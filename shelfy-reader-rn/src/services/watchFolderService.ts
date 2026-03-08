/**
 * Watch Folder Service
 *
 * Monitors a configured folder on the device for new ebook files
 * and auto-imports them into the library.
 *
 * React Native version:
 * - Uses expo-file-system for directory scanning
 * - Uses AsyncStorage for persistence (watch folder path, imported file tracking)
 * - Uses the RN databaseService and fileStorage
 */

import { Paths, File, Directory } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addBook, getAllBooks } from './database';
import { storeBookFile } from './fileStorage';
import type { Book } from '../types/index';

const WATCH_FOLDER_KEY = 'watch_folder_path';
const IMPORTED_FILES_KEY = 'watch_folder_imported_files';

const SUPPORTED_EXTENSIONS = [
  '.epub',
  '.pdf',
  '.mobi',
  '.azw',
  '.azw3',
  '.fb2',
  '.cbz',
  '.cbr',
  '.txt',
  '.html',
  '.htm',
  '.md',
  '.docx',
  '.odt',
];

const FORMAT_MAP: Record<string, Book['format']> = {
  '.epub': 'epub',
  '.pdf': 'pdf',
  '.mobi': 'mobi',
  '.azw': 'mobi',
  '.azw3': 'mobi',
  '.fb2': 'fb2',
  '.cbz': 'cbz',
  '.cbr': 'cbr',
  '.txt': 'txt',
  '.html': 'html',
  '.htm': 'html',
  '.md': 'markdown',
  '.docx': 'docx',
  '.odt': 'odt',
};

export async function getWatchFolderPath(): Promise<string | null> {
  return AsyncStorage.getItem(WATCH_FOLDER_KEY);
}

export async function setWatchFolderPath(path: string | null): Promise<void> {
  if (path) {
    await AsyncStorage.setItem(WATCH_FOLDER_KEY, path);
  } else {
    await AsyncStorage.removeItem(WATCH_FOLDER_KEY);
  }
}

async function getImportedFiles(): Promise<Set<string>> {
  const value = await AsyncStorage.getItem(IMPORTED_FILES_KEY);
  if (!value) return new Set();
  try {
    return new Set(JSON.parse(value));
  } catch {
    return new Set();
  }
}

async function markFileImported(fileName: string): Promise<void> {
  const imported = await getImportedFiles();
  imported.add(fileName);
  await AsyncStorage.setItem(IMPORTED_FILES_KEY, JSON.stringify([...imported]));
}

function isSupportedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function getFormat(fileName: string): Book['format'] | null {
  const lower = fileName.toLowerCase();
  for (const [ext, format] of Object.entries(FORMAT_MAP)) {
    if (lower.endsWith(ext)) return format;
  }
  return null;
}

export interface WatchFolderFile {
  name: string;
  uri: string;
}

/**
 * Scan the configured watch folder for new (not yet imported) ebook files.
 */
export async function scanWatchFolder(): Promise<WatchFolderFile[]> {
  const folderPath = await getWatchFolderPath();
  if (!folderPath) return [];

  try {
    const dir = new Directory(folderPath);
    if (!dir.exists) return [];

    const entries = dir.list();
    const imported = await getImportedFiles();
    const newFiles: WatchFolderFile[] = [];

    for (const entry of entries) {
      if (entry instanceof File) {
        const name = entry.uri.split('/').pop() || '';
        if (isSupportedFile(name) && !imported.has(name)) {
          newFiles.push({
            name,
            uri: entry.uri,
          });
        }
      }
    }

    return newFiles;
  } catch {
    return [];
  }
}

/**
 * Read a file from the watch folder and return its ArrayBuffer.
 */
async function readWatchFolderFile(fileUri: string): Promise<ArrayBuffer | null> {
  try {
    const file = new File(fileUri);
    if (!file.exists) return null;
    const bytes = await file.bytes();
    return bytes.buffer as ArrayBuffer;
  } catch {
    return null;
  }
}

/**
 * Generate a UUID (uses crypto.randomUUID when available, fallback otherwise).
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Auto-import new files from the watch folder.
 * Returns the number of successfully imported files.
 */
export async function autoImportFromWatchFolder(): Promise<number> {
  const folderPath = await getWatchFolderPath();
  if (!folderPath) return 0;

  const newFiles = await scanWatchFolder();
  if (newFiles.length === 0) return 0;

  let imported = 0;

  for (const file of newFiles) {
    const format = getFormat(file.name);
    if (!format) {
      await markFileImported(file.name);
      continue;
    }

    try {
      const arrayBuffer = await readWatchFolderFile(file.uri);
      if (!arrayBuffer) {
        await markFileImported(file.name);
        continue;
      }

      const bookId = generateUUID();

      // Store file in local storage
      const storedPath = await storeBookFile(bookId, file.name, arrayBuffer);

      // Extract title from filename (remove extension)
      const title = file.name.replace(/\.[^.]+$/, '');

      const newBook: Book = {
        id: bookId,
        title,
        author: 'Unknown',
        filePath: storedPath,
        format,
        totalPages: 0,
        currentPage: 0,
        progress: 0,
        lastRead: new Date(),
        dateAdded: new Date(),
        source: 'local',
        downloaded: true,
      };

      addBook(newBook);
      await markFileImported(file.name);
      imported++;
    } catch {
      // Mark as imported to avoid retrying failed files
      await markFileImported(file.name);
    }
  }

  return imported;
}
