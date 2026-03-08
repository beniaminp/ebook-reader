/**
 * Backup Service
 *
 * Handles local backup and restore operations for the ebook reader app.
 * Uses expo-file-system for file storage and expo-sharing for sharing backups.
 * Supports JSON export/import of library data.
 */

import { Paths, File, Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportDatabase, importDatabase } from '../db/repositories/exportImport';

// Constants
const BACKUP_VERSION = 1;
const BACKUP_DIR_NAME = 'backups';
const PREF_KEY_LAST_BACKUP = 'backup_last_time';

// Backup metadata
export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  timestamp: number;
  version: number;
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
  errors: string[];
}

/**
 * Ensure the backup directory exists.
 */
function ensureBackupDir(): Directory {
  const dir = new Directory(Paths.document, BACKUP_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

/**
 * Generate a unique device ID for backup metadata.
 */
async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem('backup_device_id');
  if (existing) return existing;

  const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  await AsyncStorage.setItem('backup_device_id', deviceId);
  return deviceId;
}

/**
 * Create a full local backup as a JSON file.
 */
export async function createLocalBackup(): Promise<BackupResult> {
  const timestamp = Date.now();
  const filename = `backup_${timestamp}.json`;
  const result: BackupResult = {
    success: false,
    filename,
    timestamp,
  };

  try {
    const dir = ensureBackupDir();

    // Export database
    const databaseExport = exportDatabase();

    // Create backup data
    const backupData = {
      version: BACKUP_VERSION,
      timestamp,
      deviceId: await getDeviceId(),
      database: databaseExport,
    };

    // Write to file
    const file = new File(dir, filename);
    const jsonStr = JSON.stringify(backupData, null, 2);
    file.write(jsonStr);

    result.path = file.uri;
    result.size = jsonStr.length;
    result.success = true;

    // Save last backup time
    await AsyncStorage.setItem(PREF_KEY_LAST_BACKUP, String(timestamp));
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Backup failed';
    console.error('Backup error:', error);
  }

  return result;
}

/**
 * Share a backup file using the system share dialog.
 */
export async function shareBackup(backupPath: string): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      console.warn('Sharing is not available on this device');
      return false;
    }
    await Sharing.shareAsync(backupPath, {
      mimeType: 'application/json',
      dialogTitle: 'Share Backup',
    });
    return true;
  } catch (error) {
    console.error('Share error:', error);
    return false;
  }
}

/**
 * Create and immediately share a backup.
 */
export async function createAndShareBackup(): Promise<BackupResult> {
  const result = await createLocalBackup();
  if (result.success && result.path) {
    await shareBackup(result.path);
  }
  return result;
}

/**
 * Restore a backup from a JSON file path.
 */
export async function restoreBackup(
  filePath: string,
  options: {
    overwrite?: boolean;
    mergeStrategy?: 'merge' | 'replace';
  } = {}
): Promise<RestoreResult> {
  const { overwrite = false, mergeStrategy = 'merge' } = options;
  const result: RestoreResult = {
    success: false,
    booksAdded: 0,
    booksUpdated: 0,
    collectionsAdded: 0,
    bookmarksAdded: 0,
    highlightsAdded: 0,
    settingsRestored: 0,
    errors: [],
  };

  try {
    // Read backup file
    const file = new File(filePath);
    if (!file.exists) {
      throw new Error('Backup file not found');
    }

    const jsonStr = await file.text();
    const backupData = JSON.parse(jsonStr);

    // Validate backup structure
    if (!backupData.version || !backupData.database) {
      throw new Error('Invalid backup file structure');
    }

    // Restore database
    const importResult = importDatabase(backupData.database, {
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
 * List available local backups, sorted newest first.
 */
export function listLocalBackups(): BackupInfo[] {
  try {
    const dir = ensureBackupDir();
    const entries = dir.list();
    const backups: BackupInfo[] = [];

    for (const entry of entries) {
      if (entry instanceof File && entry.uri.endsWith('.json')) {
        const filename = entry.uri.split('/').pop() || '';
        backups.push({
          filename,
          path: entry.uri,
          size: entry.size ?? 0,
          timestamp: parseTimestampFromFilename(filename),
          version: BACKUP_VERSION,
        });
      }
    }

    // Sort newest first
    backups.sort((a, b) => b.timestamp - a.timestamp);
    return backups;
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
}

/**
 * Delete a local backup file.
 */
export function deleteLocalBackup(backupPath: string): boolean {
  try {
    const file = new File(backupPath);
    if (file.exists) {
      file.delete();
    }
    return true;
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return false;
  }
}

/**
 * Get the last backup time.
 */
export async function getLastBackupTime(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(PREF_KEY_LAST_BACKUP);
    return value ? parseInt(value, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Parse timestamp from backup filename (e.g., backup_1234567890.json).
 */
function parseTimestampFromFilename(filename: string): number {
  const match = filename.match(/backup_(\d+)\.json$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

// Export singleton service
export const backupService = {
  createLocalBackup,
  shareBackup,
  createAndShareBackup,
  restoreBackup,
  listLocalBackups,
  deleteLocalBackup,
  getLastBackupTime,
};
