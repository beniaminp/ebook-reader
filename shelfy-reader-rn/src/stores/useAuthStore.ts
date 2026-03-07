/**
 * Auth Store
 * Manages authentication state and backup/restore actions.
 *
 * React Native version: Firebase auth services will be implemented
 * separately for RN. This store keeps the same interface.
 */

import { create } from 'zustand';

// TODO: Replace with RN Firebase auth imports when services are implemented
// import type { User, Unsubscribe } from 'firebase/auth';

// Placeholder types until RN Firebase is set up
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

type Unsubscribe = () => void;

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

    // TODO: Implement RN Firebase auth listener
    // For now, just set loading to false
    set({ isLoading: false });

    // Return no-op unsubscribe
    return () => {};
  },

  signIn: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implement RN Firebase Google sign-in
      set({ isLoading: false, error: 'Sign-in not yet implemented for React Native' });
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
      // TODO: Implement RN Firebase sign-out
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
      // TODO: Implement RN Firebase backup
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
      // TODO: Implement RN Firebase restore
      set({ isRestoring: false });
    } catch (error) {
      set({
        isRestoring: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      });
    }
  },
}));
