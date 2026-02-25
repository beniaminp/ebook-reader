/**
 * UnifiedReaderContainer — single shell component for all reader formats.
 *
 * Provides shared UI (toolbars, search modal, settings panel, tap zones,
 * keyboard navigation) and delegates rendering to the appropriate engine:
 *   - FoliateEngine for EPUB / MOBI / FB2 / CBZ
 *   - PdfEngine for PDF
 *   - ScrollEngine for TXT / HTML / MD
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonIcon,
  IonFooter,
  IonToast,
  IonModal,
  IonSearchbar,
  IonSpinner,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonProgressBar,
} from '@ionic/react';
import {
  arrowBack,
  bookmarkOutline,
  bookmark,
  searchOutline,
  settingsOutline,
  chevronBack,
  chevronForward,
  list,
} from 'ionicons/icons';

import { FoliateEngine } from './FoliateEngine';
import { PdfEngine } from './PdfEngine';
import { PdfEngineWithHighlights } from './PdfEngineWithHighlights';
import { ScrollEngine } from './ScrollEngine';
import { ReadingSettingsPanel } from '../reader-ui/ReadingSettingsPanel';
import { TranslationPanel } from '../reader-ui/TranslationPanel';
import { TextSelectionMenu } from '../reader-ui/TextSelectionMenu';
import { DictionaryPanel } from '../dictionary';
import { useThemeStore } from '../../stores/useThemeStore';
import { EPUB_THEMES } from '../../types/epub';
import type { ReaderEngineRef, SearchResult, ReaderProgress, Chapter, ReaderFormat } from '../../types/reader';
import type { Book, Highlight } from '../../types/index';
import { databaseService } from '../../services/database';
import { useAppStore } from '../../stores/useAppStore';

import './UnifiedReaderContainer.css';
import './EpubReader.css';

// ───────────────────────────── Props ─────────────────────────────

export interface UnifiedReaderContainerProps {
  book: Book;
  format: ReaderFormat;
  /** ArrayBuffer for binary formats (EPUB, PDF, MOBI, FB2, CBZ). */
  fileData?: ArrayBuffer;
  /** Text content for text-based formats (TXT, HTML, MD). */
  textContent?: string;
  /** Location string to restore (CFI, page number, scroll %). */
  initialLocation?: string;
  onBack?: () => void;
  onBookmark?: (bookId: string, location: string, textPreview?: string) => void;
  /** Called on every progress change for persistence. */
  onProgressChange?: (locationString: string, percentage: number) => void;
}

// ───────────────────────────── Helpers ─────────────────────────────

/** Formats that use foliate-js. */
const FOLIATE_FORMATS = new Set<string>(['epub', 'mobi', 'fb2', 'cbz']);

/** Formats that use the scroll engine. */
const SCROLL_FORMATS = new Set<string>(['txt', 'html', 'htm', 'md', 'markdown', 'docx', 'odt']);

function scrollContentType(format: string): 'text' | 'html' | 'markdown' {
  if (format === 'html' || format === 'htm') return 'html';
  if (format === 'md' || format === 'markdown') return 'markdown';
  return 'text';
}

// ───────────────────────────── Component ─────────────────────────────

