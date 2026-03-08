/**
 * Dropbox Cloud Provider Implementation
 *
 * React Native version:
 * - Uses expo-file-system instead of Capacitor Filesystem
 * - Uses expo-auth-session for OAuth (TODO)
 * - Dropbox JS SDK works in RN but OAuth flow needs platform adaptation
 */

import { Paths, File, Directory } from 'expo-file-system';
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

// TODO: Install 'dropbox' package and configure OAuth with expo-auth-session
// For now this is a working stub that implements the CloudProvider interface.

export class DropboxProvider implements CloudProvider {
  type: CloudProviderType = 'dropbox';
  isConnected: boolean = false;
  private accessToken: string | null = null;
  private credentials: CloudCredentials | null = null;

  async connect(credentials: CloudCredentials): Promise<ConnectResult> {
    try {
      if (!credentials.accessToken) {
        return {
          success: false,
          error: 'Access token is required for Dropbox',
        };
      }

      this.accessToken = credentials.accessToken;
      this.credentials = credentials;

      // Test connection by getting account info via Dropbox HTTP API
      const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Dropbox API error: ${response.status}`);
      }

      const accountInfo = await response.json();

      this.isConnected = true;

      return {
        success: true,
        accountInfo: {
          email: accountInfo.email,
          name: `${accountInfo.name?.given_name || ''} ${accountInfo.name?.surname || ''}`.trim(),
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
    this.accessToken = null;
    this.credentials = null;
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
    if (!this.accessToken || !this.isConnected) {
      return false;
    }

    try {
      const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listBooks(): Promise<CloudBookFile[]> {
    if (!this.accessToken || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      // Ensure the books directory exists
      try {
        await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: CLOUD_BOOKS_PATH }),
        });
      } catch {
        // Folder may already exist (409 conflict)
      }

      const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: CLOUD_BOOKS_PATH }),
      });

      if (!response.ok) {
        throw new Error(`Failed to list folder: ${response.status}`);
      }

      const result = await response.json();
      const files: CloudBookFile[] = [];

      for (const entry of result.entries || []) {
        if (entry['.tag'] === 'file') {
          const extension = entry.name.split('.').pop()?.toLowerCase() || '';
          files.push({
            bookId: entry.id || entry.name,
            fileName: entry.name,
            path: entry.path_lower || entry.path_display,
            remotePath: entry.path_lower || entry.path_display,
            size: entry.size || 0,
            lastModified: entry.client_modified
              ? new Date(entry.client_modified).getTime()
              : Date.now(),
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
    if (!this.accessToken || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      // Read local file
      const file = new File(localPath);
      const bytes = await file.bytes();

      const fullPath = `${CLOUD_BOOKS_PATH}/${remotePath}`;

      // Upload to Dropbox via content upload endpoint
      const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path: fullPath,
            mode: 'overwrite',
            autorename: false,
          }),
        },
        body: bytes,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      onProgress?.(100);

      return result.path_lower || fullPath;
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
    if (!this.accessToken || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({ path: remotePath }),
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Save to local filesystem using expo-file-system
      const destFile = new File(localPath);
      destFile.write(uint8);

      onProgress?.(100);

      return localPath;
    } catch (error) {
      console.error('Failed to download book from Dropbox:', error);
      throw error;
    }
  }

  async deleteBook(remotePath: string): Promise<boolean> {
    if (!this.accessToken || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: remotePath }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete book from Dropbox:', error);
      return false;
    }
  }

  async uploadSyncData(data: SyncData): Promise<boolean> {
    if (!this.accessToken || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      const json = JSON.stringify(data, null, 2);

      const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path: SYNC_DATA_PATH,
            mode: 'overwrite',
            autorename: false,
          }),
        },
        body: json,
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to upload sync data to Dropbox:', error);
      return false;
    }
  }

  async downloadSyncData(): Promise<SyncData | null> {
    if (!this.accessToken || !this.isConnected) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({ path: SYNC_DATA_PATH }),
        },
      });

      if (!response.ok) {
        if (response.status === 409) {
          return null; // File doesn't exist yet
        }
        throw new Error(`Download failed: ${response.status}`);
      }

      const text = await response.text();
      return JSON.parse(text);
    } catch (error: any) {
      // Dropbox returns 409 for path/not_found
      if (error?.message?.includes('409') || error?.status === 409) {
        return null;
      }
      console.error('Failed to download sync data from Dropbox:', error);
      throw error;
    }
  }

  async getLastSyncTime(): Promise<number> {
    if (!this.accessToken || !this.isConnected) {
      return 0;
    }

    try {
      const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: SYNC_DATA_PATH }),
      });

      if (response.ok) {
        const metadata = await response.json();
        if (metadata.server_modified) {
          return new Date(metadata.server_modified).getTime();
        }
      }
    } catch {
      // File doesn't exist
    }
    return 0;
  }
}
