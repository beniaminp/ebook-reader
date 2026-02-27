/**
 * FoliateEngine — headless foliate-js wrapper for EPUB, MOBI, FB2, CBZ, CBR.
 *
 * Implements ReaderEngineRef so UnifiedReaderContainer can drive it.
 * No UI chrome — just the <foliate-view> element.
 *
 * For CBR files, converts to CBZ format first using comicService.
 */

import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';
import type { View as FoliateView, FoliateLocation, FoliateTocItem } from 'foliate-js/view.js';
import type { EpubTheme } from '../../types/epub';
import type { ReaderEngineRef, Chapter, SearchResult, ReaderProgress } from '../../types/reader';
import { comicService } from '../../services/comicService';

import './EpubReader.css';

export interface FoliateEngineProps {
  /** Raw book bytes. */
  arrayBuffer: ArrayBuffer;
  /** Book ID used to avoid reloading the same book. */
  bookId: string;
  /** File format hint — determines MIME type for foliate-js. */
  format: string;
  /** Initial location to restore (CFI or fraction string). */
  initialLocation?: string;
  /** Called on every relocation (page turn, chapter change, etc.). */
  onRelocate?: (progress: ReaderProgress) => void;
  /** Called after the book is successfully loaded. */
  onLoadComplete?: (metadata: { title: string; author: string }) => void;
  /** Called on error. */
  onError?: (error: string) => void;
}

/** Map format string to MIME type for foliate-js. */
function formatToMime(format: string): string {
  switch (format) {
    case 'epub':
      return 'application/epub+zip';
    case 'mobi':
    case 'azw3':
      return 'application/x-mobipocket-ebook';
    case 'fb2':
      return 'application/x-fictionbook+xml';
    case 'cbz':
    case 'cbr':
      return 'application/vnd.comicbook+zip';
    default:
      return 'application/epub+zip';
  }
}

/** Extract a plain string from foliate-js metadata fields. */
function metaString(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    const values = Object.values(val as Record<string, string>);
    return values[0] ?? '';
  }
  return String(val);
}

/** Extract author name from foliate-js metadata. */
function metaAuthor(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val
      .map((item) => metaString(item?.name ?? item))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof val === 'object' && val !== null && 'name' in val) {
    return metaString((val as { name: unknown }).name);
  }
  return metaString(val);
}

/** Convert foliate-js TOC tree to our Chapter type. */
function tocToChapters(toc: FoliateTocItem[] | undefined | null): Chapter[] {
  if (!toc) return [];
  return toc.map((item, idx) => ({
    id: String(item.id ?? idx),
    label: item.label?.trim() || `Chapter ${idx + 1}`,
    href: item.href || '',
    subitems: item.subitems ? tocToChapters(item.subitems) : undefined,
  }));
}

