/**
 * Calibre-Web API Service
 * Handles authentication, metadata sync, and book downloads from Calibre-Web servers.
 *
 * React Native version:
 * - Uses standard fetch instead of axios
 * - Uses expo-file-system instead of Capacitor Filesystem
 * - Uses AsyncStorage instead of Capacitor Preferences
 */

import { Paths, File, Directory } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalibreWebServerConfig,
  CalibreWebBook,
  CalibreWebBooksResponse,
  CalibreWebConnectionTest,
  DownloadProgress,
  CalibreWebSyncOptions,
  CalibreWebSyncResult,
} from '../types/calibreWeb';

// Constants
const PREF_KEY_SERVERS = 'calibreweb_servers';
const PREF_KEY_ACTIVE_SERVER = 'calibreweb_active_server';
const BOOKS_DIR = new Directory(Paths.document, 'calibreweb_books');
const COVER_DIR = new Directory(Paths.cache, 'calibreweb_covers');

// API endpoints
const CALIBRE_WEB_API = {
  LOGIN: '/api/login',
  BOOKS: '/api/books',
  BOOK: '/api/books/:id',
  COVER: '/api/cover/:id',
  DOWNLOAD: '/api/download/:id/:format',
  SYNC: '/api/sync',
};

// Progress callback type
type ProgressCallback = (progress: DownloadProgress) => void;

