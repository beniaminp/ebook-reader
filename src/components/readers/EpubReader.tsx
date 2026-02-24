/**
 * EPUB Reader Component
 *
 * A wrapper around foliate-js for rendering EPUB files in the app
 */

import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import type { View as FoliateView, FoliateLocation, FoliateTocItem } from 'foliate-js/view.js';
import type { EpubCfi, EpubChapter, EpubMetadata, BookDataForReader, EpubReaderRef, EpubSearchResult } from '../../types/epub';
import type { EpubTheme } from '../../types/epub';

import './EpubReader.css';

export interface EpubReaderProps {
  bookData: BookDataForReader;
  initialLocation?: EpubCfi;
  onProgressChange?: (cfi: EpubCfi, percentage: number, currentPage: number, totalPages: number) => void;
  onChapterChange?: (chapter: EpubChapter, index: number) => void;
  onLoadComplete?: (metadata: EpubMetadata) => void;
  onError?: (error: string) => void;
}

/** Extract a plain string from foliate-js metadata fields that may be a string or a language map. */
function metaString(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    // Language map — return first available value
    const values = Object.values(val as Record<string, string>);
    return values[0] ?? '';
  }
  return String(val);
}

/** Extract author name from foliate-js metadata.author which may be a string, object, or array. */
function metaAuthor(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val.map(item => metaString(item?.name ?? item)).filter(Boolean).join(', ');
  }
  if (typeof val === 'object' && val !== null && 'name' in val) {
    return metaString((val as { name: unknown }).name);
  }
  return metaString(val);
}

/** Convert a foliate-js TOC item tree to our EpubChapter type. */
function tocToChapters(toc: FoliateTocItem[] | undefined | null): EpubChapter[] {
  if (!toc) return [];
  return toc.map((item, idx) => ({
    id: String(item.id ?? idx),
    label: item.label?.trim() || `Chapter ${idx + 1}`,
    href: item.href || '',
    subitems: item.subitems ? tocToChapters(item.subitems) : undefined,
  }));
}

