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
  | 'fb2'
  | 'cbz'
  | 'txt'
  | 'html'
  | 'htm'
  | 'md'
  | 'markdown';

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
}

/**
 * Common ref interface that all format engines expose via useImperativeHandle.
 * The UnifiedReaderContainer calls these methods to drive navigation, search, etc.
 */
export interface ReaderEngineRef {
  next(): void;
  prev(): void;
  /** Navigate to a format-specific location (CFI, page number string, scroll %). */
  goToLocation(location: string): void;
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
}
