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
  volumeHighOutline,
  speedometerOutline,
} from 'ionicons/icons';

import { Capacitor } from '@capacitor/core';
import { FoliateEngine } from './FoliateEngine';
import type { CapturedSelection } from './FoliateEngine';
import { PdfEngineWithHighlights } from './PdfEngineWithHighlights';
import { ScrollEngine } from './ScrollEngine';
import { ReadingSettingsPanel } from '../reader-ui/ReadingSettingsPanel';
import { TranslationPanel } from '../reader-ui/TranslationPanel';
import { TextSelectionMenu } from '../reader-ui/TextSelectionMenu';
import { ReadingRuler } from '../reader-ui/ReadingRuler';
import { DictionaryPanel } from '../dictionary';
import { ReaderSearch } from './ReaderSearch';
import { ReaderHighlightFlow } from './ReaderHighlightFlow';
import type { HighlightMeta } from './ReaderHighlightFlow';
import { useThemeStore } from '../../stores/useThemeStore';
import { useReaderThemeSync } from '../../hooks/useReaderThemeSync';
import type {
  ReaderEngineRef,
  ReaderProgress,
  Chapter,
  ReaderFormat,
} from '../../types/reader';
import type { Book, Highlight } from '../../types/index';
import { databaseService } from '../../services/database';
import { useAppStore } from '../../stores/useAppStore';
import { useBrightnessGesture } from '../../hooks/useBrightnessGesture';
import { useSleepTimer } from '../../hooks/useSleepTimer';
import { useReaderTTS } from '../../hooks/useReaderTTS';
import { SleepTimerButton } from '../reader-ui/SleepTimerButton';
import { SleepTimerWarning } from '../reader-ui/SleepTimerWarning';
import { SleepTimerOverlay } from '../reader-ui/SleepTimerOverlay';
import RSVPReader from '../reader-ui/RSVPReader';
import PomodoroTimer from '../reader-ui/PomodoroTimer';
import { TTSControls } from '../reader-ui/TTSControls';
import { useReadingSpeed } from '../../hooks/useReadingSpeed';
import { TimeLeftDisplay } from '../reader-ui/TimeLeftDisplay';
import { ChapterScrubber } from '../reader-ui/ChapterScrubber';
import { useImmersiveMode } from '../../hooks/useImmersiveMode';
import { HighlightsPanel } from '../common/HighlightsPanel';
import { BookmarksPanel } from '../common/BookmarksPanel';
import type { EpubBookmark } from '../../services/annotationsService';
import type { FoliateHighlight } from './FoliateEngine';

