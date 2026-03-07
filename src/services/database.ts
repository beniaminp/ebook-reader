/**
 * Database service facade.
 * Re-exports all domain repository functions so existing consumer imports remain unchanged.
 */

// Connection & initialization
export { initDatabase } from './db/connection';

// Book operations & internal types
export {
  getAllBooks,
  getBookById,
  addBook,
  updateBook,
  updateBookMetadata,
  deleteBook,
  searchBooks,
  getBooksByFormat,
} from './db/bookRepository';
export type { DbBookmark, DbHighlight } from './db/bookRepository';

// Bookmark operations
export { addBookmark, getBookmarks, deleteBookmark } from './db/bookmarkRepository';

// Highlight operations
export {
  addHighlight,
  getHighlights,
  deleteHighlight,
  updateHighlight,
} from './db/highlightRepository';

// Reading progress operations
export {
  upsertReadingProgress,
  getReadingProgress,
  updateFurthestProgress,
} from './db/progressRepository';

// Collection operations
export {
  getAllCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  addBookToCollection,
  removeBookFromCollection,
  getBooksInCollection,
} from './db/collectionRepository';

// Reading stats operations
export {
  recordReadingSession,
  getReadingStats,
  getGlobalReadingStats,
  recordIndividualSession,
  getReadingTimeline,
  getTotalReadingSummary,
} from './db/statsRepository';

// Settings & theme operations
export {
  getSetting,
  setSetting,
  getAllSettings,
  getThemes,
  getTheme,
} from './db/settingsRepository';

// Tag operations
export {
  getTags,
  createTag,
  addTagToBook,
  removeTagFromBook,
  getBookTags,
} from './db/tagRepository';

// Hardcover & sync queue operations
export {
  updateBookHardcoverData,
  getBookByHardcoverId,
  addToSyncQueue,
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueRetry,
} from './db/hardcoverRepository';

// Export/Import operations
export { exportDatabase, importDatabase, getAllAppSettings } from './db/exportImport';

// ============================================================================
// Re-import everything for the databaseService object
// ============================================================================

import { initDatabase } from './db/connection';
import {
  getAllBooks,
  getBookById,
  addBook,
  updateBook,
  updateBookMetadata,
  deleteBook,
  searchBooks,
  getBooksByFormat,
} from './db/bookRepository';
import { addBookmark, getBookmarks, deleteBookmark } from './db/bookmarkRepository';
import {
  addHighlight,
  getHighlights,
  deleteHighlight,
  updateHighlight,
} from './db/highlightRepository';
import {
  upsertReadingProgress,
  getReadingProgress,
  updateFurthestProgress,
} from './db/progressRepository';
import {
  getAllCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  addBookToCollection,
  removeBookFromCollection,
  getBooksInCollection,
} from './db/collectionRepository';
import {
  recordReadingSession,
  getReadingStats,
  getGlobalReadingStats,
  recordIndividualSession,
  getReadingTimeline,
  getTotalReadingSummary,
} from './db/statsRepository';
import {
  getSetting,
  setSetting,
  getAllSettings,
  getThemes,
  getTheme,
} from './db/settingsRepository';
import {
  getTags,
  createTag,
  addTagToBook,
  removeTagFromBook,
  getBookTags,
} from './db/tagRepository';
import {
  updateBookHardcoverData,
  getBookByHardcoverId,
  addToSyncQueue,
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueRetry,
} from './db/hardcoverRepository';
import { exportDatabase, importDatabase, getAllAppSettings } from './db/exportImport';

export const databaseService = {
  initDatabase,
  // Books
  getAllBooks,
  getBookById,
  addBook,
  updateBook,
  updateBookMetadata,
  deleteBook,
  searchBooks,
  getBooksByFormat,
  // Collections
  getAllCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  addBookToCollection,
  removeBookFromCollection,
  getBooksInCollection,
  // Reading Progress
  upsertReadingProgress,
  getReadingProgress,
  updateFurthestProgress,
  // Bookmarks
  addBookmark,
  getBookmarks,
  deleteBookmark,
  // Highlights
  addHighlight,
  getHighlights,
  deleteHighlight,
  updateHighlight,
  // Reading Stats
  recordReadingSession,
  recordIndividualSession,
  getReadingStats,
  getGlobalReadingStats,
  getReadingTimeline,
  getTotalReadingSummary,
  // Settings
  getSetting,
  setSetting,
  getAllSettings,
  getAllAppSettings,
  // Export/Import
  exportDatabase,
  importDatabase,
  // Themes
  getThemes,
  getTheme,
  // Tags
  getTags,
  createTag,
  addTagToBook,
  removeTagFromBook,
  getBookTags,
  // Hardcover
  updateBookHardcoverData,
  getBookByHardcoverId,
  addToSyncQueue,
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueRetry,
};
