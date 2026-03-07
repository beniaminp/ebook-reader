/**
 * Smart Shelves Store
 * Manages smart shelf definitions and active shelf selection.
 *
 * React Native version: uses AsyncStorage for persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SmartShelf } from '../services/smartShelvesService';
import { DEFAULT_SMART_SHELVES } from '../services/smartShelvesService';

interface SmartShelvesState {
  shelves: SmartShelf[];
  /** Currently active smart shelf ID, or null if none selected */
  activeShelfId: string | null;

  addShelf: (shelf: SmartShelf) => void;
  removeShelf: (shelfId: string) => void;
  updateShelf: (shelfId: string, updates: Partial<SmartShelf>) => void;
  setActiveShelf: (shelfId: string | null) => void;
  resetDefaults: () => void;
}

export const useSmartShelvesStore = create<SmartShelvesState>()(
  persist(
    (set, get) => ({
      shelves: [...DEFAULT_SMART_SHELVES],
      activeShelfId: null,

      addShelf: (shelf) =>
        set((state) => ({
          shelves: [...state.shelves, shelf],
        })),

      removeShelf: (shelfId) =>
        set((state) => ({
          shelves: state.shelves.filter((s) => s.id !== shelfId),
          activeShelfId: state.activeShelfId === shelfId ? null : state.activeShelfId,
        })),

      updateShelf: (shelfId, updates) =>
        set((state) => ({
          shelves: state.shelves.map((s) =>
            s.id === shelfId ? { ...s, ...updates } : s
          ),
        })),

      setActiveShelf: (shelfId) => set({ activeShelfId: shelfId }),

      resetDefaults: () => {
        const state = get();
        // Keep user-created shelves, replace defaults
        const userShelves = state.shelves.filter((s) => !s.isDefault);
        set({ shelves: [...DEFAULT_SMART_SHELVES, ...userShelves] });
      },
    }),
    {
      name: 'smart-shelves-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        shelves: state.shelves,
        activeShelfId: state.activeShelfId,
      }),
      // Migration: ensure default shelves exist if store was created before they were added
      migrate: (persisted: any, version: number) => {
        if (persisted && Array.isArray(persisted.shelves)) {
          const existingIds = new Set(persisted.shelves.map((s: SmartShelf) => s.id));
          const missingDefaults = DEFAULT_SMART_SHELVES.filter(
            (d) => !existingIds.has(d.id)
          );
          return {
            ...persisted,
            shelves: [...missingDefaults, ...persisted.shelves],
          };
        }
        return persisted;
      },
      version: 1,
    }
  )
);
