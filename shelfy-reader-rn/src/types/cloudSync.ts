export type CloudProviderType = 'dropbox' | 'webdav' | 'google-drive';

export interface CloudCredentials {
  provider: CloudProviderType;
  accessToken?: string;
  refreshToken?: string;
  serverUrl?: string;
  username?: string;
  password?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'completed' | 'success';

export interface SyncProgress {
  status: SyncStatus;
  currentOperation?: string;
  currentFile?: string;
  progress: number;
  itemsCompleted: number;
  itemsTotal: number;
  bytesTransferred: number;
  totalBytes: number;
}

export interface SyncResult {
  success: boolean;
  bookmarksAdded: number;
  bookmarksUpdated: number;
  bookmarksRemoved: number;
  highlightsAdded: number;
  highlightsUpdated: number;
  highlightsRemoved: number;
  progressUpdated: number;
  conflicts: any[];
  errors: string[];
  duration: number;
}

export type ConflictResolution = 'local' | 'remote' | 'newest' | 'ask' | 'last-write-wins';

export interface CloudBookFile {
  bookId: string;
  fileName: string;
  remotePath: string;
  localPath?: string;
  path: string;
  lastModified: number;
  size: number;
}
