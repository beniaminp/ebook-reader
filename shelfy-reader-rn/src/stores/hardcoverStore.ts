/**
 * Hardcover Store
 * Zustand store for Hardcover sync state management.
 *
 * React Native version: uses AsyncStorage instead of @capacitor/preferences.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hardcoverService } from '../services/hardcoverService';
import { hardcoverSyncQueue } from '../services/hardcoverSyncQueue';
import { databaseService } from '../services/database';
import {
  HARDCOVER_STATUS_MAP,
  HARDCOVER_STATUS_REVERSE,
} from '../types/hardcover';
import type { HardcoverSyncResult, HardcoverStatusId } from '../types/hardcover';

const STORE_KEY = 'hardcover-store';

interface PersistedState {
  isConnected: boolean;
  username: string | null;
  lastSyncAt: number | null;
  matchedBooks: Record<string, number>; // localBookId -> hardcoverId
  autoSync: boolean;
}

interface HardcoverState extends PersistedState {
  isSyncing: boolean;
  syncError: string | null;
  pendingQueueCount: number;

  // Actions
  initialize: () => Promise<void>;
  connect: (token: string) => Promise<string>;
  disconnect: () => Promise<void>;
  fullSync: () => Promise<HardcoverSyncResult>;
  pushBookStatus: (localBookId: string, status: string) => Promise<void>;
  pushBookRating: (localBookId: string, rating: number) => Promise<void>;
  pushBookProgress: (localBookId: string, percentage: number) => Promise<void>;
  setAutoSync: (enabled: boolean) => Promise<void>;
  processQueue: () => Promise<void>;
  refreshQueueCount: () => Promise<void>;
}

async function loadPersistedState(): Promise<Partial<PersistedState>> {
  try {
    const value = await AsyncStorage.getItem(STORE_KEY);
    if (value) return JSON.parse(value);
  } catch { /* ignore */ }
  return {};
}

async function savePersistedState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(state));
}

