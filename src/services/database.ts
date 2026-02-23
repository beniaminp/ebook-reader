/**
 * Database service for SQLite operations
 * Uses Capacitor Community SQLite plugin
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import {
  DB_NAME,
  TABLES,
  getAllCreateStatements,
  getAllIndexStatements,
  getAllSeedStatements,
} from './schema';
import type { Book, ReadingProgress, Collection, Bookmark, Highlight } from '../types/index';

// Initialize SQLite connection
const sqliteConnection = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;

// ============================================================================
// INTERNAL TYPES
// ============================================================================

// Internal types that match the database schema
interface DbBookmark {
  id: string;
  bookId: string;
  location: string; // CFI or page number as string
  pageNumber?: number;
  chapter?: string;
  text?: string;
}

interface DbHighlight {
  id: string;
  bookId: string;
  location: string; // CFI or page number as string
  text: string;
  color: string;
  note?: string;
}

// ============================================================================
// WEB PLATFORM FALLBACK
// ============================================================================

interface WebBook extends Book {
  createdAt: number;
  updatedAt: number;
}

interface WebCollection extends Collection {
  createdAt: number;
  updatedAt: number;
}

let webBooks: WebBook[] = [];
let webCollections: WebCollection[] = [];

const getDefaultCollections = (): WebCollection[] => [
  {
    id: 'collection-favorites',
    name: 'Favorites',
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'collection-reading',
    name: 'Currently Reading',
    sortOrder: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'collection-to-read',
    name: 'To Read',
    sortOrder: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

function saveWebData() {
  localStorage.setItem('ebook_books', JSON.stringify(webBooks));
  localStorage.setItem('ebook_collections', JSON.stringify(webCollections));
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

export async function initDatabase(): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.log('Running on web - using localStorage fallback');
      return initWebDatabase();
    }

    db = await sqliteConnection.createConnection(
      DB_NAME,
      false,
      'no-encryption',
      1,
      false
    );

    await db.open();
    const isOpen = await db.isDBOpen();

    if (isOpen.result) {
      const statements = getAllCreateStatements();
      for (const statement of statements) {
        await db.execute(statement);
      }

      const indexes = getAllIndexStatements();
      for (const index of indexes) {
        await db.execute(index);
      }

      const seeds = getAllSeedStatements();
      for (const seed of seeds) {
        await db.execute(seed);
      }

      console.log('Database initialized successfully');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

async function initWebDatabase(): Promise<boolean> {
  try {
    const storedBooks = localStorage.getItem('ebook_books');
    const storedCollections = localStorage.getItem('ebook_collections');

    webBooks = storedBooks ? JSON.parse(storedBooks) : [];
    webCollections = storedCollections ? JSON.parse(storedCollections) : getDefaultCollections();

    console.log('Web database initialized');
    return true;
  } catch (error) {
    console.error('Error initializing web database:', error);
    return false;
  }
}

// ============================================================================
// BOOK OPERATIONS
// ============================================================================

export async function getAllBooks(): Promise<Book[]> {
  if (!Capacitor.isNativePlatform()) {
    return webBooks.map(webBookToBook);
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(`SELECT * FROM ${TABLES.BOOKS} ORDER BY added_at DESC;`);
    return result.values?.map(mapRowToBook) || [];
  } catch (error) {
    console.error('Error getting books:', error);
    return [];
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  if (!Capacitor.isNativePlatform()) {
    const found = webBooks.find(b => b.id === id);
    return found ? webBookToBook(found) : null;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(
      `SELECT * FROM ${TABLES.BOOKS} WHERE id = ? LIMIT 1;`,
      [id]
    );
    if (result.values && result.values.length > 0) {
      return mapRowToBook(result.values[0]);
    }
    return null;
  } catch (error) {
    console.error('Error getting book:', error);
    return null;
  }
}

export async function addBook(book: Omit<Book, 'dateAdded'>): Promise<boolean> {
  const now = Date.now();

  if (!Capacitor.isNativePlatform()) {
    const webBook: WebBook = {
      ...book,
      dateAdded: new Date(now),
      createdAt: now,
      updatedAt: now,
    };
    webBooks.push(webBook);
    saveWebData();
    return true;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    await db!.query(
      `INSERT INTO ${TABLES.BOOKS} (
        id, title, author, file_path, file_name, file_size, format,
        cover_path, total_pages, language, publisher, publish_date, isbn,
        description, source, source_id, source_url, downloaded, series,
        series_index, rating, tags, added_at, last_opened_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        book.id,
        book.title,
        book.author,
        book.filePath,
        book.title + (book.format === 'epub' ? '.epub' : '.pdf'),
        0,
        book.format.toUpperCase(),
        book.coverPath || null,
        book.totalPages || null,
        null,
        null,
        null,
        null,
        null,
        book.source || 'local',
        book.sourceId || null,
        book.sourceUrl || null,
        book.downloaded ? 1 : 0,
        null,
        null,
        null,
        null,
        Math.floor(now / 1000),
        null,
        Math.floor(now / 1000),
        Math.floor(now / 1000),
      ]
    );
    return true;
  } catch (error) {
    console.error('Error adding book:', error);
    return false;
  }
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const index = webBooks.findIndex(b => b.id === id);
    if (index !== -1) {
      webBooks[index] = { ...webBooks[index], ...updates, updatedAt: Date.now() };
      saveWebData();
      return true;
    }
    return false;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.author !== undefined) {
      fields.push('author = ?');
      values.push(updates.author);
    }
    if (updates.coverPath !== undefined) {
      fields.push('cover_path = ?');
      values.push(updates.coverPath);
    }
    if (updates.currentPage !== undefined) {
      fields.push('current_page = ?');
      values.push(updates.currentPage);
    }
    if (updates.progress !== undefined) {
      fields.push('progress = ?');
      values.push(updates.progress);
    }
    if (updates.lastRead !== undefined) {
      fields.push('last_read = ?');
      values.push(updates.lastRead.getTime());
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(Math.floor(Date.now() / 1000));
      values.push(id);

      await db!.query(
        `UPDATE ${TABLES.BOOKS} SET ${fields.join(', ')} WHERE id = ?;`,
        values
      );
    }
    return true;
  } catch (error) {
    console.error('Error updating book:', error);
    return false;
  }
}

export async function deleteBook(id: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    webBooks = webBooks.filter(b => b.id !== id);
    saveWebData();
    return true;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    await db!.query(`DELETE FROM ${TABLES.BOOKS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting book:', error);
    return false;
  }
}

export async function searchBooks(query: string): Promise<Book[]> {
  if (!Capacitor.isNativePlatform()) {
    const lowerQuery = query.toLowerCase();
    return webBooks
      .filter(b => b.title.toLowerCase().includes(lowerQuery) || b.author.toLowerCase().includes(lowerQuery))
      .map(webBookToBook);
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(
      `SELECT * FROM ${TABLES.BOOKS}
       WHERE title LIKE ? OR author LIKE ?
       ORDER BY added_at DESC;`,
      [`%${query}%`, `%${query}%`]
    );
    return result.values?.map(mapRowToBook) || [];
  } catch (error) {
    console.error('Error searching books:', error);
    return [];
  }
}

export async function getBooksByFormat(formats: string[]): Promise<Book[]> {
  if (!Capacitor.isNativePlatform()) {
    return webBooks
      .filter(b => formats.includes(b.format))
      .map(webBookToBook);
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const placeholders = formats.map(() => '?').join(',');
    const result = await db!.query(
      `SELECT * FROM ${TABLES.BOOKS} WHERE format IN (${placeholders}) ORDER BY added_at DESC;`,
      formats
    );
    return result.values?.map(mapRowToBook) || [];
  } catch (error) {
    console.error('Error getting books by format:', error);
    return [];
  }
}

// ============================================================================
// COLLECTION OPERATIONS
// ============================================================================

export async function getAllCollections(): Promise<Collection[]> {
  if (!Capacitor.isNativePlatform()) {
    return webCollections.map(webCollectionToCollection);
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(
      `SELECT * FROM ${TABLES.COLLECTIONS} ORDER BY sort_order;`
    );
    return result.values?.map(mapRowToCollection) || [];
  } catch (error) {
    console.error('Error getting collections:', error);
    return [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function mapRowToBook(row: any): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    filePath: row.file_path,
    coverPath: row.cover_path,
    format: row.format?.toLowerCase() as Book['format'],
    totalPages: row.total_pages || 0,
    currentPage: 0,
    progress: 0,
    lastRead: new Date(row.last_opened_at || row.added_at * 1000),
    dateAdded: new Date(row.added_at * 1000),
    source: row.source || 'local',
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    downloaded: row.downloaded === 1,
  };
}

function webBookToBook(webBook: WebBook): Book {
  return {
    id: webBook.id,
    title: webBook.title,
    author: webBook.author,
    filePath: webBook.filePath,
    coverPath: webBook.coverPath,
    format: webBook.format,
    totalPages: webBook.totalPages,
    currentPage: webBook.currentPage,
    progress: webBook.progress,
    lastRead: webBook.lastRead,
    dateAdded: webBook.dateAdded,
    source: webBook.source,
    sourceId: webBook.sourceId,
    sourceUrl: webBook.sourceUrl,
    downloaded: webBook.downloaded,
  };
}

function mapRowToCollection(row: any): Collection {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

function webCollectionToCollection(webCollection: WebCollection): Collection {
  return {
    id: webCollection.id,
    name: webCollection.name,
    sortOrder: webCollection.sortOrder,
  };
}

// ============================================================================
// READING PROGRESS OPERATIONS
// ============================================================================

export async function upsertReadingProgress(
  bookId: string,
  progress: Omit<ReadingProgress, 'id' | 'bookId' | 'createdAt' | 'updatedAt'>
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback: update book directly
    const book = webBooks.find(b => b.id === bookId);
    if (book) {
      book.currentPage = progress.currentPage;
      book.progress = progress.percentage;
      book.updatedAt = Date.now();
      saveWebData();
    }
    return true;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    await db!.query(
      `INSERT INTO ${TABLES.READING_PROGRESS} (
        id, book_id, current_page, total_pages, percentage, location,
        chapter_id, chapter_title, last_read_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(book_id) DO UPDATE SET
        current_page = excluded.current_page,
        total_pages = excluded.total_pages,
        percentage = excluded.percentage,
        location = excluded.location,
        chapter_id = excluded.chapter_id,
        chapter_title = excluded.chapter_title,
        last_read_at = excluded.last_read_at,
        updated_at = excluded.updated_at;`,
      [
        `${bookId}-progress`,
        bookId,
        progress.currentPage,
        progress.totalPages,
        progress.percentage,
        progress.location || null,
        progress.chapterId || null,
        progress.chapterTitle || null,
        progress.lastReadAt || Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000),
      ]
    );
    return true;
  } catch (error) {
    console.error('Error upserting reading progress:', error);
    return false;
  }
}

export async function getReadingProgress(bookId: string): Promise<ReadingProgress | null> {
  if (!Capacitor.isNativePlatform()) {
    const book = webBooks.find(b => b.id === bookId);
    if (book) {
      return {
        id: `${bookId}-progress`,
        bookId,
        currentPage: book.currentPage,
        totalPages: book.totalPages,
        percentage: book.progress,
        lastReadAt: Math.floor(book.lastRead.getTime() / 1000),
        createdAt: Math.floor(book.dateAdded.getTime() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      };
    }
    return null;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(
      `SELECT * FROM ${TABLES.READING_PROGRESS} WHERE book_id = ?;`,
      [bookId]
    );
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      return {
        id: row.id,
        bookId: row.book_id,
        currentPage: row.current_page,
        totalPages: row.total_pages,
        percentage: row.percentage,
        location: row.location,
        chapterId: row.chapter_id,
        chapterTitle: row.chapter_title,
        lastReadAt: row.last_read_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting reading progress:', error);
    return null;
  }
}

// ============================================================================
// BOOKMARK OPERATIONS
// ============================================================================

export async function addBookmark(bookmark: DbBookmark): Promise<Bookmark | null> {
  if (!Capacitor.isNativePlatform()) {
    const newBookmark: Bookmark = {
      id: bookmark.id,
      bookId: bookmark.bookId,
      location: {
        bookId: bookmark.bookId,
        cfi: bookmark.location,
        position: 0,
      },
      text: bookmark.text,
      chapter: bookmark.chapter,
      timestamp: new Date(),
    };
    localStorage.setItem(`bookmark_${newBookmark.id}`, JSON.stringify(newBookmark));
    return newBookmark;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const id = bookmark.id || `${bookmark.bookId}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    await db!.query(
      `INSERT INTO ${TABLES.BOOKMARKS} (
        id, book_id, location, page_number, chapter_id, chapter_title,
        text_preview, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        bookmark.bookId,
        bookmark.location,
        bookmark.pageNumber || null,
        null,
        bookmark.chapter || null,
        bookmark.text || null,
        null,
        now,
        now,
      ]
    );

    return {
      id,
      bookId: bookmark.bookId,
      location: {
        bookId: bookmark.bookId,
        cfi: bookmark.location,
        position: 0,
      },
      text: bookmark.text,
      chapter: bookmark.chapter,
      timestamp: new Date(now * 1000),
    };
  } catch (error) {
    console.error('Error adding bookmark:', error);
    return null;
  }
}

export async function getBookmarks(bookId: string): Promise<Bookmark[]> {
  if (!Capacitor.isNativePlatform()) {
    const bookmarks: Bookmark[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`bookmark_${bookId}`)) {
        const data = localStorage.getItem(key);
        if (data) {
          bookmarks.push(JSON.parse(data));
        }
      }
    }
    return bookmarks;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(
      `SELECT * FROM ${TABLES.BOOKMARKS} WHERE book_id = ? ORDER BY created_at DESC;`,
      [bookId]
    );
    return (result.values || []).map(row => ({
      id: row.id,
      bookId: row.book_id,
      location: {
        bookId: row.book_id,
        cfi: row.location,
        position: 0,
      },
      text: row.text_preview,
      chapter: row.chapter_title,
      timestamp: new Date(row.created_at * 1000),
    }));
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    return [];
  }
}

export async function deleteBookmark(id: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.removeItem(`bookmark_${id}`);
    return true;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    await db!.query(`DELETE FROM ${TABLES.BOOKMARKS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return false;
  }
}

// ============================================================================
// HIGHLIGHT OPERATIONS
// ============================================================================

export async function addHighlight(highlight: DbHighlight): Promise<Highlight | null> {
  if (!Capacitor.isNativePlatform()) {
    const newHighlight: Highlight = {
      id: highlight.id,
      bookId: highlight.bookId,
      location: {
        bookId: highlight.bookId,
        cfi: highlight.location,
        position: 0,
      },
      text: highlight.text,
      color: highlight.color,
      note: highlight.note,
      timestamp: new Date(),
    };
    localStorage.setItem(`highlight_${newHighlight.id}`, JSON.stringify(newHighlight));
    return newHighlight;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const id = highlight.id || `${highlight.bookId}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    await db!.query(
      `INSERT INTO ${TABLES.HIGHLIGHTS} (
        id, book_id, location, text, color, note, page_number,
        chapter_id, chapter_title, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        highlight.bookId,
        highlight.location,
        highlight.text,
        highlight.color || '#ffff00',
        highlight.note || null,
        null,
        null,
        null,
        now,
        now,
      ]
    );

    return {
      id,
      bookId: highlight.bookId,
      location: {
        bookId: highlight.bookId,
        cfi: highlight.location,
        position: 0,
      },
      text: highlight.text,
      color: highlight.color,
      note: highlight.note,
      timestamp: new Date(now * 1000),
    };
  } catch (error) {
    console.error('Error adding highlight:', error);
    return null;
  }
}

export async function getHighlights(bookId: string): Promise<Highlight[]> {
  if (!Capacitor.isNativePlatform()) {
    const highlights: Highlight[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`highlight_${bookId}`)) {
        const data = localStorage.getItem(key);
        if (data) {
          highlights.push(JSON.parse(data));
        }
      }
    }
    return highlights;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(
      `SELECT * FROM ${TABLES.HIGHLIGHTS} WHERE book_id = ? ORDER BY created_at DESC;`,
      [bookId]
    );
    return (result.values || []).map(row => ({
      id: row.id,
      bookId: row.book_id,
      location: {
        bookId: row.book_id,
        cfi: row.location,
        position: 0,
      },
      text: row.text,
      color: row.color,
      note: row.note || undefined,
      timestamp: new Date(row.created_at * 1000),
    }));
  } catch (error) {
    console.error('Error getting highlights:', error);
    return [];
  }
}

export async function deleteHighlight(id: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.removeItem(`highlight_${id}`);
    return true;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    await db!.query(`DELETE FROM ${TABLES.HIGHLIGHTS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting highlight:', error);
    return false;
  }
}

export async function updateHighlight(id: string, updates: Partial<Pick<Highlight, 'color' | 'note'>>): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const key = `highlight_${id}`;
    const data = localStorage.getItem(key);
    if (data) {
      const highlight = JSON.parse(data);
      const updated = { ...highlight, ...updates };
      localStorage.setItem(key, JSON.stringify(updated));
      return true;
    }
    return false;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.note !== undefined) {
      fields.push('note = ?');
      values.push(updates.note);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(Math.floor(Date.now() / 1000));
      values.push(id);

      await db!.query(
        `UPDATE ${TABLES.HIGHLIGHTS} SET ${fields.join(', ')} WHERE id = ?;`,
        values
      );
    }
    return true;
  } catch (error) {
    console.error('Error updating highlight:', error);
    return false;
  }
}

// ============================================================================
// READING STATS OPERATIONS
// ============================================================================

export async function recordReadingSession(
  bookId: string,
  pagesRead: number,
  timeSpent: number
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback: no-op (stats not persisted on web)
    return true;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const todayStart = Math.floor(Date.now() / 1000);
    const today = todayStart - (todayStart % 86400);
    const now = Math.floor(Date.now() / 1000);

    // Check if exists
    const existingResult = await db!.query(
      `SELECT * FROM ${TABLES.READING_STATS} WHERE book_id = ? AND date = ?;`,
      [bookId, today]
    );

    if (existingResult.values && existingResult.values.length > 0) {
      const row = existingResult.values[0];
      await db!.query(
        `UPDATE ${TABLES.READING_STATS}
         SET pages_read = ?, time_spent = ?, session_count = ?, updated_at = ?
         WHERE id = ?;`,
        [
          (row.pages_read || 0) + pagesRead,
          (row.time_spent || 0) + timeSpent,
          (row.session_count || 0) + 1,
          now,
          row.id,
        ]
      );
    } else {
      await db!.query(
        `INSERT INTO ${TABLES.READING_STATS} (
          id, book_id, date, pages_read, time_spent, session_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          `${bookId}-${today}`,
          bookId,
          today,
          pagesRead,
          timeSpent,
          1,
          now,
          now,
        ]
      );
    }
    return true;
  } catch (error) {
    console.error('Error recording reading session:', error);
    return false;
  }
}

export async function getReadingStats(bookId: string, days = 30): Promise<any[]> {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback: return empty stats
    return [];
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const startDate = Math.floor(Date.now() / 1000) - days * 86400;

    const result = await db!.query(
      `SELECT * FROM ${TABLES.READING_STATS}
       WHERE book_id = ? AND date >= ?
       ORDER BY date DESC;`,
      [bookId, startDate]
    );

    return result.values || [];
  } catch (error) {
    console.error('Error getting reading stats:', error);
    return [];
  }
}

export async function getGlobalReadingStats(days = 30): Promise<any[]> {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback: return empty stats
    return [];
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const startDate = Math.floor(Date.now() / 1000) - days * 86400;

    const result = await db!.query(
      `SELECT rs.date, SUM(rs.pages_read) as pages_read, SUM(rs.time_spent) as time_spent,
              SUM(rs.session_count) as session_count, COUNT(DISTINCT rs.book_id) as books_active
       FROM ${TABLES.READING_STATS} rs
       WHERE rs.date >= ?
       GROUP BY rs.date
       ORDER BY rs.date ASC;`,
      [startDate]
    );

    return result.values || [];
  } catch (error) {
    console.error('Error getting global reading stats:', error);
    return [];
  }
}

export async function getTotalReadingSummary(): Promise<{
  totalBooksRead: number;
  totalPagesRead: number;
  totalTimeSpent: number;
  averageSessionTime: number;
}> {
  const defaultSummary = { totalBooksRead: 0, totalPagesRead: 0, totalTimeSpent: 0, averageSessionTime: 0 };

  if (!Capacitor.isNativePlatform()) {
    // Web fallback: derive from webBooks
    const booksWithProgress = webBooks.filter(b => b.progress > 0);
    return {
      totalBooksRead: booksWithProgress.filter(b => b.progress >= 1).length,
      totalPagesRead: booksWithProgress.reduce((sum, b) => sum + (b.currentPage || 0), 0),
      totalTimeSpent: 0,
      averageSessionTime: 0,
    };
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const summaryResult = await db!.query(
      `SELECT
         COUNT(DISTINCT book_id) as total_books,
         SUM(pages_read) as total_pages,
         SUM(time_spent) as total_time,
         AVG(time_spent / CASE WHEN session_count > 0 THEN session_count ELSE 1 END) as avg_session
       FROM ${TABLES.READING_STATS};`
    );

    if (summaryResult.values && summaryResult.values.length > 0) {
      const row = summaryResult.values[0];
      return {
        totalBooksRead: row.total_books || 0,
        totalPagesRead: row.total_pages || 0,
        totalTimeSpent: row.total_time || 0,
        averageSessionTime: row.avg_session || 0,
      };
    }
    return defaultSummary;
  } catch (error) {
    console.error('Error getting total reading summary:', error);
    return defaultSummary;
  }
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

export async function getSetting<T = any>(key: string): Promise<T | null> {
  if (!Capacitor.isNativePlatform()) {
    const value = localStorage.getItem(`setting_${key}`);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return value as any;
      }
    }
    return null;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(
      `SELECT value FROM ${TABLES.APP_SETTINGS} WHERE key = ?;`,
      [key]
    );
    if (result.values && result.values.length > 0) {
      return JSON.parse(result.values[0].value);
    }
    return null;
  } catch (error) {
    console.error('Error getting setting:', error);
    return null;
  }
}

export async function setSetting(key: string, value: any, category?: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.setItem(`setting_${key}`, JSON.stringify(value));
    return true;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    await db!.query(
      `INSERT INTO ${TABLES.APP_SETTINGS} (id, key, value, category, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, category = excluded.category, updated_at = excluded.updated_at;`,
      [
        `setting-${key}`,
        key,
        JSON.stringify(value),
        category || null,
        Math.floor(Date.now() / 1000),
      ]
    );
    return true;
  } catch (error) {
    console.error('Error setting setting:', error);
    return false;
  }
}

export async function getAllSettings(): Promise<Record<string, any>> {
  if (!Capacitor.isNativePlatform()) {
    const settings: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('setting_')) {
        const value = localStorage.getItem(key);
        if (value) {
          const settingKey = key.replace('setting_', '');
          try {
            settings[settingKey] = JSON.parse(value);
          } catch {
            settings[settingKey] = value;
          }
        }
      }
    }
    return settings;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(`SELECT key, value FROM ${TABLES.APP_SETTINGS};`);

    const settings: Record<string, any> = {};
    for (const row of result.values || []) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return settings;
  } catch (error) {
    console.error('Error getting all settings:', error);
    return {};
  }
}

// ============================================================================
// THEME OPERATIONS
// ============================================================================

export async function getThemes(): Promise<any[]> {
  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(`SELECT * FROM ${TABLES.THEMES} ORDER BY name;`);
    return (result.values || []).map(row => ({
      id: row.id,
      name: row.name,
      isDefault: row.is_default === 1,
      backgroundColor: row.background_color,
      textColor: row.text_color,
      secondaryColor: row.secondary_color,
      fontFamily: row.font_family,
      fontSize: row.font_size,
      lineHeight: row.line_height,
      textAlignment: row.text_alignment,
      marginSize: row.margin_size,
      customCss: row.custom_css,
    }));
  } catch (error) {
    console.error('Error getting themes:', error);
    return [];
  }
}

export async function getTheme(id: string): Promise<any | null> {
  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(
      `SELECT * FROM ${TABLES.THEMES} WHERE id = ?;`,
      [id]
    );
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      return {
        id: row.id,
        name: row.name,
        isDefault: row.is_default === 1,
        backgroundColor: row.background_color,
        textColor: row.text_color,
        secondaryColor: row.secondary_color,
        fontFamily: row.font_family,
        fontSize: row.font_size,
        lineHeight: row.line_height,
        textAlignment: row.text_alignment,
        marginSize: row.margin_size,
        customCss: row.custom_css,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting theme:', error);
    return null;
  }
}

// ============================================================================
// COLLECTION BOOK MANAGEMENT
// ============================================================================

export async function addBookToCollection(
  bookId: string,
  collectionId: string,
  sortOrder = 0
): Promise<boolean> {
  if (!db) {
    await initDatabase();
  }

  try {
    const id = `${collectionId}-${bookId}`;
    const now = Math.floor(Date.now() / 1000);

    await db!.query(
      `INSERT OR IGNORE INTO ${TABLES.BOOK_COLLECTIONS} (id, book_id, collection_id, sort_order, added_at)
       VALUES (?, ?, ?, ?, ?);`,
      [id, bookId, collectionId, sortOrder, now]
    );
    return true;
  } catch (error) {
    console.error('Error adding book to collection:', error);
    return false;
  }
}

export async function removeBookFromCollection(bookId: string, collectionId: string): Promise<boolean> {
  if (!db) {
    await initDatabase();
  }

  try {
    await db!.query(
      `DELETE FROM ${TABLES.BOOK_COLLECTIONS} WHERE book_id = ? AND collection_id = ?;`,
      [bookId, collectionId]
    );
    return true;
  } catch (error) {
    console.error('Error removing book from collection:', error);
    return false;
  }
}

export async function getBooksInCollection(collectionId: string): Promise<Book[]> {
  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(
      `SELECT b.* FROM ${TABLES.BOOKS} b
       INNER JOIN ${TABLES.BOOK_COLLECTIONS} bc ON b.id = bc.book_id
       WHERE bc.collection_id = ?
       ORDER BY bc.sort_order, b.added_at DESC;`,
      [collectionId]
    );
    return (result.values || []).map(mapRowToBook);
  } catch (error) {
    console.error('Error getting books in collection:', error);
    return [];
  }
}

// ============================================================================
// COLLECTION CRUD
// ============================================================================

export async function createCollection(
  collection: Omit<Collection, 'id'>
): Promise<Collection | null> {
  if (!Capacitor.isNativePlatform()) {
    const newCollection: Collection = {
      ...collection,
      id: `collection-${Date.now()}`,
    };
    webCollections.push(newCollection as any);
    saveWebData();
    return newCollection;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const id = `collection-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    await db!.query(
      `INSERT INTO ${TABLES.COLLECTIONS} (id, name, description, cover_path, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [id, collection.name, collection.description || null, null, collection.sortOrder, now, now]
    );

    return { ...collection, id };
  } catch (error) {
    console.error('Error creating collection:', error);
    return null;
  }
}

export async function updateCollection(
  id: string,
  updates: Partial<Omit<Collection, 'id'>>
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const index = webCollections.findIndex(c => c.id === id);
    if (index !== -1) {
      webCollections[index] = { ...webCollections[index], ...updates };
      saveWebData();
      return true;
    }
    return false;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.sortOrder !== undefined) {
      fields.push('sort_order = ?');
      values.push(updates.sortOrder);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(Math.floor(Date.now() / 1000));
      values.push(id);

      await db!.query(
        `UPDATE ${TABLES.COLLECTIONS} SET ${fields.join(', ')} WHERE id = ?;`,
        values
      );
    }
    return true;
  } catch (error) {
    console.error('Error updating collection:', error);
    return false;
  }
}

export async function deleteCollection(id: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    webCollections = webCollections.filter(c => c.id !== id);
    saveWebData();
    return true;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    await db!.query(`DELETE FROM ${TABLES.COLLECTIONS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting collection:', error);
    return false;
  }
}

// ============================================================================
// TAG OPERATIONS
// ============================================================================

export async function getTags(): Promise<any[]> {
  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(`SELECT * FROM ${TABLES.TAGS} ORDER BY name;`);
    return (result.values || []).map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
    }));
  } catch (error) {
    console.error('Error getting tags:', error);
    return [];
  }
}

export async function createTag(name: string, color?: string): Promise<any | null> {
  if (!db) {
    await initDatabase();
  }

  try {
    const id = `tag-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    await db!.query(
      `INSERT INTO ${TABLES.TAGS} (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
      [id, name, color || null, now, now]
    );

    return { id, name, color };
  } catch (error) {
    console.error('Error creating tag:', error);
    return null;
  }
}

export async function addTagToBook(bookId: string, tagId: string): Promise<boolean> {
  if (!db) {
    await initDatabase();
  }

  try {
    const id = `${tagId}-${bookId}`;
    const now = Math.floor(Date.now() / 1000);

    await db!.query(
      `INSERT OR IGNORE INTO ${TABLES.BOOK_TAGS} (id, book_id, tag_id, added_at) VALUES (?, ?, ?, ?);`,
      [id, bookId, tagId, now]
    );
    return true;
  } catch (error) {
    console.error('Error adding tag to book:', error);
    return false;
  }
}

export async function removeTagFromBook(bookId: string, tagId: string): Promise<boolean> {
  if (!db) {
    await initDatabase();
  }

  try {
    await db!.query(
      `DELETE FROM ${TABLES.BOOK_TAGS} WHERE book_id = ? AND tag_id = ?;`,
      [bookId, tagId]
    );
    return true;
  } catch (error) {
    console.error('Error removing tag from book:', error);
    return false;
  }
}

export async function getBookTags(bookId: string): Promise<any[]> {
  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db!.query(
      `SELECT t.* FROM ${TABLES.TAGS} t
       INNER JOIN ${TABLES.BOOK_TAGS} bt ON t.id = bt.tag_id
       WHERE bt.book_id = ?
       ORDER BY t.name;`,
      [bookId]
    );
    return (result.values || []).map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
    }));
  } catch (error) {
    console.error('Error getting book tags:', error);
    return [];
  }
}

// ============================================================================
// EXPORTED SERVICE
// ============================================================================

// Export internal types for use in other modules
export type { DbBookmark, DbHighlight };

export const databaseService = {
  initDatabase,
  // Books
  getAllBooks,
  getBookById,
  addBook,
  updateBook,
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
  getReadingStats,
  getGlobalReadingStats,
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
