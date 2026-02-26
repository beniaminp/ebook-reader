/**
 * PdfEngine — headless PDF.js renderer implementing ReaderEngineRef.
 *
 * Renders a single page via canvas. No UI chrome — the UnifiedReaderContainer
 * provides toolbar, search modal, settings, etc.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import '../../utils/pdfWorkerSetup';
import { useThemeStore } from '../../stores/useThemeStore';
import { PageTransition } from '../reader-ui/PageTransition';
import type { PageDirection } from '../reader-ui/PageTransition';
import type { ReaderEngineRef, SearchResult, ReaderProgress, Chapter } from '../../types/reader';

export interface PdfEngineProps {
  pdfData: ArrayBuffer;
  bookId: string;
  initialPage?: number;
  onRelocate?: (progress: ReaderProgress) => void;
  onLoadComplete?: (metadata: { title: string; author: string; totalPages: number }) => void;
  onError?: (error: string) => void;
}

export const PdfEngine = forwardRef<ReaderEngineRef, PdfEngineProps>((props, ref) => {
  const { pdfData, bookId, initialPage, onRelocate, onLoadComplete, onError } = props;

  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  const [currentPage, setCurrentPage] = useState(initialPage || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [pageDirection, setPageDirection] = useState<PageDirection>('forward');

  const { pageTransitionType } = useThemeStore();

  // Stable callback refs
  const onRelocateRef = useRef(onRelocate);
  const onLoadCompleteRef = useRef(onLoadComplete);
  const onErrorRef = useRef(onError);
  onRelocateRef.current = onRelocate;
  onLoadCompleteRef.current = onLoadComplete;
  onErrorRef.current = onError;

  // Current page ref for imperative access
  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);
  currentPageRef.current = currentPage;
  totalPagesRef.current = totalPages;

  // Load PDF document
  useEffect(() => {
    let mounted = true;

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        if (!mounted) return;

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        totalPagesRef.current = pdf.numPages;

        const page = initialPage ? Math.min(initialPage, pdf.numPages) : 1;
        setCurrentPage(page);
        currentPageRef.current = page;

        setLoaded(true);

        onLoadCompleteRef.current?.({
          title: '',
          author: '',
          totalPages: pdf.numPages,
        });
      } catch (err: any) {
        if (!mounted) return;
        onErrorRef.current?.(err?.message || 'Failed to load PDF');
      }
    };

    loadPdf();

    return () => {
      mounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfData, bookId]);

  // Render current page to canvas
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDocRef.current.getPage(pageNum);
      const containerWidth = canvasRef.current.parentElement?.clientWidth || window.innerWidth - 32;
      const viewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const context = canvasRef.current.getContext('2d', { alpha: false });
      if (!context) return;

      canvasRef.current.width = scaledViewport.width;
      canvasRef.current.height = scaledViewport.height;

      const renderTask = page.render({
        canvasContext: context as any,
        viewport: scaledViewport,
        canvas: canvasRef.current,
      } as any);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(`Failed to render page ${pageNum}:`, err);
      }
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      renderPage(currentPage);
    }
  }, [loaded, currentPage, renderPage]);

  // Notify on page change
  useEffect(() => {
    if (!loaded || totalPages === 0) return;
    onRelocateRef.current?.({
      current: currentPage,
      total: totalPages,
      fraction: (currentPage - 1) / totalPages,
      label: `${currentPage} / ${totalPages}`,
      locationString: String(currentPage),
    });
  }, [currentPage, totalPages, loaded]);

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(totalPagesRef.current, page));
    if (clamped > currentPageRef.current) setPageDirection('forward');
    else if (clamped < currentPageRef.current) setPageDirection('backward');
    setCurrentPage(clamped);
    currentPageRef.current = clamped;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      next: () => goToPage(currentPageRef.current + 1),
      prev: () => goToPage(currentPageRef.current - 1),
      goToLocation: (location: string) => {
        const page = parseInt(location, 10);
        if (!isNaN(page)) goToPage(page);
      },
      goToChapter: () => {
        /* PDF has no chapters */
      },
      getChapters: (): Chapter[] => [],
      getProgress: (): ReaderProgress => ({
        current: currentPageRef.current,
        total: totalPagesRef.current,
        fraction:
          totalPagesRef.current > 0 ? (currentPageRef.current - 1) / totalPagesRef.current : 0,
        label: `${currentPageRef.current} / ${totalPagesRef.current}`,
        locationString: String(currentPageRef.current),
      }),
      search: async (query: string): Promise<SearchResult[]> => {
        if (!pdfDocRef.current || !query.trim()) return [];
        const results: SearchResult[] = [];
        const total = totalPagesRef.current;

        try {
          for (let i = 1; i <= total; i++) {
            const page = await pdfDocRef.current.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            const lowerText = pageText.toLowerCase();
            const lowerQuery = query.toLowerCase();

            let idx = 0;
            const matchCount: number[] = [];
            while ((idx = lowerText.indexOf(lowerQuery, idx)) !== -1) {
              matchCount.push(idx);
              idx += lowerQuery.length;
            }

            if (matchCount.length > 0) {
              // Get excerpt around first match
              const firstIdx = matchCount[0];
              const start = Math.max(0, firstIdx - 40);
              const end = Math.min(pageText.length, firstIdx + query.length + 40);
              const excerpt =
                (start > 0 ? '...' : '') +
                pageText.slice(start, end) +
                (end < pageText.length ? '...' : '');

              results.push({
                location: String(i),
                excerpt,
                label: `Page ${i} (${matchCount.length} match${matchCount.length !== 1 ? 'es' : ''})`,
              });
            }
          }
        } catch (err) {
          console.error('PDF search failed:', err);
        }

        return results;
      },
    }),
    [goToPage]
  );

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100%',
        padding: '16px',
      }}
    >
      <PageTransition
        pageKey={currentPage}
        animationType={pageTransitionType}
        direction={pageDirection}
      >
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            height: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        />
      </PageTransition>
    </div>
  );
});

PdfEngine.displayName = 'PdfEngine';

export default PdfEngine;