export const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>((props, ref) => {
  const { bookData, initialLocation, onProgressChange, onChapterChange, onLoadComplete, onError } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const loadedBookIdRef = useRef<string | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [chapters, setChapters] = useState<EpubChapter[]>([]);

  // Track current position for getCurrentLocation/getPercentage
  const currentCfiRef = useRef<string>('');
  const currentFractionRef = useRef<number>(0);

  // Track current theme/font settings for injection into section docs
  const themeRef = useRef<EpubTheme | null>(null);
  const fontSizeRef = useRef<number>(16);
  const fontFamilyRef = useRef<string>('serif');
  const lineHeightRef = useRef<number>(1.6);
  const loadedDocsRef = useRef<Set<Document>>(new Set());

  // Store callbacks in refs so the effect doesn't re-run when they change
  const onProgressChangeRef = useRef(onProgressChange);
  const onChapterChangeRef = useRef(onChapterChange);
  const onLoadCompleteRef = useRef(onLoadComplete);
  const onErrorRef = useRef(onError);
  onProgressChangeRef.current = onProgressChange;
  onChapterChangeRef.current = onChapterChange;
  onLoadCompleteRef.current = onLoadComplete;
  onErrorRef.current = onError;

  /** Build and inject a <style> element into a section document. */
  const injectStyles = useCallback((doc: Document) => {
    const existingStyle = doc.getElementById('foliate-reader-style');
    if (existingStyle) existingStyle.remove();

    const style = doc.createElement('style');
    style.id = 'foliate-reader-style';

    const theme = themeRef.current;
    const rules: string[] = [];

    if (theme) {
      rules.push(`body { background: ${theme.backgroundColor} !important; color: ${theme.textColor} !important; }`);
    }
    rules.push(`body { font-size: ${fontSizeRef.current}px !important; font-family: ${fontFamilyRef.current} !important; }`);
    rules.push(`body, p { line-height: ${lineHeightRef.current} !important; }`);

    style.textContent = rules.join('\n');
    doc.head.appendChild(style);
  }, []);

  /** Re-inject styles into all currently loaded section documents. */
  const reapplyStyles = useCallback(() => {
    for (const doc of loadedDocsRef.current) {
      try {
        injectStyles(doc);
      } catch {
        // Doc may have been detached
      }
    }
  }, [injectStyles]);

  // Initialize the foliate-view — only runs when the actual book identity changes
  useEffect(() => {
    if (!bookData) return;

    const bookId = bookData.book?.id || '';

    // Skip if this book is already loaded
    if (loadedBookIdRef.current === bookId && viewRef.current) {
      return;
    }

    // Cleanup previous view if any
    if (viewRef.current) {
      try { viewRef.current.close(); } catch { /* ignore */ }
      viewRef.current.remove();
      viewRef.current = null;
    }
    loadedDocsRef.current.clear();

    let destroyed = false;

    const loadBook = async () => {
      try {
        // Dynamically import foliate-js to register the custom element
        const { View } = await import('foliate-js/view.js');

        if (destroyed) return;

        // Ensure custom element is registered (import side-effects handle this)
        // Create the <foliate-view> element
        const view = new View() as FoliateView;
        viewRef.current = view;
        loadedBookIdRef.current = bookId;

        if (!containerRef.current) return;
        containerRef.current.appendChild(view);

        // Track chapters ref for chapter change callback
        let chaptersLocal: EpubChapter[] = [];

        // Listen for section loads to inject styles
        view.addEventListener('load', ((e: CustomEvent<{ doc: Document; index: number }>) => {
          if (destroyed) return;
          const { doc } = e.detail;
          loadedDocsRef.current.add(doc);
          injectStyles(doc);
        }) as EventListener);

        // Listen for relocations to track progress
        view.addEventListener('relocate', ((e: CustomEvent<FoliateLocation>) => {
          if (destroyed) return;
          const loc = e.detail;
          const cfi = loc.cfi || '';
          const fraction = loc.fraction ?? 0;
          const currentPage = loc.location?.current ?? 0;
          const totalPages = loc.location?.total ?? 0;

          currentCfiRef.current = cfi;
          currentFractionRef.current = fraction;

          onProgressChangeRef.current?.(cfi, fraction * 100, Math.max(1, currentPage), totalPages);

          // Chapter change
          if (loc.tocItem) {
            const tocLabel = loc.tocItem.label?.trim() || '';
            const idx = chaptersLocal.findIndex(ch => ch.label === tocLabel || ch.href === loc.tocItem?.href);
            if (idx >= 0) {
              onChapterChangeRef.current?.(chaptersLocal[idx], idx);
            }
          }
        }) as EventListener);

        // Open the book — pass a Blob to foliate-js
        let blob: Blob;
        if (bookData.arrayBuffer) {
          blob = new Blob([bookData.arrayBuffer], { type: 'application/epub+zip' });
        } else if (bookData.fileUri) {
          // Fetch the file URI to get a blob
          const res = await fetch(bookData.fileUri);
          blob = await res.blob();
        } else {
          throw new Error('No valid book data provided');
        }

        if (destroyed) return;

        await view.open(blob);

        if (destroyed) return;

        // Navigate to initial location
        if (initialLocation) {
          await view.goTo(initialLocation);
        } else {
          await view.next();
        }

        if (destroyed) return;

        // Extract metadata
        const meta = view.book?.metadata;
        onLoadCompleteRef.current?.({
          title: metaString(meta?.title) || 'Unknown Title',
          author: metaAuthor(meta?.author),
          description: meta?.description ? String(meta.description) : undefined,
          publisher: meta?.publisher ? metaString(typeof meta.publisher === 'object' && 'name' in meta.publisher ? meta.publisher.name : meta.publisher) : undefined,
          language: Array.isArray(meta?.language) ? meta.language[0] : meta?.language ? String(meta.language) : undefined,
        });

        // Extract TOC
        const tocChapters = tocToChapters(view.book?.toc);
        chaptersLocal = tocChapters;
        setChapters(tocChapters);

        setIsLoaded(true);
      } catch (error) {
        if (destroyed) return;
        console.error('Failed to load EPUB:', error);
        onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to load book');
      }
    };

    loadBook();

    return () => {
      destroyed = true;
      if (viewRef.current) {
        try { viewRef.current.close(); } catch { /* ignore */ }
        viewRef.current.remove();
        viewRef.current = null;
        loadedBookIdRef.current = null;
      }
      loadedDocsRef.current.clear();
    };
    // Only re-run when the actual book identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookData.book?.id, bookData.arrayBuffer, bookData.fileUri]);

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      next: () => { viewRef.current?.next(); },
      prev: () => { viewRef.current?.prev(); },
      goToChapter: (index: number) => {
        if (chapters[index]) {
          viewRef.current?.goTo(chapters[index].href);
        }
      },
      goToCfi: (cfi: string) => {
        viewRef.current?.goTo(cfi);
      },
      setFontSize: (size: number) => {
        fontSizeRef.current = size;
        reapplyStyles();
      },
      setFontFamily: (family: string) => {
        fontFamilyRef.current = family;
        reapplyStyles();
      },
      setLineHeight: (height: number) => {
        lineHeightRef.current = height;
        reapplyStyles();
      },
      setTheme: (theme: EpubTheme) => {
        themeRef.current = theme;
        reapplyStyles();
      },
      getChapters: () => chapters,
      getCurrentLocation: () => currentCfiRef.current,
      getPercentage: () => currentFractionRef.current * 100,
      search: async (query: string): Promise<EpubSearchResult[]> => {
        if (!viewRef.current || !query.trim()) return [];

        const results: EpubSearchResult[] = [];

        try {
          const iter = viewRef.current.search({ query });
          for await (const result of iter) {
            if (result === 'done') break;
            if (typeof result === 'string') continue;
            if (result.subitems) {
              // Section-level result with subitems
              const chapterLabel = result.label || 'Unknown chapter';
              for (const sub of result.subitems) {
                results.push({
                  cfi: sub.cfi,
                  excerpt: sub.excerpt || '',
                  chapterLabel,
                });
              }
            } else if (result.cfi) {
              // Individual result
              results.push({
                cfi: result.cfi,
                excerpt: result.excerpt || '',
                chapterLabel: '',
              });
            }
          }
        } catch (err) {
          console.error('EPUB search failed:', err);
        }

        return results;
      },
    }),
    [chapters, reapplyStyles]
  );

  return <div ref={containerRef} className="epub-viewer" />;
});

EpubReader.displayName = 'EpubReader';

export default EpubReader;
