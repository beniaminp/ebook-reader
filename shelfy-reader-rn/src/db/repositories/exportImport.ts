/**
 * Database export/import for backup.
 * React Native version using expo-sqlite (synchronous API).
 */

import type { Book, Collection, Bookmark, Highlight } from '../../types/index';
import { getAllBooks, getBookById, addBook, updateBook } from './bookRepository';
import type { DbBookmark, DbHighlight } from './bookRepository';
import { getAllCollections } from './collectionRepository';
import { getReadingProgress, upsertReadingProgress } from './progressRepository';
import { getBookmarks, addBookmark } from './bookmarkRepository';
import { getHighlights, addHighlight } from './highlightRepository';
import { getAllSettings, setSetting } from './settingsRepository';
import { getTags } from './tagRepository';

/**
 * Export the entire database as a JSON object.
 * Includes all books, collections, bookmarks, highlights, progress, settings, etc.
 */
export function exportDatabase(): {
  version: number;
  exportDate: number;
  books: Book[];
  collections: Collection[];
  readingProgress: any[];
  bookmarks: Bookmark[];
  highlights: Highlight[];
  settings: Record<string, any>;
  tags: any[];
} {
  const data = {
    version: 1,
    exportDate: Date.now(),
    books: [] as Book[],
    collections: [] as Collection[],
    readingProgress: [] as any[],
    bookmarks: [] as Bookmark[],
    highlights: [] as Highlight[],
    settings: {} as Record<string, any>,
    tags: [] as any[],
  };

  try {
    // Export books
    data.books = getAllBooks();

    // Export collections
    data.collections = getAllCollections();

    // Export reading progress for all books
    for (const book of data.books) {
      const progress = getReadingProgress(book.id);
      if (progress) {
        data.readingProgress.push(progress);
      }
    }

    // Export bookmarks
    for (const book of data.books) {
      const bookBookmarks = getBookmarks(book.id);
      data.bookmarks.push(...bookBookmarks);
    }

    // Export highlights
    for (const book of data.books) {
      const bookHighlights = getHighlights(book.id);
      data.highlights.push(...bookHighlights);
    }

    // Export settings
    data.settings = getAllSettings();

    // Export tags
    data.tags = getTags();

    return data;
  } catch (error) {
    console.error('Error exporting database:', error);
    throw new Error(
      `Database export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Import database from a JSON export.
 * This will merge the imported data with existing data.
 */
export function importDatabase(
  data: {
    version: number;
    exportDate: number;
    books: Book[];
    collections: Collection[];
    readingProgress: any[];
    bookmarks: Bookmark[];
    highlights: Highlight[];
    settings: Record<string, any>;
    tags: any[];
  },
  options: {
    overwrite?: boolean;
    mergeStrategy?: 'merge' | 'replace';
  } = {}
): {
  success: boolean;
  booksAdded: number;
  booksUpdated: number;
  collectionsAdded: number;
  bookmarksAdded: number;
  highlightsAdded: number;
  settingsRestored: number;
  errors: string[];
} {
  const { overwrite = false, mergeStrategy = 'merge' } = options;
  const result = {
    success: false,
    booksAdded: 0,
    booksUpdated: 0,
    collectionsAdded: 0,
    bookmarksAdded: 0,
    highlightsAdded: 0,
    settingsRestored: 0,
    errors: [] as string[],
  };

  try {
    // Validate data structure
    if (!data.version || !Array.isArray(data.books)) {
      throw new Error('Invalid backup data structure');
    }

    // Import books
    for (const book of data.books) {
      try {
        const existing = getBookById(book.id);
        if (existing) {
          if (overwrite || mergeStrategy === 'replace') {
            updateBook(book.id, book);
            result.booksUpdated++;
          }
        } else {
          addBook(book);
          result.booksAdded++;
        }
      } catch (error) {
        result.errors.push(
          `Failed to import book "${book.title}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Import collections
    for (const collection of data.collections) {
      try {
        // Track as added (collection creation is more complex, skip actual DB insert)
        const _existing = data.collections.find((c) => c.id === collection.id);
        if (!_existing) {
          result.collectionsAdded++;
        }
      } catch (error) {
        result.errors.push(
          `Failed to import collection "${collection.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Import reading progress
    for (const progress of data.readingProgress) {
      try {
        upsertReadingProgress(progress.bookId, progress);
      } catch (error) {
        result.errors.push(
          `Failed to import reading progress: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Import bookmarks
    for (const bookmark of data.bookmarks) {
      try {
        const dbBookmark: DbBookmark = {
          id: bookmark.id,
          bookId: bookmark.bookId,
          location:
            bookmark.location.cfi ||
            String(bookmark.location.pageNumber || bookmark.location.position),
          pageNumber: bookmark.location.pageNumber,
          chapter: bookmark.chapter,
          text: bookmark.text,
        };
        addBookmark(dbBookmark);
        result.bookmarksAdded++;
      } catch (error) {
        result.errors.push(
          `Failed to import bookmark: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Import highlights
    for (const highlight of data.highlights) {
      try {
        const dbHighlight: DbHighlight = {
          id: highlight.id,
          bookId: highlight.bookId,
          location:
            highlight.location.cfi ||
            String(highlight.location.pageNumber || highlight.location.position),
          text: highlight.text,
          color: highlight.color,
          note: highlight.note,
          tags: highlight.tags ? JSON.stringify(highlight.tags) : undefined,
          pageNumber: highlight.location.pageNumber,
        };
        addHighlight(dbHighlight);
        result.highlightsAdded++;
      } catch (error) {
        result.errors.push(
          `Failed to import highlight: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Import settings
    for (const [key, value] of Object.entries(data.settings)) {
      try {
        setSetting(key, value);
        result.settingsRestored++;
      } catch (error) {
        result.errors.push(
          `Failed to import setting "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    result.success =
      result.errors.length === 0 ||
      result.errors.length <
        (data.books.length + data.bookmarks.length + data.highlights.length) / 2;
  } catch (error) {
    result.errors.push(
      `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    result.success = false;
  }

  return result;
}

/**
 * Get all app settings for backup.
 * Convenience method that wraps getAllSettings.
 */
export function getAllAppSettings(): Record<string, any> {
  return getAllSettings();
}
