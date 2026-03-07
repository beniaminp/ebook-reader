/**
 * Cloud Sync Service
 * Orchestrator for cloud synchronization with Dropbox and WebDAV providers
 */

import { Preferences } from '@capacitor/preferences';
import { DropboxProvider } from './cloud/dropboxProvider';
import { WebDAVProvider } from './cloud/webdavProvider';
import { mergeData } from './cloud/syncMerge';
import type {
  CloudProvider,
  CloudProviderType,
  CloudCredentials,
  ConnectResult,
  CloudBookFile,
  SyncData,
  SyncProgress,
  SyncResult,
  ConflictResolution,
} from '../types/cloudSync';
import type { Bookmark, Highlight, ReadingProgress } from '../types/index';

// Constants
const PREF_KEY_CONFIG = 'cloudsync_config';

// Progress callback type
type ProgressCallback = (progress: SyncProgress) => void;

/**
 * Main Cloud Sync Service
 */
export class CloudSyncService {
  private currentProvider: CloudProvider | null = null;
  private providerType: CloudProviderType | null = null;

  /**
   * Initialize the service with stored configuration
   */
  async initialize(): Promise<void> {
    try {
      const configStr = await Preferences.get({ key: PREF_KEY_CONFIG });
      if (configStr.value) {
        const config = JSON.parse(configStr.value);
        if (config.credentials && config.providerType) {
          await this.connect(config.providerType, config.credentials);
        }
      }
    } catch (error) {
      console.warn('Failed to initialize cloud sync from stored config:', error);
      // Clear corrupted config to prevent repeated failures
      await Preferences.remove({ key: PREF_KEY_CONFIG }).catch(() => {});
    }
  }

  /**
   * Connect to a cloud provider
   */
  async connect(
    providerType: CloudProviderType,
    credentials: CloudCredentials
  ): Promise<ConnectResult> {
    let provider: CloudProvider;

    switch (providerType) {
      case 'dropbox':
        provider = new DropboxProvider();
        break;
      case 'webdav':
        provider = new WebDAVProvider();
        break;
      default:
        return {
          success: false,
          error: `Unsupported provider type: ${providerType}`,
        };
    }

    const result = await provider.connect(credentials);

    if (result.success) {
      this.currentProvider = provider;
      this.providerType = providerType;

      // Save configuration
      await this.saveConfig(providerType, credentials);
    }

    return result;
  }

  /**
   * Disconnect from current provider
   */
  async disconnect(): Promise<void> {
    if (this.currentProvider) {
      await this.currentProvider.disconnect();
    }
    this.currentProvider = null;
    this.providerType = null;

    // Clear saved configuration
    await Preferences.remove({ key: PREF_KEY_CONFIG });
  }

  /**
   * Test connection to current provider
   */
  async testConnection(): Promise<boolean> {
    return this.currentProvider?.testConnection() || false;
  }

  /**
   * Get current provider type
   */
  getCurrentProviderType(): CloudProviderType | null {
    return this.providerType;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.currentProvider?.isConnected || false;
  }

  /**
   * List books in cloud storage
   */
  async listBooks(): Promise<CloudBookFile[]> {
    if (!this.currentProvider) {
      throw new Error('No cloud provider connected');
    }
    return this.currentProvider.listBooks();
  }

