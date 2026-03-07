/**
 * WebDAV Cloud Provider Implementation
 */

import { createClient, WebDAVClient } from 'webdav';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ensureNoMedia } from '../noMediaService';
import type {
  CloudProvider,
  CloudProviderType,
  CloudCredentials,
  ConnectResult,
  CloudBookFile,
  SyncData,
} from '../../types/cloudSync';

const SYNC_DATA_PATH = '/ebook-reader-sync.json';
const CLOUD_BOOKS_PATH = '/ebook-reader/books';

export class WebDAVProvider implements CloudProvider {
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
      const dir = localPath.includes('/') ? localPath.substring(0, localPath.lastIndexOf('/')) : '.';
      await ensureNoMedia(Directory.Data, dir);
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
