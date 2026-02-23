/**
 * EPUB-related type definitions
 */

// EPUB CFI (Canonical Fragment Identifier) - location in EPUB
export type EpubCfi = string;

// EPUB Chapter information
export interface EpubChapter {
  id: string;
  label: string;
  href: string;
  subitems?: EpubChapter[];
}

// EPUB Metadata
export interface EpubMetadata {
  title: string;
  author?: string;
  description?: string;
  publisher?: string;
  language?: string;
  coverUrl?: string;
  totalPages?: number;
}

// EPUB Theme configuration
export interface EpubTheme {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

// Predefined EPUB themes
export const EPUB_THEMES: Record<string, EpubTheme> = {
  light: {
    id: 'light',
    name: 'Light',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    backgroundColor: '#1a1a1a',
    textColor: '#e0e0e0',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  sepia: {
    id: 'sepia',
    name: 'Sepia',
    backgroundColor: '#f4ecd8',
    textColor: '#5b4636',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  eyeComfort: {
    id: 'eyeComfort',
    name: 'Eye Comfort',
    backgroundColor: '#0d3b3b',
    textColor: '#c8e0e0',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
};

// Book data for reader
export interface BookDataForReader {
  book: {
    id: string;
    title: string;
    author: string;
    format: string;
  };
  fileUri?: string;
  arrayBuffer?: ArrayBuffer;
  initialLocation?: EpubCfi;
}

// EPUB search result
export interface EpubSearchResult {
  cfi: string;
  excerpt: string;
  chapterLabel: string;
}

// EPUB Reader ref methods
export interface EpubReaderRef {
  next: () => void;
  prev: () => void;
  goToChapter: (index: number) => void;
  goToCfi: (cfi: string) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setLineHeight: (height: number) => void;
  setTheme: (theme: EpubTheme) => void;
  getChapters: () => EpubChapter[];
  getCurrentLocation: () => EpubCfi;
  getPercentage: () => number;
  search: (query: string) => Promise<EpubSearchResult[]>;
}
