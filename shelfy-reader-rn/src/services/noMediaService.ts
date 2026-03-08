/**
 * No Media Service
 *
 * Prevents Android media scanner from indexing book files
 * by creating a .nomedia file in the books directory.
 */

import { Paths, File, Directory } from 'expo-file-system';

const BOOKS_DIR = new Directory(Paths.document, 'books');

/**
 * Create a .nomedia file in the books directory to prevent
 * Android's MediaScanner from indexing book files (e.g. cover images).
 *
 * This file tells the Android media scanner to skip this directory.
 * Safe to call multiple times -- only creates the file if it doesn't exist.
 */
export function ensureNoMedia(): void {
  try {
    // Ensure the books directory exists first
    if (!BOOKS_DIR.exists) {
      BOOKS_DIR.create({ intermediates: true });
    }

    const noMediaFile = new File(BOOKS_DIR, '.nomedia');
    if (!noMediaFile.exists) {
      noMediaFile.write('');
    }
  } catch (error) {
    console.warn('[NoMedia] Failed to create .nomedia file:', error);
  }
}

/**
 * Check if the .nomedia file exists in the books directory.
 */
export function hasNoMedia(): boolean {
  try {
    const noMediaFile = new File(BOOKS_DIR, '.nomedia');
    return noMediaFile.exists;
  } catch {
    return false;
  }
}

export const noMediaService = {
  ensureNoMedia,
  hasNoMedia,
};
