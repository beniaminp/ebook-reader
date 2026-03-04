/**
 * Shared reader types for the unified reader architecture.
 *
 * All format-specific engines (FoliateEngine, PdfEngine, ScrollEngine)
 * implement the ReaderEngineRef interface so the UnifiedReaderContainer
 * can control them uniformly.
 */

/** A chapter / TOC entry common to all formats. */
export interface Chapter {
  id: string;
  label: string;
  href: string;
  subitems?: Chapter[];
}

/** A single search hit returned by any engine. */
export interface SearchResult {
  /** Format-specific location string (CFI for epub, page number for pdf, char index for scroll). */
  location: string;
  /** Text excerpt around the match. */
  excerpt: string;
  /** Human-readable label (chapter name, page number, etc.). */
  label: string;
}

/** The set of formats the unified reader can open. */
export type ReaderFormat =
  | 'epub'
  | 'pdf'
  | 'mobi'
  | 'azw3'
  | 'fb2'
  | 'cbz'
  | 'cbr'
  | 'txt'
  | 'html'
  | 'htm'
  | 'md'
  | 'markdown'
  | 'docx'
  | 'odt';

/** Progress info returned by engines. */
export interface ReaderProgress {
  /** Current page/section number (1-based). */
  current: number;
  /** Total pages/sections. */
  total: number;
  /** 0-1 fraction through the book. */
  fraction: number;
  /** Human-readable label, e.g. "Page 5 of 100" or "42%". */
  label: string;
  /** Format-specific location string for persistence. */
  locationString?: string;
  /** Section/chapter progress (from foliate-js). */
  section?: {
    /** Current section index (0-based). */
    current: number;
    /** Total sections in the book. */
    total: number;
  };
  /** Current TOC chapter label (from foliate-js). */
  chapterLabel?: string;
  /** Estimated remaining time (seconds) from foliate-js. */
  timeInSection?: number;
  /** Estimated total remaining time (seconds) from foliate-js. */
  timeInBook?: number;
}

/**
 * Common ref interface that all format engines expose via useImperativeHandle.
 * The UnifiedReaderContainer calls these methods to drive navigation, search, etc.
 */
export interface ReaderEngineRef {
  next(): void | Promise<void>;
  prev(): void | Promise<void>;
  /** Navigate to a format-specific location (CFI, page number string, scroll %). */
  goToLocation(location: string): void;
  /** Navigate to a fractional position (0-1) through the book. */
  goToFraction?(fraction: number): void;
  /** Full-text search; returns matches. */
  search(query: string): Promise<SearchResult[]>;
  /** Get current reading progress. */
  getProgress(): ReaderProgress;
  /** Get table-of-contents chapters (if available). */
  getChapters(): Chapter[];
  /** Jump to a TOC chapter by index. */
  goToChapter(index: number): void;
  /** Apply a theme (background + text color). */
  setTheme?(theme: { backgroundColor: string; textColor: string }): void;
  /** Set font size in px. */
  setFontSize?(size: number): void;
  /** Set font family CSS value. */
  setFontFamily?(family: string): void;
  /** Set line-height multiplier. */
  setLineHeight?(height: number): void;
  /** Set text alignment for content. */
  setTextAlign?(align: string): void;
  /** Set margin/padding size. */
  setMarginSize?(size: string): void;
  /** Set custom per-side margins in px. */
  setCustomMargins?(margins: { top: number; bottom: number; left: number; right: number }): void;
  /** Set custom background image (or undefined to clear). */
  setCustomBackgroundImage?(imageUri: string | undefined): void;
  /** Enable/disable CSS hyphenation. */
  setHyphenation?(enabled: boolean): void;
  /** Set paragraph spacing multiplier (em units). */
  setParagraphSpacing?(spacing: number): void;
  /** Set letter spacing (em units). */
  setLetterSpacing?(spacing: number): void;
  /** Enable/disable bionic reading mode. */
  setBionicReading?(enabled: boolean): void;
  /** Enable/disable interlinear translation mode. */
  setInterlinearMode?(enabled: boolean, targetLanguage: string): void;
  /** Enable/disable Word Wise mode with difficulty level and optional target language. */
  setWordWise?(enabled: boolean, level: number, targetLang?: string): void;
  /** Get current text selection info (CFI + text for EPUB, offsets for scroll). */
  getSelectionInfo?(): { cfi?: string; text: string; startOffset?: number; endOffset?: number } | null;
  /** Add a visual highlight annotation (EPUB). */
  addHighlightAnnotation?(cfi: string, color: string): void;
  /** Remove a visual highlight annotation (EPUB). */
  removeHighlightAnnotation?(cfi: string): void;
  /** Get the visible text content for TTS. Returns the text of the current page/section. */
  getVisibleText?(): string;
  /** Get the iframe document(s) for the currently visible content (EPUB). */
  getContentDocuments?(): Document[];
  /**
   * Get a Range representing the currently visible text in the document.
   * For paginated EPUB, this is the text in the current CSS column.
   * Used by TTS highlighter to narrow word search to visible content.
   */
  getVisibleRange?(): Range | null;
}
