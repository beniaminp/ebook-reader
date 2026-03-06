/**
 * Ensures .nomedia files exist in app directories to prevent
 * Android's MediaScanner from indexing covers/books in the gallery.
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const created = new Set<string>();

export async function ensureNoMedia(directory: Directory, dirPath: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

  const key = `${directory}:${dirPath}`;
  if (created.has(key)) return;

  try {
    await Filesystem.writeFile({
      path: `${dirPath}/.nomedia`,
      data: '',
      directory,
      recursive: true,
    });
    created.add(key);
  } catch {
    // Best effort — don't block the caller
  }
}
