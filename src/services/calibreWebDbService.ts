/**
 * Calibre-Web Database Integration Service
 * Handles syncing Calibre-Web books to the local database
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { calibreWebService } from './calibreWebService';
import { addBook, updateBook, getBookById, getAllBooks } from './database';
import type { Book } from '../types/index';
import { CalibreWebBook, CalibreWebServerConfig, CalibreWebSyncStatus } from '../types/calibreWeb';

// Constants
const CALIBRE_WEB_CACHE_DIR = 'calibreweb_covers';
const CALIBRE_WEB_BOOKS_DIR = 'calibreweb_books';

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

    const existingBooks = await getAllBooks();

    for (const book of books) {
      try {
        // Check if book already exists in database
        const sourceId = `${serverConfig.id}:${book.id}`;
        const existingBook = existingBooks.find(b => b.sourceId === sourceId);

        if (existingBook) {
          // Update existing book metadata
          await updateCalibreWebBookInDb(existingBook.id, book);
        } else {
          // Add new book
          await addCalibreWebBookToDb(book, serverConfig);
        }

        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to sync "${book.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
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
export async function addCalibreWebBookToDb(
  book: CalibreWebBook,
  serverConfig: CalibreWebServerConfig
): Promise<Book> {
  // Determine best format
  const formats = calibreWebService.getAvailableFormats(book);
  const preferredFormat = formats.find(f => f === 'EPUB') || formats[0] || 'EPUB';

  // Generate file path (placeholder until downloaded)
  const formatLower = preferredFormat.toLowerCase();
  const filePath = `${CALIBRE_WEB_BOOKS_DIR}/${serverConfig.id}/${book.id}.${formatLower}`;

  // Get cover URL if available
  const coverUrl = book.cover
    ? `${serverConfig.serverUrl}${book.cover}`
    : undefined;

  // Generate unique ID
  const bookId = `cw_${serverConfig.id}_${book.id}`;

  const newBook: Omit<Book, 'dateAdded'> = {
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

  await addBook(newBook);

  return {
    ...newBook,
    dateAdded: new Date(),
  };
}

/**
 * Update an existing Calibre-Web book in the database
 */
export async function updateCalibreWebBookInDb(
  localBookId: string,
  book: CalibreWebBook
): Promise<boolean> {
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

  return await updateBook(localBookId, updates);
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
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    const fileName = `cover_${serverConfig.id}_${bookId}.jpg`;
    const filePath = `${CALIBRE_WEB_CACHE_DIR}/${fileName}`;

    await Filesystem.writeFile({
      path: filePath,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });

    return filePath;
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
    const formatData = book.formats?.find(f => f.format.toLowerCase() === format.toLowerCase());

    if (!formatData) {
      return { success: false, error: `Format ${format} not available` };
    }

    // Download using axios through the service
    const filePath = await calibreWebService.downloadBook(
      book,
      format,
      (progress) => {
        onProgress?.(progress.progress, progress.bytesDownloaded, progress.totalBytes);
      }
    );

    if (!filePath) {
      return { success: false, error: 'Download failed' };
    }

    // Update book in database to mark as downloaded
    const sourceId = `${serverConfig.id}:${book.id}`;
    const allBooks = await getAllBooks();
    const localBook = allBooks.find(b => b.sourceId === sourceId);

    if (localBook) {
      await updateBook(localBook.id, {
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
export async function getCalibreWebBookStatus(
  serverConfig: CalibreWebServerConfig,
  calibreBookId: number
): Promise<CalibreWebSyncStatus> {
  const sourceId = `${serverConfig.id}:${calibreBookId}`;
  const allBooks = await getAllBooks();
  const localBook = allBooks.find(b => b.sourceId === sourceId);

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
export async function deleteCalibreWebBook(
  localBookId: string
): Promise<boolean> {
  try {
    const book = await getBookById(localBookId);

    if (!book) {
      return false;
    }

    // Delete the file if downloaded
    if (book.downloaded && book.filePath) {
      try {
        await Filesystem.deleteFile({
          path: book.filePath,
          directory: Directory.Data,
        });
      } catch {
        // File might not exist
      }
    }

    // Update database to mark as not downloaded
    await updateBook(localBookId, {
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
export async function getCalibreWebBooks(serverId?: string): Promise<Book[]> {
  const allBooks = await getAllBooks();

  if (serverId) {
    return allBooks.filter(b => b.source === 'calibre-web' && b.sourceId?.startsWith(serverId));
  }

  return allBooks.filter(b => b.source === 'calibre-web');
}

/**
 * Get Calibre-Web books that are downloaded
 */
export async function getDownloadedCalibreWebBooks(): Promise<Book[]> {
  const allBooks = await getAllBooks();
  return allBooks.filter(b => b.source === 'calibre-web' && b.downloaded);
}

/**
 * Get Calibre-Web books that are not downloaded (cloud-only)
 */
export async function getCloudOnlyCalibreWebBooks(): Promise<Book[]> {
  const allBooks = await getAllBooks();
  return allBooks.filter(b => b.source === 'calibre-web' && !b.downloaded);
}

/**
 * Helper: Convert array buffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