/**
 * Helper: convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export class CalibreWebService {
  private currentConfig: CalibreWebServerConfig | null = null;
  private activeDownloads: Map<number, AbortController> = new Map();

  /**
   * Initialize the service with stored configuration
   */
  async initialize(): Promise<void> {
    const activeServerId = await AsyncStorage.getItem(PREF_KEY_ACTIVE_SERVER);
    if (activeServerId) {
      const servers = await this.loadServers();
      const server = servers.find((s) => s.id === activeServerId && s.isActive);
      if (server) {
        this.currentConfig = server;
      }
    }
  }

  /**
   * Build headers for authenticated requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.currentConfig?.token) {
      headers['Authorization'] = `Bearer ${this.currentConfig.token}`;
    }
    return headers;
  }

  /**
   * Make an authenticated fetch request
   */
  private async authenticatedFetch(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.currentConfig) {
      throw new Error('Not connected to Calibre-Web server');
    }

    const url = `${this.currentConfig.serverUrl}${path}`;
    const headers = { ...this.getHeaders(), ...(options.headers as Record<string, string> || {}) };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 - try to re-authenticate
    if (response.status === 401 && this.currentConfig) {
      const loginSuccess = await this.login(
        this.currentConfig.serverUrl,
        this.currentConfig.username,
        this.currentConfig.password || ''
      );
      if (loginSuccess) {
        // Retry with new token
        const retryHeaders = { ...this.getHeaders(), ...(options.headers as Record<string, string> || {}) };
        return fetch(url, { ...options, headers: retryHeaders });
      }
    }

    return response;
  }

  /**
   * Test connection to a Calibre-Web server
   */
  async testConnection(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<CalibreWebConnectionTest> {
    const startTime = Date.now();
    try {
      const normalizedUrl = this.normalizeUrl(serverUrl);

      // Try to login
      const loginResult = await fetch(`${normalizedUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const loginData = await loginResult.json();
      const responseTime = Date.now() - startTime;

      if (loginData.success) {
        // Try to get basic info
        try {
          const booksResponse = await fetch(`${normalizedUrl}/api/books?limit=1`, {
            headers: { Authorization: `Bearer ${loginData.token}` },
          });
          const booksData = await booksResponse.json();

          return {
            success: true,
            bookCount: booksData.total || 0,
            responseTime,
          };
        } catch {
          return {
            success: true,
            responseTime,
          };
        }
      }

      return {
        success: false,
        error: loginData.message || 'Authentication failed',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
        responseTime,
      };
    }
  }

  /**
   * Login to Calibre-Web server
   */
  async login(serverUrl: string, username: string, password: string): Promise<boolean> {
    try {
      const normalizedUrl = this.normalizeUrl(serverUrl);

      const response = await fetch(`${normalizedUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success || data.token) {
        const token = data.token;

        // Check if server already exists
        const servers = await this.loadServers();
        let server = servers.find((s) => s.serverUrl === normalizedUrl && s.username === username);

        if (server) {
          // Update existing server
          server.token = token;
          server.updatedAt = Date.now();
        } else {
          // Create new server config
          server = {
            id: this.generateId(),
            name: this.getServerName(normalizedUrl),
            serverUrl: normalizedUrl,
            username,
            password,
            token,
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          servers.push(server);
        }

        // Set as active server
        await this.saveServers(servers);
        await AsyncStorage.setItem(PREF_KEY_ACTIVE_SERVER, server.id);

        this.currentConfig = server;

        return true;
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  /**
   * Logout from current server
   */
  async logout(): Promise<void> {
    this.currentConfig = null;
    await AsyncStorage.removeItem(PREF_KEY_ACTIVE_SERVER);
  }

  /**
   * Fetch all books from Calibre-Web server
   */
  async fetchAllBooks(
    onProgress?: (current: number, total: number) => void
  ): Promise<CalibreWebBook[]> {
    if (!this.currentConfig) {
      throw new Error('Not connected to Calibre-Web server');
    }

    const allBooks: CalibreWebBook[] = [];
    let page = 0;
    const pageSize = 100;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await this.authenticatedFetch(
          `/api/books?offset=${page * pageSize}&limit=${pageSize}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch books: ${response.status}`);
        }

        const data: CalibreWebBooksResponse = await response.json();

        if (data.books) {
          allBooks.push(...data.books);
          hasMore = allBooks.length < (data.total || 0);

          if (onProgress) {
            onProgress(allBooks.length, data.total || 0);
          }
        } else {
          hasMore = false;
        }

        page++;
      }

      return allBooks;
    } catch (error) {
      console.error('Failed to fetch books:', error);
      throw error;
    }
  }

  /**
   * Fetch a single book's metadata
   */
  async fetchBook(bookId: number): Promise<CalibreWebBook | null> {
    if (!this.currentConfig) {
      throw new Error('Not connected to Calibre-Web server');
    }

    try {
      const response = await this.authenticatedFetch(`/api/books/${bookId}`);
      if (!response.ok) return null;

      const data = await response.json();
      return data.book || null;
    } catch (error) {
      console.error(`Failed to fetch book ${bookId}:`, error);
      return null;
    }
  }

  /**
   * Download and cache a book's cover image
   */
  async downloadCover(bookId: number, coverUrl?: string): Promise<string | null> {
    if (!this.currentConfig) {
      throw new Error('Not connected to Calibre-Web server');
    }

    try {
      // Ensure cover directory exists
      if (!COVER_DIR.exists) {
        COVER_DIR.create({ intermediates: true });
      }

      const url = coverUrl
        ? (coverUrl.startsWith('http') ? coverUrl : `${this.currentConfig.serverUrl}${coverUrl}`)
        : `${this.currentConfig.serverUrl}/api/cover/${bookId}`;

      const fileName = `cover_${bookId}_${this.currentConfig.id}.jpg`;
      const destFile = new File(COVER_DIR, fileName);

      const downloadedFile = await File.downloadFileAsync(url, destFile, {
        headers: this.getHeaders(),
        idempotent: true,
      });

      return downloadedFile.uri;
    } catch (error) {
      console.error(`Failed to download cover for book ${bookId}:`, error);
      return null;
    }
  }

  /**
   * Download a book file
   */
  async downloadBook(
    book: CalibreWebBook,
    format: string,
    onProgress?: ProgressCallback
  ): Promise<string | null> {
    if (!this.currentConfig) {
      throw new Error('Not connected to Calibre-Web server');
    }

    // Check if format exists
    const formatData = book.formats?.find((f) => f.format.toLowerCase() === format.toLowerCase());
    if (!formatData) {
      throw new Error(`Format ${format} not available for this book`);
    }

    // Create abort controller for this download
    const abortController = new AbortController();
    this.activeDownloads.set(book.id, abortController);

    const progress: DownloadProgress = {
      bookId: book.id,
      bookTitle: book.title,
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: formatData.uncompressed_size || 0,
      status: 'pending',
    };

    try {
      // Ensure books directory exists
      if (!BOOKS_DIR.exists) {
        BOOKS_DIR.create({ intermediates: true });
      }

      progress.status = 'downloading';
      onProgress?.(progress);

      const ext = format.toLowerCase();
      const fileName = `${this.sanitizeFileName(book.title)}_${book.id}.${ext}`;
      const destFile = new File(BOOKS_DIR, fileName);

      const downloadUrl = formatData.download_url
        ? (formatData.download_url.startsWith('http')
            ? formatData.download_url
            : `${this.currentConfig.serverUrl}${formatData.download_url}`)
        : `${this.currentConfig.serverUrl}/api/download/${book.id}/${format}`;

      const downloadedFile = await File.downloadFileAsync(
        downloadUrl,
        destFile,
        {
          headers: this.getHeaders(),
          idempotent: true,
        }
      );

      progress.progress = 100;
      progress.status = 'completed';
      onProgress?.(progress);
      return downloadedFile.uri;
    } catch (error) {
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : 'Download failed';
      onProgress?.(progress);
      return null;
    } finally {
      this.activeDownloads.delete(book.id);
    }
  }

  /**
   * Cancel a book download
   */
  cancelDownload(bookId: number): boolean {
    const controller = this.activeDownloads.get(bookId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(bookId);
      return true;
    }
    return false;
  }

  /**
   * Check if a book is already downloaded locally
   */
  async isBookDownloaded(bookId: number, title: string): Promise<boolean> {
    try {
      const formats = ['epub', 'pdf', 'mobi', 'azw3'];

      for (const format of formats) {
        const fileName = `${this.sanitizeFileName(title)}_${bookId}.${format}`;
        const file = new File(BOOKS_DIR, fileName);
        if (file.exists) return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get local file path for a downloaded book
   */
  async getLocalBookPath(bookId: number, title: string): Promise<string | null> {
    const formats = ['epub', 'pdf', 'mobi', 'azw3'];

    for (const format of formats) {
      const fileName = `${this.sanitizeFileName(title)}_${bookId}.${format}`;
      const file = new File(BOOKS_DIR, fileName);
      if (file.exists) return file.uri;
    }

    return null;
  }

  /**
   * Delete a downloaded book
   */
  async deleteLocalBook(bookId: number, title: string): Promise<boolean> {
    const formats = ['epub', 'pdf', 'mobi', 'azw3'];

    for (const format of formats) {
      const fileName = `${this.sanitizeFileName(title)}_${bookId}.${format}`;
      const file = new File(BOOKS_DIR, fileName);
      try {
        if (file.exists) {
          file.delete();
          return true;
        }
      } catch {
        // Continue
      }
    }

    return false;
  }

  /**
   * Get available formats for a book
   */
  getAvailableFormats(book: CalibreWebBook): string[] {
    return book.formats?.map((f) => f.format.toUpperCase()) || [];
  }

  /**
   * Sync books from Calibre-Web
   */
  async syncBooks(
    options: CalibreWebSyncOptions,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<CalibreWebSyncResult> {
    const startTime = Date.now();
    const result: CalibreWebSyncResult = {
      success: false,
      booksSynced: 0,
      coversDownloaded: 0,
      booksDownloaded: 0,
      failedBooks: 0,
      errors: [],
      duration: 0,
    };

    if (!this.currentConfig) {
      result.errors.push('Not connected to Calibre-Web server');
      return result;
    }

    try {
      // Fetch all books
      const books = await this.fetchAllBooks();
      result.booksSynced = books.length;

      // Download covers if requested
      if (options.downloadCovers) {
        for (const book of books) {
          if (book.cover) {
            try {
              await this.downloadCover(book.id, book.cover);
              result.coversDownloaded++;
            } catch {
              result.errors.push(`Failed to download cover for "${book.title}"`);
            }
          }
        }
      }

      // Download books if requested (offline mode)
      if (options.downloadBooks) {
        const downloadPromises: Promise<void>[] = [];
        let activeDownloads = 0;

        for (const book of books) {
          // Prefer EPUB, fallback to PDF
          const formats = this.getAvailableFormats(book);
          const format = formats.find((f) => f === 'EPUB') || formats[0];

          if (format) {
            // Limit concurrent downloads
            while (activeDownloads >= options.maxConcurrentDownloads) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            activeDownloads++;

            const promise = this.downloadBook(book, format, onProgress)
              .then(() => {
                result.booksDownloaded++;
              })
              .catch(() => {
                result.failedBooks++;
              })
              .finally(() => {
                activeDownloads--;
              });

            downloadPromises.push(promise);
          }
        }

        await Promise.all(downloadPromises);
      }

      // Update last sync time
      this.currentConfig.lastSyncAt = Date.now();
      const servers = await this.loadServers();
      const serverIndex = servers.findIndex((s) => s.id === this.currentConfig!.id);
      if (serverIndex !== -1) {
        servers[serverIndex] = this.currentConfig;
        await this.saveServers(servers);
      }

      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Sync failed');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Get current server config
   */
  getCurrentServer(): CalibreWebServerConfig | null {
    return this.currentConfig;
  }

  /**
   * Load all saved servers
   */
  async loadServers(): Promise<CalibreWebServerConfig[]> {
    try {
      const value = await AsyncStorage.getItem(PREF_KEY_SERVERS);
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save servers to AsyncStorage
   */
  async saveServers(servers: CalibreWebServerConfig[]): Promise<void> {
    await AsyncStorage.setItem(PREF_KEY_SERVERS, JSON.stringify(servers));
  }

  /**
   * Delete a server configuration
   */
  async deleteServer(serverId: string): Promise<void> {
    const servers = await this.loadServers();
    const filtered = servers.filter((s) => s.id !== serverId);
    await this.saveServers(filtered);

    if (this.currentConfig?.id === serverId) {
      await this.logout();
    }
  }

  /**
   * Normalize server URL
   */
  private normalizeUrl(url: string): string {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');
    return normalized;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `cw_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Extract server name from URL
   */
  private getServerName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'Calibre-Web Server';
    }
  }

  /**
   * Sanitize filename
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }
}

// Export singleton instance
export const calibreWebService = new CalibreWebService();
