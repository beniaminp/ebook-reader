/**
 * Calibre-Web API Service
 * Handles authentication, metadata sync, and book downloads from Calibre-Web servers
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import {
  CalibreWebServerConfig,
  CalibreWebBook,
  CalibreWebBooksResponse,
  CalibreWebAuthResponse,
  CalibreWebConnectionTest,
  DownloadProgress,
  CalibreWebSyncOptions,
  CalibreWebSyncResult,
  CalibreWebFormat,
} from '../types/calibreWeb';

// Constants
const PREF_KEY_SERVERS = 'calibreweb_servers';
const PREF_KEY_ACTIVE_SERVER = 'calibreweb_active_server';
const CACHE_DIR = 'calibreweb_cache';
const BOOKS_DIR = 'calibreweb_books';
const COVER_DIR = 'calibreweb_covers';

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

export class CalibreWebService {
  private httpClient: AxiosInstance | null = null;
  private currentConfig: CalibreWebServerConfig | null = null;
  private activeDownloads: Map<number, AbortController> = new Map();

  /**
   * Initialize the service with stored configuration
   */
  async initialize(): Promise<void> {
    const activeServerId = await Preferences.get({ key: PREF_KEY_ACTIVE_SERVER });
    if (activeServerId.value) {
      const servers = await this.loadServers();
      const server = servers.find(s => s.id === activeServerId.value && s.isActive);
      if (server) {
        this.currentConfig = server;
        await this.createHttpClient(server);
      }
    }
  }

  /**
   * Create HTTP client for a server
   */
  private async createHttpClient(config: CalibreWebServerConfig): Promise<AxiosInstance> {
    this.httpClient = axios.create({
      baseURL: config.serverUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token if available
    if (config.token) {
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${config.token}`;
    }

    // Add request interceptor for auth
    this.httpClient.interceptors.request.use(
      (config) => config,
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          if (this.currentConfig) {
            const loginSuccess = await this.login(
              this.currentConfig.serverUrl,
              this.currentConfig.username,
              this.currentConfig.password || ''
            );
            if (loginSuccess && error.config) {
              // Retry original request
              return this.httpClient!.request(error.config);
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return this.httpClient;
  }

  /**
   * Test connection to a Calibre-Web server
   */
  async testConnection(serverUrl: string, username: string, password: string): Promise<CalibreWebConnectionTest> {
    const startTime = Date.now();
    try {
      // Normalize URL
      const normalizedUrl = this.normalizeUrl(serverUrl);

      // Create temp client
      const tempClient = axios.create({
        baseURL: normalizedUrl,
        timeout: 15000,
      });

      // Try to login
      const loginResult = await tempClient.post('/api/login', {
        username,
        password,
      });

      const responseTime = Date.now() - startTime;

      if (loginResult.data.success) {
        // Try to get basic info
        try {
          const booksResponse = await tempClient.get('/api/books', {
            headers: {
              Authorization: `Bearer ${loginResult.data.token}`,
            },
            params: { limit: 1 },
          });

          return {
            success: true,
            bookCount: booksResponse.data.total || 0,
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
        error: loginResult.data.message || 'Authentication failed',
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

      const tempClient = axios.create({
        baseURL: normalizedUrl,
        timeout: 15000,
      });

      const response = await tempClient.post('/api/login', {
        username,
        password,
      });

      if (response.data.success || response.data.token) {
        const token = response.data.token;

        // Check if server already exists
        const servers = await this.loadServers();
        let server = servers.find(s => s.serverUrl === normalizedUrl && s.username === username);

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
            password, // In production, this should be encrypted
            token,
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          servers.push(server);
        }

        // Set as active server
        await this.saveServers(servers);
        await Preferences.set({ key: PREF_KEY_ACTIVE_SERVER, value: server.id });

        this.currentConfig = server;
        await this.createHttpClient(server);

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
    this.httpClient = null;
    await Preferences.remove({ key: PREF_KEY_ACTIVE_SERVER });
  }

  /**
   * Fetch all books from Calibre-Web server
   */
  async fetchAllBooks(onProgress?: (current: number, total: number) => void): Promise<CalibreWebBook[]> {
    if (!this.httpClient || !this.currentConfig) {
      throw new Error('Not connected to Calibre-Web server');
    }

    const allBooks: CalibreWebBook[] = [];
    let page = 0;
    const pageSize = 100;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await this.httpClient.get<CalibreWebBooksResponse>('/api/books', {
          params: {
            offset: page * pageSize,
            limit: pageSize,
          },
        });

        if (response.data.books) {
          allBooks.push(...response.data.books);
          hasMore = allBooks.length < (response.data.total || 0);

          if (onProgress) {
            onProgress(allBooks.length, response.data.total || 0);
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
    if (!this.httpClient || !this.currentConfig) {
      throw new Error('Not connected to Calibre-Web server');
    }

    try {
      const response = await this.httpClient.get<{ book: CalibreWebBook }>(`/api/books/${bookId}`);
      return response.data.book || null;
    } catch (error) {
      console.error(`Failed to fetch book ${bookId}:`, error);
      return null;
    }
  }

  /**
   * Download and cache a book's cover image
   */
  async downloadCover(bookId: number, coverUrl?: string): Promise<string | null> {
    if (!this.httpClient || !this.currentConfig) {
      throw new Error('Not connected to Calibre-Web server');
    }

    try {
      const url = coverUrl || `/api/cover/${bookId}`;
      const response = await this.httpClient.get(url, {
        responseType: 'arraybuffer',
      });

      // Save to filesystem
      const fileName = `cover_${bookId}_${this.currentConfig.id}.jpg`;
      const filePath = `${COVER_DIR}/${fileName}`;

      await Filesystem.writeFile({
        path: filePath,
        data: this.arrayBufferToBase64(response.data),
        directory: Directory.Cache,
        recursive: true,
      });

      return filePath;
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
    if (!this.httpClient || !this.currentConfig) {
      throw new Error('Not connected to Calibre-Web server');
    }

    // Check if format exists
    const formatData = book.formats?.find(f => f.format.toLowerCase() === format.toLowerCase());
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
      progress.status = 'downloading';
      onProgress?.(progress);

      const response = await this.httpClient.get(formatData.download_url || `/api/download/${book.id}/${format}`, {
        responseType: 'arraybuffer',
        signal: abortController.signal,
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            progress.progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            progress.bytesDownloaded = progressEvent.loaded;
            progress.totalBytes = progressEvent.total;
            onProgress?.(progress);
          }
        },
      });

      // Save to filesystem
      const ext = format.toLowerCase();
      const fileName = `${this.sanitizeFileName(book.title)}_${book.id}.${ext}`;
      const filePath = `${BOOKS_DIR}/${fileName}`;

      await Filesystem.writeFile({
        path: filePath,
        data: this.arrayBufferToBase64(response.data),
        directory: Directory.Data,
        recursive: true,
      });

      progress.progress = 100;
      progress.status = 'completed';
      onProgress?.(progress);

      return filePath;
    } catch (error) {
      if (axios.isCancel(error)) {
        progress.status = 'cancelled';
      } else {
        progress.status = 'failed';
        progress.error = error instanceof Error ? error.message : 'Download failed';
      }
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
      // Check multiple possible formats
      const formats = ['epub', 'pdf', 'mobi', 'azw3'];

      for (const format of formats) {
        const fileName = `${this.sanitizeFileName(title)}_${bookId}.${format}`;
        try {
          await Filesystem.stat({
            path: `${BOOKS_DIR}/${fileName}`,
            directory: Directory.Data,
          });
          return true;
        } catch {
          // File doesn't exist, try next format
        }
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
      try {
        await Filesystem.stat({
          path: `${BOOKS_DIR}/${fileName}`,
          directory: Directory.Data,
        });
        return `${BOOKS_DIR}/${fileName}`;
      } catch {
        // Continue
      }
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
      try {
        await Filesystem.deleteFile({
          path: `${BOOKS_DIR}/${fileName}`,
          directory: Directory.Data,
        });
        return true;
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
    return book.formats?.map(f => f.format.toUpperCase()) || [];
  }

  /**
   * Sync books from Calibre-Web
   */
  async syncBooks(options: CalibreWebSyncOptions, onProgress?: (progress: DownloadProgress) => void): Promise<CalibreWebSyncResult> {
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
            } catch (error) {
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
          const format = formats.find(f => f === 'EPUB') || formats[0];

          if (format) {
            // Limit concurrent downloads
            while (activeDownloads >= options.maxConcurrentDownloads) {
              await new Promise(resolve => setTimeout(resolve, 100));
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
      const serverIndex = servers.findIndex(s => s.id === this.currentConfig!.id);
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
      const { value } = await Preferences.get({ key: PREF_KEY_SERVERS });
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save servers to preferences
   */
  async saveServers(servers: CalibreWebServerConfig[]): Promise<void> {
    await Preferences.set({
      key: PREF_KEY_SERVERS,
      value: JSON.stringify(servers),
    });
  }

  /**
   * Delete a server configuration
   */
  async deleteServer(serverId: string): Promise<void> {
    const servers = await this.loadServers();
    const filtered = servers.filter(s => s.id !== serverId);
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

  /**
   * Convert array buffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// Export singleton instance
export const calibreWebService = new CalibreWebService();
