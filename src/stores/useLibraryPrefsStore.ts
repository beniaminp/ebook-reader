import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'grid' | 'list' | 'shelf';
export type SortOption = 'title' | 'author' | 'dateAdded' | 'lastRead' | 'rating';
export type ReadStatus = 'all' | 'unread' | 'reading' | 'finished' | 'dnf';

export interface ActiveFilters {
  format: string;
  collectionId: string;
  readStatus: ReadStatus;
  tagIds: string[];
}

interface LibraryPrefsState {
  viewMode: ViewMode;
  sortBy: SortOption;
  filters: ActiveFilters;

  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sort: SortOption) => void;
  setFilters: (filters: ActiveFilters | ((prev: ActiveFilters) => ActiveFilters)) => void;
}

export const DEFAULT_FILTERS: ActiveFilters = {
  format: 'all',
  collectionId: 'all',
  readStatus: 'all',
  tagIds: [],
};

export const useLibraryPrefsStore = create<LibraryPrefsState>()(
  persist(
    (set, get) => ({
      viewMode: 'grid',
      sortBy: 'dateAdded',
      filters: DEFAULT_FILTERS,

      setViewMode: (mode) => set({ viewMode: mode }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setFilters: (filtersOrFn) =>
        set({
          filters: typeof filtersOrFn === 'function' ? filtersOrFn(get().filters) : filtersOrFn,
        }),
    }),
    {
      name: 'library-preferences',
      partialize: (state) => ({
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        filters: state.filters,
      }),
    }
  )
);
