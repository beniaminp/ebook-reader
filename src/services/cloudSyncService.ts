/**
 * Cloud Sync Service
 * Handles synchronization with Dropbox and WebDAV providers
 */

import { Dropbox } from 'dropbox';
import { createClient, WebDAVClient } from 'webdav';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import type {
  CloudProvider,
  CloudProviderType,
  CloudCredentials,
  ConnectResult,
  CloudBookFile,
  SyncData,
  SyncProgress,
  SyncResult,
  SyncConflict,
  BookmarkSync,
  HighlightSync,
  ReadingProgressSync,
  ConflictResolution,
} from '../types/cloudSync';
import type { Bookmark, Highlight, ReadingProgress } from '../types/index';

// Constants
const PREF_KEY_CONFIG = 'cloudsync_config';
const DROPBOX_APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY || '';
const SYNC_DATA_PATH = '/ebook-reader-sync.json';
const CLOUD_BOOKS_PATH = '/ebook-reader/books';
const SYNC_VERSION = 1;

// Progress callback type
type ProgressCallback = (progress: SyncProgress) => void;

// Generate a unique device ID
let deviceId: string | null = null;

async function getDeviceId(): Promise<string> {
  if (!deviceId) {
    const { value } = await Preferences.get({ key: 'cloudsync_device_id' });
    if (value) {
      deviceId = value;
    } else {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await Preferences.set({ key: 'cloudsync_device_id', value: deviceId });
    }
  }
  return deviceId;
}

/**
 * Dropbox Provider Implementation
 */
class DropboxProvider implements CloudProvider {
  type: CloudProviderType = 'dropbox';
  isConnected: boolean = false;
  private client: Dropbox | null = null;
  private credentials: CloudCredentials | null = null;