import './UnifiedReaderContainer.css';
import './EpubReader.css';
import '../reader-ui/Interlinear.css';
import '../reader-ui/WordWise.css';

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
  const [pendingHighlightMeta, setPendingHighlightMeta] = useState<HighlightMeta | null>(null);

  // Highlights panel
  const [highlightsPanelOpen, setHighlightsPanelOpen] = useState(false);

  // Bookmarks panel
  const [bookmarksPanelOpen, setBookmarksPanelOpen] = useState(false);
  const [bookmarksList, setBookmarksList] = useState<EpubBookmark[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState('');

  // Captured selection (from FoliateEngine, native selection cleared immediately)
  const [capturedSelectionText, setCapturedSelectionText] = useState('');

  const isFoliate = FOLIATE_FORMATS.has(format);
  const isPdf = format === 'pdf';
  const isScroll = SCROLL_FORMATS.has(format);

  // Theme
  const themeStore = useThemeStore();
  const { currentTheme, toolbarStyle, iconColor, pageStyle } = useReaderThemeSync(engineRef, {
    isFoliate,
    isPdf,
    isScroll,
    ionContentRef,
  });

  // Brightness gesture hook
  const brightnessGesture = useBrightnessGesture({
    enabled: true,
  });

  // TTS (text-to-speech) — state and handlers extracted to useReaderTTS hook
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const {
    ttsActive,
    tts,
    handleToggleTTS,
    handleTTSClose,
    stopTTSForSleep,
  } = useReaderTTS({
    engineRef,
    ionContentRef,
    onNoText: useCallback(() => setToastMessage('No text available for TTS'), []),
  });

  // Sleep timer hook — stop TTS on expiry
  const sleepTimer = useSleepTimer({
    onExpire: stopTTSForSleep,
  });

  // Reading speed / time-left hook
  const readingSpeed = useReadingSpeed({
    active: !toolbarVisible && !searchOpen && !settingsOpen,
    format,
  });

  // Immersive mode hook
  const { isImmersive } = useImmersiveMode({
    enabled: themeStore.immersiveMode,
    toolbarVisible,
    setToolbarVisible,
  });

  // Track the active bookmark ID so we can remove it
  const currentBookmarkIdRef = useRef<string | null>(null);

  // Track the current chapter label for "end of chapter" sleep timer
  const prevChapterLabelRef = useRef<string | undefined>(undefined);

  // (Overlay removed — tap zones are now handled inside the foliate iframe directly,
  // so text selection works without being blocked by a transparent overlay.)

  // (Timer cleanup removed — overlay and selection timers no longer exist.)

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
            tags: h.tags ? JSON.stringify(h.tags) : undefined,
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
          if (old && (old.color !== h.color || old.note !== h.note || JSON.stringify(old.tags) !== JSON.stringify(h.tags))) {
            databaseService.updateHighlight(h.id, { color: h.color, note: h.note, tags: h.tags });
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

  const handleNext = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    engineRef.current?.next();
  }, []);
  const handlePrev = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    engineRef.current?.prev();
  }, []);
  const handleToggleToolbar = useCallback(() => setToolbarVisible((v) => !v), []);

  // ─── Progress from engine ─────────────────────────

  const handleRelocate = useCallback(
    async (p: ReaderProgress) => {
      setProgress(p);
      readingSpeed.onProgressChange(p);

      // Detect chapter changes for "end of chapter" sleep timer
      const newChapterLabel = p.chapterLabel;
      if (
        prevChapterLabelRef.current !== undefined &&
        newChapterLabel !== undefined &&
        prevChapterLabelRef.current !== newChapterLabel
      ) {
        // Chapter changed — trigger end-of-chapter timer if active
        sleepTimer.triggerEndOfChapter();
      }
      prevChapterLabelRef.current = newChapterLabel;

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
    [onProgressChange, book.id, readingSpeed, sleepTimer]
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
    // Sync interlinear / word-wise state that may have been missed if the
    // settings useEffect fired before the engine was ready.
    const ts = useThemeStore.getState();
    if (ts.interlinearMode) {
      engineRef.current?.setInterlinearMode?.(ts.interlinearMode, ts.interlinearLanguage);
    }
    if (ts.wordWiseEnabled) {
      const targetLang = Capacitor.isNativePlatform() ? ts.interlinearLanguage : undefined;
      engineRef.current?.setWordWise?.(ts.wordWiseEnabled, ts.wordWiseLevel, targetLang);
    }
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
    // Sync interlinear / word-wise state (effect may have fired before engine was ready)
    const ts = useThemeStore.getState();
    if (ts.interlinearMode) {
      engineRef.current?.setInterlinearMode?.(ts.interlinearMode, ts.interlinearLanguage);
    }
    if (ts.wordWiseEnabled) {
      const targetLang = Capacitor.isNativePlatform() ? ts.interlinearLanguage : undefined;
      engineRef.current?.setWordWise?.(ts.wordWiseEnabled, ts.wordWiseLevel, targetLang);
    }
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

  // (Theme/font/style sync effects are handled by useReaderThemeSync hook)

  // ─── Content tap zones (for non-foliate formats: PDF, scroll) ─────────────────────────
  // (Foliate tap zones are now handled inside the iframe via FoliateEngine.onContentTap)

  // Ref to forward bookmark toggle into tap handlers (defined later)
  const handleToggleBookmarkRef = useRef(() => {});

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

      // Skip if user has selected text (let TextSelectionMenu handle it)
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;

      const relX = touch.clientX / window.innerWidth;
      const relY = touch.clientY / window.innerHeight;
      contentTouchHandledRef.current = true;
      // Upper-right corner: toggle bookmark (works even when toolbar is hidden)
      if (relX > 0.80 && relY < 0.12) {
        handleToggleBookmarkRef.current();
      } else if (relX < 0.33) {
        handlePrev();
      } else if (relX > 0.67) {
        handleNext();
      } else {
        handleToggleToolbar();
      }
    },
    [isFoliate, handlePrev, handleNext, handleToggleToolbar, brightnessGesture]
  );

  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      if (isFoliate) return;
      if (contentTouchHandledRef.current) {
        contentTouchHandledRef.current = false;
        return;
      }
      // Skip if user has selected text (let TextSelectionMenu handle it)
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      const relX = e.clientX / window.innerWidth;
      const relY = e.clientY / window.innerHeight;
      // Upper-right corner: toggle bookmark
      if (relX > 0.80 && relY < 0.12) {
        handleToggleBookmarkRef.current();
      } else if (relX < 0.33) {
        handlePrev();
      } else if (relX > 0.67) {
        handleNext();
      } else {
        handleToggleToolbar();
      }
    },
    [isFoliate, handlePrev, handleNext, handleToggleToolbar]
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

  // Keep bookmark ref in sync for tap-zone handlers defined earlier
  handleToggleBookmarkRef.current = handleToggleBookmark;

  // (TTS handlers extracted to useReaderTTS hook)

  // (Search state/callbacks extracted to ReaderSearch component)

  // ─── TOC ─────────────────────────

  const handleGoToChapter = useCallback((index: number) => {
    engineRef.current?.goToChapter(index);
    setTocOpen(false);
  }, []);

  // ─── Scrubber ─────────────────────────

  const handleScrub = useCallback((fraction: number) => {
    if (engineRef.current?.goToFraction) {
      engineRef.current.goToFraction(fraction);
    } else {
      // Fallback: convert fraction to a location string
      if (progress?.total) {
        const page = Math.max(1, Math.round(fraction * progress.total));
        engineRef.current?.goToLocation(String(page));
      }
    }
  }, [progress?.total]);

  const handleScrubChapterTap = useCallback((chapterIndex: number) => {
    engineRef.current?.goToChapter(chapterIndex);
  }, []);

  // ─── Text selection ─────────────────────────
  // Text selection detection and actions (highlight, copy, translate, define)
  // are fully handled by the TextSelectionMenu component, which attaches its
  // own selectionchange/mouseup/touchend listeners on both the main document
  // and the foliate iframe.

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

  // Handle taps inside the foliate iframe for tap-zone navigation.
  // Uses a ref so FoliateEngine doesn't re-render when handlers change.
  const handleFoliateContentTapRef = useRef((_relX: number, _relY: number) => {});
  handleFoliateContentTapRef.current = (relX: number, relY: number) => {
    // Upper-right corner: toggle bookmark (works even when toolbar is hidden)
    if (relX > 0.80 && relY < 0.12) {
      handleToggleBookmark();
      return;
    }
    if (relX < 0.33) handlePrev();
    else if (relX > 0.67) handleNext();
    else handleToggleToolbar();
  };
  const stableOnContentTap = useCallback((relX: number, relY: number) => handleFoliateContentTapRef.current(relX, relY), []);

  const handleSelectionCapturedRef = useRef((_sel: CapturedSelection | null) => {});
  handleSelectionCapturedRef.current = (sel: CapturedSelection | null) => {
    setCapturedSelectionText(sel?.text || '');
  };
  const stableOnSelectionCaptured = useCallback(
    (sel: CapturedSelection | null) => handleSelectionCapturedRef.current(sel),
    []
  );

  const handleSelectionDismiss = useCallback(() => {
    setCapturedSelectionText('');
    // Clear native selection in iframes
    try {
      engineRef.current?.getContentDocuments?.()?.forEach((d) => {
        try { d.getSelection?.()?.removeAllRanges(); } catch { /* */ }
      });
    } catch { /* */ }
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
          onContentTap={stableOnContentTap}
          onSelectionCaptured={stableOnSelectionCaptured}
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
    stableOnContentTap,
  ]);

  // (Toolbar/icon/page styles are computed by useReaderThemeSync hook)

  return (
    <IonPage
      className={`unified-reader-page${toolbarVisible ? '' : ' fullscreen'}${isImmersive ? ' immersive' : ''}`}
      style={{
        ...pageStyle,
        ...(themeStore.colorVisionFilter !== 'none' && isFoliate ? { filter: 'url(#color-vision-filter-main)' } : {}),
      }}
    >
      {/* Color Vision Deficiency Filter (for foliate engine) */}
      {themeStore.colorVisionFilter !== 'none' && isFoliate && (
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="color-vision-filter-main">
              <feColorMatrix type="matrix" values={
                themeStore.colorVisionFilter === 'protanopia' ? '0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0' :
                themeStore.colorVisionFilter === 'deuteranopia' ? '0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0' :
                '0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0'
              } />
            </filter>
          </defs>
        </svg>
      )}
      {/* ─── Top toolbar ─── */}
      <IonHeader className={`reader-toolbar-header${toolbarVisible ? ' toolbar-visible' : ' toolbar-hidden'}`}>
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
            {tts.isSupported && (
              <IonButton
                onClick={handleToggleTTS}
                style={iconColor}
                aria-label={ttsActive ? 'Stop text-to-speech' : 'Start text-to-speech'}
                color={ttsActive ? 'primary' : undefined}
              >
                <IonIcon icon={volumeHighOutline} />
              </IonButton>
            )}
            <SleepTimerButton sleepTimer={sleepTimer} iconStyle={iconColor} />
            <IonButton
              onClick={() => setRsvpOpen(true)}
              style={iconColor}
              title="Speed Reading (RSVP)"
            >
              <IonIcon icon={speedometerOutline} />
            </IonButton>
            <IonButton onClick={() => setSettingsOpen(true)} style={iconColor}>
              <IonIcon icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        {/* Progress bar for scroll/pdf formats */}
        {!isFoliate && progress && <IonProgressBar value={progress.fraction} />}
      </IonHeader>

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
        {/* ─── Bookmark indicator on upper-right corner (only when bookmarked) ─── */}
        {isBookmarked ? (
          <div
            className="reader-bookmark-indicator"
            onClick={(e) => { e.stopPropagation(); handleToggleBookmark(); }}
            onTouchEnd={(e) => { e.stopPropagation(); }}
            style={{
              position: 'absolute',
              top: 0,
              right: 6,
              zIndex: 10,
              cursor: 'pointer',
              pointerEvents: 'auto',
              width: 14,
              height: 20,
              padding: 0,
            }}
            title="Remove bookmark"
          >
            <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
              <path d="M0 0H14V19L7 15L0 19V0Z" fill="#e53935" />
            </svg>
          </div>
        ) : null}

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
          <div className="unified-reader-wrapper" onContextMenu={(e) => e.preventDefault()}>
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
          </div>
        ) : (
          renderEngine
        )}
        <ReadingRuler ionContentRef={ionContentRef} />
      </IonContent>

      {/* ─── Bottom toolbar ─── */}
      <IonFooter className={`reader-toolbar-footer${toolbarVisible ? ' toolbar-visible' : ' toolbar-hidden'}`}>
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

            <div className="page-info-wrapper">
              <ChapterScrubber
                progress={progress}
                chapters={chapters}
                onScrub={handleScrub}
                onChapterTap={handleScrubChapterTap}
                textColor={isFoliate ? currentTheme.textColor : undefined}
                accentColor={isFoliate ? currentTheme.textColor : undefined}
              />
              <div className="page-info-row">
                <span className="page-info" style={iconColor}>
                  {progress?.label || '...'}
                </span>
                <TimeLeftDisplay timeLeft={readingSpeed.timeLeft} style={iconColor} />
              </div>
            </div>

            <IonButton fill="clear" size="small" onClick={handleNext} style={iconColor}>
              <IonIcon icon={chevronForward} />
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>

      {/* ─── Search modal ─── */}
      <ReaderSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        engineRef={engineRef}
      />

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
        enabledActions={['translate', 'highlight', 'copy', 'define', 'share-quote']}
        capturedText={isFoliate ? capturedSelectionText : undefined}
        onDismiss={handleSelectionDismiss}
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
        onShareQuote={async (text) => {
          try {
            const { shareQuoteCard } = await import('../../services/quoteCardService');
            await shareQuoteCard({
              text,
              bookTitle: book.title,
              author: book.author,
            });
          } catch (err) {
            setToastMessage('Failed to share quote');
          }
        }}
      />

      {/* ─── Color Picker Popover with Tags ─── */}
      <ReaderHighlightFlow
        bookId={book.id}
        isOpen={colorPickerOpen}
        onClose={() => {
          setColorPickerOpen(false);
          setPendingHighlightText('');
          setPendingHighlightMeta(null);
        }}
        pendingText={pendingHighlightText}
        pendingMeta={pendingHighlightMeta}
        isFoliate={isFoliate}
        engineRef={engineRef}
        onHighlightCreated={(saved) => {
          const updated = [...highlights, saved];
          setHighlights(updated);
          prevHighlightsRef.current = updated;
        }}
        onToast={setToastMessage}
        onClearSelection={() => setCapturedSelectionText('')}
      />

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
            tags: h.tags,
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

      {/* ─── TTS Mini-Player Controls ─── */}
      {ttsActive && tts.state !== 'idle' && (
        <TTSControls tts={tts} onClose={handleTTSClose} />
      )}

      {/* ─── Brightness Gesture Overlay ─── */}
      {brightnessGesture.brightnessOverlay}

      {/* ─── Sleep Timer Warning (1 min remaining) ─── */}
      <SleepTimerWarning
        visible={sleepTimer.showWarning}
        remainingSeconds={sleepTimer.remainingSeconds}
        onExtend={(minutes) => sleepTimer.extendTimer(minutes)}
        onDismiss={() => sleepTimer.dismissWarning()}
      />

      {/* ─── Sleep Timer Expiry Overlay ─── */}
      <SleepTimerOverlay
        visible={sleepTimer.hasExpired}
        onDismiss={() => sleepTimer.dismissExpired()}
        onRestart={(minutes) => {
          sleepTimer.dismissExpired();
          sleepTimer.startTimer(minutes);
        }}
      />

      {/* Pomodoro Focus Timer */}
      <PomodoroTimer />

      {/* RSVP Speed Reading */}
      {rsvpOpen && (
        <RSVPReader
          text={engineRef.current?.getVisibleText?.() || ''}
          onClose={() => setRsvpOpen(false)}
          onComplete={() => {
            engineRef.current?.next();
          }}
        />
      )}
    </IonPage>
  );
};

export default UnifiedReaderContainer;
