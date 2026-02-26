/**
 * React hook for Calibre-Web integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { calibreWebService } from '../services/calibreWebService';
import { calibreWebDbService } from '../services/calibreWebDbService';
import { useCalibreWebStore } from '../stores/calibreWebStore';
import type { Book } from '../types/index';
import {
  CalibreWebServerConfig,
  CalibreWebBook,
  DownloadProgress,
  CalibreWebSyncResult,
  CalibreWebSyncOptions,
} from '../types/calibreWeb';

export interface UseCalibreWebReturn {
  // Server state
  activeServer: CalibreWebServerConfig | null;
  isConnected: boolean;
  servers: CalibreWebServerConfig[];

  // Book state
  syncedBooks: Book[];
  downloadedBooks: Book[];
  cloudOnlyBooks: Book[];

  // Sync state
  isSyncing: boolean;
  lastSyncTime: number | null;
  activeDownloads: Record<number, DownloadProgress>;

  // Actions
  connect: (serverUrl: string, username: string, password: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  testConnection: (
    serverUrl: string,
    username: string,
    password: string
  ) => Promise<{
    success: boolean;
    error?: string;
    bookCount?: number;
  }>;
  syncLibrary: (options?: Partial<CalibreWebSyncOptions>) => Promise<CalibreWebSyncResult>;
  downloadBook: (book: CalibreWebBook, format: string) => Promise<string | null>;
  cancelDownload: (bookId: number) => boolean;
  deleteLocalBook: (localBookId: string) => Promise<boolean>;
  refreshBooks: () => Promise<void>;
}

export function useCalibreWeb(): UseCalibreWebReturn {
  const {
    activeServerId,
    isConnected,
    servers,
    isSyncing,
    lastSyncTime,
    activeDownloads,
    setActiveServer,
    setConnected,
    addServer,
    removeServer,
    setSyncing,
    setLastSyncTime,
    setDownloadProgress,
    removeDownloadProgress,
    getActiveServer,
    getDownloadedBooks,
    getCloudOnlyBooks,
    loadState,
  } = useCalibreWebStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const downloadBookRef = useRef<
    ((book: CalibreWebBook, format: string) => Promise<string | null>) | undefined
  >(undefined);

  // Initialize service on mount
  useEffect(() => {
    const init = async () => {
      await loadState();
      await calibreWebService.initialize();
      const currentServer = calibreWebService.getCurrentServer();
      if (currentServer) {
        setActiveServer(currentServer.id);
        setConnected(true);
      }
      setIsInitialized(true);
    };

    init();
  }, [loadState, setActiveServer, setConnected]);

  // Connect to a Calibre-Web server
  const connect = useCallback(
    async (serverUrl: string, username: string, password: string): Promise<boolean> => {
      const success = await calibreWebService.login(serverUrl, username, password);
      if (success) {
        const server = calibreWebService.getCurrentServer();
        if (server) {
          setActiveServer(server.id);
          setConnected(true);
          addServer(server);
        }
      }
      return success;
    },
    [setActiveServer, setConnected, addServer]
  );

  // Disconnect from current server
  const disconnect = useCallback(async (): Promise<void> => {
    await calibreWebService.logout();
    setActiveServer('');
    setConnected(false);
  }, [setActiveServer, setConnected]);

  // Test connection to a server
  const testConnection = useCallback(
    async (
      serverUrl: string,
      username: string,
      password: string
    ): Promise<{ success: boolean; error?: string; bookCount?: number }> => {
      const result = await calibreWebService.testConnection(serverUrl, username, password);
      return {
        success: result.success,
        error: result.error,
        bookCount: result.bookCount,
      };
    },
    []
  );

  // Sync library from Calibre-Web
  const syncLibrary = useCallback(
    async (options: Partial<CalibreWebSyncOptions> = {}): Promise<CalibreWebSyncResult> => {
      const server = getActiveServer();
      if (!server) {
        return {
          success: false,
          booksSynced: 0,
          coversDownloaded: 0,
          booksDownloaded: 0,
          failedBooks: 0,
          errors: ['No active server'],
          duration: 0,
        };
      }

      setSyncing(true);
      const startTime = Date.now();

      const syncOptions: CalibreWebSyncOptions = {
        syncMetadata: options.syncMetadata ?? true,
        downloadCovers: options.downloadCovers ?? true,
        downloadBooks: options.downloadBooks ?? false,
        maxConcurrentDownloads: options.maxConcurrentDownloads ?? 3,
        retryFailedDownloads: options.retryFailedDownloads ?? false,
      };

      const result: CalibreWebSyncResult = {
        success: false,
        booksSynced: 0,
        coversDownloaded: 0,
        booksDownloaded: 0,
        failedBooks: 0,
        errors: [],
        duration: 0,
      };

      try {
        // Sync to database (which fetches books from server)
        const syncResult = await calibreWebDbService.syncCalibreWebBooksToDb(
          server,
          (current, total) => {
            // Progress callback
          }
        );

        result.booksSynced = syncResult.synced;
        result.failedBooks = syncResult.failed;
        result.errors = syncResult.errors;

        // Download covers if requested
        if (syncOptions.downloadCovers) {
          const books = await calibreWebService.fetchAllBooks();
          for (const book of books) {
            if (book.cover) {
              try {
                await calibreWebDbService.cacheBookCover(book.id, book.cover, server);
                result.coversDownloaded++;
              } catch {
                // Ignore cover errors
              }
            }
          }
        }

        // Download books if requested
        if (syncOptions.downloadBooks) {
          const books = await calibreWebService.fetchAllBooks();
          let downloadedCount = 0;

          for (const book of books) {
            const formats = calibreWebService.getAvailableFormats(book);
            const format = formats.find((f) => f === 'EPUB') || formats[0];
            if (format && downloadBookRef.current) {
              const path = await downloadBookRef.current(book, format);
              if (path) downloadedCount++;
            }
          }

          result.booksDownloaded = downloadedCount;
        }

        // Update server's last sync time
        server.lastSyncAt = Date.now();

        result.success = true;
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : 'Sync failed');
      }

      result.duration = Date.now() - startTime;
      setSyncing(false);
      setLastSyncTime(Date.now());

      return result;
    },
    [getActiveServer, setSyncing, setLastSyncTime]
  );

  // Download a single book
  const downloadBook = useCallback(
    async (book: CalibreWebBook, format: string): Promise<string | null> => {
      const server = getActiveServer();
      if (!server) {
        return null;
      }

      const result = await calibreWebDbService.downloadCalibreWebBook(
        book,
        format,
        server,
        (progress, downloaded, total) => {
          setDownloadProgress(book.id, {
            bookId: book.id,
            bookTitle: book.title,
            progress,
            bytesDownloaded: downloaded,
            totalBytes: total,
            status: progress < 100 ? 'downloading' : 'completed',
          });
        }
      );

      if (result.success) {
        setDownloadProgress(book.id, {
          bookId: book.id,
          bookTitle: book.title,
          progress: 100,
          bytesDownloaded: 1,
          totalBytes: 1,
          status: 'completed',
        });
        return result.filePath || null;
      }

      setDownloadProgress(book.id, {
        bookId: book.id,
        bookTitle: book.title,
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 0,
        status: 'failed',
        error: result.error,
      });

      return null;
    },
    [getActiveServer, setDownloadProgress]
  );

  // Store downloadBook in ref to avoid circular dependency
  downloadBookRef.current = downloadBook;

  // Cancel a download
  const cancelDownload = useCallback((bookId: number): boolean => {
    return calibreWebService.cancelDownload(bookId);
  }, []);

  // Delete a local book
  const deleteLocalBook = useCallback(async (localBookId: string): Promise<boolean> => {
    return await calibreWebDbService.deleteCalibreWebBook(localBookId);
  }, []);

  // Refresh books from database
  const refreshBooks = useCallback(async (): Promise<void> => {
    // This would trigger a re-fetch from the database
    // The store handles persistence, so this is mainly for forcing updates
    const server = getActiveServer();
    if (server) {
      const books = await calibreWebDbService.getCalibreWebBooks(server.id);
      // Update store with fresh data
      useCalibreWebStore.setState({ syncedBooks: books as any });
    }
  }, [getActiveServer]);

  return {
    activeServer: getActiveServer(),
    isConnected,
    servers,
    syncedBooks: [],
    downloadedBooks: getDownloadedBooks() as any,
    cloudOnlyBooks: getCloudOnlyBooks() as any,
    isSyncing,
    lastSyncTime,
    activeDownloads,
    connect,
    disconnect,
    testConnection,
    syncLibrary,
    downloadBook,
    cancelDownload,
    deleteLocalBook,
    refreshBooks,
  };
}
