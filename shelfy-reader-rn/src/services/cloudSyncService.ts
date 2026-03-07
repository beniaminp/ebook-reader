/**
 * Cloud Sync Service - Stub
 * Placeholder for cloud sync functionality (Dropbox, WebDAV, etc.)
 */

import type {
  CloudProviderType,
  CloudCredentials,
  SyncProgress,
  SyncResult,
  ConflictResolution,
  CloudBookFile,
} from '../types/cloudSync';

interface ConnectResult {
  success: boolean;
  accountInfo?: {
    email?: string;
    name?: string;
    quotaUsed?: number;
    quotaTotal?: number;
  };
  error?: string;
}

class CloudSyncServiceImpl {
  private _providerType: CloudProviderType | null = null;
  private _connected = false;

  async initialize(): Promise<void> {
    // No-op stub
  }

  getCurrentProviderType(): CloudProviderType | null {
    return this._providerType;
  }

  isConnected(): boolean {
    return this._connected;
  }

  async getStoredLastSyncTime(): Promise<number> {
    return 0;
  }

  async listBooks(): Promise<CloudBookFile[]> {
    return [];
  }

  async connect(
    _providerType: CloudProviderType,
    _credentials: CloudCredentials
  ): Promise<ConnectResult> {
    console.warn('Cloud sync not yet implemented');
    return { success: false, error: 'Cloud sync not yet implemented' };
  }

  async disconnect(): Promise<void> {
    this._providerType = null;
    this._connected = false;
  }

  async testConnection(): Promise<boolean> {
    return false;
  }

  async syncData(
    _bookmarks: any[],
    _highlights: any[],
    _progress: any[],
    _conflictResolution: ConflictResolution,
    _onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    console.warn('Cloud sync not yet implemented');
    return {
      success: false,
      bookmarksAdded: 0,
      bookmarksUpdated: 0,
      bookmarksRemoved: 0,
      highlightsAdded: 0,
      highlightsUpdated: 0,
      highlightsRemoved: 0,
      progressUpdated: 0,
      conflicts: [],
      errors: ['Cloud sync not yet implemented'],
      duration: 0,
    };
  }

  async uploadBook(
    _localPath: string,
    _remotePath: string,
    _onProgress?: (progress: number) => void
  ): Promise<string> {
    console.warn('Cloud sync not yet implemented');
    return '';
  }

  async downloadBook(
    _remotePath: string,
    _localPath: string,
    _onProgress?: (progress: number) => void
  ): Promise<string> {
    console.warn('Cloud sync not yet implemented');
    return '';
  }

  async deleteBook(_remotePath: string): Promise<boolean> {
    console.warn('Cloud sync not yet implemented');
    return false;
  }
}

export const cloudSyncService = new CloudSyncServiceImpl();
export default cloudSyncService;
