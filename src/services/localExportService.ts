/**
 * Local Export/Import Service
 * Exports all app data (books, files, progress, settings) to a ZIP file
 * that can be downloaded and later re-imported.
 */

import JSZip from 'jszip';
import { databaseService } from './database';
import { webFileStorage } from './webFileStorage';
import { useThemeStore } from '../stores/useThemeStore';
import { useLibraryPrefsStore } from '../stores/useLibraryPrefsStore';
import { useTranslationStore } from '../stores/useTranslationStore';
import { useSecurityStore } from '../stores/useSecurityStore';

const EXPORT_VERSION = 1;

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

/**
 * Export all app data to a ZIP blob.
 */
export interface ExportStats {
  books: number;
  bookmarks: number;
  highlights: number;
  files: number;
}

export async function exportAllData(): Promise<{ blob: Blob; stats: ExportStats }> {
  const zip = new JSZip();

  // 1. Export database (books, collections, progress, bookmarks, highlights, tags, settings)
  const dbExport = await databaseService.exportDatabase();
  zip.file('database.json', JSON.stringify(dbExport, null, 2));

  // 2. Export Zustand store states
  const storeExports = {
    theme: useThemeStore.getState(),
    libraryPrefs: useLibraryPrefsStore.getState(),
    translation: useTranslationStore.getState(),
    security: useSecurityStore.getState(),
  };
  zip.file('store_settings.json', JSON.stringify(storeExports, null, 2));

  // 3. Export book files from IndexedDB
  const fileKeys = await webFileStorage.getAllKeys();
  const filesFolder = zip.folder('files')!;
  for (const bookId of fileKeys) {
    const data = await webFileStorage.getFile(bookId);
    if (data) {
      filesFolder.file(bookId, data);
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
      fileCount: fileKeys.length,
    })
  );

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return {
    blob,
    stats: {
      books: dbExport.books.length,
      bookmarks: dbExport.bookmarks.length,
      highlights: dbExport.highlights.length,
      files: fileKeys.length,
    },
  };
}

/**
 * Trigger a browser download of the exported ZIP.
 */
export async function downloadExport(): Promise<ExportStats> {
  const { blob, stats } = await exportAllData();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `ebook-reader-backup-${date}.zip`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return stats;
}

/**
 * Import all data from a ZIP file.
 */
export async function importAllData(file: File): Promise<ImportResult> {
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
    const zip = await JSZip.loadAsync(file);

    // Validate
    const metadataFile = zip.file('metadata.json');
    if (!metadataFile) {
      throw new Error('Invalid backup file: missing metadata.json');
    }

    // 1. Import database
    const dbFile = zip.file('database.json');
    if (dbFile) {
      const dbJson = JSON.parse(await dbFile.async('string'));
      const dbResult = await databaseService.importDatabase(dbJson, {
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
        // Only restore serializable settings, skip functions
        const { theme, fontFamily, fontSize, lineHeight, textAlign, marginSize,
          blueLightFilter, blueLightIntensity, readingRuler, readingRulerSettings,
          bionicReading, focusMode, focusModeSettings, autoScroll, autoScrollSpeed,
          customThemes, customFonts, customBackgroundColor, customBackgroundImage,
          pageTransitionType } = stores.theme;
        useThemeStore.setState({
          theme, fontFamily, fontSize, lineHeight, textAlign, marginSize,
          blueLightFilter, blueLightIntensity, readingRuler, readingRulerSettings,
          bionicReading, focusMode, focusModeSettings, autoScroll, autoScrollSpeed,
          customThemes, customFonts, customBackgroundColor, customBackgroundImage,
          pageTransitionType,
        });
        result.settingsRestored++;
      }

      if (stores.libraryPrefs) {
        const { viewMode, sortBy, filters } = stores.libraryPrefs;
        useLibraryPrefsStore.setState({ viewMode, sortBy, filters });
        result.settingsRestored++;
      }

      if (stores.translation) {
        const { targetLanguage, autoDetectSource, apiKey, apiEndpoint, saveHistory, translationHistory } = stores.translation;
        useTranslationStore.setState({ targetLanguage, autoDetectSource, apiKey, apiEndpoint, saveHistory, translationHistory });
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
      const fileEntries: string[] = [];
      filesFolder.forEach((relativePath) => {
        if (relativePath && !relativePath.includes('/')) {
          fileEntries.push(relativePath);
        }
      });

      for (const bookId of fileEntries) {
        try {
          const fileData = await filesFolder.file(bookId)?.async('arraybuffer');
          if (fileData) {
            await webFileStorage.storeFile(bookId, fileData);
            result.filesRestored++;
          }
        } catch (err) {
          result.errors.push(`Failed to restore file ${bookId}: ${err instanceof Error ? err.message : 'Unknown'}`);
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