export const UnifiedReaderContainer: React.FC<UnifiedReaderContainerProps> = ({
  book,
  format,
  fileData,
  textContent,
  initialLocation,
  onBack,
  onBookmark,
  onProgressChange,
}) => {
  const engineRef = useRef<ReaderEngineRef>(null);
  const ionContentRef = useRef<HTMLIonContentElement>(null);

  // UI state
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [title, setTitle] = useState(book.title);
  const [progress, setProgress] = useState<ReaderProgress | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [searching, setSearching] = useState(false);

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  // Dictionary state
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');

  // PDF highlights state
  const [pdfHighlights, setPdfHighlights] = useState<Highlight[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState('');

  // Theme
  const themeStore = useThemeStore();
  const currentTheme = EPUB_THEMES[themeStore.theme] || EPUB_THEMES.light;

  // Track the active bookmark ID so we can remove it
  const currentBookmarkIdRef = useRef<string | null>(null);

  // Overlay tap zone state (for foliate engine with iframe)
  const overlayTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [overlayPassthrough, setOverlayPassthrough] = useState(false);

  // Track whether a touch event already handled the tap (prevents double-toggle on mobile)
  const touchHandledRef = useRef(false);

  // Text selection state
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFoliate = FOLIATE_FORMATS.has(format);
  const isPdf = format === 'pdf';
  const isScroll = SCROLL_FORMATS.has(format);

  // ─── Load PDF highlights ─────────────────────────

  useEffect(() => {
    if (isPdf) {
      databaseService.getHighlights(book.id).then(setPdfHighlights);
    }
  }, [isPdf, book.id]);

  const handleAddPdfHighlight = useCallback(async (highlight: Omit<Highlight, 'id' | 'timestamp'>) => {
    const result = await databaseService.addHighlight({
      ...highlight,
      location: highlight.location.pageNumber
        ? String(highlight.location.pageNumber)
        : highlight.location.cfi || String(highlight.location.position),
      rects: highlight.rects ? JSON.stringify(highlight.rects) : undefined,
    });
    if (result) {
      setPdfHighlights(prev => [...prev, result]);
      setToastMessage('Highlight added');
    }
  }, []);

  const handleDeletePdfHighlight = useCallback(async (id: string) => {
    await databaseService.deleteHighlight(id);
    setPdfHighlights(prev => prev.filter(h => h.id !== id));
  }, []);

  const handleUpdatePdfHighlight = useCallback(async (id: string, updates: { color?: string; note?: string }) => {
    await databaseService.updateHighlight(id, updates);
    setPdfHighlights(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  }, []);

  const handlePdfHighlightsChange = useCallback((updatedHighlights: Highlight[]) => {
    setPdfHighlights(updatedHighlights);
  }, []);

  // ─── Stable callback refs for renderEngine (prevent remounting on handler change) ─────────────────────────

  const handleRelocateRef = useRef<(p: ReaderProgress) => void>(() => {});
  const handleFoliateLoadCompleteRef = useRef<(meta: { title: string; author: string }) => void>(() => {});
  const handlePdfLoadCompleteRef = useRef<(meta: { title: string; author: string; totalPages: number }) => void>(() => {});
  const handleScrollLoadCompleteRef = useRef<() => void>(() => {});
  const handleErrorRef = useRef<(error: string) => void>(() => {});
  const handlePdfHighlightsChangeRef = useRef<(highlights: Highlight[]) => void>(() => {});
  const pdfHighlightsRef = useRef<Highlight[]>([]);

  // ─── Navigation handlers ─────────────────────────

  const handleNext = useCallback(() => engineRef.current?.next(), []);
  const handlePrev = useCallback(() => engineRef.current?.prev(), []);
  const handleToggleToolbar = useCallback(() => setToolbarVisible(v => !v), []);

  // ─── Progress from engine ─────────────────────────

  const handleRelocate = useCallback((p: ReaderProgress) => {
    setProgress(p);
    if (p.locationString) {
      onProgressChange?.(p.locationString, p.fraction * 100);
    }
  }, [onProgressChange]);

  // ─── Load complete from engine ─────────────────────────

  const handleFoliateLoadComplete = useCallback((meta: { title: string; author: string }) => {
    if (meta.title) setTitle(meta.title);
    setLoading(false);
    // Get chapters after load
    setTimeout(() => {
      const ch = engineRef.current?.getChapters() || [];
      setChapters(ch);
    }, 100);
  }, []);

  const handlePdfLoadComplete = useCallback((meta: { title: string; author: string; totalPages: number }) => {
    if (meta.title) setTitle(meta.title);
    setLoading(false);
  }, []);

  const handleScrollLoadComplete = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback((error: string) => {
    setToastMessage(`Error: ${error}`);
    setLoading(false);
  }, []);

  // Keep stable callback refs in sync so renderEngine never remounts due to handler identity changes
  handleRelocateRef.current = handleRelocate;
  handleFoliateLoadCompleteRef.current = handleFoliateLoadComplete;
  handlePdfLoadCompleteRef.current = handlePdfLoadComplete;
  handleScrollLoadCompleteRef.current = handleScrollLoadComplete;
  handleErrorRef.current = handleError;
  handlePdfHighlightsChangeRef.current = handlePdfHighlightsChange;
  pdfHighlightsRef.current = pdfHighlights;

  // ─── Apply theme/font changes to foliate engine ─────────────────────────

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setTheme?.({ backgroundColor: currentTheme.backgroundColor, textColor: currentTheme.textColor });
  }, [currentTheme, isFoliate]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setFontSize?.(themeStore.fontSize);
  }, [themeStore.fontSize, isFoliate]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setFontFamily?.(themeStore.fontFamily);
  }, [themeStore.fontFamily, isFoliate]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setLineHeight?.(themeStore.lineHeight);
  }, [themeStore.lineHeight, isFoliate]);

  // ─── Overlay tap zones (for foliate iframe) ─────────────────────────

  const handleOverlayTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    overlayTouchRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    longPressTimerRef.current = setTimeout(() => {
      setOverlayPassthrough(true);
    }, 500);
  }, []);

  const handleOverlayTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleOverlayTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (overlayPassthrough) {
      setTimeout(() => setOverlayPassthrough(false), 3000);
      return;
    }

    if (!overlayTouchRef.current) return;
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - overlayTouchRef.current.x);
    const dy = Math.abs(touch.clientY - overlayTouchRef.current.y);
    const elapsed = Date.now() - overlayTouchRef.current.time;
    overlayTouchRef.current = null;

    if (dx > 10 || dy > 10 || elapsed > 500) return;

    // Mark that touch handled this tap so onClick doesn't double-fire
    touchHandledRef.current = true;

    const relX = touch.clientX / window.innerWidth;
    if (relX < 0.25) handlePrev();
    else if (relX > 0.75) handleNext();
    else handleToggleToolbar();
  }, [overlayPassthrough, handlePrev, handleNext, handleToggleToolbar]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    // On mobile, touch events already handled the tap — skip the synthetic click
    if (touchHandledRef.current) {
      touchHandledRef.current = false;
      return;
    }
    const relX = e.clientX / window.innerWidth;
    if (relX < 0.25) handlePrev();
    else if (relX > 0.75) handleNext();
    else handleToggleToolbar();
  }, [handlePrev, handleNext, handleToggleToolbar]);

  // ─── Content tap zones (for non-foliate formats: PDF, scroll) ─────────────────────────

  const contentTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const contentTouchHandledRef = useRef(false);

  const handleContentTouchStart = useCallback((e: React.TouchEvent) => {
    if (isFoliate) return;
    const touch = e.touches[0];
    contentTouchRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, [isFoliate]);

  const handleContentTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isFoliate || !contentTouchRef.current) return;
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - contentTouchRef.current.x);
    const dy = Math.abs(touch.clientY - contentTouchRef.current.y);
    const elapsed = Date.now() - contentTouchRef.current.time;
    contentTouchRef.current = null;

    if (dx > 10 || dy > 10 || elapsed > 500) return;

    const relX = touch.clientX / window.innerWidth;
    // Only handle center tap to toggle toolbar for non-foliate formats
    // (left/right navigation is handled by scrolling or PDF engine)
    if (relX >= 0.25 && relX <= 0.75) {
      contentTouchHandledRef.current = true;
      handleToggleToolbar();
    }
  }, [isFoliate, handleToggleToolbar]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if (isFoliate) return;
    if (contentTouchHandledRef.current) {
      contentTouchHandledRef.current = false;
      return;
    }
    const relX = e.clientX / window.innerWidth;
    if (relX >= 0.25 && relX <= 0.75) {
      handleToggleToolbar();
    }
  }, [isFoliate, handleToggleToolbar]);

  // ─── Keyboard navigation ─────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (searchOpen || settingsOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          handlePrev();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          handleNext();
          break;
        case 'Home':
          e.preventDefault();
          engineRef.current?.goToLocation('1');
          break;
        case 'End':
          if (progress?.total) {
            e.preventDefault();
            engineRef.current?.goToLocation(String(progress.total));
          }
          break;
        case 'f':
          if (e.ctrlKey) {
            e.preventDefault();
            setSearchOpen(true);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, searchOpen, settingsOpen, progress]);

  // ─── Bookmark ─────────────────────────

  const handleToggleBookmark = useCallback(async () => {
    const loc = progress?.locationString || '';
    if (isBookmarked) {
      // Remove the bookmark from the database
      if (currentBookmarkIdRef.current) {
        await useAppStore.getState().removeBookmark(currentBookmarkIdRef.current);
        currentBookmarkIdRef.current = null;
      } else {
        // Fallback: fetch bookmarks and remove any that match the current location
        const bookmarks = await databaseService.getBookmarks(book.id);
        const match = bookmarks.find(b => b.location?.cfi === loc);
        if (match) {
          await databaseService.deleteBookmark(match.id);
        }
      }
      setIsBookmarked(false);
      setToastMessage('Bookmark removed');
    } else {
      const bookmarkId = `bookmark-${Date.now()}`;
      currentBookmarkIdRef.current = bookmarkId;
      // Add via the store so it persists to the database
      await useAppStore.getState().addBookmark(book.id, loc, undefined, undefined, undefined);
      // Fetch back the saved bookmark to capture its real ID
      const saved = await databaseService.getBookmarks(book.id);
      const match = saved.find(b => b.location?.cfi === loc);
      if (match) currentBookmarkIdRef.current = match.id;
      onBookmark?.(book.id, loc);
      setIsBookmarked(true);
      setToastMessage('Bookmark added');
    }
  }, [book.id, progress, isBookmarked, onBookmark]);

  // ─── Search ─────────────────────────

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !engineRef.current) return;
    setSearching(true);
    try {
      const results = await engineRef.current.search(searchQuery);
      setSearchResults(results);
      setCurrentSearchIndex(0);
      if (results.length > 0) {
        engineRef.current.goToLocation(results[0].location);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const goToSearchResult = useCallback((idx: number) => {
    if (searchResults.length === 0 || !engineRef.current) return;
    setCurrentSearchIndex(idx);
    engineRef.current.goToLocation(searchResults[idx].location);
  }, [searchResults]);

  const goToNextSearchResult = useCallback(() => {
    goToSearchResult((currentSearchIndex + 1) % searchResults.length);
  }, [goToSearchResult, currentSearchIndex, searchResults.length]);

  const goToPrevSearchResult = useCallback(() => {
    goToSearchResult((currentSearchIndex - 1 + searchResults.length) % searchResults.length);
  }, [goToSearchResult, currentSearchIndex, searchResults.length]);

  // ─── TOC ─────────────────────────

  const handleGoToChapter = useCallback((index: number) => {
    engineRef.current?.goToChapter(index);
    setTocOpen(false);
  }, []);

  // ─── Dictionary / Text selection ─────────────────────────

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    // Check if it looks like a single word (allow apostrophes and hyphens)
    if (/^[\w'-]+$/.test(text)) {
      setSelectedWord(text);
      setDictionaryOpen(true);
    }

    // Clear selection after a delay
    if (selectionTimerRef.current) {
      clearTimeout(selectionTimerRef.current);
    }
    selectionTimerRef.current = setTimeout(() => {
      selection?.removeAllRanges();
    }, 500);
  }, []);

  useEffect(() => {
    // Add text selection listener for scroll and PDF engines
    if (isScroll || isPdf) {
      document.addEventListener('selectionchange', handleTextSelection);
      return () => {
        document.removeEventListener('selectionchange', handleTextSelection);
        if (selectionTimerRef.current) {
          clearTimeout(selectionTimerRef.current);
        }
      };
    }
  }, [isScroll, isPdf, handleTextSelection]);

  // Handle text selection for foliate (EPUB) via iframe
  const handleFoliateTextSelection = useCallback(() => {
    if (!isFoliate) return;

    // Try to get selection from foliate iframe
    const foliateView = document.querySelector('foliate-view');
    if (!foliateView) return;

    const iframe = foliateView.shadowRoot?.querySelector('iframe');
    if (!iframe?.contentWindow) return;

    const iframeSelection = iframe.contentWindow.getSelection();
    if (!iframeSelection || iframeSelection.isCollapsed) return;

    const text = iframeSelection.toString().trim();
    if (!text) return;

    // Check if it looks like a single word
    if (/^[\w'-]+$/.test(text)) {
      setSelectedWord(text);
      setDictionaryOpen(true);
    }

    // Clear selection after a delay
    if (selectionTimerRef.current) {
      clearTimeout(selectionTimerRef.current);
    }
    selectionTimerRef.current = setTimeout(() => {
      iframeSelection?.removeAllRanges();
    }, 500);
  }, [isFoliate]);

  // Listen for foliate (EPUB iframe) text selection when in passthrough mode.
  // Use mouseup + touchend events instead of polling so detection is immediate.
  useEffect(() => {
    if (!isFoliate || !overlayPassthrough) return;

    // Attach to the document first; if the foliate iframe is available, also
    // attach inside it so selection events bubble regardless of focus.
    const attachIframeListeners = () => {
      const foliateView = document.querySelector('foliate-view');
      const iframe = foliateView?.shadowRoot?.querySelector('iframe') as HTMLIFrameElement | null;
      return iframe?.contentDocument ?? null;
    };

    const onSelectionEnd = () => handleFoliateTextSelection();

    document.addEventListener('mouseup', onSelectionEnd);
    document.addEventListener('touchend', onSelectionEnd);

    // Also attach inside the iframe document if accessible
    const iframeDoc = attachIframeListeners();
    if (iframeDoc) {
      iframeDoc.addEventListener('mouseup', onSelectionEnd);
      iframeDoc.addEventListener('touchend', onSelectionEnd);
    }

    return () => {
      document.removeEventListener('mouseup', onSelectionEnd);
      document.removeEventListener('touchend', onSelectionEnd);
      if (iframeDoc) {
        iframeDoc.removeEventListener('mouseup', onSelectionEnd);
        iframeDoc.removeEventListener('touchend', onSelectionEnd);
      }
    };
  }, [isFoliate, overlayPassthrough, handleFoliateTextSelection]);

  // ─── Render engine ─────────────────────────
  // Stable wrapper callbacks forward to refs so the useMemo only depends on
  // structural values (book ID, format, file data), preventing unnecessary
  // engine remounts when handler identity changes.

  const stableOnRelocate = useCallback((p: ReaderProgress) => handleRelocateRef.current(p), []);
  const stableOnFoliateLoadComplete = useCallback((meta: { title: string; author: string }) => handleFoliateLoadCompleteRef.current(meta), []);
  const stableOnPdfLoadComplete = useCallback((meta: { title: string; author: string; totalPages: number }) => handlePdfLoadCompleteRef.current(meta), []);
  const stableOnScrollLoadComplete = useCallback(() => handleScrollLoadCompleteRef.current(), []);
  const stableOnError = useCallback((error: string) => handleErrorRef.current(error), []);
  const stableOnPdfHighlightsChange = useCallback((highlights: Highlight[]) => handlePdfHighlightsChangeRef.current(highlights), []);

  const renderEngine = useMemo(() => {
    if (isFoliate && fileData) {
      return (
        <FoliateEngine
          ref={engineRef}
          arrayBuffer={fileData}
          bookId={book.id}
          format={format}
          initialLocation={initialLocation}
          onRelocate={stableOnRelocate}
          onLoadComplete={stableOnFoliateLoadComplete}
          onError={stableOnError}
        />
      );
    }

    if (isPdf && fileData) {
      return (
        <PdfEngineWithHighlights
          ref={engineRef}
          pdfData={fileData}
          bookId={book.id}
          initialPage={initialLocation ? parseInt(initialLocation, 10) || 1 : 1}
          onRelocate={stableOnRelocate}
          onLoadComplete={stableOnPdfLoadComplete}
          onError={stableOnError}
          existingHighlights={pdfHighlightsRef.current}
          onHighlightsChange={stableOnPdfHighlightsChange}
        />
      );
    }

    if (isScroll && textContent !== undefined) {
      return (
        <ScrollEngine
          ref={engineRef}
          content={textContent}
          contentType={scrollContentType(format)}
          ionContentRef={ionContentRef}
          onRelocate={stableOnRelocate}
          onLoadComplete={stableOnScrollLoadComplete}
        />
      );
    }

    return null;
  }, [
    isFoliate, isPdf, isScroll, fileData, textContent,
    book.id, format, initialLocation,
    stableOnRelocate, stableOnFoliateLoadComplete, stableOnPdfLoadComplete,
    stableOnScrollLoadComplete, stableOnError, stableOnPdfHighlightsChange,
  ]);

  // ─── Toolbar theme styling ─────────────────────────

  const toolbarStyle = isFoliate
    ? {
        '--background': currentTheme.backgroundColor,
        '--color': currentTheme.textColor,
        '--border-color': currentTheme.id === 'light' ? '#e0e0e0' : 'rgba(255,255,255,0.12)',
      } as React.CSSProperties
    : undefined;

  const iconColor = isFoliate ? { color: currentTheme.textColor } : undefined;

  // ─── Render ─────────────────────────

  return (
    <IonPage
      className={`unified-reader-page${toolbarVisible ? '' : ' fullscreen'}`}
      style={isFoliate ? { '--reader-bg': currentTheme.backgroundColor } as React.CSSProperties : undefined}
    >
      {/* ─── Top toolbar ─── */}
      {toolbarVisible && (
        <IonHeader>
          <IonToolbar style={toolbarStyle}>
            <IonButtons slot="start">
              <IonButton onClick={onBack} style={iconColor}>
                <IonIcon icon={arrowBack} />
              </IonButton>
            </IonButtons>
            <IonTitle style={iconColor}>{title}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setSearchOpen(true)} style={iconColor}>
                <IonIcon icon={searchOutline} />
              </IonButton>
              <IonButton onClick={handleToggleBookmark} style={iconColor}>
                <IonIcon icon={isBookmarked ? bookmark : bookmarkOutline} />
              </IonButton>
              <IonButton onClick={() => setSettingsOpen(true)} style={iconColor}>
                <IonIcon icon={settingsOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
          {/* Progress bar for scroll/pdf formats */}
          {!isFoliate && progress && (
            <IonProgressBar value={progress.fraction} />
          )}
        </IonHeader>
      )}

      {/* ─── Content area ─── */}
      <IonContent
        ref={ionContentRef}
        scrollY={isScroll}
        scrollEvents={isScroll}
        style={isFoliate ? { '--background': currentTheme.backgroundColor } as React.CSSProperties : undefined}
        onTouchStart={handleContentTouchStart}
        onTouchEnd={handleContentTouchEnd}
        onClick={handleContentClick}
      >
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
            <IonSpinner name="crescent" />
            <p>Loading...</p>
          </div>
        )}

        {isFoliate ? (
          <div className="unified-reader-wrapper">
            {renderEngine}
            <div
              className={`unified-tap-overlay${overlayPassthrough ? ' passthrough' : ''}`}
              onTouchStart={handleOverlayTouchStart}
              onTouchMove={handleOverlayTouchMove}
              onTouchEnd={handleOverlayTouchEnd}
              onClick={handleOverlayClick}
            />
          </div>
        ) : (
          renderEngine
        )}
      </IonContent>

      {/* ─── Bottom toolbar ─── */}
      {toolbarVisible && (
        <IonFooter>
          <IonToolbar style={toolbarStyle}>
            <div className="unified-bottom-bar">
              <IonButton fill="clear" size="small" onClick={handlePrev} style={iconColor}>
                <IonIcon icon={chevronBack} />
              </IonButton>

              {chapters.length > 0 && (
                <IonButton fill="clear" size="small" onClick={() => setTocOpen(true)} style={iconColor}>
                  <IonIcon icon={list} />
                </IonButton>
              )}

              <span className="page-info" style={iconColor}>
                {progress?.label || '...'}
              </span>

              <IonButton fill="clear" size="small" onClick={handleNext} style={iconColor}>
                <IonIcon icon={chevronForward} />
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      )}

      {/* ─── Search modal ─── */}
      <IonModal isOpen={searchOpen} onDidDismiss={() => setSearchOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Search</IonTitle>
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
              onKeyPress={e => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="Search in book..."
              showCancelButton="focus"
            />
            <IonButton expand="block" onClick={handleSearch} style={{ marginTop: '8px' }}>
              Search
            </IonButton>

            {searching && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <IonSpinner />
                <p>Searching...</p>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', marginTop: '16px',
                  borderBottom: '1px solid var(--ion-color-light-shade)',
                }}>
                  <span>{currentSearchIndex + 1} of {searchResults.length} results</span>
                  <div>
                    <IonButton size="small" fill="clear" onClick={goToPrevSearchResult}>
                      <IonIcon icon={chevronBack} />
                    </IonButton>
                    <IonButton size="small" fill="clear" onClick={goToNextSearchResult}>
                      <IonIcon icon={chevronForward} />
                    </IonButton>
                  </div>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {searchResults.map((result, idx) => (
                    <IonItem
                      key={idx}
                      button
                      onClick={() => {
                        goToSearchResult(idx);
                        setSearchOpen(false);
                      }}
                      style={{
                        background: idx === currentSearchIndex ? 'var(--ion-color-light-tint)' : undefined,
                      }}
                    >
                      <IonLabel>
                        {result.label && <h3 style={{ fontSize: '13px', fontWeight: 600 }}>{result.label}</h3>}
                        <p style={{ fontSize: '12px' }}>{result.excerpt}</p>
                      </IonLabel>
                    </IonItem>
                  ))}
                </div>
              </>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)', marginTop: '20px' }}>
                No results found for &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </div>
        </IonContent>
      </IonModal>

      {/* ─── TOC popover ─── */}
      <IonPopover isOpen={tocOpen} onDidDismiss={() => setTocOpen(false)}>
        <div style={{ width: '300px', maxWidth: '80vw', maxHeight: '60vh', overflowY: 'auto' }}>
          <IonList>
            <IonItem lines="none">
              <IonLabel><h2>Table of Contents</h2></IonLabel>
            </IonItem>
            {chapters.map((ch, idx) => (
              <IonItem key={ch.id} button onClick={() => handleGoToChapter(idx)}>
                <IonLabel>{ch.label}</IonLabel>
              </IonItem>
            ))}
          </IonList>
        </div>
      </IonPopover>

      {/* ─── Settings modal ─── */}
      <IonModal
        isOpen={settingsOpen}
        onDidDismiss={() => setSettingsOpen(false)}
        breakpoints={[0, 0.5, 0.85]}
        initialBreakpoint={0.5}
      >
        <ReadingSettingsPanel onDismiss={() => setSettingsOpen(false)} />
      </IonModal>

      {/* ─── Toast ─── */}
      <IonToast
        isOpen={!!toastMessage}
        onDidDismiss={() => setToastMessage('')}
        message={toastMessage}
        duration={2000}
        position="bottom"
      />

      {/* ─── Dictionary Panel ─── */}
      <DictionaryPanel
        isOpen={dictionaryOpen}
        onDismiss={() => setDictionaryOpen(false)}
        word={selectedWord}
        bookId={book.id}
      />

      {/* ─── Translation Panel ─── */}
      <TranslationPanel
        bookId={book.id}
        location={progress?.locationString}
      />

      {/* ─── Text Selection Menu ─── */}
      <TextSelectionMenu
        enabledActions={['translate', 'highlight', 'copy', 'define']}
        onHighlight={(text) => {
          // Handle highlight - this would integrate with annotations service
          setToastMessage('Highlight added');
        }}
        onCopy={(text) => {
          setToastMessage('Copied to clipboard');
        }}
        onDefine={(text) => {
          setSelectedWord(text.split(/\s+/)[0]);
          setDictionaryOpen(true);
        }}
      />
    </IonPage>
  );
};

export default UnifiedReaderContainer;
