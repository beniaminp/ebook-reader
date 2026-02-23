/**
 * EPUB Reader Component
 *
 * A wrapper around epub.js for rendering EPUB files in the app
 */

import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import ePub, { Book, Rendition } from 'epubjs';
import type { EpubCfi, EpubChapter, EpubMetadata, BookDataForReader, EpubReaderRef, EpubSearchResult } from '../../types/epub';
import type { EpubTheme } from '../../types/epub';

import './EpubReader.css';

export interface EpubReaderProps {
  bookData: BookDataForReader;
  initialLocation?: EpubCfi;
  onProgressChange?: (cfi: EpubCfi, percentage: number) => void;
  onChapterChange?: (chapter: EpubChapter, index: number) => void;
  onLoadComplete?: (metadata: EpubMetadata) => void;
  onError?: (error: string) => void;
}

export const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>((props, ref) => {
  const { bookData, initialLocation, onProgressChange, onChapterChange, onLoadComplete, onError } = props;

  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [chapters, setChapters] = useState<EpubChapter[]>([]);

  // Initialize EPUB book
  useEffect(() => {
    if (!bookData) return;

    const loadBook = async () => {
      try {
        let book: Book;

        if (bookData.arrayBuffer) {
          // Load from ArrayBuffer
          book = ePub(bookData.arrayBuffer);
        } else if (bookData.fileUri) {
          // Load from file URI
          book = ePub(bookData.fileUri);
        } else {
          throw new Error('No valid book data provided');
        }

        bookRef.current = book;

        // Initialize rendition
        if (viewerRef.current) {
          const rendition = book.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            spread: 'auto',
          });

          renditionRef.current = rendition;

          // Display book
          await rendition.display(initialLocation || undefined);

          // Get metadata
          const metadata = await book.loaded.metadata;
          onLoadComplete?.({
            title: metadata.title || 'Unknown Title',
            author: metadata.creator,
            description: metadata.description,
            publisher: metadata.publisher,
            language: metadata.language,
          });

          // Get table of contents
          const navigation = await book.loaded.navigation;
          const tocChapters = navigation.toc.map((chapter: any) => ({
            id: chapter.id,
            label: chapter.label,
            href: chapter.href,
            subitems: chapter.subitems?.map((sub: any) => ({
              id: sub.id,
              label: sub.label,
              href: sub.href,
            })),
          }));
          setChapters(tocChapters);

          // Set up progress tracking
          rendition.on('relocated', (location: any) => {
            const cfi = location.start.cfi;
            const percentage = location.start.percentage * 100;
            onProgressChange?.(cfi, percentage);

            // Find current chapter
            const currentChapter = findChapterByCfi(tocChapters, cfi);
            if (currentChapter) {
              onChapterChange?.(currentChapter.chapter, currentChapter.index);
            }
          });

          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load EPUB:', error);
        onError?.(error instanceof Error ? error.message : 'Failed to load book');
      }
    };

    loadBook();

    return () => {
      // Cleanup
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [bookData, initialLocation]);

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      next: () => renditionRef.current?.next(),
      prev: () => renditionRef.current?.prev(),
      goToChapter: (index: number) => {
        if (chapters[index]) {
          renditionRef.current?.display(chapters[index].href);
        }
      },
      goToCfi: (cfi: string) => {
        renditionRef.current?.display(cfi);
      },
      setFontSize: (size: number) => {
        if (renditionRef.current) {
          renditionRef.current.themes.fontSize(`${size}px`);
        }
      },
      setFontFamily: (family: string) => {
        if (renditionRef.current) {
          renditionRef.current.themes.font(family);
        }
      },
      setLineHeight: (height: number) => {
        if (renditionRef.current) {
          // Use register to apply custom CSS rules for line-height
          renditionRef.current.themes.register('line-height', {
            'body, p': { 'line-height': `${height}` },
          });
          renditionRef.current.themes.select('line-height');
        }
      },
      setTheme: (theme: EpubTheme) => {
        if (renditionRef.current) {
          renditionRef.current.themes.register(theme.id, {
            body: {
              background: theme.backgroundColor,
              color: theme.textColor,
            },
          });
          renditionRef.current.themes.select(theme.id);
        }
      },
      getChapters: () => chapters,
      getCurrentLocation: () => {
        // This would need to be tracked in state
        return '';
      },
      getPercentage: () => {
        // This would need to be tracked in state
        return 0;
      },
      search: async (query: string): Promise<EpubSearchResult[]> => {
        if (!bookRef.current || !query.trim()) return [];

        const results: EpubSearchResult[] = [];

        try {
          await bookRef.current.spine.each(async (section: any) => {
            try {
              const sectionResults = await section.search(query);
              if (sectionResults && sectionResults.length > 0) {
                // Find the chapter label for this section
                const chapterLabel =
                  chapters.find(
                    (ch) => section.href && section.href.includes(ch.href)
                  )?.label || section.href || 'Unknown chapter';

                sectionResults.forEach((r: any) => {
                  results.push({
                    cfi: r.cfi,
                    excerpt: r.excerpt || '',
                    chapterLabel,
                  });
                });
              }
            } catch {
              // Some sections may not support search — skip them
            }
          });
        } catch (err) {
          console.error('EPUB search failed:', err);
        }

        return results;
      },
    }),
    [chapters]
  );

  return <div ref={viewerRef} className="epub-viewer" />;
});

EpubReader.displayName = 'EpubReader';

// Helper to find chapter by CFI
function findChapterByCfi(
  chapters: EpubChapter[],
  cfi: string
): { chapter: EpubChapter; index: number } | null {
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    if (chapter.subitems && chapter.subitems.length > 0) {
      const subResult = findChapterByCfi(chapter.subitems, cfi);
      if (subResult) return subResult;
    }
    // Simple comparison - in real implementation would need proper CFI parsing
    if (cfi.startsWith(chapter.href)) {
      return { chapter, index: i };
    }
  }
  return null;
}

export default EpubReader;
