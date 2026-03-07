/**
 * Dropbox Cloud Provider Implementation
 */

import { Dropbox } from 'dropbox';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ensureNoMedia } from '../noMediaService';
import { blobToBase64, blobToText } from '../../utils/converters';
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

export class DropboxProvider implements CloudProvider {
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
      const base64 = await blobToBase64(fileBlob);

      // Save to local filesystem
      const dir = localPath.includes('/') ? localPath.substring(0, localPath.lastIndexOf('/')) : '.';
      await ensureNoMedia(Directory.Data, dir);
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
      const text = await blobToText(fileBlob);
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
}
