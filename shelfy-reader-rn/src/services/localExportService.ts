/**
 * Local Export/Import Service
 * Exports all app data (books, files, progress, settings) to a ZIP file
 * that can be shared or later re-imported.
 *
 * React Native version:
 * - Uses expo-file-system for file I/O
 * - Uses expo-sharing for share sheet
 * - Uses JSZip for ZIP creation/extraction
 * - Uses the RN databaseService and fileStorage
 */

import JSZip from 'jszip';
import { Paths, File, Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportDatabase, importDatabase } from '../db/repositories/exportImport';
import {
  storeBookFile,
  readBookFile,
  listBookFiles,
} from './fileStorage';
import { useThemeStore } from '../stores/useThemeStore';
import { useLibraryPrefsStore } from '../stores/useLibraryPrefsStore';
import { useTranslationStore } from '../stores/useTranslationStore';
import { useSecurityStore } from '../stores/useSecurityStore';
import { getAllBooks } from './database';

const EXPORT_VERSION = 1;
const EXPORT_DIR = new Directory(Paths.cache, 'exports');

export interface ImportResult {
  success: boolean;
  booksAdded: number;
  booksUpdated: number;
  bookmarksAdded: number;
  highlightsAdded: number;
  settingsRestored: number;
  filesRestored: number;
  errors: string[];
}

export interface ExportStats {
  books: number;
  bookmarks: number;
  highlights: number;
  files: number;
}

/**
 * Export all app data to a ZIP file and return its local URI and stats.
 */
export async function exportAllData(): Promise<{ uri: string; stats: ExportStats }> {
  const zip = new JSZip();

  // 1. Export database (books, collections, progress, bookmarks, highlights, tags, settings)
  const dbExport = exportDatabase();
  zip.file('database.json', JSON.stringify(dbExport, null, 2));

  // 2. Export Zustand store states
  const storeExports = {
    theme: useThemeStore.getState(),
    libraryPrefs: useLibraryPrefsStore.getState(),
    translation: useTranslationStore.getState(),
    security: useSecurityStore.getState(),
  };
  zip.file('store_settings.json', JSON.stringify(storeExports, null, 2));

  // 3. Export book files from local storage
  const books = getAllBooks();
  const filesFolder = zip.folder('files')!;
  let fileCount = 0;

  for (const book of books) {
    if (book.filePath) {
      try {
        const bookFiles = await listBookFiles(book.id);
        for (const fileName of bookFiles) {
          try {
            const data = await readBookFile(`${Paths.document.uri}/books/${book.id}/${fileName}`);
            filesFolder.file(`${book.id}/${fileName}`, new Uint8Array(data));
            fileCount++;
          } catch {
            // Skip files that can't be read
          }
        }
      } catch {
        // Skip books with no local files
      }
    }
  }

  // 4. Metadata
  zip.file(
    'metadata.json',
    JSON.stringify({
      version: EXPORT_VERSION,
      exportDate: Date.now(),
      bookCount: dbExport.books.length,
      bookmarkCount: dbExport.bookmarks.length,
      highlightCount: dbExport.highlights.length,
      fileCount,
    })
  );

  // Generate ZIP as Uint8Array
  const zipData = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Write to a temp file
  if (!EXPORT_DIR.exists) {
    EXPORT_DIR.create({ intermediates: true });
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `ebook-reader-backup-${date}.zip`;
  const destFile = new File(EXPORT_DIR, filename);
  destFile.write(zipData);

  return {
    uri: destFile.uri,
    stats: {
      books: dbExport.books.length,
      bookmarks: dbExport.bookmarks.length,
      highlights: dbExport.highlights.length,
      files: fileCount,
    },
  };
}

/**
 * Export all data and open the system share sheet.
 */
export async function shareExport(): Promise<ExportStats> {
  const { uri, stats } = await exportAllData();

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/zip',
      dialogTitle: 'Export Library Backup',
    });
  } else {
    console.warn('Sharing is not available on this device');
  }

  return stats;
}

/**
 * Import all data from a ZIP file (given its local URI).
 */