export const useHardcoverStore = create<HardcoverState>((set, get) => ({
  isConnected: false,
  username: null,
  lastSyncAt: null,
  matchedBooks: {},
  autoSync: false,
  isSyncing: false,
  syncError: null,
  pendingQueueCount: 0,

  initialize: async () => {
    const persisted = await loadPersistedState();
    set({
      isConnected: persisted.isConnected || false,
      username: persisted.username || null,
      lastSyncAt: persisted.lastSyncAt || null,
      matchedBooks: persisted.matchedBooks || {},
      autoSync: persisted.autoSync || false,
    });
    await get().refreshQueueCount();
  },

  connect: async (token: string) => {
    const username = await hardcoverService.testConnection(token);
    await hardcoverService.saveConfig({ token, username, autoSync: false });
    const newState = {
      isConnected: true,
      username,
      lastSyncAt: get().lastSyncAt,
      matchedBooks: get().matchedBooks,
      autoSync: false,
    };
    set(newState);
    await savePersistedState(newState);
    return username;
  },

  disconnect: async () => {
    await hardcoverService.clearConfig();
    const newState: PersistedState = {
      isConnected: false,
      username: null,
      lastSyncAt: null,
      matchedBooks: {},
      autoSync: false,
    };
    set({ ...newState, isSyncing: false, syncError: null, pendingQueueCount: 0 });
    await savePersistedState(newState);
  },

  fullSync: async () => {
    set({ isSyncing: true, syncError: null });
    const result: HardcoverSyncResult = { matched: 0, pulled: 0, pushed: 0, errors: [] };

    try {
      // 1. Fetch all user books from Hardcover
      const userBooks = await hardcoverService.getUserBooks();

      // 2. Get local books
      const localBooks = await databaseService.getAllBooks();
      const matchedBooks: Record<string, number> = { ...get().matchedBooks };

      // 3. Match local books to Hardcover books
      for (const localBook of localBooks) {
        // Already matched?
        if (matchedBooks[localBook.id]) continue;

        const isbn = localBook.metadata?.isbn;
        let matched = false;

        // Try ISBN match first
        if (isbn) {
          const hcBook = userBooks.find(
            (ub) => ub.book.isbn_13 === isbn || ub.book.isbn_10 === isbn
          );
          if (hcBook) {
            matchedBooks[localBook.id] = hcBook.book_id;
            matched = true;
          }
        }

        // Try title+author match
        if (!matched) {
          const titleLower = localBook.title.toLowerCase();
          const authorLower = localBook.author.toLowerCase();
          const hcBook = userBooks.find((ub) => {
            const hcTitle = ub.book.title?.toLowerCase() || '';
            const hcAuthor = ub.book.contributions?.[0]?.author?.name?.toLowerCase() || '';
            return hcTitle === titleLower && hcAuthor === authorLower;
          });
          if (hcBook) {
            matchedBooks[localBook.id] = hcBook.book_id;
          }
        }
      }

      result.matched = Object.keys(matchedBooks).length;

      // 4. Pull data from Hardcover for matched books
      for (const [localBookId, hardcoverId] of Object.entries(matchedBooks)) {
        const userBook = userBooks.find((ub) => ub.book_id === hardcoverId);
        if (!userBook) continue;

        const localBook = localBooks.find((b) => b.id === localBookId);
        if (!localBook) continue;

        const updates: Record<string, any> = { hardcoverId };

        // Pull community rating
        if (userBook.book.rating) updates.communityRating = userBook.book.rating;
        if (userBook.book.ratings_count) updates.communityRatingCount = userBook.book.ratings_count;

        // Pull review (only if local is empty)
        if (userBook.review && !localBook.hardcoverReview) {
          updates.hardcoverReview = userBook.review;
        }

        // Pull reading status (only if local is unread)
        if (userBook.status_id && localBook.readStatus === 'unread') {
          const status = HARDCOVER_STATUS_REVERSE[userBook.status_id as HardcoverStatusId];
          if (status) updates.readStatus = status;
        }

        // Pull rating (only if local has no rating)
        if (userBook.rating && !localBook.metadata?.rating) {
          updates.rating = userBook.rating;
        }

        // Pull page count
        if (userBook.book.pages && !localBook.pageCount) {
          updates.pageCount = userBook.book.pages;
        }

        // Pull cover URL
        if (userBook.book.image?.url && !localBook.coverUrl) {
          updates.coverUrl = userBook.book.image.url;
        }

        await databaseService.updateBookHardcoverData(localBookId, updates);
        result.pulled++;
      }

      // 5. Push local status/rating to Hardcover for matched books
      for (const [localBookId, hardcoverId] of Object.entries(matchedBooks)) {
        const localBook = localBooks.find((b) => b.id === localBookId);
        if (!localBook) continue;

        const userBook = userBooks.find((ub) => ub.book_id === hardcoverId);
        const localStatusId = HARDCOVER_STATUS_MAP[localBook.readStatus || 'unread'] as HardcoverStatusId | undefined;

        // Push status if different
        if (localStatusId && userBook && userBook.status_id !== localStatusId) {
          try {
            await hardcoverService.upsertUserBook(hardcoverId, { statusId: localStatusId });
            result.pushed++;
          } catch (e) {
            result.errors.push(`Failed to push status for ${localBook.title}`);
          }
        }
      }

      // 6. Process any pending queue items
      await hardcoverSyncQueue.processQueue();

      const newState: PersistedState = {
        isConnected: true,
        username: get().username,
        lastSyncAt: Date.now(),
        matchedBooks,
        autoSync: get().autoSync,
      };
      set({ ...newState, isSyncing: false });
      await savePersistedState(newState);
      await get().refreshQueueCount();

      // Reload books in app store to reflect updates
      const { useAppStore } = await import('./useAppStore');
      await useAppStore.getState().loadBooks();

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sync failed';
      set({ isSyncing: false, syncError: msg });
      result.errors.push(msg);
      return result;
    }
  },

  pushBookStatus: async (localBookId: string, status: string) => {
    const hardcoverId = get().matchedBooks[localBookId];
    if (!hardcoverId) return;
    const statusId = HARDCOVER_STATUS_MAP[status] as HardcoverStatusId | undefined;
    if (!statusId) return;
    await hardcoverSyncQueue.enqueueSync(localBookId, 'status', { hardcoverId, statusId });
    await get().refreshQueueCount();
  },

  pushBookRating: async (localBookId: string, rating: number) => {
    const hardcoverId = get().matchedBooks[localBookId];
    if (!hardcoverId) return;
    await hardcoverSyncQueue.enqueueSync(localBookId, 'rating', { hardcoverId, rating });
    await get().refreshQueueCount();
  },

  pushBookProgress: async (localBookId: string, percentage: number) => {
    const hardcoverId = get().matchedBooks[localBookId];
    if (!hardcoverId) return;
    await hardcoverSyncQueue.enqueueSync(localBookId, 'progress', { hardcoverId, percentage });
    await get().refreshQueueCount();
  },

  setAutoSync: async (enabled: boolean) => {
    set({ autoSync: enabled });
    const config = await hardcoverService.loadConfig();
    if (config) {
      await hardcoverService.saveConfig({ ...config, autoSync: enabled });
    }
    await savePersistedState({
      isConnected: get().isConnected,
      username: get().username,
      lastSyncAt: get().lastSyncAt,
      matchedBooks: get().matchedBooks,
      autoSync: enabled,
    });
  },

  processQueue: async () => {
    try {
      await hardcoverSyncQueue.processQueue();
      await get().refreshQueueCount();
    } catch (e) {
      console.error('Failed to process Hardcover sync queue:', e);
    }
  },

  refreshQueueCount: async () => {
    const count = await hardcoverSyncQueue.getQueueCount();
    set({ pendingQueueCount: count });
  },
}));
