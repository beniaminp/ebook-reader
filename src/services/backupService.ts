/**
 * Backup Service
 * Handles full backup and restore operations for the ebook reader app
 * Supports Dropbox and WebDAV cloud providers
 */

import JSZip from 'jszip';
import { Dropbox } from 'dropbox';
import { createClient, WebDAVClient } from 'webdav';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { databaseService } from './database';
import { useThemeStore } from '../stores/useThemeStore';
import type { CloudProviderType } from '../types/cloudSync';

// Constants
const PREF_KEY_BACKUP_CONFIG = 'backup_config';
const BACKUP_VERSION = 1;
const DROPBOX_BACKUP_PATH = '/ebook-reader/backups';
const WEBDAV_BACKUP_PATH = '/ebook-reader/backups';

// Backup metadata
export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  timestamp: number;
  lastModified: number;
  version: number;
  provider: CloudProviderType;
}

// Backup result
export interface BackupResult {
  success: boolean;
  filename?: string;
  path?: string;
  size?: number;
  timestamp?: number;
  error?: string;
}

// Restore result
export interface RestoreResult {
  success: boolean;
  booksAdded: number;
  booksUpdated: number;
  collectionsAdded: number;
  bookmarksAdded: number;
  highlightsAdded: number;
  settingsRestored: number;
  themesRestored: boolean;
  errors: string[];
}

// Backup data structure
interface BackupData {
  version: number;
  timestamp: number;
  deviceId: string;
  database: {
    version: number;
    exportDate: number;
    books: any[];
    collections: any[];
    readingProgress: any[];
    bookmarks: any[];
    highlights: any[];
    settings: Record<string, any>;
    tags: any[];
  };
  themeSettings: any;
}

/**
 * Generate a unique device ID
 */
async function getDeviceId(): Promise<string> {
  const { value } = await Preferences.get({ key: 'backup_device_id' });
  if (value) {
    return value;
  }
  const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  await Preferences.set({ key: 'backup_device_id', value: deviceId });
  return deviceId;
}

/**
 * Create a Dropbox provider instance
 */
async function createDropboxProvider(): Promise<Dropbox> {
  const { value } = await Preferences.get({ key: 'cloudsync_config_token' });
  if (!value) {
    throw new Error('Dropbox access token not found. Please connect to Dropbox first.');
  }
  return new Dropbox({ accessToken: value });
}

/**
 * Create a WebDAV provider instance
 */
async function createWebDAVProvider(): Promise<WebDAVClient> {
  const configStr = await Preferences.get({ key: 'cloudsync_config' });
  if (!configStr.value) {
    throw new Error('WebDAV configuration not found. Please connect to WebDAV first.');
  }

  const config = JSON.parse(configStr.value);
  const password = await Preferences.get({ key: 'cloudsync_config_password' });
  if (!password.value) {
    throw new Error('WebDAV password not found. Please connect to WebDAV first.');
  }

  const url = config.credentials?.url;
  const username = config.credentials?.username;

  if (!url || !username) {
    throw new Error('Invalid WebDAV configuration');
  }

  return createClient(url, {
    username,
    password: password.value,
  });
}

/**
 * Ensure the backup directory exists for a provider
 */
async function ensureBackupDirectory(provider: CloudProviderType): Promise<void> {
  try {
    if (provider === 'dropbox') {
      const dbx = await createDropboxProvider();
      try {
        await dbx.filesCreateFolderV2({ path: DROPBOX_BACKUP_PATH });
      } catch (error: any) {
        if (error.status !== 409) {
          throw error;
        }
        // Directory already exists, ignore error
      }
    } else {
      const client = await createWebDAVProvider();
      try {
        await client.createDirectory(WEBDAV_BACKUP_PATH);
      } catch (error: any) {
        if (!error.message?.includes('exists')) {
          throw error;
        }
        // Directory already exists, ignore error
      }
    }
  } catch (error) {
    console.error('Failed to ensure backup directory:', error);
    throw error;
  }
}

/**
 * Create a full backup and upload to cloud storage
 */
