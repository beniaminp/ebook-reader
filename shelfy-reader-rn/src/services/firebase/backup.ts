/**
 * Firebase Backup Stub
 *
 * React Native version:
 * - Exports the same interface as the Ionic version
 * - All operations log warnings and return safe defaults
 * - To integrate: install @react-native-firebase/firestore and
 *   @react-native-firebase/storage
 *
 * TODO: Replace with real implementation using:
 *   - @react-native-firebase/firestore
 *   - @react-native-firebase/storage
 */

export interface BackupManifest {
  timestamp: number;
  bookCount: number;
  bookmarkCount: number;
  highlightCount: number;
  fileCount: number;
  totalSize: number;
}

/**
 * Perform a full backup of all app data to Firebase.
 * Stub: throws until Firebase is configured.
 */
export async function performBackup(userId: string): Promise<void> {
  console.warn('[Firebase Backup] performBackup called but Firebase is not configured');
  throw new Error(
    'Firebase is not configured. Install @react-native-firebase/firestore and @react-native-firebase/storage to enable backups.'
  );
}

/**
 * Restore all app data from a Firebase backup.
 * Stub: throws until Firebase is configured.
 */
export async function restoreFromBackup(userId: string): Promise<void> {
  console.warn('[Firebase Backup] restoreFromBackup called but Firebase is not configured');
  throw new Error(
    'Firebase is not configured. Install @react-native-firebase/firestore and @react-native-firebase/storage to enable restore.'
  );
}

/**
 * Check if a backup exists for the given user.
 * Stub: always returns null.
 */
export async function checkForBackup(userId: string): Promise<BackupManifest | null> {
  console.warn('[Firebase Backup] checkForBackup called but Firebase is not configured');
  return null;
}

/**
 * Delete a user's backup from Firebase.
 * Stub: no-op.
 */
export async function deleteBackup(userId: string): Promise<void> {
  console.warn('[Firebase Backup] deleteBackup called but Firebase is not configured');
}