  async connect(credentials: CloudCredentials): Promise<ConnectResult> {
    try {
      if (!credentials.accessToken) {
        return {
          success: false,
          error: 'Access token is required for Dropbox',
        };
      }

      this.client = new Dropbox({
        accessToken: credentials.accessToken,
      });

      this.credentials = credentials;

      // Test connection by getting account info
      const accountInfo = await this.client.usersGetCurrentAccount();

      this.isConnected = true;

      return {
        success: true,
        accountInfo: {
          email: accountInfo.result.email,
          name: `${accountInfo.result.name.given_name} ${accountInfo.result.name.surname}`,
        },
      };
    } catch (error) {
      this.isConnected = false;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Dropbox',
      };
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.credentials = null;
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.usersGetCurrentAccount();
      return true;
    } catch {
      return false;
    }
  }

  async listBooks(): Promise<CloudBookFile[]> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      // Ensure the books directory exists
      try {
        await this.client.filesCreateFolderV2({ path: CLOUD_BOOKS_PATH });
      } catch (error: any) {
        if (error.status !== 409) {
          throw error;
        }
      }

      const result = await this.client.filesListFolder({ path: CLOUD_BOOKS_PATH });
      const files: CloudBookFile[] = [];

      for (const entry of result.result.entries) {
        if (entry['.tag'] === 'file') {
          const file = entry as any;
          const extension = file.name.split('.').pop()?.toLowerCase() || '';
          files.push({
            id: file.id,
            name: file.name,
            path: file.path_lower,
            size: file.size,
            lastModified: new Date(file.client_modified).getTime(),
            format: extension,
          });
        }
      }

      return files;
    } catch (error) {
      console.error('Failed to list Dropbox books:', error);
      return [];
    }
  }

  async uploadBook(
    localPath: string,
    remotePath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      // Read local file
      const file = await Filesystem.readFile({
        path: localPath,
        directory: Directory.Data,
      });

      const fullPath = `${CLOUD_BOOKS_PATH}/${remotePath}`;

      // Upload to Dropbox
      const response = await this.client.filesUpload({
        path: fullPath,
        contents: file.data,
        mode: { '.tag': 'overwrite' } as any,
      });

      onProgress?.(100);

      return response.result.path_lower || fullPath;
    } catch (error) {
      console.error('Failed to upload book to Dropbox:', error);
      throw error;
    }
  }

  async downloadBook(
    remotePath: string,
    localPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      const response = await this.client.filesDownload({ path: remotePath });
      const fileBlob = (response.result as any).fileBlob;

      // Convert blob to base64
      const base64 = await this.blobToBase64(fileBlob);

      // Save to local filesystem
      await Filesystem.writeFile({
        path: localPath,
        data: base64.split(',')[1], // Remove data URL prefix
        directory: Directory.Data,
        recursive: true,
      });

      onProgress?.(100);

      return localPath;
    } catch (error) {
      console.error('Failed to download book from Dropbox:', error);
      throw error;
    }
  }

  async deleteBook(remotePath: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      await this.client.filesDeleteV2({ path: remotePath });
      return true;
    } catch (error) {
      console.error('Failed to delete book from Dropbox:', error);
      return false;
    }
  }

  async uploadSyncData(data: SyncData): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      const json = JSON.stringify(data, null, 2);
      const response = await this.client.filesUpload({
        path: SYNC_DATA_PATH,
        contents: json,
        mode: { '.tag': 'overwrite' } as any,
        autorename: false,
      });

      return !!response.result.path_lower;
    } catch (error) {
      console.error('Failed to upload sync data to Dropbox:', error);
      return false;
    }
  }

  async downloadSyncData(): Promise<SyncData | null> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      const response = await this.client.filesDownload({ path: SYNC_DATA_PATH });
      const fileBlob = (response.result as any).fileBlob;
      const text = await this.blobToText(fileBlob);
      return JSON.parse(text);
    } catch (error: any) {
      if (error.status === 404) {
        return null; // File doesn't exist yet
      }
      console.error('Failed to download sync data from Dropbox:', error);
      throw error;
    }
  }

  async getLastSyncTime(): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 0;
    }

    try {
      const response = await this.client.filesGetMetadata({ path: SYNC_DATA_PATH });
      const metadata = response.result as any;
      if (metadata.server_modified) {
        return new Date(metadata.server_modified).getTime();
      }
    } catch {
      // File doesn't exist
    }
    return 0;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async blobToText(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  }
}

/**
 * WebDAV Provider Implementation
 */
class WebDAVProvider implements CloudProvider {
  type: CloudProviderType = 'webdav';
  isConnected: boolean = false;
  private client: WebDAVClient | null = null;
  private credentials: CloudCredentials | null = null;

