import { create } from 'zustand';
import { databaseService } from '../services/database';
import type { Book, Bookmark, Highlight } from '../types/index';

// TODO: implement markDirty for RN backup system
const markDirty = () => {};

interface AppState {
  // Library state
  books: Book[];
  currentBook: Book | null;
  isLoading: boolean;
  error: string | null;

  // Reading state
  currentLocation: number;
  bookmarks: Map<string, number[]>;
  highlights: Map<string, Array<{ location: number; text: string; color: string; note?: string }>>;

  // Actions - Library
  loadBooks: () => Promise<void>;
  setBooks: (books: Book[]) => void;
  addBook: (book: Omit<Book, 'dateAdded'>) => Promise<Book | null>;
  removeBook: (bookId: string) => Promise<boolean>;
  setCurrentBook: (book: Book | null) => void;
  updateBook: (
    bookId: string,
    updates: Partial<Omit<Book, 'id' | 'dateAdded'>>
  ) => Promise<boolean>;

  // Progress actions
  updateProgress: (
    bookId: string,
    location: number,
    total: number,
    locationStr?: string,
    chapterTitle?: string
  ) => Promise<void>;

  // Bookmark actions
  loadBookmarks: (bookId: string) => Promise<void>;
  addBookmark: (
    bookId: string,
    location: string,
    pageNumber?: number,
    chapterTitle?: string,
    textPreview?: string
  ) => Promise<void>;
  removeBookmark: (bookmarkId: string) => Promise<void>;
  hasBookmark: (bookId: string, location: number) => boolean;

  // Highlight actions
  loadHighlights: (bookId: string) => Promise<void>;
  addHighlight: (
    bookId: string,
    location: string,
    text: string,
    color: string,
    note?: string,
    pageNumber?: number,
    chapterTitle?: string
  ) => Promise<void>;
  removeHighlight: (highlightId: string) => Promise<void>;
  getHighlights: (
    bookId: string
  ) => Array<{ location: number; text: string; color: string; note?: string }>;

  // Search
  searchBooks: (query: string) => Promise<Book[]>;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  books: [],
  currentBook: null,
  isLoading: false,
  error: null,
  currentLocation: 0,
  bookmarks: new Map(),
  highlights: new Map(),

  // Library actions
  loadBooks: async () => {
    set({ isLoading: true, error: null });
    try {
      const books = await databaseService.getAllBooks();
      set({ books, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load books',
        isLoading: false,
      });
    }
  },

  setBooks: (books) => set({ books }),

