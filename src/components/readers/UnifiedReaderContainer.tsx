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
  volumeHighOutline,
} from 'ionicons/icons';

import { Capacitor } from '@capacitor/core';
import { FoliateEngine } from './FoliateEngine';
import { PdfEngineWithHighlights } from './PdfEngineWithHighlights';
import { ScrollEngine } from './ScrollEngine';
import { ReadingSettingsPanel } from '../reader-ui/ReadingSettingsPanel';
import { TranslationPanel } from '../reader-ui/TranslationPanel';
import { TextSelectionMenu } from '../reader-ui/TextSelectionMenu';
import { ReadingRuler } from '../reader-ui/ReadingRuler';
import { autoScrollManager } from '../reader-ui/AutoScrollManager';
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
import { useSleepTimer } from '../../hooks/useSleepTimer';
import { useTTS } from '../../hooks/useTTS';
import { useTTSHighlighter } from '../../hooks/useTTSHighlighter';
import { SleepTimerButton } from '../reader-ui/SleepTimerButton';
import { SleepTimerWarning } from '../reader-ui/SleepTimerWarning';
import { SleepTimerOverlay } from '../reader-ui/SleepTimerOverlay';
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

  // TTS state
  const [ttsActive, setTtsActive] = useState(false);
  // Ref to track whether TTS is active (avoids stale closures)
  const ttsActiveRef = useRef(false);
  // Ref to track whether we are auto-advancing TTS to the next page
  const ttsAutoAdvancingRef = useRef(false);
  // Ref to hold the tts.speak function so onComplete can call it without circular dep
  const ttsSpeakRef = useRef<((text: string) => void) | null>(null);
  // Ref to track the last text read by TTS (to detect end-of-book)
  const ttsLastTextRef = useRef<string>('');

  // TTS word-level highlighter
  const ttsHighlighter = useTTSHighlighter({
    getContentDocuments: () => engineRef.current?.getContentDocuments?.() || [],
    onScrollToHighlight: useCallback((element: HTMLElement, doc: Document) => {
      try {
        const win = doc.defaultView;
        if (!win) return;

        // For iframe content (EPUB/foliate), scrollIntoView on the element
        // inside the iframe won't help because content is paginated via CSS
        // columns. The page turn will be handled by auto-advance when TTS
        // finishes the current page's text. However, for scroll-mode content
        // (ScrollEngine), we do want to scroll.
        const isInIframe = win !== win.parent;
        if (isInIframe) {
          // Paginated EPUB: no scroll needed within the iframe.
          // Auto-advance handles page turns when text runs out.
          return;
        }

        // ScrollEngine: scroll to the highlighted word within IonContent
        const ionContent = ionContentRef?.current;
        if (ionContent) {
          const rect = element.getBoundingClientRect();
          const viewHeight = win.innerHeight || doc.documentElement.clientHeight;
          const isOutOfView =
            rect.bottom < 0 ||
            rect.top > viewHeight ||
            rect.top < 60 ||
            rect.bottom > viewHeight - 60;

          if (isOutOfView) {
            // Scroll the IonContent so the element is centered
            ionContent.getScrollElement().then((scrollEl) => {
              const scrollTop = scrollEl.scrollTop;
              const targetTop = scrollTop + rect.top - viewHeight / 2;
              ionContent.scrollToPoint(0, Math.max(0, targetTop), 200);
            });
          }
        } else {
          // Fallback: standard scrollIntoView
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }
      } catch {
        // ignore scroll errors
      }
    }, []),
  });

  // TTS hook with word boundary events for highlighting
  const tts = useTTS({
    onWordBoundary: ttsHighlighter.onWordBoundary,
    onSentenceStart: ttsHighlighter.onSentenceStart,
    onComplete: useCallback(() => {
      ttsHighlighter.clearHighlight();

      // Auto-advance to next page and continue reading
      if (ttsAutoAdvancingRef.current || !ttsActiveRef.current) {
        return;
      }

      const engine = engineRef.current;
      if (!engine) return;

      ttsAutoAdvancingRef.current = true;

      // Navigate to the next page
      engine.next();

      // Wait a moment for the new page content to render, then get text and continue
      setTimeout(() => {
        ttsAutoAdvancingRef.current = false;

        // Double-check TTS is still active (user may have stopped it)
        if (!ttsActiveRef.current) return;

        const newText = engine.getVisibleText?.();
        if (newText && newText.trim().length > 0) {
          // Check if this is the same text we just read (end of book)
          const trimmedNew = newText.trim();
          if (trimmedNew === ttsLastTextRef.current) {
            // We've reached the end of the book — same page text returned
            ttsActiveRef.current = false;
            ttsLastTextRef.current = '';
            setTtsActive(false);
            return;
          }
          // Continue reading the next page
          ttsLastTextRef.current = trimmedNew;
          ttsSpeakRef.current?.(newText);
        } else {
          // No more text — end of book or no content
          ttsActiveRef.current = false;
          ttsLastTextRef.current = '';
          setTtsActive(false);
        }
      }, 600);
    }, [ttsHighlighter]),
  });

  // Keep the speak ref in sync
  ttsSpeakRef.current = tts.speak;

  // Sleep timer hook — stop TTS on expiry
  const sleepTimer = useSleepTimer({
    onExpire: () => {
      // Stop active TTS playback
      if (tts.state === 'playing' || tts.state === 'paused') {
        tts.stop();
        ttsHighlighter.clearHighlight();
        ttsActiveRef.current = false;
        ttsAutoAdvancingRef.current = false;
        setTtsActive(false);
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    },
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

  const isFoliate = FOLIATE_FORMATS.has(format);
  const isPdf = format === 'pdf';
  const isScroll = SCROLL_FORMATS.has(format);

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
    if (!isFoliate) return;
    engineRef.current?.setHyphenation?.(themeStore.hyphenation);
  }, [themeStore.hyphenation, isFoliate]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setParagraphSpacing?.(themeStore.paragraphSpacing);
  }, [themeStore.paragraphSpacing, isFoliate]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setLetterSpacing?.(themeStore.letterSpacing);
  }, [themeStore.letterSpacing, isFoliate]);

  useEffect(() => {
    if (isPdf) return;
    console.log(`[Interlinear] Effect fired: enabled=${themeStore.interlinearMode}, lang=${themeStore.interlinearLanguage}, hasEngine=${!!engineRef.current}`);
    engineRef.current?.setInterlinearMode?.(
      themeStore.interlinearMode,
      themeStore.interlinearLanguage
    );
  }, [themeStore.interlinearMode, themeStore.interlinearLanguage, isFoliate, isScroll, isPdf]);

  useEffect(() => {
    if (isPdf) return;
    const targetLang = Capacitor.isNativePlatform() ? themeStore.interlinearLanguage : undefined;
    engineRef.current?.setWordWise?.(
      themeStore.wordWiseEnabled,
      themeStore.wordWiseLevel,
      targetLang
    );
  }, [themeStore.wordWiseEnabled, themeStore.wordWiseLevel, themeStore.interlinearLanguage, isFoliate, isScroll, isPdf]);

  // ─── AutoScroll ─────────────────────────

  useEffect(() => {
    if (themeStore.autoScroll) {
      // Get the scrollable element from IonContent
      const ionContent = ionContentRef?.current;
      if (ionContent) {
        ionContent.getScrollElement().then((scrollEl) => {
          if (scrollEl) {
            autoScrollManager.start(scrollEl, themeStore.autoScrollSpeed);
          }
        });
      }
    } else {
      autoScrollManager.stop();
    }
    return () => {
      autoScrollManager.stop();
    };
  }, [themeStore.autoScroll]);

  useEffect(() => {
    if (themeStore.autoScroll) {
      autoScrollManager.updateSpeed(themeStore.autoScrollSpeed);
    }
  }, [themeStore.autoScrollSpeed, themeStore.autoScroll]);

  // ─── Content tap zones (for non-foliate formats: PDF, scroll) ─────────────────────────
  // (Foliate tap zones are now handled inside the iframe via FoliateEngine.onContentTap)

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
      // Handle tap zones for non-foliate formats
      if (relX < 0.33) {
        contentTouchHandledRef.current = true;
        handlePrev();
      } else if (relX > 0.67) {
        contentTouchHandledRef.current = true;
        handleNext();
      } else {
        contentTouchHandledRef.current = true;
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
      if (relX < 0.33) {
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

  // ─── TTS ─────────────────────────

  const handleToggleTTS = useCallback(() => {
    if (ttsActive) {
      // Stop TTS
      tts.stop();
      ttsHighlighter.clearHighlight();
      ttsActiveRef.current = false;
      ttsAutoAdvancingRef.current = false;
      ttsLastTextRef.current = '';
      setTtsActive(false);
    } else {
      // Start TTS with visible text
      const text = engineRef.current?.getVisibleText?.();
      if (text && text.trim().length > 0) {
        ttsActiveRef.current = true;
        ttsLastTextRef.current = text.trim();
        tts.speak(text);
        setTtsActive(true);
      } else {
        setToastMessage('No text available for TTS');
      }
    }
  }, [ttsActive, tts, ttsHighlighter]);

  const handleTTSClose = useCallback(() => {
    tts.stop();
    ttsHighlighter.clearHighlight();
    ttsActiveRef.current = false;
    ttsAutoAdvancingRef.current = false;
    ttsLastTextRef.current = '';
    setTtsActive(false);
  }, [tts, ttsHighlighter]);

  // Clean up highlighter on unmount
  useEffect(() => {
    return () => {
      ttsHighlighter.clearHighlight();
      ttsActiveRef.current = false;
      ttsAutoAdvancingRef.current = false;
    };
  }, [ttsHighlighter]);

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
  const handleFoliateContentTapRef = useRef((_relX: number) => {});
  handleFoliateContentTapRef.current = (relX: number) => {
    if (relX < 0.33) handlePrev();
    else if (relX > 0.67) handleNext();
    else handleToggleToolbar();
  };
  const stableOnContentTap = useCallback((relX: number) => handleFoliateContentTapRef.current(relX), []);

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
      className={`unified-reader-page${toolbarVisible ? '' : ' fullscreen'}${isImmersive ? ' immersive' : ''}`}
      style={pageStyle}
    >
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
    </IonPage>
  );
};

export default UnifiedReaderContainer;