export async function fullBackup(provider: CloudProviderType): Promise<BackupResult> {
  const timestamp = Date.now();
  const filename = `backup_${timestamp}.zip`;
  const result: BackupResult = {
    success: false,
    filename,
    timestamp,
  };

  try {
    // Ensure backup directory exists
    await ensureBackupDirectory(provider);

    // Export database
    const databaseExport = await databaseService.exportDatabase();

    // Export theme settings
    const themeState = useThemeStore.getState();
    const themeSettings = {
      theme: themeState.theme,
      fontFamily: themeState.fontFamily,
      fontSize: themeState.fontSize,
      lineHeight: themeState.lineHeight,
      textAlign: themeState.textAlign,
      marginSize: themeState.marginSize,
      blueLightFilter: themeState.blueLightFilter,
      blueLightIntensity: themeState.blueLightIntensity,
      readingRuler: themeState.readingRuler,
      readingRulerSettings: themeState.readingRulerSettings,
      bionicReading: themeState.bionicReading,
      focusMode: themeState.focusMode,
      focusModeSettings: themeState.focusModeSettings,
      autoScroll: themeState.autoScroll,
      autoScrollSpeed: themeState.autoScrollSpeed,
      customThemes: themeState.customThemes,
      pageTransitionType: themeState.pageTransitionType,
    };

    // Create backup data object
    const backupData: BackupData = {
      version: BACKUP_VERSION,
      timestamp,
      deviceId: await getDeviceId(),
      database: databaseExport,
      themeSettings,
    };

    // Create ZIP file
    const zip = new JSZip();

    // Add database JSON
    zip.file('database.json', JSON.stringify(databaseExport, null, 2));

    // Add theme settings JSON
    zip.file('theme_settings.json', JSON.stringify(themeSettings, null, 2));

    // Add metadata
    zip.file(
      'metadata.json',
      JSON.stringify(
        {
          version: BACKUP_VERSION,
          timestamp,
          deviceId: await getDeviceId(),
        },
        null,
        2
      )
    );

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Convert blob to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(zipBlob);
    });

    const base64Data = base64.split(',')[1];
    result.size = base64Data.length;

    // Upload to cloud provider
    if (provider === 'dropbox') {
      const dbx = await createDropboxProvider();
      const path = `${DROPBOX_BACKUP_PATH}/${filename}`;

      await dbx.filesUpload({
        path,
        contents: base64Data,
        mode: { '.tag': 'overwrite' } as any,
        autorename: false,
      });

      result.path = path;
    } else {
      const client = await createWebDAVProvider();
      const path = `${WEBDAV_BACKUP_PATH}/${filename}`;

      await client.putFileContents(path, base64Data, {
        overwrite: true,
      });

      result.path = path;
    }

    result.success = true;

    // Save last backup time
    await Preferences.set({
      key: PREF_KEY_BACKUP_CONFIG,
      value: JSON.stringify({
        lastBackupTime: timestamp,
        lastBackupProvider: provider,
      }),
    });
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Backup failed';
    console.error('Backup error:', error);
  }

  return result;
}

/**
 * Restore a backup from cloud storage
 */
