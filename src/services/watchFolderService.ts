/**
 * Watch Folder Service
 *
 * Monitors a configured folder on the device for new ebook files
 * and auto-imports them into the library. Native (Android) only.
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { databaseService } from './database';
import { webFileStorage } from './webFileStorage';
import type { Book } from '../types/index';

const WATCH_FOLDER_KEY = 'watch_folder_path';
const IMPORTED_FILES_KEY = 'watch_folder_imported_files';

const SUPPORTED_EXTENSIONS = [
  '.epub', '.pdf', '.mobi', '.azw', '.azw3', '.fb2',
  '.cbz', '.cbr', '.txt', '.html', '.htm', '.md', '.docx', '.odt',
];

const FORMAT_MAP: Record<string, Book['format']> = {
  '.epub': 'epub', '.pdf': 'pdf', '.mobi': 'mobi',
  '.azw': 'mobi', '.azw3': 'mobi', '.fb2': 'fb2',
  '.cbz': 'cbz', '.cbr': 'cbr', '.txt': 'txt',
  '.html': 'html', '.htm': 'html', '.md': 'markdown',
  '.docx': 'docx', '.odt': 'odt',
};

export async function getWatchFolderPath(): Promise<string | null> {
  const { value } = await Preferences.get({ key: WATCH_FOLDER_KEY });
  return value;
}

export async function setWatchFolderPath(path: string | null): Promise<void> {
  if (path) {
    await Preferences.set({ key: WATCH_FOLDER_KEY, value: path });
  } else {
    await Preferences.remove({ key: WATCH_FOLDER_KEY });
  }
}

async function getImportedFiles(): Promise<Set<string>> {
  const { value } = await Preferences.get({ key: IMPORTED_FILES_KEY });
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
  await Preferences.set({
    key: IMPORTED_FILES_KEY,
    value: JSON.stringify([...imported]),
  });
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
  if (!Capacitor.isNativePlatform()) return [];

  const folderPath = await getWatchFolderPath();
  if (!folderPath) return [];

  try {
    const result = await Filesystem.readdir({
      path: folderPath,
      directory: Directory.ExternalStorage,
    });

    const imported = await getImportedFiles();
    const newFiles: WatchFolderFile[] = [];

    for (const file of result.files) {
      if (file.type === 'file' && isSupportedFile(file.name) && !imported.has(file.name)) {
        newFiles.push({
          name: file.name,
          uri: file.uri,
        });
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
async function readWatchFolderFile(
  folderPath: string,
  fileName: string
): Promise<ArrayBuffer | null> {
  try {
    const result = await Filesystem.readFile({
      path: `${folderPath}/${fileName}`,
      directory: Directory.ExternalStorage,
    });

    const base64 = result.data as string;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch {
    return null;
  }
}

/**
 * Auto-import new files from the watch folder.
 * Returns the number of successfully imported files.
 */
export async function autoImportFromWatchFolder(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;

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
      const arrayBuffer = await readWatchFolderFile(folderPath, file.name);
      if (!arrayBuffer) {
        await markFileImported(file.name);
        continue;
      }

      const bookId = crypto.randomUUID();
      const filePath = `indexeddb://${bookId}/${file.name}`;

      // Store file in IndexedDB
      await webFileStorage.storeFile(filePath, arrayBuffer);

      // Extract title from filename (remove extension)
      const title = file.name.replace(/\.[^.]+$/, '');

      const newBook: Book = {
        id: bookId,
        title,
        author: 'Unknown',
        filePath,
        format,
        totalPages: 0,
        currentPage: 0,
        progress: 0,
        lastRead: new Date(),
        dateAdded: new Date(),
        source: 'local',
        downloaded: true,
      };

      await databaseService.addBook(newBook);
      await markFileImported(file.name);
      imported++;
    } catch {
      // Mark as imported to avoid retrying failed files
      await markFileImported(file.name);
    }
  }

  return imported;
}
