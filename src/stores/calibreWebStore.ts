/**
 * Calibre-Web Store
 * State management for Calibre-Web integration
 * Uses Capacitor Preferences for persistence in mobile apps
 */

import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import {
  CalibreWebBook,
  CalibreWebServerConfig,
  CalibreWebSyncStatus,
  DownloadProgress,
  CalibreWebLocalBook,
} from '../types/calibreWeb';

const STORAGE_KEY = 'calibre-web-store';

interface CalibreWebState {
  // Server state
  servers: CalibreWebServerConfig[];
  activeServerId: string | null;
  isConnected: boolean;

  // Book state
  syncedBooks: CalibreWebLocalBook[];
  bookStatuses: Record<number, CalibreWebSyncStatus>;

  // Sync state
  isSyncing: boolean;
  lastSyncTime: number | null;

  // Download state
  activeDownloads: Record<number, DownloadProgress>;

  // Actions
  setActiveServer: (serverId: string) => void;
  setConnected: (connected: boolean) => void;
  addServer: (server: CalibreWebServerConfig) => void;
  removeServer: (serverId: string) => void;
  updateServer: (serverId: string, updates: Partial<CalibreWebServerConfig>) => void;

  // Book actions
  setSyncedBooks: (books: CalibreWebLocalBook[]) => void;
  addSyncedBook: (book: CalibreWebLocalBook) => void;
  removeSyncedBook: (bookId: string) => void;
  updateSyncedBook: (bookId: string, updates: Partial<CalibreWebLocalBook>) => void;
  setBookStatus: (calibreBookId: number, status: CalibreWebSyncStatus) => void;
  getBookStatus: (calibreBookId: number) => CalibreWebSyncStatus | undefined;

  // Sync actions
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: number) => void;

  // Download actions
  setDownloadProgress: (calibreBookId: number, progress: DownloadProgress) => void;
  removeDownloadProgress: (calibreBookId: number) => void;
  getDownloadProgress: (calibreBookId: number) => DownloadProgress | undefined;
  clearCompletedDownloads: () => void;

  // Persistence
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;

  // Getters
  getActiveServer: () => CalibreWebServerConfig | null;
  getBookByCalibreId: (calibreBookId: number) => CalibreWebLocalBook | undefined;
  getDownloadedBooks: () => CalibreWebLocalBook[];
  getCloudOnlyBooks: () => CalibreWebLocalBook[];
}

// Load state from storage
async function loadPersistedState(): Promise<Partial<CalibreWebState>> {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      const parsed = JSON.parse(value);
      // Convert Map back to Record
      return {
        ...parsed,
        bookStatuses: parsed.bookStatuses || {},
        activeDownloads: parsed.activeDownloads || {},
      };
    }
  } catch (error) {
    console.error('Failed to load Calibre-Web state:', error);
  }
  return {};
}

// Save state to storage
async function savePersistedState(state: Partial<CalibreWebState>) {
  try {
    const toSave = {
      servers: state.servers || [],
      activeServerId: state.activeServerId || null,
      syncedBooks: state.syncedBooks || [],
      lastSyncTime: state.lastSyncTime || null,
      bookStatuses: state.bookStatuses || {},
    };
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(toSave),
    });
  } catch (error) {
    console.error('Failed to save Calibre-Web state:', error);
  }
}