export async function restoreBackup(
  provider: CloudProviderType,
  backupPath: string,
  options: {
    overwrite?: boolean;
    mergeStrategy?: 'merge' | 'replace';
    restoreThemes?: boolean;
  } = {}
): Promise<RestoreResult> {
  const { overwrite = false, mergeStrategy = 'merge', restoreThemes = true } = options;
  const result: RestoreResult = {
    success: false,
    booksAdded: 0,
    booksUpdated: 0,
    collectionsAdded: 0,
    bookmarksAdded: 0,
    highlightsAdded: 0,
    settingsRestored: 0,
    themesRestored: false,
    errors: [],
  };

  try {
    // Download backup file
    let zipData: string;

    if (provider === 'dropbox') {
      const dbx = await createDropboxProvider();
      const response = await dbx.filesDownload({ path: backupPath });
      const fileBlob = (response.result as any).fileBlob;

      // Convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileBlob);
      });

      zipData = base64.split(',')[1];
    } else {
      const client = await createWebDAVProvider();
      const buffer = await client.getFileContents(backupPath, { format: 'text' });
      zipData = buffer as string;
    }

    // Load ZIP
    const zip = await JSZip.loadAsync(zipData, { base64: true });

    // Extract database JSON
    const databaseFile = zip.file('database.json');
    if (!databaseFile) {
      throw new Error('Invalid backup file: database.json not found');
    }

    const databaseJson = await databaseFile.async('string');
    const databaseExport = JSON.parse(databaseJson);

    // Restore database
    const importResult = await databaseService.importDatabase(databaseExport, {
      overwrite,
      mergeStrategy,
    });

    result.booksAdded = importResult.booksAdded;
    result.booksUpdated = importResult.booksUpdated;
    result.collectionsAdded = importResult.collectionsAdded;
    result.bookmarksAdded = importResult.bookmarksAdded;
    result.highlightsAdded = importResult.highlightsAdded;
    result.settingsRestored = importResult.settingsRestored;
    result.errors = importResult.errors;

    // Restore theme settings if requested
    if (restoreThemes) {
      const themeFile = zip.file('theme_settings.json');
      if (themeFile) {
        try {
          const themeJson = await themeFile.async('string');
          const themeSettings = JSON.parse(themeJson);

          const themeStore = useThemeStore.getState();

          // Apply theme settings
          if (themeSettings.theme) themeStore.setTheme(themeSettings.theme);
          if (themeSettings.fontFamily) themeStore.setFontFamily(themeSettings.fontFamily);
          if (themeSettings.fontSize) themeStore.setFontSize(themeSettings.fontSize);
          if (themeSettings.lineHeight) themeStore.setLineHeight(themeSettings.lineHeight);
          if (themeSettings.textAlign) themeStore.setTextAlign(themeSettings.textAlign);
          if (themeSettings.marginSize) themeStore.setMarginSize(themeSettings.marginSize);
          if (typeof themeSettings.blueLightFilter === 'boolean') {
            themeStore.setBlueLightFilter(themeSettings.blueLightFilter);
          }
          if (typeof themeSettings.blueLightIntensity === 'number') {
            themeStore.setBlueLightIntensity(themeSettings.blueLightIntensity);
          }
          if (typeof themeSettings.readingRuler === 'boolean') {
            themeStore.setReadingRuler(themeSettings.readingRuler);
          }
          if (themeSettings.readingRulerSettings) {
            if (themeSettings.readingRulerSettings.height) {
              themeStore.setReadingRulerHeight(themeSettings.readingRulerSettings.height);
            }
            if (themeSettings.readingRulerSettings.opacity) {
              themeStore.setReadingRulerOpacity(themeSettings.readingRulerSettings.opacity);
            }
            if (themeSettings.readingRulerSettings.color) {
              themeStore.setReadingRulerColor(themeSettings.readingRulerSettings.color);
            }
          }
          if (typeof themeSettings.bionicReading === 'boolean') {
            themeStore.setBionicReading(themeSettings.bionicReading);
          }
          if (typeof themeSettings.focusMode === 'boolean') {
            themeStore.setFocusMode(themeSettings.focusMode);
          }
          if (typeof themeSettings.focusModeSettings?.opacity === 'number') {
            themeStore.setFocusModeOpacity(themeSettings.focusModeSettings.opacity);
          }
          if (typeof themeSettings.autoScroll === 'boolean') {
            themeStore.setAutoScroll(themeSettings.autoScroll);
          }
          if (typeof themeSettings.autoScrollSpeed === 'number') {
            themeStore.setAutoScrollSpeed(themeSettings.autoScrollSpeed);
          }
          if (themeSettings.pageTransitionType) {
            themeStore.setPageTransitionType(themeSettings.pageTransitionType);
          }

          // Restore custom themes
          if (Array.isArray(themeSettings.customThemes)) {
            for (const theme of themeSettings.customThemes) {
              themeStore.addCustomTheme(theme);
            }
          }

          result.themesRestored = true;
        } catch (error) {
          result.errors.push(
            `Failed to restore theme settings: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    result.success =
      result.errors.length === 0 ||
      result.errors.length <
        (result.booksAdded + result.booksUpdated + result.bookmarksAdded + result.highlightsAdded) /
          2;
  } catch (error) {
    result.success = false;
    result.errors.push(
      `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    console.error('Restore error:', error);
  }

  return result;
}

/**
 * List available backups from cloud storage
 */
export async function listBackups(provider: CloudProviderType): Promise<BackupInfo[]> {
  const backups: BackupInfo[] = [];

  try {
    if (provider === 'dropbox') {
      const dbx = await createDropboxProvider();

      // Ensure directory exists
      await ensureBackupDirectory(provider);

      const result = await dbx.filesListFolder({ path: DROPBOX_BACKUP_PATH });

      for (const entry of result.result.entries) {
        if (entry['.tag'] === 'file' && entry.name.endsWith('.zip')) {
          const file = entry as any;
          backups.push({
            filename: file.name,
            path: file.path_lower,
            size: file.size,
            lastModified: new Date(file.client_modified).getTime(),
            timestamp: parseTimestampFromFilename(file.name),
            version: BACKUP_VERSION,
            provider: 'dropbox',
          });
        }
      }
    } else {
      const client = await createWebDAVProvider();

      // Ensure directory exists
      await ensureBackupDirectory(provider);

      const contents = await client.getDirectoryContents(WEBDAV_BACKUP_PATH);

      if (Array.isArray(contents)) {
        for (const item of contents as any[]) {
          if (item.type === 'file' && item.basename.endsWith('.zip')) {
            backups.push({
              filename: item.basename,
              path: item.filename,
              size: item.size,
              lastModified: new Date(item.lastmod).getTime(),
              timestamp: parseTimestampFromFilename(item.basename),
              version: BACKUP_VERSION,
              provider: 'webdav',
            });
          }
        }
      }
    }

    // Sort by timestamp, newest first
    backups.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to list backups:', error);
  }

  return backups;
}

/**
 * Delete a backup from cloud storage
 */
export async function deleteBackup(
  provider: CloudProviderType,
  backupPath: string
): Promise<boolean> {
  try {
    if (provider === 'dropbox') {
      const dbx = await createDropboxProvider();
      await dbx.filesDeleteV2({ path: backupPath });
    } else {
      const client = await createWebDAVProvider();
      await client.deleteFile(backupPath);
    }
    return true;
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return false;
  }
}

/**
 * Get backup metadata from a backup file
 */
export async function getBackupMetadata(
  provider: CloudProviderType,
  backupPath: string
): Promise<{
  version: number;
  timestamp: number;
  deviceId: string;
} | null> {
  try {
    let zipData: string;

    if (provider === 'dropbox') {
      const dbx = await createDropboxProvider();
      const response = await dbx.filesDownload({ path: backupPath });
      const fileBlob = (response.result as any).fileBlob;

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileBlob);
      });

      zipData = base64.split(',')[1];
    } else {
      const client = await createWebDAVProvider();
      const buffer = await client.getFileContents(backupPath, { format: 'text' });
      zipData = buffer as string;
    }

    const zip = await JSZip.loadAsync(zipData, { base64: true });
    const metadataFile = zip.file('metadata.json');

    if (metadataFile) {
      const metadataJson = await metadataFile.async('string');
      return JSON.parse(metadataJson);
    }

    return null;
  } catch (error) {
    console.error('Failed to get backup metadata:', error);
    return null;
  }
}

/**
 * Parse timestamp from backup filename
 */
function parseTimestampFromFilename(filename: string): number {
  const match = filename.match(/backup_(\d+)\.zip$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

/**
 * Get last backup time from local storage
 */
export async function getLastBackupTime(): Promise<number> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_BACKUP_CONFIG });
    if (value) {
      const config = JSON.parse(value);
      return config.lastBackupTime || 0;
    }
  } catch {
    // Ignore
  }
  return 0;
}

// Export singleton service
export const backupService = {
  fullBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  getBackupMetadata,
  getLastBackupTime,
};
