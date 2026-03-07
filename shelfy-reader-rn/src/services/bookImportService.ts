import * as FileSystem from 'expo-file-system';
import { storeBookFile, storeCoverImage } from './fileStorage';
import { addBook } from './database';
import { detectFormat } from '../utils/formatUtils';
import type { Book } from '../types';

export interface ImportResult {
  success: boolean;
  book?: Book;
  error?: string;
}

export async function importBookFromUri(
  uri: string,
  filename: string,
  mimeType?: string,
  fileSize?: number
): Promise<ImportResult> {
  try {
    const format = detectFormat(filename, mimeType);
    if (!format) {
      return { success: false, error: `Unsupported format: ${filename}` };
    }

    const bookId = crypto.randomUUID();

    // Read file content
    const base64Content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
    const filePath = await storeBookFile(bookId, filename, bytes.buffer as ArrayBuffer);

    // Extract basic metadata from filename
    const title = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

    const book: Book = {
      id: bookId,
      title,
      author: '',
      filePath,
      format,
      totalPages: 0,
      currentPage: 0,
      progress: 0,
      lastRead: new Date(),
      dateAdded: new Date(),
      source: 'local',
      downloaded: true,
      fileSize: fileSize ?? bytes.byteLength,
    };

    await addBook(book);
    return { success: true, book };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function importMultipleBooks(
  files: Array<{ uri: string; name: string; mimeType?: string; size?: number }>
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  for (const file of files) {
    const result = await importBookFromUri(
      file.uri,
      file.name,
      file.mimeType,
      file.size
    );
    results.push(result);
  }
  return results;
}
