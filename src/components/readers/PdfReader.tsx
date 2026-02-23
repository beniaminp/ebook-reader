import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  IonContent,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSearchbar,
  IonSpinner,
  IonToast,
  IonModal,
  IonHeader,
  IonFooter,
  IonItem,
  IonInput,
  IonToggle,
  IonPage,
} from '@ionic/react';
import {
  chevronBack,
  chevronForward,
  expand,
  contract,
  refresh,
  searchOutline,
  settingsOutline,
  bookmark,
  bookmarkOutline,
  arrowBack,
} from 'ionicons/icons';
import { useAppStore } from '../../stores/useAppStore';
import { useTapZones } from '../../hooks/useTapZones';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { PageTransition } from '../reader-ui/PageTransition';
import { useThemeStore } from '../../stores/useThemeStore';
import type { PageDirection } from '../reader-ui/PageTransition';

// PDF.js worker setup - using CDN for worker
import * as pdfjsLib from 'pdfjs-dist';

// Set worker from CDN (works with Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfReaderProps {
  book: {
    id: string;
    title: string;
    author?: string;
    currentPage?: number;
  };
  pdfData: ArrayBuffer | string;
  onPageChange?: (pageNumber: number, totalPages: number) => void;
  onBookmarkToggle?: (pageNumber: number) => void;
  onClose?: () => void;
}

type ZoomMode = 'fit-width' | 'fit-page' | 'custom';
type ViewMode = 'single' | 'continuous' | 'scrolling';

