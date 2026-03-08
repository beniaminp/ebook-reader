/**
 * WebDAV Cloud Provider Implementation
 *
 * React Native version:
 * - Uses fetch-based WebDAV requests instead of the 'webdav' npm package
 *   (which relies on Node.js APIs not available in RN)
 * - Uses expo-file-system for local file I/O
 */

import { File } from 'expo-file-system';
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

/**
 * Minimal WebDAV client using fetch (no external dependency).
 * Covers PROPFIND, GET, PUT, DELETE, MKCOL.
 */
class SimpleWebDAVClient {
  constructor(
    private baseUrl: string,
    private username: string,
    private password: string
  ) {}

  private get authHeader(): string {
    // Basic auth
    const encoded = btoa(`${this.username}:${this.password}`);
    return `Basic ${encoded}`;
  }

  private url(path: string): string {
    const base = this.baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  async propfind(path: string, depth: '0' | '1' = '1'): Promise<Response> {
    return fetch(this.url(path), {
      method: 'PROPFIND',
      headers: {
        Authorization: this.authHeader,
        Depth: depth,
        'Content-Type': 'application/xml',
      },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname />
    <d:getcontentlength />
    <d:getlastmodified />
    <d:resourcetype />
  </d:prop>
</d:propfind>`,
    });
  }

  async get(path: string): Promise<Response> {
    return fetch(this.url(path), {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
      },
    });
  }

  async put(path: string, body: string | Uint8Array): Promise<Response> {
    return fetch(this.url(path), {
      method: 'PUT',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/octet-stream',
      },
      body: body instanceof Uint8Array ? body.buffer as ArrayBuffer : body,
    });
  }

  async delete(path: string): Promise<Response> {
    return fetch(this.url(path), {
      method: 'DELETE',
      headers: {
        Authorization: this.authHeader,
      },
    });
  }

  async mkcol(path: string): Promise<Response> {
    return fetch(this.url(path), {
      method: 'MKCOL',
      headers: {
        Authorization: this.authHeader,
      },
    });
  }
}

/**
 * Parse a PROPFIND multistatus XML response into file entries.
 * Uses a simple regex-based parser since DOMParser is not available in RN.
 */
function parsePropfindResponse(
  xml: string,
  basePath: string
): Array<{
  href: string;
  name: string;
  isDirectory: boolean;
  size: number;
  lastModified: string;
}> {
  const entries: Array<{
    href: string;
    name: string;
    isDirectory: boolean;
    size: number;
    lastModified: string;
  }> = [];

  // Split by <d:response> or <D:response>
  const responseRegex = /<(?:d|D):response>([\s\S]*?)<\/(?:d|D):response>/g;
  let match: RegExpExecArray | null;

  while ((match = responseRegex.exec(xml)) !== null) {
    const block = match[1];

    // Extract href
    const hrefMatch = block.match(/<(?:d|D):href>([^<]+)<\/(?:d|D):href>/);
    const href = hrefMatch ? decodeURIComponent(hrefMatch[1]) : '';

    // Check if it's a collection (directory)
    const isDirectory = /<(?:d|D):collection\s*\/?>/.test(block);

    // Extract content length
    const sizeMatch = block.match(/<(?:d|D):getcontentlength>(\d+)<\/(?:d|D):getcontentlength>/);
    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;

    // Extract last modified
    const lastModMatch = block.match(
      /<(?:d|D):getlastmodified>([^<]+)<\/(?:d|D):getlastmodified>/
    );
    const lastModified = lastModMatch ? lastModMatch[1] : '';

    // Extract name from href
    const cleanHref = href.replace(/\/$/, '');
    const name = cleanHref.split('/').pop() || '';

    // Skip the base directory itself
    const normalizedHref = cleanHref.replace(/\/$/, '');
    const normalizedBase = basePath.replace(/\/$/, '');
    if (normalizedHref === normalizedBase || !name) {
      continue;
    }

    entries.push({ href: cleanHref, name, isDirectory, size, lastModified });
  }

  return entries;
}

export class WebDAVProvider implements CloudProvider {
  type: CloudProviderType = 'webdav';
  isConnected: boolean = false;
  private client: SimpleWebDAVClient | null = null;
  private credentials: CloudCredentials | null = null;

  async connect(credentials: CloudCredentials): Promise<ConnectResult> {
    try {
      if (!credentials.url || !credentials.username || !credentials.password) {
        return {
          success: false,
          error: 'URL, username, and password are required for WebDAV',
        };
      }

      this.client = new SimpleWebDAVClient(credentials.url, credentials.username, credentials.password);
      this.credentials = credentials;

      // Test connection by listing root
      const response = await this.client.propfind('/', '0');
      if (!response.ok && response.status !== 207) {
        throw new Error(`WebDAV server returned ${response.status}`);
      }

      this.isConnected = true;

      return {
        success: true,
        accountInfo: {
          email: credentials.username,
          name: credentials.username,
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
      const response = await this.client.propfind('/', '0');
      return response.ok || response.status === 207;
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
        await this.client.mkcol(CLOUD_BOOKS_PATH);
      } catch {
        // Directory may already exist
      }

      const response = await this.client.propfind(CLOUD_BOOKS_PATH);
      if (!response.ok && response.status !== 207) {
        throw new Error(`Failed to list directory: ${response.status}`);
      }

      const xml = await response.text();
      const entries = parsePropfindResponse(xml, CLOUD_BOOKS_PATH);
      const files: CloudBookFile[] = [];

      for (const item of entries) {
        if (!item.isDirectory) {
          const extension = item.name.split('.').pop()?.toLowerCase() || '';
          files.push({
            bookId: item.href,
            fileName: item.name,
            path: item.href,
            remotePath: item.href,
            size: item.size,
            lastModified: item.lastModified ? new Date(item.lastModified).getTime() : Date.now(),
            format: extension,
          });
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
      const file = new File(localPath);
      const bytes = await file.bytes();

      const fullPath = `${CLOUD_BOOKS_PATH}/${remotePath}`;

      // Upload to WebDAV
      const response = await this.client.put(fullPath, bytes);
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

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
      const response = await this.client.get(remotePath);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Save to local filesystem
      const destFile = new File(localPath);
      destFile.write(uint8);

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
      const response = await this.client.delete(remotePath);
      return response.ok || response.status === 204;
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
      const response = await this.client.put(SYNC_DATA_PATH, json);
      return response.ok || response.status === 201 || response.status === 204;
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
      const response = await this.client.get(SYNC_DATA_PATH);
      if (response.status === 404) {
        return null; // File doesn't exist yet
      }
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const text = await response.text();
      return JSON.parse(text);
    } catch (error: any) {
      if (error?.message?.includes('404') || error?.status === 404) {
        return null;
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
      const response = await this.client.propfind(SYNC_DATA_PATH, '0');
      if (response.ok || response.status === 207) {
        const xml = await response.text();
        const lastModMatch = xml.match(
          /<(?:d|D):getlastmodified>([^<]+)<\/(?:d|D):getlastmodified>/
        );
        if (lastModMatch) {
          return new Date(lastModMatch[1]).getTime();
        }
      }
    } catch {
      // File doesn't exist
    }
    return 0;
  }
}
