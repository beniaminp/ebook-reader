import { webFileStorage } from './webFileStorage';
import { databaseService } from './database';
import { metadataLookupService } from './metadataLookupService';
import { extractMetadata } from './metadataExtractor';
import { useAppStore } from '../stores/useAppStore';
import { chmService } from './chmService';
import type { Book } from '../types';

/** SHA-256 hash of the first 8KB of a file buffer, used for duplicate detection. */
export async function computeFileHash(buffer: ArrayBuffer): Promise<string> {
  const slice = buffer.slice(0, 8192); // First 8KB
  const hashBuffer = await crypto.subtle.digest('SHA-256', slice);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  return existingBooks.find(b => {
    // Check by file hash
    if (fileHash && b.fileHash && b.fileHash === fileHash) return true;
    // Check by title+author (case insensitive)
    if (
      title &&
      author &&
      b.title.toLowerCase() === title.toLowerCase() &&
      b.author.toLowerCase() === author.toLowerCase() &&
      author.toLowerCase() !== 'unknown'
    ) return true;
    return false;
  });
}

/** Generate a UUID with a fallback for browsers that don't support crypto.randomUUID(). */
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

/** Determine the book format from a file name extension. */
function detectFormat(fileName: string): Book['format'] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.epub')) return 'epub';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.mobi')) return 'mobi';
  if (lower.endsWith('.azw') || lower.endsWith('.azw3')) return 'azw3';
  if (lower.endsWith('.fb2')) return 'fb2';
  if (lower.endsWith('.cbz')) return 'cbz';
  if (lower.endsWith('.cbr')) return 'cbr';
  if (lower.endsWith('.chm')) throw new Error(chmService.getUnsupportedReason());
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md';
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.odt')) return 'odt';
  return 'txt';
}

export interface ImportBookOptions {
  existingBooks: Book[];
  setBooks: (books: Book[]) => void;
}

/**
 * Import a single book file: store bytes, extract metadata, detect duplicates,
 * persist to DB, and kick off online metadata enrichment.
 */
export async function importBook(
  file: File,
  options: ImportBookOptions
): Promise<void> {
  // Validate File object to prevent crashes
  if (!file || !file.name) {
    throw new Error('Invalid file: file name is required');
  }

  const format = detectFormat(file.name);
  const bookId = generateUUID();

  // Read the file into an ArrayBuffer first — this is the critical step
  const arrayBuffer = await file.arrayBuffer();

  // Store the file data in IndexedDB (web) so it persists across navigations/reloads
  await webFileStorage.storeFile(bookId, arrayBuffer);
  const filePath = `indexeddb://${bookId}/${file.name}`;

  // Extract metadata (best-effort, with timeout — don't block import on failure)
  let title = file.name.replace(/\.[^/.]+$/, '');
  let author = 'Unknown';
  let coverPath: string | undefined;

  try {
    const meta = await extractMetadata(arrayBuffer, file.name, format);
    if (meta.title) title = meta.title;
    if (meta.author) author = meta.author;
    if (meta.coverDataUrl) coverPath = meta.coverDataUrl;
  } catch (err) {
    console.error('Metadata extraction failed, using filename:', err);
  }

  // Compute file hash for duplicate detection
  let fileHash: string | undefined;
  try {
    fileHash = await computeFileHash(arrayBuffer);
  } catch { /* hash is optional */ }

  // Check for duplicates
  const existingDuplicate = checkForDuplicate(options.existingBooks, title, author, fileHash);
  if (existingDuplicate) {
    const shouldContinue = window.confirm(
      `"${file.name}" appears to match "${existingDuplicate.title}" by ${existingDuplicate.author} already in your library.\n\nImport anyway?`
    );
    if (!shouldContinue) {
      await webFileStorage.deleteFile(bookId);
      return;
    }
  }

  const newBook: Book = {
    id: bookId,
    title,
    author,
    filePath,
    coverPath,
    format,
    fileHash,
    totalPages: 0,
    currentPage: 0,
    progress: 0,
    lastRead: new Date(),
    dateAdded: new Date(),
    source: 'local',
    downloaded: true,
  };

  await databaseService.addBook(newBook);

  // Immediately update the store so the book appears in the library without waiting for full reload
  const currentBooks = useAppStore.getState().books;
  options.setBooks([newBook, ...currentBooks]);

  // Fetch metadata from online APIs and update both DB and store
  metadataLookupService.fetchBookMetadata(title, author).then(async (meta) => {
    if (meta) {
      await databaseService.updateBookMetadata(bookId, meta);
      // Auto-fetch cover if book has none and metadata has a cover URL
      let fetchedCoverPath: string | undefined;
      if (!newBook.coverPath && meta.coverUrl) {
        try {
          const resp = await fetch(meta.coverUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            fetchedCoverPath = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            await databaseService.updateBook(bookId, { coverPath: fetchedCoverPath });
          }
        } catch {
          // Cover fetch is optional
        }
      }
      // Update the book in the store with genre/metadata
      const updatedBooks = useAppStore.getState().books.map((b) =>
        b.id === bookId
          ? {
              ...b,
              ...(fetchedCoverPath ? { coverPath: fetchedCoverPath } : {}),
              genre: meta.genre,
              subgenres: meta.subgenres,
              metadata: { ...b.metadata, ...meta },
            }
          : b
      );
      options.setBooks(updatedBooks);
    }
  });
}

export const SUPPORTED_EXTENSIONS = new Set([
  '.epub', '.pdf', '.mobi', '.azw', '.azw3', '.fb2',
  '.cbz', '.cbr', '.txt', '.html', '.htm', '.md', '.docx', '.odt',
]);

/** Filter a list of files to only those with supported ebook extensions. */
export function filterSupportedFiles(files: File[]): File[] {
  return files.filter((file) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
  });
}