  addBook: async (bookData) => {
    set({ isLoading: true, error: null });
    try {
      const success = await databaseService.addBook(bookData);
      if (success) {
        // Reload books to get the newly added book from the database
        const books = await databaseService.getAllBooks();
        const newBook = books.find((b) => b.id === bookData.id) || null;
        set({ books, isLoading: false });
        markDirty();
        return newBook;
      }
      set({ isLoading: false });
      return null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add book',
        isLoading: false,
      });
      return null;
    }
  },

  removeBook: async (bookId) => {
    set({ isLoading: true, error: null });
    try {
      // Unshare the book if it was shared (fire-and-forget, don't block deletion)
      try {
        const { useSharingStore } = await import('./useSharingStore');
        const sharingState = useSharingStore.getState();
        await sharingState.loadMySharedBooks();
        const sharedDoc = sharingState.mySharedBooks.find((d) => d.localBookId === bookId);
        if (sharedDoc) {
          await sharingState.unshareBook(sharedDoc);
        }
      } catch (err) {
        console.warn('Failed to unshare book during deletion:', err);
      }

      const success = await databaseService.deleteBook(bookId);
      if (success) {
        set((state) => ({
          books: state.books.filter((b) => b.id !== bookId),
          currentBook: state.currentBook?.id === bookId ? null : state.currentBook,
          isLoading: false,
        }));
        markDirty();
      }
      return success;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove book',
        isLoading: false,
      });
      return false;
    }
  },

  setCurrentBook: (book) =>
    set({
      currentBook: book,
      currentLocation: 0,
    }),

  updateBook: async (bookId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const success = await databaseService.updateBook(bookId, updates);
      if (success) {
        set((state) => ({
          books: state.books.map((b) => (b.id === bookId ? { ...b, ...updates } : b)),
          currentBook:
            state.currentBook?.id === bookId
              ? { ...state.currentBook, ...updates }
              : state.currentBook,
          isLoading: false,
        }));

        // Auto-push status/rating changes to Hardcover
        try {
          const { useHardcoverStore } = await import('./hardcoverStore');
          const hcState = useHardcoverStore.getState();
          if (hcState.isConnected && hcState.matchedBooks[bookId]) {
            if ((updates as any).readStatus) {
              hcState.pushBookStatus(bookId, (updates as any).readStatus);
            }
            if (updates.metadata?.rating !== undefined) {
              hcState.pushBookRating(bookId, updates.metadata.rating);
            }
          }
        } catch { /* ignore hardcover push failure */ }
      }
      return success;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update book',
        isLoading: false,
      });
      return false;
    }
  },

  // Progress actions
  updateProgress: async (bookId, location, total, locationStr, chapterTitle) => {
    try {
      const progressPercentage = total > 0 ? location / total : 0;
      await databaseService.upsertReadingProgress(bookId, {
        currentPage: location,
        totalPages: total,
        percentage: progressPercentage * 100,
        location: locationStr,
        chapterTitle: chapterTitle,
        lastReadAt: Math.floor(Date.now() / 1000),
      });

      const previousBook = get().books.find((b) => b.id === bookId);
      const currentFurthest = previousBook?.furthestProgress || 0;
      const newFurthest = Math.max(currentFurthest, progressPercentage);

      set((state) => ({
        books: state.books.map((b) =>
          b.id === bookId
            ? {
                ...b,
                totalPages: total,
                currentPage: location,
                progress: progressPercentage,
                furthestProgress: newFurthest,
                lastRead: new Date(),
              }
            : b
        ),
        currentLocation: location,
        currentBook:
          state.currentBook?.id === bookId
            ? {
                ...state.currentBook,
                totalPages: total,
                currentPage: location,
                progress: progressPercentage,
                furthestProgress: newFurthest,
                lastRead: new Date(),
              }
            : state.currentBook,
      }));

      // TODO: Fire-and-forget side effects (streak tracking, Hardcover sync, etc.)
      // handleProgressSideEffects will be implemented in RN services
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update progress' });
    }
  },

  // Bookmark actions
  loadBookmarks: async (bookId) => {
    try {
      const bookmarks = await databaseService.getBookmarks(bookId);
      const pageNumbers: number[] = [];
      bookmarks.forEach((b: Bookmark) => {
        const pageNum = b.location?.pageNumber;
        if (pageNum !== undefined) {
          pageNumbers.push(pageNum);
        }
      });
      // Merge into existing map instead of replacing, so other books' bookmarks are preserved
      const existing = new Map(get().bookmarks);
      existing.set(bookId, pageNumbers);
      set({ bookmarks: existing });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load bookmarks' });
    }
  },

  addBookmark: async (bookId, location, pageNumber, chapterTitle, textPreview) => {
    try {
      const result = await databaseService.addBookmark({
        id: generateUUID(),
        bookId,
        location,
        pageNumber,
        chapter: chapterTitle,
        text: textPreview,
      });
      if (result && pageNumber !== undefined) {
        const existing = get().bookmarks.get(bookId) || [];
        const updated = new Map(get().bookmarks);
        updated.set(bookId, [...existing, pageNumber]);
        set({ bookmarks: updated });
      }
      markDirty();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add bookmark' });
    }
  },

  removeBookmark: async (bookmarkId) => {
    try {
      await databaseService.deleteBookmark(bookmarkId);
      const currentBook = get().currentBook;
      if (currentBook) {
        await get().loadBookmarks(currentBook.id);
      }
      markDirty();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove bookmark' });
    }
  },

  hasBookmark: (bookId, location) => {
    const bookBookmarks = get().bookmarks.get(bookId) || [];
    return bookBookmarks.includes(location);
  },

  // Highlight actions
  loadHighlights: async (bookId) => {
    try {
      const highlights = await databaseService.getHighlights(bookId);
      const entries = highlights.map((h: Highlight) => ({
        location: h.location?.pageNumber || h.location?.position || 0,
        text: h.text,
        color: h.color,
        note: h.note,
        id: h.id,
      }));
      // Merge into existing map instead of replacing, so other books' highlights are preserved
      const existing = new Map(get().highlights);
      existing.set(bookId, entries);
      set({ highlights: existing });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load highlights' });
    }
  },

  addHighlight: async (bookId, location, text, color, note) => {
    try {
      const result = await databaseService.addHighlight({
        id: generateUUID(),
        bookId,
        location,
        text,
        color,
        note,
      });
      if (result) {
        const existing = get().highlights.get(bookId) || [];
        const entry = {
          location: result.location?.pageNumber || result.location?.position || 0,
          text: result.text,
          color: result.color,
          note: result.note,
          id: result.id,
        };
        const updated = new Map(get().highlights);
        updated.set(bookId, [...existing, entry]);
        set({ highlights: updated });
      }
      markDirty();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add highlight' });
    }
  },

  removeHighlight: async (highlightId) => {
    try {
      await databaseService.deleteHighlight(highlightId);
      const currentBook = get().currentBook;
      if (currentBook) {
        const existing = get().highlights.get(currentBook.id) || [];
        const updated = new Map(get().highlights);
        updated.set(
          currentBook.id,
          existing.filter((h) => (h as { id?: string }).id !== highlightId)
        );
        set({ highlights: updated });
      }
      markDirty();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove highlight' });
    }
  },

  getHighlights: (bookId) => {
    return get().highlights.get(bookId) || [];
  },

  // Search
  searchBooks: async (query) => {
    try {
      return await databaseService.searchBooks(query);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Search failed' });
      return [];
    }
  },
}));
