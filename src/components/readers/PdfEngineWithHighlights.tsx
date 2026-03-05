/**
 * PdfEngineWithHighlights — PDF.js renderer with text highlighting support.
 *
 * Features:
 * - Canvas rendering for PDF pages
 * - Text layer overlay for text selection
 * - Highlight creation from text selection
 * - Highlight rendering as colored overlays
 * - Export annotated PDF functionality
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
import type { HighlightRect, Highlight } from '../../types/index';
import { HIGHLIGHT_COLORS } from '../../services/annotationsService';
import { PdfService } from '../../services/pdfService';
import { PdfHighlightPanel } from '../common/PdfHighlightPanel';

export interface PdfEngineWithHighlightsProps {
  pdfData: ArrayBuffer;
  bookId: string;
  initialPage?: number;
  onRelocate?: (progress: ReaderProgress) => void;
  onLoadComplete?: (metadata: { title: string; author: string; totalPages: number }) => void;
  onError?: (error: string) => void;
  existingHighlights?: Highlight[];
  onHighlightsChange?: (highlights: Highlight[]) => void;
}

export const PdfEngineWithHighlights = forwardRef<ReaderEngineRef, PdfEngineWithHighlightsProps>(
  (props, ref) => {
    const {
      pdfData,
      bookId,
      initialPage,
      onRelocate,
      onLoadComplete,
      onError,
      existingHighlights = [],
      onHighlightsChange,
    } = props;

    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const textContentRef = useRef<any[]>([]); // Store text content for selection
    const renderTaskRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [currentPage, setCurrentPage] = useState(initialPage || 1);
    const [totalPages, setTotalPages] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [pageDirection, setPageDirection] = useState<PageDirection>('forward');
    const [viewport, setViewport] = useState<pdfjsLib.PageViewport | null>(null);

    // Highlight state
    const [highlights, setHighlights] = useState<Highlight[]>([...existingHighlights]);
    const [showHighlightMenu, setShowHighlightMenu] = useState(false);
    const [highlightMenuPosition, setHighlightMenuPosition] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const [selectedTextInfo, setSelectedTextInfo] = useState<{
      text: string;
      rects: HighlightRect[];
    } | null>(null);
    const [showHighlightsPanel, setShowHighlightsPanel] = useState(false);

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

    // Update highlights when prop changes
    useEffect(() => {
      setHighlights([...existingHighlights]);
    }, [existingHighlights]);

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

    // Render text layer for selection
    const renderTextLayer = useCallback(
      async (pageNum: number, pageViewport: pdfjsLib.PageViewport, containerScale: number) => {
        if (!pdfDocRef.current || !textLayerRef.current) return;

        try {
          const page = await pdfDocRef.current.getPage(pageNum);
          const textContent = await page.getTextContent();
          textContentRef.current = textContent.items as any[];

          // Clear existing text layer
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${pageViewport.width}px`;
          textLayerRef.current.style.height = `${pageViewport.height}px`;

          // Create text layer div
          const textLayerDiv = document.createElement('div');
          textLayerDiv.style.position = 'absolute';
          textLayerDiv.style.left = '0';
          textLayerDiv.style.top = '0';
          textLayerDiv.style.width = '100%';
          textLayerDiv.style.height = '100%';
          textLayerDiv.style.overflow = 'hidden';
          textLayerDiv.style.lineHeight = '1';
          textLayerDiv.style.mixBlendMode = 'multiply';
          textLayerDiv.style.pointerEvents = 'auto';

          // Render text items
          for (const item of textContent.items as any[]) {
            if (item.str.length === 0) continue;

            const tx = pdfjsLib.Util.transform(pageViewport.transform, item.transform);

            const fontHeight = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);

            const textDiv = document.createElement('div');
            textDiv.textContent = item.str;
            textDiv.style.position = 'absolute';
            textDiv.style.left = `${tx[4]}px`;
            textDiv.style.top = `${tx[5] - fontHeight}px`;
            textDiv.style.fontSize = `${fontHeight}px`;
            textDiv.style.fontFamily = item.fontName || 'sans-serif';
            textDiv.style.whiteSpace = 'pre';
            textDiv.style.cursor = 'text';
            textDiv.style.userSelect = 'text';
            textDiv.style.color = 'transparent';
            textDiv.className = 'pdf-text-layer-text';

            textLayerDiv.appendChild(textDiv);
          }

          textLayerRef.current.appendChild(textLayerDiv);
        } catch (err) {
          console.error('Failed to render text layer:', err);
        }
      },
      []
    );

    // Handle text selection
    const handleSelection = useCallback(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setShowHighlightMenu(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();

      if (text.length === 0 || !textLayerRef.current?.contains(range.commonAncestorContainer)) {
        setShowHighlightMenu(false);
        return;
      }

      // Get bounding rects
      const rects: HighlightRect[] = [];
      const rangeRects = range.getClientRects();
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (containerRect) {
        for (let i = 0; i < rangeRects.length; i++) {
          const rect = rangeRects[i];
          if (rect.width > 0 && rect.height > 0) {
            rects.push({
              x: rect.left - containerRect.left,
              y: rect.top - containerRect.top,
              width: rect.width,
              height: rect.height,
            });
          }
        }
      }

      if (rects.length > 0) {
        setSelectedTextInfo({ text, rects });
        const firstRect = rects[0];
        setHighlightMenuPosition({
          x: firstRect.x + firstRect.width / 2,
          y: Math.max(10, firstRect.y - 50),
        });
        setShowHighlightMenu(true);
      }
    }, []);

    useEffect(() => {
      const handleMouseUp = () => {
        setTimeout(handleSelection, 10);
      };

      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [handleSelection]);

    // Create highlight
    const handleCreateHighlight = useCallback(
      (color: string) => {
        if (!selectedTextInfo || selectedTextInfo.rects.length === 0) return;

        const newHighlight: Highlight = {
          id: `hl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          bookId,
          location: {
            bookId,
            pageNumber: currentPageRef.current,
            position: (currentPageRef.current - 1) / totalPagesRef.current,
          },
          text: selectedTextInfo.text,
          color,
          pageNumber: currentPageRef.current,
          rects: selectedTextInfo.rects,
          timestamp: new Date(),
        };

        const updatedHighlights = [...highlights, newHighlight];
        setHighlights(updatedHighlights);
        onHighlightsChange?.(updatedHighlights);

        // Clear selection
        window.getSelection()?.removeAllRanges();
        setSelectedTextInfo(null);
        setShowHighlightMenu(false);
      },
      [selectedTextInfo, bookId, highlights, onHighlightsChange]
    );

    // Delete highlight
    const handleDeleteHighlight = useCallback(
      (id: string) => {
        const updatedHighlights = highlights.filter((h) => h.id !== id);
        setHighlights(updatedHighlights);
        onHighlightsChange?.(updatedHighlights);
      },
      [highlights, onHighlightsChange]
    );

    // Update highlight
    const handleUpdateHighlight = useCallback(
      (id: string, updates: { color?: string; note?: string }) => {
        const updatedHighlights = highlights.map((h) => (h.id === id ? { ...h, ...updates } : h));
        setHighlights(updatedHighlights);
        onHighlightsChange?.(updatedHighlights);
      },
      [highlights, onHighlightsChange]
    );

    // Render current page to canvas
    const renderPage = useCallback(
      async (pageNum: number) => {
        if (!pdfDocRef.current || !canvasRef.current) return;

        try {
          if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
          }

          const page = await pdfDocRef.current.getPage(pageNum);
          const containerWidth = containerRef.current?.clientWidth || window.innerWidth - 32;
          const pageViewport = page.getViewport({ scale: 1 });
          const containerScale = containerWidth / pageViewport.width;
          const scaledViewport = page.getViewport({ scale: containerScale });

          setViewport(scaledViewport);

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

          // Render text layer after canvas
          await renderTextLayer(pageNum, scaledViewport, containerScale);
        } catch (err: any) {
          if (err?.name !== 'RenderingCancelledException') {
            console.error(`Failed to render page ${pageNum}:`, err);
          }
        }
      },
      [renderTextLayer]
    );

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

    // Get highlights for current page
    const currentPageHighlights = highlights.filter((h) => h.pageNumber === currentPage && h.rects);

    // Export annotated PDF
    const handleExportPdf = useCallback(async () => {
      try {
        const pdfHighlights = highlights
          .filter((h) => h.pageNumber && h.rects)
          .map((h) => ({
            id: h.id,
            bookId: h.bookId,
            pageNumber: h.pageNumber!,
            text: h.text,
            rects: h.rects!,
            color: h.color,
            note: h.note,
            createdAt: h.timestamp as any,
          }));
        await PdfService.exportAnnotatedPdf(pdfData, pdfHighlights, `annotated-${bookId}.pdf`);
      } catch (error) {
        console.error('Failed to export PDF:', error);
      }
    }, [highlights, pdfData, bookId]);

    useImperativeHandle(
      ref,
      () => ({
        next: () => goToPage(currentPageRef.current + 1),
        prev: () => goToPage(currentPageRef.current - 1),
        goToLocation: (location: string) => {
          const page = parseInt(location, 10);
          if (!isNaN(page)) goToPage(page);
        },
        goToFraction: (fraction: number) => {
          const page = Math.max(1, Math.min(totalPagesRef.current, Math.round(fraction * totalPagesRef.current) + 1));
          goToPage(page);
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
        getVisibleText: (): string => {
          // Get text from the rendered text layer in the DOM
          if (textLayerRef.current) {
            return textLayerRef.current.innerText || textLayerRef.current.textContent || '';
          }
          return '';
        },
        getContentDocuments: (): Document[] => {
          // PDF renders in the main document
          return [document];
        },
      }),
      [goToPage]
    );

    // Convert hex color to rgba
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
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
          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%',
                height: 'auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                display: 'block',
              }}
            />
            {/* Text layer for selection */}
            <div
              ref={textLayerRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
              }}
            />
            {/* Render highlights */}
            {currentPageHighlights.map((highlight) => (
              <React.Fragment key={highlight.id}>
                {highlight.rects?.map((rect, idx) => (
                  <div
                    key={`${highlight.id}-${idx}`}
                    style={{
                      position: 'absolute',
                      left: `${rect.x}px`,
                      top: `${rect.y}px`,
                      width: `${rect.width}px`,
                      height: `${rect.height}px`,
                      backgroundColor: hexToRgba(highlight.color, 0.3),
                      pointerEvents: 'none',
                    }}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </PageTransition>

        {/* Highlight color picker menu */}
        {showHighlightMenu && highlightMenuPosition && (
          <div
            style={{
              position: 'fixed',
              left: `${highlightMenuPosition.x}px`,
              top: `${highlightMenuPosition.y}px`,
              transform: 'translateX(-50%)',
              background: 'var(--ion-color-light)',
              borderRadius: '8px',
              padding: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 1000,
              display: 'flex',
              gap: '4px',
            }}
          >
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleCreateHighlight(color.value)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: color.value,
                  border: '2px solid #fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                }}
                title={color.name}
              />
            ))}
            <button
              onClick={() => {
                setShowHighlightMenu(false);
                setSelectedTextInfo(null);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                background: 'var(--ion-color-medium)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Toolbar buttons for highlights and export */}
        <div
          style={{
            position: 'fixed',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 100,
          }}
        >
          <button
            onClick={() => setShowHighlightsPanel(true)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--ion-color-primary)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
            title="Highlights"
          >
            🖍️
          </button>
          <button
            onClick={handleExportPdf}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--ion-color-secondary)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
            title="Export Annotated PDF"
          >
            📥
          </button>
        </div>

        {/* Highlights Panel */}
        <PdfHighlightPanel
          isOpen={showHighlightsPanel}
          onClose={() => setShowHighlightsPanel(false)}
          highlights={highlights
            .filter((h) => h.pageNumber && h.rects)
            .map((h) => ({
              id: h.id,
              bookId: h.bookId,
              pageNumber: h.pageNumber!,
              text: h.text,
              rects: h.rects!,
              color: h.color,
              note: h.note,
              createdAt: h.timestamp as any,
            }))}
          onGoToHighlight={(pageNumber: number) => goToPage(pageNumber)}
          onDeleteHighlight={handleDeleteHighlight}
          onUpdateHighlight={handleUpdateHighlight}
        />
      </div>
    );
  }
);

PdfEngineWithHighlights.displayName = 'PdfEngineWithHighlights';

export default PdfEngineWithHighlights;