interface SearchResult {
  pageNumber: number;
  matches: number[];
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  book,
  pdfData,
  onPageChange,
  onBookmarkToggle,
  onClose,
}) => {
  // Core PDF state
  const pdfDocument = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [totalPages, setTotalPages] = useState(0);

  // Navigation state
  const [currentPage, setCurrentPage] = useState(book.currentPage || 1);
  const [targetPage, setTargetPage] = useState(currentPage);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('single');

  // Zoom state
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit-width');
  const [customZoom, setCustomZoom] = useState(100);
  const [actualZoom, setActualZoom] = useState(100);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [searching, setSearching] = useState(false);

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [invertColors, setInvertColors] = useState(false);

  // Store state
  const { settings, hasBookmark } = useAppStore();
  const { pageTransitionType } = useThemeStore();

  // Page transition state
  const [pageDirection, setPageDirection] = useState<PageDirection>('forward');

  // Canvas refs for rendering
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderTasks = useRef<Map<number, any>>(new Map());

  // Calculate actual zoom based on mode
  const calculateZoom = useCallback((
    pageWidth: number,
    pageHeight: number,
    containerWidth: number,
    containerHeight: number
  ): number => {
    switch (zoomMode) {
      case 'fit-width':
        return Math.floor((containerWidth / pageWidth) * 100);
      case 'fit-page':
        return Math.floor(
          Math.min(containerWidth / pageWidth, containerHeight / pageHeight) * 100
        );
      case 'custom':
        return customZoom;
      default:
        return 100;
    }
  }, [zoomMode, customZoom]);

  // Load PDF document
  useEffect(() => {
    let mounted = true;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument({
          data: pdfData,
          password: password || undefined,
        });

        const pdf = await loadingTask.promise;

        if (!mounted) return;

        pdfDocument.current = pdf;
        setTotalPages(pdf.numPages);
        setPdfLoaded(true);
        setLoading(false);

        // Set initial page if not already set
        if (!book.currentPage || book.currentPage < 1) {
          setCurrentPage(1);
        } else {
          setCurrentPage(Math.min(book.currentPage, pdf.numPages));
        }
      } catch (err: any) {
        if (!mounted) return;

        if (err?.name === 'PasswordException') {
          setPasswordRequired(true);
          setError('This PDF requires a password to open.');
        } else {
          setError(err?.message || 'Failed to load PDF');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      mounted = false;
      // Cancel any pending render tasks
      renderTasks.current.forEach(task => task.cancel());
      renderTasks.current.clear();
    };
  }, [pdfData, password, book.currentPage]);

  // Update zoom when zoom mode changes
  useEffect(() => {
    // Calculate zoom based on window size (simplified approach)
    const containerWidth = window.innerWidth - 32;
    const containerHeight = window.innerHeight - 200;

    // Get page dimensions for first page (approximate)
    const updateZoom = async () => {
      if (!pdfDocument.current) return;
      try {
        const page = await pdfDocument.current.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const zoom = calculateZoom(
          viewport.width,
          viewport.height,
          containerWidth,
          containerHeight
        );
        setActualZoom(zoom);
      } catch {
        setActualZoom(100);
      }
    };

    updateZoom();
  }, [zoomMode, customZoom, calculateZoom, pdfLoaded]);

  // Render a single page
  const renderPage = useCallback(async (
    pageNumber: number,
    canvas: HTMLCanvasElement
  ) => {
    if (!pdfDocument.current) return;

    try {
      // Cancel any existing render task for this page
      const existingTask = renderTasks.current.get(pageNumber);
      if (existingTask) {
        existingTask.cancel();
      }

      const page = await pdfDocument.current.getPage(pageNumber);
      const viewport = page.getViewport({
        scale: actualZoom / 100,
        rotation: rotation,
      });

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Apply CSS filters for theme inversion
      if (invertColors) {
        context.filter = 'invert(1) hue-rotate(180deg)';
      } else {
        context.filter = 'none';
      }

      const renderContext = {
        canvasContext: context as any,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext as any);
      renderTasks.current.set(pageNumber, renderTask);

      await renderTask.promise;
      renderTasks.current.delete(pageNumber);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(`Failed to render page ${pageNumber}:`, err);
      }
    }
  }, [actualZoom, rotation, invertColors]);

  // Handle page change with progress update
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;

    setCurrentPage(newPage);
    onPageChange?.(newPage, totalPages);
  }, [totalPages, onPageChange]);

  // Navigation handlers
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setPageDirection('forward');
      handlePageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, handlePageChange]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      setPageDirection('backward');
      handlePageChange(currentPage - 1);
    }
  }, [currentPage, handlePageChange]);

  // Swipe gesture handlers
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNextPage,
    onSwipeRight: goToPrevPage,
  });

  // Tap zone handlers
  const tapHandlers = useTapZones({
    onNext: goToNextPage,
    onPrev: goToPrevPage,
  });

  const goToPage = useCallback(() => {
    const page = Math.max(1, Math.min(totalPages, targetPage));
    handlePageChange(page);
  }, [targetPage, totalPages, handlePageChange]);

  // Zoom handlers
  const zoomIn = useCallback(() => {
    setZoomMode('custom');
    setCustomZoom(prev => Math.min(300, prev + 25));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomMode('custom');
    setCustomZoom(prev => Math.max(50, prev - 25));
  }, []);

  // Rotation handlers
  const rotateClockwise = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const rotateCounterClockwise = useCallback(() => {
    setRotation(prev => (prev + 270) % 360);
  }, []);

  // Bookmark handler
  const toggleBookmark = useCallback(() => {
    onBookmarkToggle?.(currentPage);
  }, [currentPage, onBookmarkToggle]);

  const isBookmarked = hasBookmark?.(book.id, currentPage) || false;

  // Search functionality
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim() || !pdfDocument.current) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const results: SearchResult[] = [];

    try {
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDocument.current.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .toLowerCase();

        const query = searchQuery.toLowerCase();
        const matches: number[] = [];
        let index = 0;

        while ((index = pageText.indexOf(query, index)) !== -1) {
          matches.push(index);
          index += query.length;
        }

        if (matches.length > 0) {
          results.push({ pageNumber: i, matches });
        }
      }

      setSearchResults(results);
      if (results.length > 0) {
        setCurrentSearchIndex(0);
        const firstResultPage = results[0].pageNumber;
        handlePageChange(firstResultPage);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, totalPages, handlePageChange]);

  const goToNextSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;

    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    handlePageChange(searchResults[nextIndex].pageNumber);
  }, [searchResults, currentSearchIndex, handlePageChange]);

  const goToPrevSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;

    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    handlePageChange(searchResults[prevIndex].pageNumber);
  }, [searchResults, currentSearchIndex, handlePageChange]);

  // Register canvas refs
  const registerCanvas = useCallback((pageNumber: number, canvas: HTMLCanvasElement | null) => {
    if (!canvas) {
      canvasRefs.current.delete(pageNumber);
      return;
    }
    canvasRefs.current.set(pageNumber, canvas);
  }, []);

  // Render current page
  useEffect(() => {
    if (!pdfLoaded || viewMode !== 'single') return;

    const canvas = canvasRefs.current.get(currentPage);
    if (canvas) {
      renderPage(currentPage, canvas);
    }
  }, [pdfLoaded, currentPage, viewMode, renderPage, actualZoom, rotation, invertColors]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (settingsOpen) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          goToNextPage();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          goToPrevPage();
          break;
        case 'Home':
          e.preventDefault();
          handlePageChange(1);
          break;
        case 'End':
          e.preventDefault();
          handlePageChange(totalPages);
          break;
        case '+':
        case '=':
          e.ctrlKey && (e.preventDefault(), zoomIn());
          break;
        case '-':
          e.ctrlKey && (e.preventDefault(), zoomOut());
          break;
        case 'f':
          e.ctrlKey && (e.preventDefault(), setSearchOpen(true));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage, handlePageChange, totalPages, zoomIn, zoomOut, settingsOpen]);

  // Progress percentage
  const progress = totalPages > 0 ? ((currentPage - 1) / totalPages) * 100 : 0;

  // Current zoom display
  const zoomDisplay = useMemo(() => {
    return `${actualZoom}%`;
  }, [actualZoom]);

  // Search result display
  const searchResultText = useMemo(() => {
    if (searchResults.length === 0) return '';
    return `${currentSearchIndex + 1} of ${searchResults.length} results`;
  }, [searchResults.length, currentSearchIndex]);

  // Password modal
  if (passwordRequired) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Password Required</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
            <p>Enter the password to open this PDF file:</p>
            <IonInput
              type="password"
              value={password}
              onIonInput={e => setPassword(e.detail.value || '')}
              placeholder="PDF password"
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  setPasswordRequired(false);
                }
              }}
            />
            <IonButton expand="block" onClick={() => setPasswordRequired(false)}>
              Unlock
            </IonButton>
            {error && <p style={{ color: 'var(--ion-color-danger)' }}>{error}</p>}
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Loading state
  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '100px' }}>
            <IonSpinner name="crescent" />
            <p>Loading PDF...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Error state
  if (error && !pdfLoaded) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <p style={{ color: 'var(--ion-color-danger)' }}>Error: {error}</p>
            <IonButton onClick={onClose}>Close</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      {/* Top toolbar */}
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>
              <IonIcon icon={arrowBack} />
            </IonButton>
          </IonButtons>

          <IonTitle>{book.title}</IonTitle>

          <IonButtons slot="end">
            <IonButton onClick={() => setSearchOpen(true)}>
              <IonIcon icon={searchOutline} />
            </IonButton>
            <IonButton onClick={() => setSettingsOpen(true)}>
              <IonIcon icon={settingsOutline} />
            </IonButton>
            <IonButton onClick={toggleBookmark}>
              <IonIcon icon={isBookmarked ? bookmark : bookmarkOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        {/* Progress bar */}
        <IonProgressBar value={progress / 100} />

        {/* Page info bar */}
        <IonToolbar style={{ '--min-height': '40px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            width: '100%',
          }}>
            <IonButton disabled={currentPage <= 1} onClick={goToPrevPage} fill="clear">
              <IonIcon icon={chevronBack} />
            </IonButton>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonInput
                type="number"
                value={targetPage.toString()}
                onIonInput={e => setTargetPage(parseInt(e.detail.value || '1'))}
                onIonBlur={goToPage}
                style={{ width: '60px', textAlign: 'center' }}
              />
              <span>/ {totalPages}</span>
            </div>

            <IonButton disabled={currentPage >= totalPages} onClick={goToNextPage} fill="clear">
              <IonIcon icon={chevronForward} />
            </IonButton>

            <span style={{ marginLeft: '16px', fontSize: '12px' }}>
              {progress.toFixed(1)}%
            </span>
          </div>
        </IonToolbar>
      </IonHeader>

      {/* Main content area */}
      <IonContent
        scrollEvents={true}
        style={{
          backgroundColor: settings.theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            minHeight: '100%',
            padding: '16px',
          }}
          onTouchStart={(e) => { swipeHandlers.onTouchStart(e); tapHandlers.onTouchStart(e); }}
          onTouchMove={swipeHandlers.onTouchMove}
          onTouchEnd={(e) => { swipeHandlers.onTouchEnd(e); tapHandlers.onTouchEnd(e); }}
        >
          {viewMode === 'single' && (
            <PageTransition
              pageKey={currentPage}
              animationType={pageTransitionType}
              direction={pageDirection}
            >
              <canvas
                ref={canvas => registerCanvas(currentPage, canvas)}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  boxShadow: settings.theme === 'dark'
                    ? '0 4px 20px rgba(255,255,255,0.1)'
                    : '0 4px 20px rgba(0,0,0,0.1)',
                }}
              />
            </PageTransition>
          )}
        </div>
      </IonContent>

      {/* Bottom toolbar */}
      <IonFooter>
        <IonToolbar style={{ '--min-height': '50px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
          }}>
            {/* Zoom controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonButton size="small" onClick={zoomOut} fill="clear">
                <IonIcon icon={contract} />
              </IonButton>
              <IonSelect
                value={zoomMode}
                onIonChange={(e: any) => setZoomMode(e.detail.value as ZoomMode)}
                interface="popover"
              >
                <IonSelectOption value="fit-width">Fit Width</IonSelectOption>
                <IonSelectOption value="fit-page">Fit Page</IonSelectOption>
                <IonSelectOption value="custom">Custom</IonSelectOption>
              </IonSelect>
              <span style={{ fontSize: '12px', minWidth: '45px', textAlign: 'center' }}>
                {zoomDisplay}
              </span>
              <IonButton size="small" onClick={zoomIn} fill="clear">
                <IonIcon icon={expand} />
              </IonButton>
            </div>

            {/* Rotation controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonButton size="small" onClick={rotateCounterClockwise} fill="clear">
                <IonIcon icon={refresh} style={{ transform: 'scaleX(-1)' }} />
              </IonButton>
              <IonButton size="small" onClick={rotateClockwise} fill="clear">
                <IonIcon icon={refresh} />
              </IonButton>
            </div>

            {/* View mode toggle */}
            <IonSegment
              value={viewMode}
              onIonChange={e => setViewMode(e.detail.value as ViewMode)}
              style={{ width: '140px' }}
            >
              <IonSegmentButton value="single">
                <IonLabel>Single</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="scrolling">
                <IonLabel>Scroll</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>
        </IonToolbar>
      </IonFooter>

      {/* Search modal */}
      <IonModal isOpen={searchOpen} onDidDismiss={() => setSearchOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Search in PDF</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setSearchOpen(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ padding: '16px' }}>
            <IonSearchbar
              value={searchQuery}
              onIonInput={e => setSearchQuery(e.detail.value || '')}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  performSearch();
                }
              }}
              placeholder="Search text..."
              showCancelButton="focus"
            />

            {searching && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <IonSpinner />
                <p>Searching...</p>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--ion-color-light-shade)',
                }}>
                  <span>{searchResultText}</span>
                  <div>
                    <IonButton size="small" onClick={goToPrevSearchResult} fill="clear">
                      <IonIcon icon={chevronBack} />
                    </IonButton>
                    <IonButton size="small" onClick={goToNextSearchResult} fill="clear">
                      <IonIcon icon={chevronForward} />
                    </IonButton>
                  </div>
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {searchResults.map((result, idx) => (
                    <IonItem
                      key={result.pageNumber}
                      button
                      onClick={() => {
                        handlePageChange(result.pageNumber);
                        setCurrentSearchIndex(idx);
                        setSearchOpen(false);
                      }}
                      style={{
                        background: idx === currentSearchIndex
                          ? 'var(--ion-color-light-tint)'
                          : undefined,
                      }}
                    >
                      <IonLabel>
                        <h3>Page {result.pageNumber}</h3>
                        <p>{result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}</p>
                      </IonLabel>
                    </IonItem>
                  ))}
                </div>
              </>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)', marginTop: '20px' }}>
                No results found for "{searchQuery}"
              </p>
            )}
          </div>
        </IonContent>
      </IonModal>

      {/* Settings modal */}
      <IonModal isOpen={settingsOpen} onDidDismiss={() => setSettingsOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>PDF Settings</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setSettingsOpen(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ padding: '16px' }}>
            <IonItem>
              <IonLabel>
                <h3>Invert Colors (Dark Mode)</h3>
                <p>Invert PDF colors for better reading in dark mode</p>
              </IonLabel>
              <IonToggle
                slot="end"
                checked={invertColors}
                onIonChange={e => setInvertColors(e.detail.checked)}
              />
            </IonItem>

            <div style={{ marginTop: '24px' }}>
              <h3>Keyboard Shortcuts</h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                <li><strong>Arrow keys / Page Up/Down:</strong> Navigate pages</li>
                <li><strong>Home/End:</strong> First/Last page</li>
                <li><strong>Ctrl + F:</strong> Open search</li>
                <li><strong>Ctrl + +/-:</strong> Zoom in/out</li>
              </ul>
            </div>
          </div>
        </IonContent>
      </IonModal>

      {/* Toast for errors */}
      <IonToast
        isOpen={!!error}
        message={error || ''}
        duration={3000}
        color="danger"
        onDidDismiss={() => setError(null)}
      />
    </IonPage>
  );
};

export default PdfReader;
