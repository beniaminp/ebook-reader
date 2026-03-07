/**
 * Book Import Service
 *
 * Handles importing book files into the library: stores bytes via
 * expo-file-system, extracts metadata, detects duplicates, persists
 * to the database, and kicks off online metadata enrichment.
 *
 * React Native version:
 * - Uses expo-file-system instead of IndexedDB (webFileStorage)
 * - Uses expo-document-picker patterns for file selection
 * - Uses expo-crypto for hashing
 * - No DOM dependencies (window.confirm replaced with callback)
 */

import { Paths, File, Directory } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { storeBookFile, storeCoverImage } from './fileStorage';
import { addBook, updateBook, updateBookMetadata } from './database';
import { metadataLookupService } from './metadataLookupService';
import type { Book } from '../types';

// ============================================================================
// HASHING
// ============================================================================

/** SHA-256 hash of the first 8KB of a file, used for duplicate detection. */
export async function computeFileHash(filePath: string): Promise<string> {
  try {
    // Read the file as base64
    const file = new File(filePath);
    const base64 = await file.base64();
    // Use expo-crypto to hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64
    );
    return hash;
  } catch {
    return '';
  }
}

/** SHA-256 hash of the first 8KB of an ArrayBuffer. */
export async function computeBufferHash(buffer: ArrayBuffer): Promise<string> {
  try {
    const slice = buffer.slice(0, 8192);
    const bytes = new Uint8Array(slice);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64
    );
    return hash;
  } catch {
    return '';
  }
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Check whether a book with the same file hash or title+author already exists.
 * Returns the matching book if found, undefined otherwise.
 */
export function checkForDuplicate(
  existingBooks: Book[],
  title: string | undefined,
  author: string | undefined,
  fileHash?: string
): Book | undefined {
  return existingBooks.find((b) => {
    // Check by file hash
    if (fileHash && b.fileHash && b.fileHash === fileHash) return true;
    // Check by title+author (case insensitive)
    if (
      title &&
      author &&
      b.title.toLowerCase() === title.toLowerCase() &&
      b.author.toLowerCase() === author.toLowerCase() &&
      author.toLowerCase() !== 'unknown'
    )
      return true;
    return false;
  });
}

// ============================================================================
// FORMAT DETECTION
// ============================================================================

/** Determine the book format from a file name extension. */
export function detectFormat(fileName: string): Book['format'] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.epub')) return 'epub';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.mobi')) return 'mobi';
  if (lower.endsWith('.azw') || lower.endsWith('.azw3')) return 'azw3';
  if (lower.endsWith('.fb2')) return 'fb2';
  if (lower.endsWith('.cbz')) return 'cbz';
  if (lower.endsWith('.cbr')) return 'cbr';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md';
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.odt')) return 'odt';
  return 'txt';
}

// ============================================================================
// UUID
// ============================================================================

/** Generate a UUID with a fallback. */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: generate a UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// IMPORT TYPES
// ============================================================================

export interface ImportResult {
  success: boolean;
  book?: Book;
  error?: string;
}