  /**
   * Upload a book to cloud storage
   */
  async uploadBook(
    localPath: string,
    remotePath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.currentProvider) {
      throw new Error('No cloud provider connected');
    }
    return this.currentProvider.uploadBook(localPath, remotePath, onProgress);
  }

  /**
   * Download a book from cloud storage
   */
  async downloadBook(
    remotePath: string,
    localPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.currentProvider) {
      throw new Error('No cloud provider connected');
    }
    return this.currentProvider.downloadBook(remotePath, localPath, onProgress);
  }

  /**
   * Delete a book from cloud storage
   */
  async deleteBook(remotePath: string): Promise<boolean> {
    if (!this.currentProvider) {
      throw new Error('No cloud provider connected');
    }
    return this.currentProvider.deleteBook(remotePath);
  }

  /**
   * Sync reading data (bookmarks, highlights, progress)
   */
  async syncData(
    localBookmarks: Bookmark[],
    localHighlights: Highlight[],
    localProgress: ReadingProgress[],
    conflictResolution: ConflictResolution,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      bookmarksAdded: 0,
      bookmarksUpdated: 0,
      bookmarksRemoved: 0,
      highlightsAdded: 0,
      highlightsUpdated: 0,
      highlightsRemoved: 0,
      progressUpdated: 0,
      conflicts: [],
      errors: [],
      duration: 0,
    };

    if (!this.currentProvider) {
      result.errors.push('No cloud provider connected');
      result.duration = Date.now() - startTime;
      return result;
    }

    try {
      onProgress?.({
        status: 'syncing',
        currentOperation: 'downloading',
        progress: 10,
        itemsCompleted: 0,
        itemsTotal: 3,
        bytesTransferred: 0,
        totalBytes: 0,
      });

      // Download remote sync data
      const remoteData = await this.currentProvider.downloadSyncData();

      onProgress?.({
        status: 'syncing',
        currentOperation: 'merging',
        progress: 30,
        itemsCompleted: 1,
        itemsTotal: 3,
        bytesTransferred: 0,
        totalBytes: 0,
      });

      // Merge data
      const mergedData = await mergeData(
        localBookmarks,
        localHighlights,
        localProgress,
        remoteData,
        conflictResolution,
        result
      );

      onProgress?.({
        status: 'syncing',
        currentOperation: 'uploading',
        progress: 70,
        itemsCompleted: 2,
        itemsTotal: 3,
        bytesTransferred: 0,
        totalBytes: 0,
      });

      // Upload merged data
      await this.currentProvider.uploadSyncData(mergedData);

      onProgress?.({
        status: 'syncing',
        currentOperation: 'uploading',
        progress: 100,
        itemsCompleted: 3,
        itemsTotal: 3,
        bytesTransferred: 0,
        totalBytes: 0,
      });

      // Update last sync time
      await this.updateLastSyncTime();

      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Sync failed');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Get last sync time from cloud
   */
  async getLastSyncTime(): Promise<number> {
    if (!this.currentProvider) {
      return 0;
    }
    return this.currentProvider.getLastSyncTime();
  }

  /**
   * Save configuration to preferences
   */
  private async saveConfig(
    providerType: CloudProviderType,
    credentials: CloudCredentials
  ): Promise<void> {
    const config = {
      providerType,
      credentials: {
        type: providerType,
        // For security, only save non-sensitive info
        url: credentials.url,
        username: credentials.username,
      },
      lastSyncTime: Date.now(),
    };

    await Preferences.set({
      key: PREF_KEY_CONFIG,
      value: JSON.stringify(config),
    });

    // Save access token separately (more secure)
    if (credentials.accessToken) {
      await Preferences.set({
        key: `${PREF_KEY_CONFIG}_token`,
        value: credentials.accessToken,
      });
    }

    if (credentials.password) {
      await Preferences.set({
        key: `${PREF_KEY_CONFIG}_password`,
        value: credentials.password,
      });
    }
  }

  /**
   * Load configuration from preferences
   */
  async loadConfig(): Promise<{
    providerType: CloudProviderType | null;
    credentials: CloudCredentials | null;
  } | null> {
    try {
      const configStr = await Preferences.get({ key: PREF_KEY_CONFIG });
      if (!configStr.value) {
        return null;
      }

      const config = JSON.parse(configStr.value);
      const credentials: CloudCredentials = {
        type: config.providerType,
        url: config.credentials?.url,
        username: config.credentials?.username,
      };

      // Load sensitive data separately
      const token = await Preferences.get({ key: `${PREF_KEY_CONFIG}_token` });
      if (token.value) {
        credentials.accessToken = token.value;
      }

      const password = await Preferences.get({ key: `${PREF_KEY_CONFIG}_password` });
      if (password.value) {
        credentials.password = password.value;
      }

      return {
        providerType: config.providerType,
        credentials,
      };
    } catch {
      return null;
    }
  }

  /**
   * Update last sync time
   */
  private async updateLastSyncTime(): Promise<void> {
    const configStr = await Preferences.get({ key: PREF_KEY_CONFIG });
    if (configStr.value) {
      const config = JSON.parse(configStr.value);
      config.lastSyncTime = Date.now();
      await Preferences.set({
        key: PREF_KEY_CONFIG,
        value: JSON.stringify(config),
      });
    }
  }

  /**
   * Get last sync time from local storage
   */
  async getStoredLastSyncTime(): Promise<number> {
    try {
      const configStr = await Preferences.get({ key: PREF_KEY_CONFIG });
      if (configStr.value) {
        const config = JSON.parse(configStr.value);
        return config.lastSyncTime || 0;
      }
    } catch {
      // Ignore
    }
    return 0;
  }
}

// Export singleton instance
export const cloudSyncService = new CloudSyncService();
