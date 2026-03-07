/**
 * Database service facade.
 * Re-exports all domain repository functions so consumers have a single import point.
 */

// Connection & initialization
export { initDatabase } from '../db/connection';

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
} from '../db/repositories/bookRepository';
export type { DbBookmark, DbHighlight } from '../db/repositories/bookRepository';

// Bookmark operations
export { addBookmark, getBookmarks, deleteBookmark } from '../db/repositories/bookmarkRepository';

// Highlight operations
export {
  addHighlight,
  getHighlights,
  deleteHighlight,
  updateHighlight,
} from '../db/repositories/highlightRepository';

// Reading progress operations
export {
  upsertReadingProgress,
  getReadingProgress,
  updateFurthestProgress,
} from '../db/repositories/progressRepository';

// Collection operations
export {
  getAllCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  addBookToCollection,
  removeBookFromCollection,
  getBooksInCollection,
} from '../db/repositories/collectionRepository';

// Reading stats operations
export {
  recordReadingSession,
  getReadingStats,
  getGlobalReadingStats,
  recordIndividualSession,
  getReadingTimeline,
  getTotalReadingSummary,
} from '../db/repositories/statsRepository';

// Settings & theme operations
export {
  getSetting,
  setSetting,
  getAllSettings,
  getThemes,
  getTheme,
} from '../db/repositories/settingsRepository';

// Tag operations
export {
  getTags,
  createTag,
  addTagToBook,
  removeTagFromBook,
  getBookTags,
} from '../db/repositories/tagRepository';

// Convenience aliases used by screens
export const getBook = getBookById;
export const updateReadingProgress = upsertReadingProgress;

// ============================================================================
// Re-import everything for the databaseService object
// ============================================================================

import { initDatabase } from '../db/connection';
import {
  getAllBooks,
  getBookById,
  addBook,
  updateBook,
  updateBookMetadata,
  deleteBook,
  searchBooks,
  getBooksByFormat,
} from '../db/repositories/bookRepository';
import {
  addBookmark,
  getBookmarks,
  deleteBookmark,
} from '../db/repositories/bookmarkRepository';
import {
  addHighlight,
  getHighlights,
  deleteHighlight,
  updateHighlight,
} from '../db/repositories/highlightRepository';
import {
  upsertReadingProgress,
  getReadingProgress,
  updateFurthestProgress,
} from '../db/repositories/progressRepository';
import {
  getAllCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  addBookToCollection,
  removeBookFromCollection,
  getBooksInCollection,
} from '../db/repositories/collectionRepository';
import {
  recordReadingSession,
  getReadingStats,
  getGlobalReadingStats,
  recordIndividualSession,
  getReadingTimeline,
  getTotalReadingSummary,
} from '../db/repositories/statsRepository';
import {
  getSetting,
  setSetting,
  getAllSettings,
  getThemes,
  getTheme,
} from '../db/repositories/settingsRepository';
import {
  getTags,
  createTag,
  addTagToBook,
  removeTagFromBook,
  getBookTags,
} from '../db/repositories/tagRepository';

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
  // Themes
  getThemes,
  getTheme,
  // Tags
  getTags,
  createTag,
  addTagToBook,
  removeTagFromBook,
  getBookTags,
};