export interface ImportBookOptions {
  existingBooks: Book[];
  setBooks: (books: Book[]) => void;
  /** Called when a duplicate is detected. Return true to continue import. */
  onDuplicateDetected?: (fileName: string, existingBook: Book) => Promise<boolean>;
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Import a book from a file URI (e.g., from expo-document-picker).
 * Stores the file, extracts metadata, detects duplicates, persists to DB,
 * and kicks off online metadata enrichment.
 */
export async function importBookFromUri(
  fileUri: string,
  fileName: string,
  options?: ImportBookOptions,
  mimeType?: string,
  fileSize?: number
): Promise<ImportResult> {
  try {
    const format = detectFormat(fileName);
    const bookId = generateUUID();

    // Read the file data
    const srcFile = new File(fileUri);
    const base64Data = await srcFile.base64();

    // Store the file in the books directory
    const filePath = await storeBookFile(bookId, fileName, base64ToArrayBuffer(base64Data));

    // Extract title from filename (best-effort)
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    const author = 'Unknown';

    // TODO: Integrate format-specific metadata extractors when available in RN

    // Compute file hash for duplicate detection
    let fileHash: string | undefined;
    try {
      fileHash = await computeFileHash(filePath);
    } catch {
      /* hash is optional */
    }

    // Check for duplicates if options provided
    if (options) {
      const existingDuplicate = checkForDuplicate(options.existingBooks, title, author, fileHash);
      if (existingDuplicate) {
        if (options.onDuplicateDetected) {
          const shouldContinue = await options.onDuplicateDetected(fileName, existingDuplicate);
          if (!shouldContinue) {
            // Clean up stored file
            const { deleteBookFile } = await import('./fileStorage');
            await deleteBookFile(bookId);
            return { success: false, error: 'Duplicate detected, import cancelled' };
          }
        }
      }
    }

    const newBook: Book = {
      id: bookId,
      title,
      author,
      filePath,
      format,
      fileHash,
      fileSize: fileSize ?? base64Data.length,
      totalPages: 0,
      currentPage: 0,
      progress: 0,
      lastRead: new Date(),
      dateAdded: new Date(),
      source: 'local',
      downloaded: true,
    };

    await addBook(newBook);

    // Update the store immediately if options provided
    if (options) {
      options.setBooks([newBook, ...options.existingBooks]);
    }

    // Fetch metadata from online APIs and update DB (fire-and-forget)
    metadataLookupService.fetchBookMetadata(title, author).then(async (meta) => {
      if (meta) {
        await updateBookMetadata(bookId, meta);
        // Auto-fetch cover if book has none and metadata has a cover URL
        if (!newBook.coverPath && meta.coverUrl) {
          try {
            const coverDir = new Directory(Paths.document, 'books', bookId);
            if (!coverDir.exists) {
              coverDir.create({ intermediates: true });
            }
            const coverFile = await File.downloadFileAsync(
              meta.coverUrl,
              new File(coverDir, 'cover.jpg'),
              { idempotent: true }
            );
            await updateBook(bookId, { coverPath: coverFile.uri });
          } catch {
            // Cover fetch is optional
          }
        }
      }
    });

    return { success: true, book: newBook };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Import a book from an ArrayBuffer (e.g., from OPDS download).
 */
export async function importBookFromBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  options: ImportBookOptions
): Promise<ImportResult> {
  try {
    const format = detectFormat(fileName);
    const bookId = generateUUID();

    // Store the file
    const filePath = await storeBookFile(bookId, fileName, buffer);

    const title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    const author = 'Unknown';

    // Compute file hash
    let fileHash: string | undefined;
    try {
      fileHash = await computeBufferHash(buffer);
    } catch {
      /* hash is optional */
    }

    // Check for duplicates
    const existingDuplicate = checkForDuplicate(options.existingBooks, title, author, fileHash);
    if (existingDuplicate) {
      if (options.onDuplicateDetected) {
        const shouldContinue = await options.onDuplicateDetected(fileName, existingDuplicate);
        if (!shouldContinue) {
          const { deleteBookFile } = await import('./fileStorage');
          await deleteBookFile(bookId);
          return { success: false, error: 'Duplicate detected, import cancelled' };
        }
      }
    }

    const newBook: Book = {
      id: bookId,
      title,
      author,
      filePath,
      format,
      fileHash,
      fileSize: buffer.byteLength,
      totalPages: 0,
      currentPage: 0,
      progress: 0,
      lastRead: new Date(),
      dateAdded: new Date(),
      source: 'local',
      downloaded: true,
    };

    await addBook(newBook);
    options.setBooks([newBook, ...options.existingBooks]);

    // Fire-and-forget metadata enrichment
    metadataLookupService.fetchBookMetadata(title, author).then(async (meta) => {
      if (meta) {
        await updateBookMetadata(bookId, meta);
      }
    });

    return { success: true, book: newBook };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Import multiple books from document picker results.
 */
export async function importMultipleBooks(
  files: Array<{ uri: string; name: string; mimeType?: string; size?: number }>,
  options?: ImportBookOptions
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  for (const file of files) {
    const result = await importBookFromUri(
      file.uri,
      file.name,
      options,
      file.mimeType,
      file.size
    );
    results.push(result);
  }
  return results;
}

// ============================================================================
// SUPPORTED EXTENSIONS
// ============================================================================

export const SUPPORTED_EXTENSIONS = new Set([
  '.epub', '.pdf', '.mobi', '.azw', '.azw3', '.fb2',
  '.cbz', '.cbr', '.txt', '.html', '.htm', '.md', '.docx', '.odt',
]);

/** Check if a filename has a supported ebook extension. */
export function isSupportedFile(fileName: string): boolean {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Helper: convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