  async connect(credentials: CloudCredentials): Promise<ConnectResult> {
    try {
      if (!credentials.url || !credentials.username || !credentials.password) {
        return {
          success: false,
          error: 'URL, username, and password are required for WebDAV',
        };
      }

      this.client = createClient(credentials.url, {
        username: credentials.username,
        password: credentials.password,
      });

      this.credentials = credentials;

      // Test connection
      await this.client.getDirectoryContents('/');

      this.isConnected = true;

      // Try to get quota info
      let quotaUsed: number | undefined;
      let quotaTotal: number | undefined;
      try {
        const quotaData = await (this.client as any).getQuota();
        quotaUsed = quotaData?.used;
        quotaTotal = quotaData?.total;
      } catch {
        // Quota not supported
      }

      return {
        success: true,
        accountInfo: {
          email: credentials.username,
          name: credentials.username,
          quotaUsed,
          quotaTotal,
        },
      };
    } catch (error) {
      this.isConnected = false;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to WebDAV server',
      };
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.credentials = null;
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.getDirectoryContents('/');
      return true;
    } catch {
      return false;
    }
  }

  async listBooks(): Promise<CloudBookFile[]> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to WebDAV');
    }

    try {
      // Ensure the books directory exists
      try {
        await this.client.createDirectory(CLOUD_BOOKS_PATH);
      } catch (error: any) {
        if (!error.message?.includes('exists')) {
          throw error;
        }
      }

      const contents = await this.client.getDirectoryContents(CLOUD_BOOKS_PATH);
      const files: CloudBookFile[] = [];

      if (Array.isArray(contents)) {
        for (const item of contents as any[]) {
          if (item.type === 'file') {
            const extension = item.basename.split('.').pop()?.toLowerCase() || '';
            files.push({
              id: item.filename,
              name: item.basename,
              path: item.filename,
              size: item.size,
              lastModified: new Date(item.lastmod).getTime(),
              format: extension,
            });
          }
        }
      }

      return files;
    } catch (error) {
      console.error('Failed to list WebDAV books:', error);
      return [];
    }
  }

  async uploadBook(
    localPath: string,
    remotePath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to WebDAV');
    }

    try {
      // Read local file
      const file = await Filesystem.readFile({
        path: localPath,
        directory: Directory.Data,
      });

      const fullPath = `${CLOUD_BOOKS_PATH}/${remotePath}`;

      // Upload to WebDAV
      await this.client.putFileContents(fullPath, file.data as string, {
        overwrite: true,
      });

      onProgress?.(100);

      return fullPath;
    } catch (error) {
      console.error('Failed to upload book to WebDAV:', error);
      throw error;
    }
  }

  async downloadBook(
    remotePath: string,
    localPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to WebDAV');
    }

    try {
      const buffer = await this.client.getFileContents(remotePath, { format: 'text' });

      // Save to local filesystem
      await Filesystem.writeFile({
        path: localPath,
        data: buffer as string,
        directory: Directory.Data,
        recursive: true,
      });

      onProgress?.(100);

      return localPath;
    } catch (error) {
      console.error('Failed to download book from WebDAV:', error);
      throw error;
    }
  }

  async deleteBook(remotePath: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to WebDAV');
    }

    try {
      await this.client.deleteFile(remotePath);
      return true;
    } catch (error) {
      console.error('Failed to delete book from WebDAV:', error);
      return false;
    }
  }

  async uploadSyncData(data: SyncData): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to WebDAV');
    }

    try {
      const json = JSON.stringify(data, null, 2);
      await this.client.putFileContents(SYNC_DATA_PATH, json, { overwrite: true });
      return true;
    } catch (error) {
      console.error('Failed to upload sync data to WebDAV:', error);
      return false;
    }
  }

  async downloadSyncData(): Promise<SyncData | null> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to WebDAV');
    }

    try {
      const contents = await this.client.getFileContents(SYNC_DATA_PATH, { format: 'text' });
      return JSON.parse(contents as string);
    } catch (error: any) {
      if (error.response?.status === 404 || error.message?.includes('not found')) {
        return null; // File doesn't exist yet
      }
      console.error('Failed to download sync data from WebDAV:', error);
      throw error;
    }
  }

  async getLastSyncTime(): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 0;
    }

    try {
      const metadata = (await this.client.stat(SYNC_DATA_PATH)) as any;
      if (metadata.lastmod) {
        return new Date(metadata.lastmod).getTime();
      }
    } catch {
      // File doesn't exist
    }
    return 0;
  }
}

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
      const mergedData = await this.mergeData(
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
   * Merge local and remote sync data
   */
  private async mergeData(
    localBookmarks: Bookmark[],
    localHighlights: Highlight[],
    localProgress: ReadingProgress[],
    remoteData: SyncData | null,
    conflictResolution: ConflictResolution,
    result: SyncResult
  ): Promise<SyncData> {
    const deviceId = await getDeviceId();
    const now = Date.now();

    // Convert local data to sync format
    const localBookmarksSync: BookmarkSync[] = localBookmarks.map((b) => ({
      id: b.id,
      bookId: b.bookId,
      location: {
        cfi: b.location.cfi,
        pageNumber: b.location.pageNumber,
        position: b.location.position,
        chapterIndex: b.location.chapterIndex,
      },
      text: b.text,
      chapter: b.chapter,
      timestamp: new Date(b.timestamp).getTime(),
    }));

    const localHighlightsSync: HighlightSync[] = localHighlights.map((h) => ({
      id: h.id,
      bookId: h.bookId,
      location: {
        cfi: h.location.cfi,
        pageNumber: h.location.pageNumber,
        position: h.location.position,
        chapterIndex: h.location.chapterIndex,
      },
      text: h.text,
      color: h.color,
      note: h.note,
      timestamp: new Date(h.timestamp).getTime(),
    }));

    const localProgressSync: ReadingProgressSync[] = localProgress.map((p) => ({
      id: p.id,
      bookId: p.bookId,
      currentPage: p.currentPage,
      totalPages: p.totalPages,
      percentage: p.percentage,
      location: p.location,
      chapterId: p.chapterId,
      chapterTitle: p.chapterTitle,
      lastReadAt: p.lastReadAt,
      timestamp: p.updatedAt,
    }));

    // If no remote data, just return local data
    if (!remoteData) {
      return {
        version: SYNC_VERSION,
        timestamp: now,
        deviceId,
        bookmarks: localBookmarksSync,
        highlights: localHighlightsSync,
        readingProgress: localProgressSync,
      };
    }

    // Merge bookmarks
    const mergedBookmarks = this.mergeBookmarks(
      localBookmarksSync,
      remoteData.bookmarks,
      conflictResolution,
      result
    );

    // Merge highlights
    const mergedHighlights = this.mergeHighlights(
      localHighlightsSync,
      remoteData.highlights,
      conflictResolution,
      result
    );

    // Merge progress (always last-write-wins for progress)
    const mergedProgress = this.mergeProgress(
      localProgressSync,
      remoteData.readingProgress,
      result
    );

    return {
      version: SYNC_VERSION,
      timestamp: now,
      deviceId,
      bookmarks: mergedBookmarks,
      highlights: mergedHighlights,
      readingProgress: mergedProgress,
    };
  }

  /**
   * Merge bookmarks with conflict resolution
   */
  private mergeBookmarks(
    local: BookmarkSync[],
    remote: BookmarkSync[],
    resolution: ConflictResolution,
    result: SyncResult
  ): BookmarkSync[] {
    const mergedMap = new Map<string, BookmarkSync>();
    const localMap = new Map(local.map((b) => [b.id, b]));
    const remoteMap = new Map(remote.map((b) => [b.id, b]));

    // Add all local bookmarks
    for (const [id, bookmark] of localMap) {
      mergedMap.set(id, bookmark);
    }

    // Merge remote bookmarks
    for (const [id, remoteBookmark] of remoteMap) {
      const localBookmark = localMap.get(id);

      if (!localBookmark) {
        // Remote bookmark doesn't exist locally
        if (remoteBookmark.deleted) {
          // Skip deleted bookmarks
          continue;
        }
        mergedMap.set(id, remoteBookmark);
        result.bookmarksAdded++;
      } else {
        // Conflict: bookmark exists on both sides
        const resolutionResult = this.resolveConflict(
          localBookmark,
          remoteBookmark,
          resolution,
          result
        );

        if (resolutionResult === 'remote') {
          mergedMap.set(id, remoteBookmark);
          result.bookmarksUpdated++;
        } else if (resolutionResult === 'local') {
          result.bookmarksUpdated++;
        }
      }
    }

    // Handle deleted bookmarks — only count if actually removed from merged set
    for (const [id, remoteBookmark] of remoteMap) {
      if (remoteBookmark.deleted && mergedMap.has(id)) {
        mergedMap.delete(id);
        result.bookmarksRemoved++;
      }
    }

    return Array.from(mergedMap.values());
  }

  /**
   * Merge highlights with conflict resolution
   */
  private mergeHighlights(
    local: HighlightSync[],
    remote: HighlightSync[],
    resolution: ConflictResolution,
    result: SyncResult
  ): HighlightSync[] {
    const mergedMap = new Map<string, HighlightSync>();
    const localMap = new Map(local.map((h) => [h.id, h]));
    const remoteMap = new Map(remote.map((h) => [h.id, h]));

    // Add all local highlights
    for (const [id, highlight] of localMap) {
      mergedMap.set(id, highlight);
    }

    // Merge remote highlights
    for (const [id, remoteHighlight] of remoteMap) {
      const localHighlight = localMap.get(id);

      if (!localHighlight) {
        // Remote highlight doesn't exist locally
        if (remoteHighlight.deleted) {
          continue;
        }
        mergedMap.set(id, remoteHighlight);
        result.highlightsAdded++;
      } else {
        // Conflict: highlight exists on both sides
        const resolutionResult = this.resolveConflict(
          localHighlight,
          remoteHighlight,
          resolution,
          result,
          'highlight'
        );

        if (resolutionResult === 'remote') {
          mergedMap.set(id, remoteHighlight);
          result.highlightsUpdated++;
        } else if (resolutionResult === 'local') {
          result.highlightsUpdated++;
        }
      }
    }

    // Handle deleted highlights — only count if actually removed from merged set
    for (const [id, remoteHighlight] of remoteMap) {
      if (remoteHighlight.deleted && mergedMap.has(id)) {
        mergedMap.delete(id);
        result.highlightsRemoved++;
      }
    }

    return Array.from(mergedMap.values());
  }

  /**
   * Merge reading progress (last-write-wins)
   */
  private mergeProgress(
    local: ReadingProgressSync[],
    remote: ReadingProgressSync[],
    result: SyncResult
  ): ReadingProgressSync[] {
    const mergedMap = new Map<string, ReadingProgressSync>();
    const localMap = new Map(local.map((p) => [p.bookId, p]));
    const remoteMap = new Map(remote.map((p) => [p.bookId, p]));

    // Add all local progress
    for (const [bookId, progress] of localMap) {
      mergedMap.set(bookId, progress);
    }

    // Merge remote progress (last-write-wins based on timestamp)
    for (const [bookId, remoteProgress] of remoteMap) {
      const localProgress = localMap.get(bookId);

      if (!localProgress) {
        // Remote progress doesn't exist locally
        if (!remoteProgress.deleted) {
          mergedMap.set(bookId, remoteProgress);
          result.progressUpdated++;
        }
      } else {
        // Use the one with the most recent timestamp
        if (remoteProgress.timestamp > localProgress.timestamp) {
          mergedMap.set(bookId, remoteProgress);
          result.progressUpdated++;
        }
      }
    }

    // Handle deleted progress
    for (const [bookId, remoteProgress] of remoteMap) {
      if (remoteProgress.deleted && !localMap.has(bookId)) {
        mergedMap.delete(bookId);
      }
    }

    return Array.from(mergedMap.values());
  }

  /**
   * Resolve a single conflict
   */
  private resolveConflict(
    local: any,
    remote: any,
    resolution: ConflictResolution,
    result: SyncResult,
    conflictType: 'bookmark' | 'highlight' | 'progress' = 'bookmark'
  ): 'local' | 'remote' {
    const localTime = local.timestamp || 0;
    const remoteTime = remote.timestamp || 0;

    switch (resolution) {
      case 'client-wins':
        return 'local';
      case 'server-wins':
        return 'remote';
      case 'last-write-wins':
        return remoteTime > localTime ? 'remote' : 'local';
      case 'manual':
        // For now, use last-write-wins
        result.conflicts.push({
          type: conflictType,
          id: local.id,
          bookId: local.bookId,
          localData: local,
          remoteData: remote,
          resolution: remoteTime > localTime ? 'remote' : 'local',
        });
        return remoteTime > localTime ? 'remote' : 'local';
      default:
        return 'local';
    }
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
