/**
 * EPUB-related type definitions
 */

// EPUB CFI (Canonical Fragment Identifier) - location in EPUB
export type EpubCfi = string;

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
  paper: {
    id: 'paper',
    name: 'Paper',
    backgroundColor: '#f5f0e8',
    textColor: '#3d3529',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  night: {
    id: 'night',
    name: 'Night',
    backgroundColor: '#0d0d0d',
    textColor: '#c0c0c0',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    backgroundColor: '#1a2332',
    textColor: '#c8dce8',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    backgroundColor: '#1a2b1a',
    textColor: '#c8dcc8',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    backgroundColor: '#2b1f1a',
    textColor: '#e8d8c8',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    backgroundColor: '#2d3035',
    textColor: '#c8ccd0',
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