export const useCalibreWebStore = create<CalibreWebState>((set, get) => ({
  // Initial state
  servers: [],
  activeServerId: null,
  isConnected: false,
  syncedBooks: [],
  bookStatuses: {},
  isSyncing: false,
  lastSyncTime: null,
  activeDownloads: {},

  // Server actions
  setActiveServer: (serverId) => {
    set({ activeServerId: serverId });
    savePersistedState(get());
  },
  setConnected: (connected) => set({ isConnected: connected }),
  addServer: (server) => {
    set((state) => {
      const updated = state.servers.find((s) => s.id === server.id)
        ? state.servers.map((s) => (s.id === server.id ? server : s))
        : [...state.servers, server];
      savePersistedState({ ...get(), servers: updated });
      return { servers: updated };
    });
  },
  removeServer: (serverId) => {
    set((state) => {
      const updated = state.servers.filter((s) => s.id !== serverId);
      savePersistedState({
        ...get(),
        servers: updated,
        activeServerId: state.activeServerId === serverId ? null : state.activeServerId,
      });
      return {
        servers: updated,
        activeServerId: state.activeServerId === serverId ? null : state.activeServerId,
      };
    });
  },
  updateServer: (serverId, updates) => {
    set((state) => {
      const updated = state.servers.map((s) => (s.id === serverId ? { ...s, ...updates } : s));
      savePersistedState({ ...get(), servers: updated });
      return { servers: updated };
    });
  },

  // Book actions
  setSyncedBooks: (books) => {
    set({ syncedBooks: books });
    savePersistedState(get());
  },
  addSyncedBook: (book) => {
    set((state) => {
      const exists = state.syncedBooks.find((b) => b.id === book.id);
      const updated = exists
        ? state.syncedBooks.map((b) => (b.id === book.id ? book : b))
        : [...state.syncedBooks, book];
      savePersistedState({ ...get(), syncedBooks: updated });
      return { syncedBooks: updated };
    });
  },
  removeSyncedBook: (bookId) => {
    set((state) => {
      const updated = state.syncedBooks.filter((b) => b.id !== bookId);
      savePersistedState({ ...get(), syncedBooks: updated });
      return { syncedBooks: updated };
    });
  },
  updateSyncedBook: (bookId, updates) => {
    set((state) => {
      const updated = state.syncedBooks.map((b) => (b.id === bookId ? { ...b, ...updates } : b));
      savePersistedState({ ...get(), syncedBooks: updated });
      return { syncedBooks: updated };
    });
  },
  setBookStatus: (calibreBookId, status) => {
    set((state) => {
      const updated = { ...state.bookStatuses, [calibreBookId]: status };
      savePersistedState({ ...get(), bookStatuses: updated });
      return { bookStatuses: updated };
    });
  },
  getBookStatus: (calibreBookId) => {
    return get().bookStatuses[calibreBookId];
  },

  // Sync actions
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSyncTime: (time) => {
    set({ lastSyncTime: time });
    savePersistedState(get());
  },

  // Download actions
  setDownloadProgress: (calibreBookId, progress) => {
    set((state) => ({
      activeDownloads: { ...state.activeDownloads, [calibreBookId]: progress },
    }));
  },
  removeDownloadProgress: (calibreBookId) => {
    set((state) => {
      const { [calibreBookId]: _, ...rest } = state.activeDownloads;
      return { activeDownloads: rest };
    });
  },
  getDownloadProgress: (calibreBookId) => {
    return get().activeDownloads[calibreBookId];
  },
  clearCompletedDownloads: () => {
    set((state) => {
      const filtered: Record<number, DownloadProgress> = {};
      for (const [id, progress] of Object.entries(state.activeDownloads)) {
        if (progress.status !== 'completed' && progress.status !== 'failed') {
          filtered[Number(id)] = progress;
        }
      }
      return { activeDownloads: filtered };
    });
  },

  // Persistence
  saveState: async () => {
    await savePersistedState(get());
  },
  loadState: async () => {
    const loaded = await loadPersistedState();
    set(loaded);
  },

  // Getters
  getActiveServer: () => {
    const state = get();
    return state.servers.find((s) => s.id === state.activeServerId) || null;
  },
  getBookByCalibreId: (calibreBookId) => {
    return get().syncedBooks.find((b) => b.calibreBookId === calibreBookId);
  },
  getDownloadedBooks: () => {
    return get().syncedBooks.filter((b) => b.isDownloaded);
  },
  getCloudOnlyBooks: () => {
    return get().syncedBooks.filter((b) => !b.isDownloaded);
  },
}));

// Helper hooks
export const useActiveServer = () => useCalibreWebStore((state) => state.getActiveServer());
export const useIsConnected = () => useCalibreWebStore((state) => state.isConnected);
export const useSyncedBooks = () => useCalibreWebStore((state) => state.syncedBooks);
export const useDownloadedBooks = () => useCalibreWebStore((state) => state.getDownloadedBooks());
export const useCloudOnlyBooks = () => useCalibreWebStore((state) => state.getCloudOnlyBooks());
export const useIsSyncing = () => useCalibreWebStore((state) => state.isSyncing);