export const FoliateEngine = forwardRef<ReaderEngineRef, FoliateEngineProps>((props, ref) => {
  const { arrayBuffer, bookId, format, initialLocation, onRelocate, onLoadComplete, onError } =
    props;

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const loadedBookIdRef = useRef<string | null>(null);

  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Keep a ref to initialLocation so the load effect can read the latest value
  // without re-running when it changes after the initial mount.
  const initialLocationRef = useRef(initialLocation);
  initialLocationRef.current = initialLocation;

  // Track current position
  const currentCfiRef = useRef<string>('');
  const currentFractionRef = useRef<number>(0);
  const currentPageRef = useRef<number>(0);
  const totalPagesRef = useRef<number>(0);

  // Track style settings for injection
  const themeRef = useRef<{ backgroundColor: string; textColor: string } | null>(null);
  const fontSizeRef = useRef<number>(16);
  const fontFamilyRef = useRef<string>('serif');
  const lineHeightRef = useRef<number>(1.6);
  const textAlignRef = useRef<string>('left');
  const marginSizeRef = useRef<string>('medium');
  const bionicReadingRef = useRef<boolean>(false);
  const loadedDocsRef = useRef<Set<Document>>(new Set());

  // Stable callback refs
  const onRelocateRef = useRef(onRelocate);
  const onLoadCompleteRef = useRef(onLoadComplete);
  const onErrorRef = useRef(onError);
  onRelocateRef.current = onRelocate;
  onLoadCompleteRef.current = onLoadComplete;
  onErrorRef.current = onError;

  const injectStyles = useCallback((doc: Document) => {
    const existingStyle = doc.getElementById('foliate-reader-style');
    if (existingStyle) existingStyle.remove();

    const style = doc.createElement('style');
    style.id = 'foliate-reader-style';

    const rules: string[] = [];
    const theme = themeRef.current;
    if (theme) {
      rules.push(
        `body { background: ${theme.backgroundColor} !important; color: ${theme.textColor} !important; }`
      );
    }
    rules.push(
      `body { font-size: ${fontSizeRef.current}px !important; font-family: ${fontFamilyRef.current} !important; }`
    );
    rules.push(`body, p { line-height: ${lineHeightRef.current} !important; }`);
    rules.push(`body, p, div { text-align: ${textAlignRef.current} !important; }`);
    const marginPadding = marginSizeRef.current === 'small' ? '8px 12px' : marginSizeRef.current === 'large' ? '24px 32px' : '16px 24px';
    rules.push(`body { padding: ${marginPadding} !important; }`);
    if (bionicReadingRef.current) {
      rules.push(`
        body { word-spacing: 0.1em !important; letter-spacing: 0.02em !important; }
        b, strong { font-weight: 900 !important; }
      `);
    }

    style.textContent = rules.join('\n');
    doc.head.appendChild(style);
  }, []);

  const reapplyStyles = useCallback(() => {
    for (const doc of loadedDocsRef.current) {
      try {
        injectStyles(doc);
      } catch {
        /* detached doc */
      }
    }
  }, [injectStyles]);

  // Initialize foliate-view
  useEffect(() => {
    if (loadedBookIdRef.current === bookId && viewRef.current) return;

    // Cleanup previous view
    if (viewRef.current) {
      try {
        viewRef.current.close();
      } catch {
        /* ignore */
      }
      viewRef.current.remove();
      viewRef.current = null;
    }
    loadedDocsRef.current.clear();

    let destroyed = false;

    const loadBook = async () => {
      try {
        // Convert CBR to CBZ if needed
        let bufferToLoad = arrayBuffer;
        let formatToUse = format;

        if (format === 'cbr') {
          try {
            bufferToLoad = await comicService.convertCbrToCbz(arrayBuffer);
            formatToUse = 'cbz';
          } catch (err) {
            if (destroyed) return;
            console.error('Failed to convert CBR to CBZ:', err);
            onErrorRef.current?.(err instanceof Error ? err.message : 'Failed to convert CBR file');
            return;
          }
        }

        const { View } = await import('foliate-js/view.js');
        if (destroyed) return;

        const view = new View() as FoliateView;
        viewRef.current = view;
        loadedBookIdRef.current = bookId;

        if (!containerRef.current) return;
        containerRef.current.appendChild(view);

        view.addEventListener('load', ((e: CustomEvent<{ doc: Document; index: number }>) => {
          if (destroyed) return;
          loadedDocsRef.current.add(e.detail.doc);
          injectStyles(e.detail.doc);
        }) as EventListener);

        view.addEventListener('relocate', ((e: CustomEvent<FoliateLocation>) => {
          if (destroyed) return;
          const loc = e.detail;
          const cfi = loc.cfi || '';
          const fraction = loc.fraction ?? 0;
          const current = loc.location?.current ?? 0;
          const total = loc.location?.total ?? 0;

          currentCfiRef.current = cfi;
          currentFractionRef.current = fraction;
          currentPageRef.current = Math.max(1, current);
          totalPagesRef.current = total;

          onRelocateRef.current?.({
            current: Math.max(1, current),
            total,
            fraction,
            label:
              total > 0 ? `${Math.max(1, current)} / ${total}` : `${Math.round(fraction * 100)}%`,
            locationString: cfi,
          });
        }) as EventListener);

        const file = new File([bufferToLoad], `book.${formatToUse}`, {
          type: formatToMime(formatToUse),
        });
        if (destroyed) return;

        await view.open(file);
        if (destroyed) return;

        if (initialLocationRef.current) {
          await view.goTo(initialLocationRef.current);
        } else {
          await view.next();
        }
        if (destroyed) return;

        // Extract metadata
        const meta = view.book?.metadata;
        onLoadCompleteRef.current?.({
          title: metaString(meta?.title) || 'Unknown Title',
          author: metaAuthor(meta?.author),
        });

        // Extract TOC
        const tocChapters = tocToChapters(view.book?.toc);
        setChapters(tocChapters);
      } catch (error) {
        if (destroyed) return;
        console.error('Failed to load book:', error);
        onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to load book');
      }
    };

    loadBook();

    return () => {
      destroyed = true;
      if (viewRef.current) {
        try {
          viewRef.current.close();
        } catch {
          /* ignore */
        }
        viewRef.current.remove();
        viewRef.current = null;
        loadedBookIdRef.current = null;
      }
      loadedDocsRef.current.clear();
    };
  }, [bookId, arrayBuffer, format]);

  useImperativeHandle(
    ref,
    () => ({
      next: () => {
        viewRef.current?.next();
      },
      prev: () => {
        viewRef.current?.prev();
      },
      goToLocation: (location: string) => {
        viewRef.current?.goTo(location);
      },
      goToChapter: (index: number) => {
        if (chapters[index]) {
          viewRef.current?.goTo(chapters[index].href);
        }
      },
      getChapters: () => chapters,
      getProgress: () => ({
        current: currentPageRef.current,
        total: totalPagesRef.current,
        fraction: currentFractionRef.current,
        label:
          totalPagesRef.current > 0
            ? `${currentPageRef.current} / ${totalPagesRef.current}`
            : `${Math.round(currentFractionRef.current * 100)}%`,
        locationString: currentCfiRef.current,
      }),
      search: async (query: string): Promise<SearchResult[]> => {
        if (!viewRef.current || !query.trim()) return [];
        const results: SearchResult[] = [];
        try {
          const iter = viewRef.current.search({ query });
          for await (const result of iter) {
            if (result === 'done') break;
            if (typeof result === 'string') continue;
            if (result.subitems) {
              const chapterLabel = result.label || '';
              for (const sub of result.subitems) {
                results.push({
                  location: sub.cfi,
                  excerpt: sub.excerpt || '',
                  label: chapterLabel,
                });
              }
            } else if (result.cfi) {
              results.push({
                location: result.cfi,
                excerpt: result.excerpt || '',
                label: '',
              });
            }
          }
        } catch (err) {
          console.error('Search failed:', err);
        }
        return results;
      },
      setTheme: (theme: { backgroundColor: string; textColor: string }) => {
        themeRef.current = theme;
        reapplyStyles();
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
      setTextAlign: (align: string) => {
        textAlignRef.current = align;
        reapplyStyles();
      },
      setMarginSize: (size: string) => {
        marginSizeRef.current = size;
        reapplyStyles();
      },
      setBionicReading: (enabled: boolean) => {
        bionicReadingRef.current = enabled;
        reapplyStyles();
      },
    }),
    [chapters, reapplyStyles]
  );

  return <div ref={containerRef} className="epub-viewer" />;
});

FoliateEngine.displayName = 'FoliateEngine';

export default FoliateEngine;
