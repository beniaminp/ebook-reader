/**
 * Cloud Sync Types
 * Interfaces for cloud synchronization providers
 */

import type { Bookmark, Highlight, ReadingProgress } from './index';

// Supported cloud providers
export type CloudProviderType = 'dropbox' | 'webdav' | 'google-drive';

// Sync status
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'completed' | 'success';

// Conflict resolution strategy
export type ConflictResolution = 'last-write-wins' | 'server-wins' | 'client-wins' | 'manual' | 'local' | 'remote' | 'newest' | 'ask';

// Cloud provider interface
export interface CloudProvider {
  type: CloudProviderType;
  isConnected: boolean;

  // Connection
  connect(credentials: CloudCredentials): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;

  // File operations
  listBooks(): Promise<CloudBookFile[]>;
  uploadBook(
    localPath: string,
    remotePath: string,
    onProgress?: (progress: number) => void
  ): Promise<string>;
  downloadBook(
    remotePath: string,
    localPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string>;
  deleteBook(remotePath: string): Promise<boolean>;

  // Sync data operations
  uploadSyncData(data: SyncData): Promise<boolean>;
  downloadSyncData(): Promise<SyncData | null>;
  getLastSyncTime(): Promise<number>;
}

// Cloud credentials for different providers
export interface CloudCredentials {
  provider: CloudProviderType;
  // Dropbox
  accessToken?: string;
  refreshToken?: string;
  // WebDAV
  serverUrl?: string;
  url?: string;
  username?: string;
  password?: string;
}

// Connection result
export interface ConnectResult {
  success: boolean;
  error?: string;
  accountInfo?: {
    email?: string;
    name?: string;
    quotaUsed?: number;
    quotaTotal?: number;
  };
}

// Cloud book file representation
export interface CloudBookFile {
  id?: string;
  bookId: string;
  name?: string;
  fileName: string;
  path: string;
  remotePath: string;
  localPath?: string;
  size: number;
  lastModified: number;
  format?: string;
}

// Sync data that gets uploaded/downloaded
export interface SyncData {
  version: number;
  timestamp: number;
  deviceId: string;
  bookmarks: BookmarkSync[];
  highlights: HighlightSync[];
  readingProgress: ReadingProgressSync[];
}

// Bookmark for sync
export interface BookmarkSync {
  id: string;
  bookId: string;
  location: {
    cfi?: string;
    pageNumber?: number;
    position: number;
    chapterIndex?: number;
  };
  text?: string;
  chapter?: string;
  timestamp: number;
  deleted?: boolean;
}

// Highlight for sync
export interface HighlightSync {
  id: string;
  bookId: string;
  location: {
    cfi?: string;
    pageNumber?: number;
    position: number;
    chapterIndex?: number;
  };
  text: string;
  color: string;
  note?: string;
  timestamp: number;
  deleted?: boolean;
}

// Reading progress for sync
export interface ReadingProgressSync {
  id: string;
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  location?: string;
  chapterId?: string;
  chapterTitle?: string;
  lastReadAt: number;
  timestamp: number;
  deleted?: boolean;
}

// Cloud sync configuration
export interface CloudSyncConfig {
  providerType: CloudProviderType;
  credentials: CloudCredentials;
  autoSync: boolean;
  syncInterval: number; // minutes
  syncOnWifiOnly: boolean;
  conflictResolution: ConflictResolution;
  lastSyncTime: number;
}

// Sync progress info
export interface SyncProgress {
  status: SyncStatus;
  currentOperation?:
    | 'uploading'
    | 'downloading'
    | 'merging'
    | 'uploading-book'
    | 'downloading-book'
    | string;
  currentFile?: string;
  progress: number; // 0-100
  itemsCompleted: number;
  itemsTotal: number;
  bytesTransferred: number;
  totalBytes: number;
  error?: string;
}

// Sync result
export interface SyncResult {
  success: boolean;
  bookmarksAdded: number;
  bookmarksUpdated: number;
  bookmarksRemoved: number;
  highlightsAdded: number;
  highlightsUpdated: number;
  highlightsRemoved: number;
  progressUpdated: number;
  conflicts: SyncConflict[];
  errors: string[];
  duration: number;
}

// Sync conflict
export interface SyncConflict {
  type: 'bookmark' | 'highlight' | 'progress';
  id: string;
  bookId: string;
  localData: any;
  remoteData: any;
  resolution?: 'local' | 'remote' | 'merge';
}
