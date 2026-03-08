/**
 * React hook for Calibre-Web integration
 *
 * React Native version: Uses the RN calibreWebService and calibreWebStore.
 * Provides connect/disconnect/sync/download operations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { calibreWebService } from '../services/calibreWebService';
import { useCalibreWebStore } from '../stores/calibreWebStore';
import type { Book } from '../types/index';
import type {
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
    setSyncing,
    setLastSyncTime,
    setDownloadProgress,
    getActiveServer,
    getDownloadedBooks,
    getCloudOnlyBooks,
    loadState,
    setSyncedBooks,
    removeSyncedBook,
  } = useCalibreWebStore();

  const [_isInitialized, setIsInitialized] = useState(false);
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
        // Use the service's syncBooks which handles fetching + downloading
        const syncResult = await calibreWebService.syncBooks(syncOptions);
        result.booksSynced = syncResult.booksSynced;
        result.coversDownloaded = syncResult.coversDownloaded;
        result.booksDownloaded = syncResult.booksDownloaded;
        result.failedBooks = syncResult.failedBooks;
        result.errors = syncResult.errors;
        result.success = syncResult.success;
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

      const filePath = await calibreWebService.downloadBook(
        book,
        format,
        (progress: DownloadProgress) => {
          setDownloadProgress(book.id, progress);
        }
      );

      if (filePath) {
        setDownloadProgress(book.id, {
          bookId: book.id,
          bookTitle: book.title,
          progress: 100,
          bytesDownloaded: 1,
          totalBytes: 1,
          status: 'completed',
        });
        return filePath;
      }

      setDownloadProgress(book.id, {
        bookId: book.id,
        bookTitle: book.title,
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 0,
        status: 'failed',
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
  const deleteLocalBook = useCallback(
    async (localBookId: string): Promise<boolean> => {
      try {
        removeSyncedBook(localBookId);
        return true;
      } catch {
        return false;
      }
    },
    [removeSyncedBook]
  );

  // Refresh books from store
  const refreshBooks = useCallback(async (): Promise<void> => {
    const server = getActiveServer();
    if (server) {
      // Trigger a re-fetch by fetching from calibreWebService
      try {
        const books = await calibreWebService.fetchAllBooks();
        // The store handles the actual book state
        void books;
      } catch {
        // Ignore refresh errors
      }
    }
  }, [getActiveServer]);

  return {
    activeServer: getActiveServer(),
    isConnected,
    servers,
    syncedBooks: [],
    downloadedBooks: getDownloadedBooks() as unknown as Book[],
    cloudOnlyBooks: getCloudOnlyBooks() as unknown as Book[],
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
