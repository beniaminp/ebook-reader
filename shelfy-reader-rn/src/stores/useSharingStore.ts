/**
 * Sharing Store
 * Manages book sharing state.
 *
 * React Native version: WebTorrent/P2P is not available on RN.
 * This is a minimal stub store.
 */

import { create } from 'zustand';

interface SharedBookDoc {
  localBookId: string;
  [key: string]: any;
}

interface SharingState {
  isSharing: boolean;
  sharedBooks: string[];
  mySharedBooks: SharedBookDoc[];
  startSharing: (bookId: string) => Promise<void>;
  stopSharing: (bookId: string) => Promise<void>;
  stopAll: () => void;
  loadMySharedBooks: () => Promise<void>;
  unshareBook: (doc: SharedBookDoc) => Promise<void>;
}

export const useSharingStore = create<SharingState>((set) => ({
  isSharing: false,
  sharedBooks: [],
  mySharedBooks: [],

  startSharing: async (_bookId: string) => {
    console.warn('Sharing is not available in the React Native version');
  },

  stopSharing: async (_bookId: string) => {
    // No-op
  },

  stopAll: () => {
    set({ isSharing: false, sharedBooks: [], mySharedBooks: [] });
  },

  loadMySharedBooks: async () => {
    // No-op - sharing not available in RN
  },

  unshareBook: async (_doc: SharedBookDoc) => {
    // No-op - sharing not available in RN
  },
}));
