/**
 * Calibre-Web Database Integration Service
 * Handles syncing Calibre-Web books to the local database.
 *
 * React Native version:
 * - Uses expo-file-system instead of Capacitor Filesystem
 * - Uses the RN calibreWebService singleton
 * - Uses the RN databaseService facade
 */

import { Paths, File, Directory } from 'expo-file-system';
import { calibreWebService } from './calibreWebService';
import {
  addBook,
  updateBook,
  getBookById,
  getAllBooks,
} from './database';
import type { Book } from '../types/index';
import type {
  CalibreWebBook,
  CalibreWebServerConfig,
  CalibreWebSyncStatus,
} from '../types/calibreWeb';

// Constants
const CALIBRE_WEB_CACHE_DIR = new Directory(Paths.cache, 'calibreweb_covers');
const CALIBRE_WEB_BOOKS_DIR = new Directory(Paths.document, 'calibreweb_books');

/**
 * Sync Calibre-Web books to database
 */
export async function syncCalibreWebBooksToDb(
  serverConfig: CalibreWebServerConfig,
  onProgress?: (current: number, total: number) => void
): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const result = {
    synced: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Fetch all books from Calibre-Web
    const books = await calibreWebService.fetchAllBooks((current, total) => {
      onProgress?.(current, total);
    });

    const existingBooks = getAllBooks();

    for (const book of books) {
      try {
        // Check if book already exists in database
        const sourceId = `${serverConfig.id}:${book.id}`;
        const existingBook = existingBooks.find((b) => b.sourceId === sourceId);

        if (existingBook) {
          // Update existing book metadata
          updateCalibreWebBookInDb(existingBook.id, book);
        } else {
          // Add new book
          addCalibreWebBookToDb(book, serverConfig);
        }

        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Failed to sync "${book.title}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return result;
  } catch (error) {
    result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Add a Calibre-Web book to the database
 */
export function addCalibreWebBookToDb(
  book: CalibreWebBook,
  serverConfig: CalibreWebServerConfig
): Book {
  // Determine best format
  const formats = calibreWebService.getAvailableFormats(book);
  const preferredFormat = formats.find((f) => f === 'EPUB') || formats[0] || 'EPUB';

  // Generate file path (placeholder until downloaded)
  const formatLower = preferredFormat.toLowerCase();
  const filePath = `calibreweb_books/${serverConfig.id}/${book.id}.${formatLower}`;

  // Get cover URL if available
  const coverUrl = book.cover ? `${serverConfig.serverUrl}${book.cover}` : undefined;

  // Generate unique ID
  const bookId = `cw_${serverConfig.id}_${book.id}`;

  const newBook: Book = {
    id: bookId,
    title: book.title,
    author: Array.isArray(book.author) ? book.author.join(', ') : book.author || 'Unknown',
    filePath: filePath,
    coverPath: coverUrl,
    format: formatLower as Book['format'],
    totalPages: 0, // Will be updated when opened
    currentPage: 0,
    progress: 0,
    lastRead: new Date(book.pubdate || Date.now()),
    dateAdded: new Date(),
    source: 'calibre-web',
    sourceId: `${serverConfig.id}:${book.id}`,
    sourceUrl: `${serverConfig.serverUrl}/api/books/${book.id}`,
    downloaded: false, // Not downloaded yet
    metadata: {
      isbn: book.isbn || book.identifiers?.isbn,
      publisher: book.publisher,
      publishDate: book.pubdate,
      language: book.languages?.[0],
      description: book.description,
      tags: book.tags,
      series: book.series,
      seriesIndex: book.series_index,
      rating: book.rating,
    },
  };

  addBook(newBook);

  return newBook;
}

/**
 * Update an existing Calibre-Web book in the database
 */
export function updateCalibreWebBookInDb(
  localBookId: string,
  book: CalibreWebBook
): boolean {
  const updates: Partial<Book> = {
    title: book.title,
    author: Array.isArray(book.author) ? book.author.join(', ') : book.author || 'Unknown',
    metadata: {
      description: book.description,
      series: book.series,
      seriesIndex: book.series_index,
      rating: book.rating,
      tags: book.tags,
    },
  };

  return updateBook(localBookId, updates);
}

/**
 * Download and cache a book's cover image
 */
export async function cacheBookCover(
  bookId: number,
  coverUrl: string,
  serverConfig: CalibreWebServerConfig
): Promise<string | null> {
  try {
    const response = await fetch(`${serverConfig.serverUrl}${coverUrl}`);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Ensure cover cache directory exists
    if (!CALIBRE_WEB_CACHE_DIR.exists) {
      CALIBRE_WEB_CACHE_DIR.create({ intermediates: true });
    }

    const fileName = `cover_${serverConfig.id}_${bookId}.jpg`;
    const destFile = new File(CALIBRE_WEB_CACHE_DIR, fileName);
    destFile.write(uint8);

    return destFile.uri;
  } catch (error) {
    console.error('Failed to cache cover:', error);
    return null;
  }
}

/**
 * Download a Calibre-Web book file
 */
export async function downloadCalibreWebBook(
  book: CalibreWebBook,
  format: string,
  serverConfig: CalibreWebServerConfig,
  onProgress?: (progress: number, downloaded: number, total: number) => void
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const formatData = book.formats?.find((f) => f.format.toLowerCase() === format.toLowerCase());

    if (!formatData) {
      return { success: false, error: `Format ${format} not available` };
    }

    // Download using the service
    const filePath = await calibreWebService.downloadBook(book, format, (progress) => {
      onProgress?.(progress.progress, progress.bytesDownloaded, progress.totalBytes);
    });

    if (!filePath) {
      return { success: false, error: 'Download failed' };
    }

    // Update book in database to mark as downloaded
    const sourceId = `${serverConfig.id}:${book.id}`;
    const allBooks = getAllBooks();
    const localBook = allBooks.find((b) => b.sourceId === sourceId);

    if (localBook) {
      updateBook(localBook.id, {
        downloaded: true,
        filePath: filePath,
      });
    }

    return { success: true, filePath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Calibre-Web sync status for a book
 */
export function getCalibreWebBookStatus(
  serverConfig: CalibreWebServerConfig,
  calibreBookId: number
): CalibreWebSyncStatus {
  const sourceId = `${serverConfig.id}:${calibreBookId}`;
  const allBooks = getAllBooks();
  const localBook = allBooks.find((b) => b.sourceId === sourceId);

  return {
    calibreBookId,
    localBookId: localBook?.id,
    lastSyncedAt: localBook?.lastRead?.getTime() || Date.now(),
    hasLocalFile: localBook?.downloaded || false,
    isDownloaded: localBook?.downloaded || false,
    coverCached: !!localBook?.coverPath,
  };
}

/**
 * Delete a Calibre-Web book from local storage
 */
export function deleteCalibreWebBook(localBookId: string): boolean {
  try {
    const book = getBookById(localBookId);

    if (!book) {
      return false;
    }

    // Delete the file if downloaded
    if (book.downloaded && book.filePath) {
      try {
        const file = new File(book.filePath);
        if (file.exists) {
          file.delete();
        }
      } catch {
        // File might not exist
      }
    }

    // Update database to mark as not downloaded
    updateBook(localBookId, {
      downloaded: false,
    });

    return true;
  } catch (error) {
    console.error('Failed to delete book:', error);
    return false;
  }
}

/**
 * Get all Calibre-Web books from database
 */
export function getCalibreWebBooks(serverId?: string): Book[] {
  const allBooks = getAllBooks();

  if (serverId) {
    return allBooks.filter((b) => b.source === 'calibre-web' && b.sourceId?.startsWith(serverId));
  }

  return allBooks.filter((b) => b.source === 'calibre-web');
}

/**
 * Get Calibre-Web books that are downloaded
 */
export function getDownloadedCalibreWebBooks(): Book[] {
  const allBooks = getAllBooks();
  return allBooks.filter((b) => b.source === 'calibre-web' && b.downloaded);
}

/**
 * Get Calibre-Web books that are not downloaded (cloud-only)
 */
export function getCloudOnlyCalibreWebBooks(): Book[] {
  const allBooks = getAllBooks();
  return allBooks.filter((b) => b.source === 'calibre-web' && !b.downloaded);
}

// Export the Calibre-Web database service
export const calibreWebDbService = {
  syncCalibreWebBooksToDb,
  addCalibreWebBookToDb,
  updateCalibreWebBookInDb,
  cacheBookCover,
  downloadCalibreWebBook,
  getCalibreWebBookStatus,
  deleteCalibreWebBook,
  getCalibreWebBooks,
  getDownloadedCalibreWebBooks,
  getCloudOnlyCalibreWebBooks,
};
