/**
 * useAutoRestore Hook
 *
 * Automatically checks for a cloud backup on app startup
 * and prompts the user to restore if the local library is empty.
 *
 * React Native version: Uses the same useAuthStore / useAppStore interface.
 * Firebase backup service is a TODO stub - the hook is fully typed and
 * ready to work once the RN Firebase services are implemented.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useAppStore } from '../stores/useAppStore';

export interface BackupManifest {
  timestamp: number;
  bookCount: number;
  bookmarkCount: number;
  highlightCount: number;
  fileCount: number;
  totalSize: number;
}

/**
 * Stub: Check for an existing backup for the given user.
 * This will be replaced with actual Firebase calls once RN Firebase is set up.
 */
async function checkForBackup(_userId: string): Promise<BackupManifest | null> {
  // TODO: Implement RN Firebase backup check
  // For now, return null (no backup found)
  return null;
}

interface AutoRestoreState {
  showPrompt: boolean;
  backupInfo: BackupManifest | null;
  isRestoring: boolean;
  confirmRestore: () => Promise<void>;
  dismiss: () => void;
}

export function useAutoRestore(): AutoRestoreState {
  const [showPrompt, setShowPrompt] = useState(false);
  const [backupInfo, setBackupInfo] = useState<BackupManifest | null>(null);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const isRestoring = useAuthStore((s) => s.isRestoring);
  const triggerRestore = useAuthStore((s) => s.triggerRestore);
  const books = useAppStore((s) => s.books);

  useEffect(() => {
    if (isLoading || !isSignedIn || !user) return;
    // Only prompt if local library is empty (fresh install)
    if (books.length > 0) return;

    let cancelled = false;
    checkForBackup(user.uid)
      .then((info) => {
        if (cancelled) return;
        if (info && info.bookCount > 0) {
          setBackupInfo(info);
          setShowPrompt(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, isLoading, user, books.length]);

  const confirmRestore = useCallback(async () => {
    await triggerRestore();
    setShowPrompt(false);
    // Reload books after restore
    await useAppStore.getState().loadBooks();
  }, [triggerRestore]);

  const dismiss = useCallback(() => {
    setShowPrompt(false);
  }, []);

  return { showPrompt, backupInfo, isRestoring, confirmRestore, dismiss };
}
