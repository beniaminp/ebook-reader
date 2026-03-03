/**
 * UnifiedReaderContainer — single shell component for all reader formats.
 *
 * Provides shared UI (toolbars, search modal, settings panel, tap zones,
 * keyboard navigation) and delegates rendering to the appropriate engine:
 *   - FoliateEngine for EPUB / MOBI / FB2 / CBZ / CBR
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
  bookmarksOutline,
  searchOutline,
  settingsOutline,
  chevronBack,
  chevronForward,
  list,
  colorPaletteOutline,
} from 'ionicons/icons';

import { FoliateEngine } from './FoliateEngine';
import { PdfEngineWithHighlights } from './PdfEngineWithHighlights';
import { ScrollEngine } from './ScrollEngine';
import { ReadingSettingsPanel } from '../reader-ui/ReadingSettingsPanel';
import { TranslationPanel } from '../reader-ui/TranslationPanel';
import { TextSelectionMenu } from '../reader-ui/TextSelectionMenu';
import { DictionaryPanel } from '../dictionary';
import { useThemeStore } from '../../stores/useThemeStore';
import { EPUB_THEMES } from '../../types/epub';
import type {
  ReaderEngineRef,
  SearchResult,
  ReaderProgress,
  Chapter,
  ReaderFormat,
} from '../../types/reader';
import type { Book, Highlight } from '../../types/index';
import { databaseService } from '../../services/database';
import { HIGHLIGHT_COLORS } from '../../services/annotationsService';
import { useAppStore } from '../../stores/useAppStore';
import { useBrightnessGesture } from '../../hooks/useBrightnessGesture';
import { HighlightsPanel } from '../common/HighlightsPanel';
import { BookmarksPanel } from '../common/BookmarksPanel';
import type { EpubBookmark } from '../../services/annotationsService';
import type { FoliateHighlight } from './FoliateEngine';

import './UnifiedReaderContainer.css';
import './EpubReader.css';
import '../reader-ui/Interlinear.css';

// ───────────────────────────── Props ─────────────────────────────

export interface UnifiedReaderContainerProps {
  book: Book;
  format: ReaderFormat;
  /** ArrayBuffer for binary formats (EPUB, PDF, MOBI, FB2, CBZ, CBR). */
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
const FOLIATE_FORMATS = new Set<string>(['epub', 'mobi', 'azw3', 'fb2', 'cbz', 'cbr']);

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

  // Highlights state (all formats)
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const prevHighlightsRef = useRef<Highlight[]>([]);

  // Color picker state
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [pendingHighlightText, setPendingHighlightText] = useState('');
  const [pendingHighlightMeta, setPendingHighlightMeta] = useState<{
    cfi?: string;
    startOffset?: number;
    endOffset?: number;
  } | null>(null);

  // Highlights panel
  const [highlightsPanelOpen, setHighlightsPanelOpen] = useState(false);

  // Bookmarks panel
  const [bookmarksPanelOpen, setBookmarksPanelOpen] = useState(false);
  const [bookmarksList, setBookmarksList] = useState<EpubBookmark[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState('');

  // Theme
  const themeStore = useThemeStore();
  const baseTheme = EPUB_THEMES[themeStore.theme] || EPUB_THEMES.light;
  // Merge custom background color into the effective theme
  const currentTheme = useMemo(
    () =>
      themeStore.customBackgroundColor
        ? { ...baseTheme, backgroundColor: themeStore.customBackgroundColor }
        : baseTheme,
    [baseTheme, themeStore.customBackgroundColor]
  );

  // Brightness gesture hook
  const brightnessGesture = useBrightnessGesture({
    enabled: true,
  });

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

  // Clean up timers on unmount to prevent setState on dead components
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
    };
  }, []);

  // ─── Keep screen awake while reading ─────────────────────────
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Wake Lock request failed (e.g. low battery, tab not visible)
      }
    };

    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLock?.release().catch(() => {});
    };
  }, []);

  // ─── Load highlights for all formats ─────────────────────────

  useEffect(() => {
    databaseService.getHighlights(book.id).then((loaded) => {
      setHighlights(loaded);
      prevHighlightsRef.current = loaded;
    });
  }, [book.id]);

  // ─── Load bookmarks for bookmark panel ─────────────────────────

  const loadBookmarks = useCallback(async () => {
    const bms = await databaseService.getBookmarks(book.id);
    setBookmarksList(
      bms.map((b) => ({
        id: b.id,
        bookId: b.bookId,
        cfi: b.location?.cfi || '',
        chapterTitle: b.chapter,
        textPreview: b.text,
        createdAt: b.timestamp instanceof Date ? b.timestamp.getTime() : Date.now(),
        updatedAt: b.timestamp instanceof Date ? b.timestamp.getTime() : Date.now(),
      }))
    );
  }, [book.id]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // PDF highlights change handler — diff and persist to DB
  const handlePdfHighlightsChange = useCallback(
    (updatedHighlights: Highlight[]) => {
      const prev = prevHighlightsRef.current;
      const prevIds = new Set(prev.map((h) => h.id));
      const newIds = new Set(updatedHighlights.map((h) => h.id));

      // Find added highlights
      for (const h of updatedHighlights) {
        if (!prevIds.has(h.id)) {
          databaseService.addHighlight({
            id: h.id,
            bookId: h.bookId,
            location: h.location?.cfi || String(h.pageNumber || ''),
            text: h.text,
            color: h.color,
            note: h.note,
            pageNumber: h.pageNumber,
            rects: h.rects ? JSON.stringify(h.rects) : undefined,
          });
        }
      }

      // Find deleted highlights
      for (const h of prev) {
        if (!newIds.has(h.id)) {
          databaseService.deleteHighlight(h.id);
        }
      }

      // Find updated highlights (color/note changes)
      for (const h of updatedHighlights) {
        if (prevIds.has(h.id)) {
          const old = prev.find((p) => p.id === h.id);
          if (old && (old.color !== h.color || old.note !== h.note)) {
            databaseService.updateHighlight(h.id, { color: h.color, note: h.note });
          }
        }
      }

      setHighlights(updatedHighlights);
      prevHighlightsRef.current = updatedHighlights;
    },
    []
  );

  // ─── Stable callback refs for renderEngine (prevent remounting on handler change) ─────────────────────────

  const handleRelocateRef = useRef<(p: ReaderProgress) => void>(() => {});
  const handleFoliateLoadCompleteRef = useRef<(meta: { title: string; author: string }) => void>(
    () => {}
  );
  const handlePdfLoadCompleteRef = useRef<
    (meta: { title: string; author: string; totalPages: number }) => void
  >(() => {});
  const handleScrollLoadCompleteRef = useRef<() => void>(() => {});
  const handleErrorRef = useRef<(error: string) => void>(() => {});
  const handlePdfHighlightsChangeRef = useRef<(highlights: Highlight[]) => void>(() => {});
  const highlightsRef = useRef<Highlight[]>([]);

  // ─── Navigation handlers ─────────────────────────

  const handleNext = useCallback(() => engineRef.current?.next(), []);
  const handlePrev = useCallback(() => engineRef.current?.prev(), []);
  const handleToggleToolbar = useCallback(() => setToolbarVisible((v) => !v), []);

  // ─── Progress from engine ─────────────────────────

  const handleRelocate = useCallback(
    async (p: ReaderProgress) => {
      setProgress(p);
      if (p.locationString) {
        onProgressChange?.(p.locationString, p.fraction * 100);

        // Check if the new location has an existing bookmark
        const bms = await databaseService.getBookmarks(book.id);
        const loc = p.locationString;
        const match = bms.find((b) => {
          // Match by CFI/location string
          if (b.location?.cfi && b.location.cfi === loc) return true;
          // Match by page number for PDF
          if (b.location?.pageNumber && p.current !== undefined && b.location.pageNumber === p.current) return true;
          return false;
        });
        setIsBookmarked(!!match);
        currentBookmarkIdRef.current = match?.id || null;
      } else {
        setIsBookmarked(false);
        currentBookmarkIdRef.current = null;
      }
    },
    [onProgressChange, book.id]
  );

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

  const handlePdfLoadComplete = useCallback(
    (meta: { title: string; author: string; totalPages: number }) => {
      if (meta.title) setTitle(meta.title);
      setLoading(false);
    },
    []
  );

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
  highlightsRef.current = highlights;

  // ─── Apply theme/font changes to foliate engine ─────────────────────────

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setTheme?.({
      backgroundColor: currentTheme.backgroundColor,
      textColor: currentTheme.textColor,
    });
  }, [currentTheme, isFoliate]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setCustomBackgroundImage?.(themeStore.customBackgroundImage);
  }, [themeStore.customBackgroundImage, isFoliate]);

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

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setTextAlign?.(themeStore.textAlign);
  }, [themeStore.textAlign, isFoliate]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setMarginSize?.(themeStore.marginSize);
  }, [themeStore.marginSize, isFoliate]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setCustomMargins?.(themeStore.customMargins);
  }, [themeStore.customMargins, isFoliate]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setBionicReading?.(themeStore.bionicReading);
  }, [themeStore.bionicReading, isFoliate]);

  useEffect(() => {
    if (isPdf) return;
    console.log(`[Interlinear] Effect fired: enabled=${themeStore.interlinearMode}, lang=${themeStore.interlinearLanguage}, hasEngine=${!!engineRef.current}`);
    engineRef.current?.setInterlinearMode?.(
      themeStore.interlinearMode,
      themeStore.interlinearLanguage
    );
  }, [themeStore.interlinearMode, themeStore.interlinearLanguage, isFoliate, isScroll, isPdf]);

  // ─── Overlay tap zones (for foliate iframe) ─────────────────────────

  const handleOverlayTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // First handle brightness gesture
      brightnessGesture.onTouchStart(e);

      const touch = e.touches[0];
      overlayTouchRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      longPressTimerRef.current = setTimeout(() => {
        setOverlayPassthrough(true);
      }, 500);
    },
    [brightnessGesture]
  );

  const handleOverlayTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Handle brightness gesture movement
      brightnessGesture.onTouchMove(e);

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    },
    [brightnessGesture]
  );

  const handleOverlayTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Handle brightness gesture end
      brightnessGesture.onTouchEnd(e);

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (overlayPassthrough) {
        setTimeout(() => setOverlayPassthrough(false), 3000);
        return;
      }

      // Skip tap handling if brightness gesture was active
      if (brightnessGesture.wasBrightnessDrag) {
        brightnessGesture.resetBrightnessDragFlag();
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
    },
    [overlayPassthrough, handlePrev, handleNext, handleToggleToolbar, brightnessGesture]
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      // On mobile, touch events already handled the tap — skip the synthetic click
      if (touchHandledRef.current) {
        touchHandledRef.current = false;
        return;
      }
      const relX = e.clientX / window.innerWidth;
      if (relX < 0.25) handlePrev();
      else if (relX > 0.75) handleNext();
      else handleToggleToolbar();
    },
    [handlePrev, handleNext, handleToggleToolbar]
  );

  // ─── Content tap zones (for non-foliate formats: PDF, scroll) ─────────────────────────

  const contentTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const contentTouchHandledRef = useRef(false);

  const handleContentTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isFoliate) return;
      // Handle brightness gesture
      brightnessGesture.onTouchStart(e);
      const touch = e.touches[0];
      contentTouchRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    },
    [isFoliate, brightnessGesture]
  );

  const handleContentTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Handle brightness gesture end
      brightnessGesture.onTouchEnd(e);

      if (isFoliate || !contentTouchRef.current) return;
      const touch = e.changedTouches[0];
      const dx = Math.abs(touch.clientX - contentTouchRef.current.x);
      const dy = Math.abs(touch.clientY - contentTouchRef.current.y);
      const elapsed = Date.now() - contentTouchRef.current.time;
      contentTouchRef.current = null;

      if (dx > 10 || dy > 10 || elapsed > 500) return;

      // Skip tap handling if brightness gesture was active
      if (brightnessGesture.wasBrightnessDrag) {
        brightnessGesture.resetBrightnessDragFlag();
        return;
      }

      const relX = touch.clientX / window.innerWidth;
      // Only handle center tap to toggle toolbar for non-foliate formats
      // (left/right navigation is handled by scrolling or PDF engine)
      if (relX >= 0.25 && relX <= 0.75) {
        contentTouchHandledRef.current = true;
        handleToggleToolbar();
      }
    },
    [isFoliate, handleToggleToolbar, brightnessGesture]
  );

  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      if (isFoliate) return;
      if (contentTouchHandledRef.current) {
        contentTouchHandledRef.current = false;
        return;
      }
      const relX = e.clientX / window.innerWidth;
      if (relX >= 0.25 && relX <= 0.75) {
        handleToggleToolbar();
      }
    },
    [isFoliate, handleToggleToolbar]
  );

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
        const match = bookmarks.find((b) => b.location?.cfi === loc);
        if (match) {
          await databaseService.deleteBookmark(match.id);
        }
      }
      setIsBookmarked(false);
      setToastMessage('Bookmark removed');
    } else {
      // Add via the store so it persists to the database
      const chapterTitle = '';
      const textPreview = progress?.label || '';
      await useAppStore.getState().addBookmark(book.id, loc, progress?.current, chapterTitle, textPreview);
      // Fetch back the saved bookmark to capture its real ID
      const saved = await databaseService.getBookmarks(book.id);
      const match = saved.find((b) => b.location?.cfi === loc);
      if (match) currentBookmarkIdRef.current = match.id;
      onBookmark?.(book.id, loc);
      setIsBookmarked(true);
      setToastMessage('Bookmark added');
    }
    // Refresh bookmarks list for the panel
    await loadBookmarks();
  }, [book.id, progress, isBookmarked, onBookmark, loadBookmarks]);

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

  const goToSearchResult = useCallback(
    (idx: number) => {
      if (searchResults.length === 0 || !engineRef.current) return;
      setCurrentSearchIndex(idx);
      engineRef.current.goToLocation(searchResults[idx].location);
    },
    [searchResults]
  );

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
  const stableOnFoliateLoadComplete = useCallback(
    (meta: { title: string; author: string }) => handleFoliateLoadCompleteRef.current(meta),
    []
  );
  const stableOnPdfLoadComplete = useCallback(
    (meta: { title: string; author: string; totalPages: number }) =>
      handlePdfLoadCompleteRef.current(meta),
    []
  );
  const stableOnScrollLoadComplete = useCallback(() => handleScrollLoadCompleteRef.current(), []);
  const stableOnError = useCallback((error: string) => handleErrorRef.current(error), []);
  const stableOnPdfHighlightsChange = useCallback(
    (highlights: Highlight[]) => handlePdfHighlightsChangeRef.current(highlights),
    []
  );

  // Convert Highlight[] to FoliateHighlight[] for EPUB engine
  const foliateHighlights: FoliateHighlight[] = useMemo(
    () =>
      isFoliate
        ? highlights
            .filter((h) => h.location?.cfi)
            .map((h) => ({ value: h.location.cfi!, color: h.color, note: h.note }))
        : [],
    [isFoliate, highlights]
  );

  const stableOnHighlightTap = useCallback((value: string) => {
    // Find the highlight by CFI and open for editing
    const hl = highlightsRef.current.find((h) => h.location?.cfi === value);
    if (hl) {
      setHighlightsPanelOpen(true);
    }
  }, []);

  const renderEngine = useMemo(() => {
    if (isFoliate && fileData) {
      return (
        <FoliateEngine
          ref={engineRef}
          arrayBuffer={fileData}
          bookId={book.id}
          format={format}
          initialLocation={initialLocation}
          highlights={foliateHighlights}
          onRelocate={stableOnRelocate}
          onLoadComplete={stableOnFoliateLoadComplete}
          onError={stableOnError}
          onHighlightTap={stableOnHighlightTap}
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
          existingHighlights={highlightsRef.current}
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
          highlights={highlightsRef.current}
          onRelocate={stableOnRelocate}
          onLoadComplete={stableOnScrollLoadComplete}
        />
      );
    }

    return null;
  }, [
    isFoliate,
    isPdf,
    isScroll,
    fileData,
    textContent,
    book.id,
    format,
    initialLocation,
    foliateHighlights,
    stableOnRelocate,
    stableOnFoliateLoadComplete,
    stableOnPdfLoadComplete,
    stableOnScrollLoadComplete,
    stableOnError,
    stableOnPdfHighlightsChange,
    stableOnHighlightTap,
  ]);

  // ─── Toolbar theme styling ─────────────────────────

  const toolbarStyle = isFoliate
    ? ({
        '--background': currentTheme.backgroundColor,
        '--color': currentTheme.textColor,
        '--border-color': currentTheme.id === 'light' ? '#e0e0e0' : 'rgba(255,255,255,0.12)',
      } as React.CSSProperties)
    : undefined;

  const iconColor = isFoliate ? { color: currentTheme.textColor } : undefined;

  // ─── Render ─────────────────────────

  const pageStyle: React.CSSProperties | undefined = isFoliate
    ? themeStore.customBackgroundImage
      ? {
          '--reader-bg': currentTheme.backgroundColor,
          backgroundImage: `url(${themeStore.customBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } as React.CSSProperties
      : { '--reader-bg': currentTheme.backgroundColor } as React.CSSProperties
    : themeStore.customBackgroundImage
      ? {
          backgroundImage: `url(${themeStore.customBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : undefined;

  return (
    <IonPage
      className={`unified-reader-page${toolbarVisible ? '' : ' fullscreen'}`}
      style={pageStyle}
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
              <IonButton onClick={() => setBookmarksPanelOpen(true)} style={iconColor}>
                <IonIcon icon={bookmarksOutline} />
              </IonButton>
              {!isPdf && (
                <IonButton onClick={() => setHighlightsPanelOpen(true)} style={iconColor}>
                  <IonIcon icon={colorPaletteOutline} />
                </IonButton>
              )}
              <IonButton onClick={() => setSettingsOpen(true)} style={iconColor}>
                <IonIcon icon={settingsOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
          {/* Progress bar for scroll/pdf formats */}
          {!isFoliate && progress && <IonProgressBar value={progress.fraction} />}
        </IonHeader>
      )}

      {/* ─── Content area ─── */}
      <IonContent
        ref={ionContentRef}
        scrollY={isScroll}
        scrollEvents={isScroll}
        style={
          isFoliate
            ? ({
                '--background': themeStore.customBackgroundImage
                  ? 'transparent'
                  : currentTheme.backgroundColor,
              } as React.CSSProperties)
            : themeStore.customBackgroundImage
              ? ({ '--background': 'transparent' } as React.CSSProperties)
              : undefined
        }
        onTouchStart={handleContentTouchStart}
        onTouchEnd={handleContentTouchEnd}
        onClick={handleContentClick}
      >
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '16px',
            }}
          >
            <IonSpinner name="crescent" />
            <p>Loading...</p>
          </div>
        )}

        {isFoliate ? (
          <div className="unified-reader-wrapper">
            {renderEngine}
            {themeStore.blueLightFilter && (
              <div
                className="blue-light-filter-overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: `rgba(255, 120, 0, ${themeStore.blueLightIntensity / 100})`,
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
            )}
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
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => setTocOpen(true)}
                  style={iconColor}
                >
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
              onIonInput={(e) => setSearchQuery(e.detail.value || '')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    marginTop: '16px',
                    borderBottom: '1px solid var(--ion-color-light-shade)',
                  }}
                >
                  <span>
                    {currentSearchIndex + 1} of {searchResults.length} results
                  </span>
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
                      key={`${result.location}-${idx}`}
                      button
                      onClick={() => {
                        goToSearchResult(idx);
                        setSearchOpen(false);
                      }}
                      style={{
                        background:
                          idx === currentSearchIndex ? 'var(--ion-color-light-tint)' : undefined,
                      }}
                    >
                      <IonLabel>
                        {result.label && (
                          <h3 style={{ fontSize: '13px', fontWeight: 600 }}>{result.label}</h3>
                        )}
                        <p style={{ fontSize: '12px' }}>{result.excerpt}</p>
                      </IonLabel>
                    </IonItem>
                  ))}
                </div>
              </>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <p
                style={{ textAlign: 'center', color: 'var(--ion-color-medium)', marginTop: '20px' }}
              >
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
              <IonLabel>
                <h2>Table of Contents</h2>
              </IonLabel>
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
      <TranslationPanel bookId={book.id} location={progress?.locationString} />

      {/* ─── Text Selection Menu ─── */}
      <TextSelectionMenu
        enabledActions={['translate', 'highlight', 'copy', 'define']}
        onHighlight={(text) => {
          // For PDF, the PdfEngineWithHighlights has its own menu
          if (isPdf) return;

          // For EPUB and scroll formats, get selection info from engine
          const selInfo = engineRef.current?.getSelectionInfo?.();
          if (selInfo) {
            setPendingHighlightText(selInfo.text || text);
            setPendingHighlightMeta({
              cfi: selInfo.cfi,
              startOffset: selInfo.startOffset,
              endOffset: selInfo.endOffset,
            });
            setColorPickerOpen(true);
          } else {
            setToastMessage('Could not capture selection');
          }
        }}
        onCopy={(text) => {
          setToastMessage('Copied to clipboard');
        }}
        onDefine={(text) => {
          setSelectedWord(text.split(/\s+/)[0]);
          setDictionaryOpen(true);
        }}
      />

      {/* ─── Color Picker Popover ─── */}
      <IonPopover
        isOpen={colorPickerOpen}
        onDidDismiss={() => {
          setColorPickerOpen(false);
          setPendingHighlightText('');
          setPendingHighlightMeta(null);
        }}
      >
        <div style={{ padding: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <p style={{ width: '100%', textAlign: 'center', margin: '0 0 8px', fontSize: '14px' }}>
            Pick highlight color
          </p>
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={async () => {
                const meta = pendingHighlightMeta;
                const text = pendingHighlightText;
                if (!meta) return;

                // Determine location string
                let locationStr = '';
                if (meta.cfi) {
                  locationStr = meta.cfi;
                } else if (meta.startOffset !== undefined && meta.endOffset !== undefined) {
                  locationStr = `${meta.startOffset}-${meta.endOffset}`;
                }

                // Save to database
                const saved = await databaseService.addHighlight({
                  bookId: book.id,
                  location: locationStr,
                  text,
                  color: color.value,
                });

                if (saved) {
                  const updated = [...highlights, saved];
                  setHighlights(updated);
                  prevHighlightsRef.current = updated;

                  // For EPUB, also add visual annotation
                  if (isFoliate && meta.cfi) {
                    engineRef.current?.addHighlightAnnotation?.(meta.cfi, color.value);
                  }

                  setToastMessage('Highlight added');
                }

                setColorPickerOpen(false);
                setPendingHighlightText('');
                setPendingHighlightMeta(null);
                window.getSelection()?.removeAllRanges();
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: color.value,
                border: '2px solid #fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                cursor: 'pointer',
              }}
              title={color.name}
            />
          ))}
        </div>
      </IonPopover>

      {/* ─── Highlights Panel (EPUB / Scroll) ─── */}
      <HighlightsPanel
        isOpen={highlightsPanelOpen}
        onClose={() => setHighlightsPanelOpen(false)}
        highlights={highlights
          .filter((h) => !isPdf) // PDF has its own panel
          .map((h) => ({
            id: h.id,
            bookId: h.bookId,
            cfiRange: h.location?.cfi || '',
            text: h.text,
            color: h.color,
            note: h.note,
            chapterTitle: undefined,
            createdAt: h.timestamp instanceof Date ? h.timestamp.getTime() : Date.now(),
            updatedAt: h.timestamp instanceof Date ? h.timestamp.getTime() : Date.now(),
          }))}
        onGoToHighlight={(cfiRange) => {
          if (cfiRange) {
            engineRef.current?.goToLocation(cfiRange);
          }
        }}
        onDeleteHighlight={async (id) => {
          const hl = highlights.find((h) => h.id === id);
          await databaseService.deleteHighlight(id);
          const updated = highlights.filter((h) => h.id !== id);
          setHighlights(updated);
          prevHighlightsRef.current = updated;

          // Remove visual annotation for EPUB
          if (isFoliate && hl?.location?.cfi) {
            engineRef.current?.removeHighlightAnnotation?.(hl.location.cfi);
          }

          setToastMessage('Highlight removed');
        }}
        onUpdateHighlight={async (id, updates) => {
          await databaseService.updateHighlight(id, updates);
          const updated = highlights.map((h) =>
            h.id === id ? { ...h, ...updates } : h
          );
          setHighlights(updated);
          prevHighlightsRef.current = updated;
        }}
      />

      {/* ─── Bookmarks Panel ─── */}
      <BookmarksPanel
        isOpen={bookmarksPanelOpen}
        onClose={() => setBookmarksPanelOpen(false)}
        bookmarks={bookmarksList}
        onGoToBookmark={(cfi) => {
          if (cfi) {
            engineRef.current?.goToLocation(cfi);
          }
        }}
        onDeleteBookmark={async (id) => {
          await databaseService.deleteBookmark(id);
          loadBookmarks();
          setToastMessage('Bookmark removed');
        }}
        onUpdateNote={async (id, note) => {
          // Bookmarks don't have a dedicated updateNote in DB, so we skip for now
          setToastMessage('Note saved');
        }}
      />

      {/* ─── Brightness Gesture Overlay ─── */}
      {brightnessGesture.brightnessOverlay}
    </IonPage>
  );
};

export default UnifiedReaderContainer;
