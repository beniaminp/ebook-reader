// EPUB-specific types
export * from './epub';

// Unified reader types
export * from './reader';

// Book types
export type BookSource = 'local' | 'calibre-web' | 'opds' | 'dropbox' | 'webdav' | 'gdrive';

export interface Book {
  id: string;
  title: string;
  author: string;
  filePath: string;
  coverPath?: string;
  format: 'epub' | 'pdf' | 'mobi' | 'fb2' | 'cbz' | 'txt';
  totalPages: number;
  currentPage: number;
  progress: number;
  lastRead: Date;
  dateAdded: Date;
  source: BookSource;
  sourceId?: string; // ID from the source system (e.g., Calibre book ID)
  sourceUrl?: string; // URL for downloading from source
  downloaded: boolean; // Whether the book file is downloaded locally
  metadata?: BookMetadata;
}

export interface BookMetadata {
  isbn?: string;
  publisher?: string;
  publishDate?: string;
  language?: string;
  description?: string;
  genres?: string[];
  tags?: string[];
  series?: string;
  seriesIndex?: number;
  rating?: number; // 0-5
}

// Reader types
export interface ReadingLocation {
  bookId: string;
  cfi?: string; // EPUB Canonical Fragment Identifier
  pageNumber?: number; // PDF page number
  position: number; // Normalized 0-1 position
  chapterIndex?: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  location: ReadingLocation;
  text?: string;
  chapter?: string;
  timestamp: Date;
}

export interface Highlight {
  id: string;
  bookId: string;
  location: ReadingLocation;
  text: string;
  color: string;
  note?: string;
  timestamp: Date;
}

export interface Annotation {
  id: string;
  bookId: string;
  location: ReadingLocation;
  text: string;
  note: string;
  type: 'note' | 'definition' | 'translation';
  timestamp: Date;
}

// Settings types
export interface ReadingSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  theme: 'light' | 'dark' | 'sepia';
  margin: number;
  textAlign: 'left' | 'justify';
  autoScroll: boolean;
  autoScrollSpeed: number;
}

export interface ReaderSettings {
  tapToTurn: boolean;
  swipeToTurn: boolean;
  volumeButtonsTurn: boolean;
  doubleTapToZoom: boolean;
  screenOrientation: 'auto' | 'portrait' | 'landscape';
  keepScreenOn: boolean;
}

// Library types
export interface LibrarySort {
  by: 'title' | 'author' | 'dateAdded' | 'lastRead' | 'progress';
  order: 'asc' | 'desc';
}

export interface LibraryFilter {
  format?: string[];
  favorites?: boolean;
  unfinished?: boolean;
  tags?: string[];
}

// Collection types
export interface Collection {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}

// Reading progress type
export interface ReadingProgress {
  id: string;
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  location?: string;
  chapterId?: string;
  chapterTitle?: string;
  lastReadAt: number;
  createdAt: number;
  updatedAt: number;
}

// Database types
export interface DatabaseSchema {
  books: Book;
  bookmarks: Bookmark;
  highlights: Highlight;
  annotations: Annotation;
  settings: ReadingSettings & ReaderSettings;
}
