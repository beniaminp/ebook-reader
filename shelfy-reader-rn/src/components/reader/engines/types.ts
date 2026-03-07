export interface ReaderLocation {
  cfi?: string;
  page?: number;
  fraction?: number;
  chapterHref?: string;
  chapterLabel?: string;
}

export interface ReaderProgress {
  current: number;
  total: number;
  fraction: number;
  location?: string;
  chapterProgress?: number;
  timeLeftInChapter?: number;
  timeLeftInBook?: number;
}

export interface Chapter {
  label: string;
  href: string;
  subitems?: Chapter[];
}

export interface SearchResult {
  cfi?: string;
  page?: number;
  excerpt: string;
  chapterLabel?: string;
}

export interface ReaderEngineRef {
  // Navigation
  goToNext(): void;
  goToPrev(): void;
  goToLocation(location: string): void;
  goToChapter(href: string): void;
  goToPage(page: number): void;

  // State
  getCurrentLocation(): ReaderLocation | null;
  getProgress(): ReaderProgress | null;
  getTOC(): Chapter[];
  getTotalPages(): number;

  // Search
  search(query: string): Promise<SearchResult[]>;
  clearSearch(): void;

  // Highlights
  addHighlight(cfi: string, color: string, id: string): void;
  removeHighlight(id: string): void;

  // Settings
  applyTheme(theme: ReaderTheme): void;
  setFontSize(size: number): void;
  setFontFamily(family: string): void;
  setLineHeight(height: number): void;
}

export interface ReaderTheme {
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  marginSize: number;
}

export interface ReaderEngineProps {
  bookData: ArrayBuffer;
  format: string;
  initialLocation?: string;
  highlights?: Array<{ id: string; cfi: string; color: string }>;
  readerTheme: ReaderTheme;
  onLocationChange?: (location: string) => void;
  onSelectionChange?: (selection: {
    text: string;
    cfi: string;
    rect: { x: number; y: number; width: number; height: number };
  }) => void;
  onTocLoaded?: (toc: Chapter[]) => void;
  onProgressChange?: (progress: ReaderProgress) => void;
  onTap?: (zone: 'left' | 'center' | 'right') => void;
}

export type BridgeMessage =
  | { type: 'ready' }
  | { type: 'locationChanged'; location: string; progress: ReaderProgress }
  | { type: 'tocLoaded'; toc: Chapter[] }
  | { type: 'selection'; text: string; cfi: string; rect: { x: number; y: number; width: number; height: number } }
  | { type: 'selectionCleared' }
  | { type: 'tap'; zone: 'left' | 'center' | 'right' }
  | { type: 'searchResults'; results: SearchResult[] }
  | { type: 'chapterChanged'; label: string; href: string }
  | { type: 'error'; message: string }
  | { type: 'log'; message: string };

export type BridgeCommand =
  | { type: 'loadBook'; data: string; format: string }
  | { type: 'goToNext' }
  | { type: 'goToPrev' }
  | { type: 'goToLocation'; location: string }
  | { type: 'goToChapter'; href: string }
  | { type: 'search'; query: string }
  | { type: 'clearSearch' }
  | { type: 'addHighlight'; cfi: string; color: string; id: string }
  | { type: 'removeHighlight'; id: string }
  | { type: 'applyTheme'; theme: ReaderTheme }
  | { type: 'setFontSize'; size: number }
  | { type: 'setFontFamily'; family: string }
  | { type: 'setLineHeight'; height: number };
