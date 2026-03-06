// EPUB-specific types
export * from './epub';

// Unified reader types
export * from './reader';

// Book types
export type BookSource = 'local' | 'calibre-web' | 'opds' | 'dropbox' | 'webdav' | 'gdrive' | 'hardcover';
export type ReadStatus = 'unread' | 'reading' | 'finished' | 'dnf';

export interface Book {
  id: string;
  title: string;
  author: string;
  filePath: string;
  coverPath?: string;
  format:
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
    | 'chm'
    | 'docx'
    | 'odt';
  totalPages: number;
  currentPage: number;
  progress: number;
  lastRead: Date;
  dateAdded: Date;
  source: BookSource;
  sourceId?: string; // ID from the source system (e.g., Calibre book ID)
  sourceUrl?: string; // URL for downloading from source
  downloaded: boolean; // Whether the book file is downloaded locally
  genre?: string; // Main genre (e.g., "Fiction", "Science")
  subgenres?: string[]; // Sub-genres (e.g., ["Thriller", "Mystery", "Suspense"])
  series?: string; // Series name (e.g., "Harry Potter")
  seriesIndex?: number; // Position in series (e.g., 1, 2, 3)
  readStatus?: ReadStatus; // Reading status (unread, reading, finished, dnf)
  hardcoverId?: number; // Matched Hardcover book ID
  hardcoverReview?: string; // Review text from Hardcover
  communityRating?: number; // Community rating from Open Library/Hardcover
  communityRatingCount?: number; // Number of community ratings
  pageCount?: number; // Page count from metadata enrichment
  coverUrl?: string; // Remote cover URL for enrichment
  review?: string; // User's written review
  fileHash?: string; // SHA-256 hash of first 8KB for duplicate detection
  fileSize?: number; // File size in bytes
  furthestProgress?: number; // Furthest reading position reached (0-1 decimal), prevents accidental progress overwrite
  metadata?: BookMetadata;
}

export interface BookMetadata {
  isbn?: string;
  publisher?: string;
  publishDate?: string;
  language?: string;
  description?: string;
  genres?: string[];
  genre?: string; // Main genre
  subgenres?: string[]; // Sub-genres
  tags?: string[];
  series?: string;
  seriesIndex?: number;
  rating?: number; // 0-5
  communityRating?: number;
  communityRatingCount?: number;
  pageCount?: number;
  coverUrl?: string;
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

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Highlight {
  id: string;
  bookId: string;
  location: ReadingLocation;
  text: string;
  color: string;
  note?: string;
  tags?: string[];
  timestamp: Date;
  /** PDF-specific: page number for the highlight */
  pageNumber?: number;
  /** PDF-specific: bounding rectangles for text selection */
  rects?: HighlightRect[];
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

// Translation types
export type TranslationLanguageCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'nl'
  | 'pl'
  | 'tr'
  | 'sv'
  | 'da'
  | 'fi'
  | 'no'
  | 'cs'
  | 'el'
  | 'he'
  | 'hi'
  | 'th'
  | 'vi'
  | 'id'
  | 'uk'
  | 'ro'
  | 'hu'
  | 'bg'
  | 'auto';

export interface TranslationSettings {
  targetLanguage: TranslationLanguageCode;
  autoDetectSource: boolean;
  apiKey?: string;
  apiEndpoint?: string;
  saveHistory: boolean;
}

export interface TranslationHistoryEntry {
  id: string;
  bookId: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
  location?: string; // CFI or page number
}

export interface TranslationSelection {
  text: string;
  rect?: DOMRect;
  range?: Range;
}

export interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  sourceLangName: string;
  targetLang: string;
  targetLangName: string;
  originalText: string;
}

// Dictionary types
export interface Phonetic {
  text?: string;
  audio?: string;
}

export interface Definition {
  definition: string;
  synonyms?: string[];
  antonyms?: string[];
  example?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface DefinitionResult {
  word: string;
  phonetic?: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  origin?: string;
  found: boolean;
  cachedAt?: number;
}

export interface VocabularyWord {
  word: string;
  definition: string;
  partOfSpeech: string;
  example?: string;
  addedAt: number;
  context?: string;
}

// Cloud sync types
export * from './cloudSync';
