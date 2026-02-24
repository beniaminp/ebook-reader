/**
 * Types for Calibre-Web integration
 */

// Calibre-Web server configuration
export interface CalibreWebServerConfig {
  id: string;
  name: string;
  serverUrl: string; // e.g., https://calibre.example.com
  username: string;
  password?: string; // Stored encrypted
  token?: string; // Session token
  lastSyncAt?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  // Sync preferences (persisted per-server)
  syncMetadata?: boolean;
  syncCovers?: boolean;
  syncBooks?: boolean;
}

// Calibre-Web book metadata from API
export interface CalibreWebBook {
  id: number;
  title: string;
  author: string[];
  author_sort?: string;
  series?: string;
  series_index?: number;
  pubdate?: string;
  publisher?: string;
  languages?: string[];
  isbn?: string;
  identifiers?: Record<string, string>;
  cover?: string; // Cover URL
  tags?: string[];
  rating?: number;
  description?: string;
  formats?: CalibreWebFormat[];
  timestamp?: string;
  uuid?: string;
  last_modified?: string;
}

// Book format in Calibre-Web
export interface CalibreWebFormat {
  format: string; // EPUB, PDF, MOBI, etc.
  uncompressed_size: number;
  download_url: string;
}

// Calibre-Web API response types
export interface CalibreWebBooksResponse {
  total: number;
  books: CalibreWebBook[];
  page?: number;
  per_page?: number;
}

export interface CalibreWebAuthResponse {
  token?: string;
  success: boolean;
  message?: string;
}

// Sync status for a book
export interface CalibreWebSyncStatus {
  calibreBookId: number;
  localBookId?: string;
  lastSyncedAt: number;
  hasLocalFile: boolean;
  isDownloaded: boolean;
  coverCached: boolean;
}

// Download progress
export interface DownloadProgress {
  bookId: number;
  bookTitle: string;
  progress: number; // 0-100
  bytesDownloaded: number;
  totalBytes: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

// Sync options
export interface CalibreWebSyncOptions {
  syncMetadata: boolean;
  downloadCovers: boolean;
  downloadBooks?: boolean; // For offline mode - download all books
  maxConcurrentDownloads: number;
  retryFailedDownloads: boolean;
}

// Sync result
export interface CalibreWebSyncResult {
  success: boolean;
  booksSynced: number;
  coversDownloaded: number;
  booksDownloaded: number;
  failedBooks: number;
  errors: string[];
  duration: number; // milliseconds
}

// Calibre-Web connection test result
export interface CalibreWebConnectionTest {
  success: boolean;
  serverVersion?: string;
  libraryName?: string;
  bookCount?: number;
  error?: string;
  responseTime: number; // milliseconds
}

// Book stored locally from Calibre-Web
export interface CalibreWebLocalBook {
  id: string; // Local book ID
  calibreBookId: number; // Calibre-Web book ID
  serverId: string; // Which server it came from
  title: string;
  author: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  format: string;
  coverPath?: string;
  coverUrl?: string; // Original cover URL for refresh
  series?: string;
  seriesIndex?: number;
  tags?: string[];
  rating?: number;
  description?: string;
  pubdate?: string;
  publisher?: string;
  isbn?: string;
  language?: string;
  lastSyncAt: number;
  downloadedAt?: number;
  isDownloaded: boolean;
  addedAt: number;
  updatedAt: number;
}
