import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useAppStore } from '../stores/useAppStore';
import { checkForBackup, type BackupManifest } from '../services/firebase/backup';

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
    checkForBackup(user.uid).then((info) => {
      if (cancelled) return;
      if (info && info.bookCount > 0) {
        setBackupInfo(info);
        setShowPrompt(true);
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [isSignedIn, isLoading, user, books.length]);

  const confirmRestore = async () => {
    await triggerRestore();
    setShowPrompt(false);
    // Reload books after restore
    await useAppStore.getState().loadBooks();
  };

  const dismiss = () => {
    setShowPrompt(false);
  };

  return { showPrompt, backupInfo, isRestoring, confirmRestore, dismiss };
}
