import { create } from 'zustand';
import type { User, Unsubscribe } from 'firebase/auth';
import {
  signInWithGoogle,
  signOutUser,
  onAuthStateChanged,
} from '../services/firebaseAuthService';
import { performBackup, restoreFromBackup, checkForBackup } from '../services/firebaseBackupService';
import { startAutoBackup, stopAutoBackup } from '../services/firebaseAutoBackupManager';

interface AuthState {
  user: User | null;
  isSignedIn: boolean;
  isLoading: boolean;
  error: string | null;
  lastBackupTime: number | null;
  isBackingUp: boolean;
  backupError: string | null;
  isRestoring: boolean;

  initialize: () => Unsubscribe;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  triggerBackup: () => Promise<void>;
  triggerRestore: () => Promise<void>;
}

let initialized = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isSignedIn: false,
  isLoading: true,
  error: null,
  lastBackupTime: null,
  isBackingUp: false,
  backupError: null,
  isRestoring: false,

  initialize: () => {
    if (initialized) {
      // Return a no-op unsubscribe if already initialized
      return () => {};
    }
    initialized = true;

    const unsubscribe = onAuthStateChanged((user) => {
      set({ user, isSignedIn: !!user, isLoading: false });

      if (user) {
        startAutoBackup(user.uid);
        // Check last backup time
        checkForBackup(user.uid).then((info) => {
          if (info) {
            set({ lastBackupTime: info.timestamp });
          }
        }).catch(() => {});
      } else {
        stopAutoBackup();
      }
    });

    return unsubscribe;
  },

  signIn: async () => {
    set({ isLoading: true, error: null });
    try {
      await signInWithGoogle();
      // Auth state change listener will handle updating state
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Sign-in failed',
        isLoading: false,
      });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      stopAutoBackup();
      await signOutUser();
      set({ user: null, isSignedIn: false, isLoading: false, lastBackupTime: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Sign-out failed',
        isLoading: false,
      });
    }
  },

  triggerBackup: async () => {
    const { user } = get();
    if (!user) return;

    set({ isBackingUp: true, backupError: null });
    try {
      await performBackup(user.uid);
      set({ isBackingUp: false, lastBackupTime: Date.now() });
    } catch (error) {
      set({
        isBackingUp: false,
        backupError: error instanceof Error ? error.message : 'Backup failed',
      });
    }
  },

  triggerRestore: async () => {
    const { user } = get();
    if (!user) return;

    set({ isRestoring: true, error: null });
    try {
      await restoreFromBackup(user.uid);
      set({ isRestoring: false });
    } catch (error) {
      set({
        isRestoring: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      });
    }
  },
}));