export async function importAllData(fileUri: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    booksAdded: 0,
    booksUpdated: 0,
    bookmarksAdded: 0,
    highlightsAdded: 0,
    settingsRestored: 0,
    filesRestored: 0,
    errors: [],
  };

  try {
    // Read the ZIP file
    const file = new File(fileUri);
    const bytes = await file.bytes();
    const zip = await JSZip.loadAsync(bytes);

    // Validate
    const metadataFile = zip.file('metadata.json');
    if (!metadataFile) {
      throw new Error('Invalid backup file: missing metadata.json');
    }

    // 1. Import database
    const dbFile = zip.file('database.json');
    if (dbFile) {
      const dbJson = JSON.parse(await dbFile.async('string'));
      const dbResult = importDatabase(dbJson, {
        overwrite: true,
        mergeStrategy: 'merge',
      });
      result.booksAdded = dbResult.booksAdded;
      result.booksUpdated = dbResult.booksUpdated;
      result.bookmarksAdded = dbResult.bookmarksAdded;
      result.highlightsAdded = dbResult.highlightsAdded;
      result.settingsRestored = dbResult.settingsRestored;
      if (dbResult.errors.length > 0) {
        result.errors.push(...dbResult.errors);
      }
    }

    // 2. Import store settings
    const storeFile = zip.file('store_settings.json');
    if (storeFile) {
      const stores = JSON.parse(await storeFile.async('string'));

      if (stores.theme) {
        const {
          theme,
          fontFamily,
          fontSize,
          lineHeight,
          textAlign,
          marginSize,
          blueLightFilter,
          blueLightIntensity,
          readingRuler,
          readingRulerSettings,
          bionicReading,
          focusMode,
          focusModeSettings,
          autoScroll,
          autoScrollSpeed,
          customThemes,
          customFonts,
          customBackgroundColor,
          customBackgroundImage,
          pageTransitionType,
          fontWeight,
        } = stores.theme;
        useThemeStore.setState({
          theme,
          fontFamily,
          fontSize,
          lineHeight,
          textAlign,
          marginSize,
          blueLightFilter,
          blueLightIntensity,
          readingRuler,
          readingRulerSettings,
          bionicReading,
          focusMode,
          focusModeSettings,
          autoScroll,
          autoScrollSpeed,
          customThemes,
          customFonts,
          customBackgroundColor,
          customBackgroundImage,
          pageTransitionType,
          fontWeight,
        });
        result.settingsRestored++;
      }

      if (stores.libraryPrefs) {
        const { viewMode, sortBy, filters } = stores.libraryPrefs;
        useLibraryPrefsStore.setState({ viewMode, sortBy, filters });
        result.settingsRestored++;
      }

      if (stores.translation) {
        const {
          targetLanguage,
          autoDetectSource,
          apiKey,
          apiEndpoint,
          saveHistory,
          translationHistory,
        } = stores.translation;
        useTranslationStore.setState({
          targetLanguage,
          autoDetectSource,
          apiKey,
          apiEndpoint,
          saveHistory,
          translationHistory,
        });
        result.settingsRestored++;
      }

      if (stores.security) {
        const { lockType, isEnabled, autoLockDelay } = stores.security;
        useSecurityStore.setState({ lockType, isEnabled, autoLockDelay });
        result.settingsRestored++;
      }
    }

    // 3. Import book files
    const filesFolder = zip.folder('files');
    if (filesFolder) {
      const fileEntries: Array<{ bookId: string; fileName: string }> = [];
      filesFolder.forEach((relativePath) => {
        if (relativePath && relativePath.includes('/')) {
          const parts = relativePath.split('/');
          if (parts.length === 2 && parts[1]) {
            fileEntries.push({ bookId: parts[0], fileName: parts[1] });
          }
        }
      });

      for (const { bookId, fileName } of fileEntries) {
        try {
          const fileData = await filesFolder.file(`${bookId}/${fileName}`)?.async('arraybuffer');
          if (fileData) {
            await storeBookFile(bookId, fileName, fileData);
            result.filesRestored++;
          }
        } catch (err) {
          result.errors.push(
            `Failed to restore file ${bookId}/${fileName}: ${err instanceof Error ? err.message : 'Unknown'}`
          );
        }
      }
    }

    result.success = result.errors.length === 0 || result.errors.length < 5;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Import failed');
    result.success = false;
  }

  return result;
}
