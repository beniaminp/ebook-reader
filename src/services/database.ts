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
  MIGRATION_SQL,
} from './schema';
import type { Book, ReadingProgress, Collection, Bookmark, Highlight } from '../types/index';
import { webFileStorage } from './webFileStorage';

// Initialize SQLite connection
const sqliteConnection = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;
let initPromise: Promise<boolean> | null = null;

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
  id?: string;
  bookId: string;
  location: string; // CFI or page number as string
  text: string;
  color: string;
  note?: string;
  pageNumber?: number;
  rects?: string; // JSON stringified array of {x, y, width, height}
}

// ============================================================================
// WEB PLATFORM FALLBACK
// ============================================================================

interface WebBook extends Book {
  createdAt: number;
  updatedAt: number;
  readingLocation?: string;
}

interface WebCollection extends Collection {
  createdAt: number;
  updatedAt: number;
}

let webBooks: WebBook[] = [];
let webCollections: WebCollection[] = [];
let webTags: Array<{ id: string; name: string; color?: string }> = [];
let webBookTags: Record<string, string[]> = {}; // bookId -> tagIds
let webBookCollections: Record<string, string[]> = {}; // collectionId -> bookIds

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

let webInitialized = false;

function saveWebData() {
  localStorage.setItem('ebook_books', JSON.stringify(webBooks));
  localStorage.setItem('ebook_collections', JSON.stringify(webCollections));
  localStorage.setItem('ebook_tags', JSON.stringify(webTags));
  localStorage.setItem('ebook_book_tags', JSON.stringify(webBookTags));
  localStorage.setItem('ebook_book_collections', JSON.stringify(webBookCollections));
}

/** Ensure the web database (localStorage) has been loaded into memory. */
function ensureWebInit() {
  if (webInitialized) return;
  const storedBooks = localStorage.getItem('ebook_books');
  const storedCollections = localStorage.getItem('ebook_collections');
  const storedTags = localStorage.getItem('ebook_tags');
  const storedBookTags = localStorage.getItem('ebook_book_tags');
  const storedBookCollections = localStorage.getItem('ebook_book_collections');
  webBooks = storedBooks ? JSON.parse(storedBooks) : [];
  webCollections = storedCollections ? JSON.parse(storedCollections) : getDefaultCollections();
  webTags = storedTags ? JSON.parse(storedTags) : [];
  webBookTags = storedBookTags ? JSON.parse(storedBookTags) : {};
  webBookCollections = storedBookCollections ? JSON.parse(storedBookCollections) : {};
  webInitialized = true;
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

export function initDatabase(): Promise<boolean> {
  // Deduplicate concurrent calls — if initialization is already in progress, return the same promise
  if (initPromise) return initPromise;
  initPromise = initDatabaseInternal().finally(() => {
    // Clear the promise so future calls can re-init if the DB was closed
    if (!db) initPromise = null;
  });
  return initPromise;
}

async function initDatabaseInternal(): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.log('Running on web - using localStorage fallback');
      return initWebDatabase();
    }

    // If we already have a valid connection, skip re-creating
    if (db) {
      const isOpen = await db.isDBOpen();
      if (isOpen.result) return true;
      // Connection exists but is not open — discard and recreate
      db = null;
    }

    // Check if connection already exists in the plugin before creating
    const isConn = await sqliteConnection.isConnection(DB_NAME, false);
    if (isConn.result) {
      db = await sqliteConnection.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqliteConnection.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    }

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

      // Run migrations (safe to re-run — ALTER TABLE ADD COLUMN errors are caught)
      for (const [, sql] of Object.entries(MIGRATION_SQL)) {
        for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
          try {
            await db.execute(stmt);
          } catch {
            // Column likely already exists — safe to ignore
          }
        }
      }

      console.log('Database initialized successfully');
      return true;
    }

    // DB opened but isOpen.result is false — clear the connection so callers get a clear error
    db = null;
    return false;
  } catch (error) {
    db = null;
    console.error('Error initializing database:', error);
    return false;
  }
}

/**
 * Returns a guaranteed-open database connection.
 * Calls initDatabase() if the connection has not been established yet.
 * Throws if initialization fails so callers never silently operate on a null db.
 */
async function getDb(): Promise<SQLiteDBConnection> {
  if (db) {
    // Verify the connection is still open — Android may close it when the app is backgrounded
    try {
      const isOpen = await db.isDBOpen();
      if (!isOpen.result) {
        db = null;
        initPromise = null;
      }
    } catch {
      db = null;
      initPromise = null;
    }
  }
  if (!db) await initDatabase();
  if (!db) throw new Error('Database initialization failed');
  return db;
}

async function initWebDatabase(): Promise<boolean> {
  try {
    ensureWebInit();
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
    ensureWebInit();
    return webBooks.map(webBookToBook);
  }

  try {
    const database = await getDb();
    const result = await database.query(`SELECT * FROM ${TABLES.BOOKS} ORDER BY added_at DESC;`);
    const books = (result.values?.map(mapRowToBook) || []).filter((b): b is Book => b !== null);

    // Load reading progress for all books
    const progressResult = await database.query(`SELECT * FROM ${TABLES.READING_PROGRESS};`);
    const progressMap = new Map<string, ReadingProgress>();
    if (progressResult.values) {
      for (const row of progressResult.values) {
        progressMap.set(row.book_id, {
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
        });
      }
    }

    // Merge progress into books
    return books.map((book) => {
      const progress = progressMap.get(book.id);
      if (progress) {
        return {
          ...book,
          currentPage: progress.currentPage,
          totalPages: progress.totalPages,
          progress: progress.percentage / 100, // Convert from percentage to decimal
          lastRead: new Date(progress.lastReadAt * 1000),
        };
      }
      return book;
    });
  } catch (error) {
    console.error('Error getting books:', error);
    return [];
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const found = webBooks.find((b) => b.id === id);
    return found ? webBookToBook(found) : null;
  }

  try {
    const database = await getDb();
    const result = await database.query(`SELECT * FROM ${TABLES.BOOKS} WHERE id = ? LIMIT 1;`, [
      id,
    ]);
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

  // Validate required fields before adding to database
  if (!book.filePath) {
    console.error('Cannot add book: filePath is required', book);
    throw new Error('Cannot add book: filePath is required');
  }
  if (!book.format) {
    console.error('Cannot add book: format is required', book);
    throw new Error('Cannot add book: format is required');
  }

  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
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

  try {
    const database = await getDb();
    await database.run(
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
    ensureWebInit();
    const index = webBooks.findIndex((b) => b.id === id);
    if (index !== -1) {
      webBooks[index] = { ...webBooks[index], ...updates, updatedAt: Date.now() };
      saveWebData();
      return true;
    }
    return false;
  }

  try {
    const database = await getDb();
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
    if (updates.filePath !== undefined) {
      fields.push('file_path = ?');
      values.push(updates.filePath);
    }
    if (updates.downloaded !== undefined) {
      fields.push('downloaded = ?');
      values.push(updates.downloaded ? 1 : 0);
    }
    if (updates.format !== undefined) {
      fields.push('format = ?');
      values.push(updates.format.toUpperCase());
    }
    if (updates.source !== undefined) {
      fields.push('source = ?');
      values.push(updates.source);
    }
    if (updates.sourceId !== undefined) {
      fields.push('source_id = ?');
      values.push(updates.sourceId);
    }
    if (updates.sourceUrl !== undefined) {
      fields.push('source_url = ?');
      values.push(updates.sourceUrl);
    }
    if ((updates as any).series !== undefined) {
      fields.push('series = ?');
      values.push((updates as any).series || null);
    }
    if ((updates as any).seriesIndex !== undefined) {
      fields.push('series_index = ?');
      values.push((updates as any).seriesIndex ?? null);
    }
    if ((updates as any).readStatus !== undefined) {
      fields.push('read_status = ?');
      values.push((updates as any).readStatus);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(Math.floor(Date.now() / 1000));
      values.push(id);

      await database.run(`UPDATE ${TABLES.BOOKS} SET ${fields.join(', ')} WHERE id = ?;`, values);
    }
    return true;
  } catch (error) {
    console.error('Error updating book:', error);
    return false;
  }
}

export async function updateBookMetadata(
  id: string,
  metadata: import('../types/index').BookMetadata
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const index = webBooks.findIndex((b) => b.id === id);
    if (index !== -1) {
      webBooks[index] = {
        ...webBooks[index],
        metadata: { ...(webBooks[index] as any).metadata, ...metadata },
        genre: metadata.genre ?? (webBooks[index] as any).genre,
        subgenres: metadata.subgenres ?? (webBooks[index] as any).subgenres,
        updatedAt: Date.now(),
      } as any;
      saveWebData();
      return true;
    }
    return false;
  }

  try {
    const database = await getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (metadata.description !== undefined) {
      fields.push('description = ?');
      values.push(metadata.description);
    }
    if (metadata.publisher !== undefined) {
      fields.push('publisher = ?');
      values.push(metadata.publisher);
    }
    if (metadata.publishDate !== undefined) {
      fields.push('publish_date = ?');
      values.push(metadata.publishDate);
    }
    if (metadata.isbn !== undefined) {
      fields.push('isbn = ?');
      values.push(metadata.isbn);
    }
    if (metadata.language !== undefined) {
      fields.push('language = ?');
      values.push(metadata.language);
    }
    if (metadata.series !== undefined) {
      fields.push('series = ?');
      values.push(metadata.series);
    }
    if (metadata.seriesIndex !== undefined) {
      fields.push('series_index = ?');
      values.push(metadata.seriesIndex);
    }
    if (metadata.rating !== undefined) {
      fields.push('rating = ?');
      values.push(metadata.rating);
    }
    if (metadata.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(metadata.tags));
    }
    if (metadata.genre !== undefined) {
      fields.push('genre = ?');
      values.push(metadata.genre);
    }
    if (metadata.subgenres !== undefined) {
      fields.push('subgenres = ?');
      values.push(JSON.stringify(metadata.subgenres));
    }
    if (metadata.communityRating !== undefined) {
      fields.push('community_rating = ?');
      values.push(metadata.communityRating);
    }
    if (metadata.communityRatingCount !== undefined) {
      fields.push('community_rating_count = ?');
      values.push(metadata.communityRatingCount);
    }
    if (metadata.pageCount !== undefined) {
      fields.push('page_count = ?');
      values.push(metadata.pageCount);
    }
    if (metadata.coverUrl !== undefined) {
      fields.push('cover_url = ?');
      values.push(metadata.coverUrl);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(Math.floor(Date.now() / 1000));
      values.push(id);
      await database.run(
        `UPDATE ${TABLES.BOOKS} SET ${fields.join(', ')} WHERE id = ?;`,
        values
      );
    }
    return true;
  } catch (error) {
    console.error('Error updating book metadata:', error);
    return false;
  }
}

export async function deleteBook(id: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    webBooks = webBooks.filter((b) => b.id !== id);
    saveWebData();
    // Clean up the file from IndexedDB
    webFileStorage.deleteFile(id).catch(() => {});
    return true;
  }

  try {
    const database = await getDb();
    await database.run(`DELETE FROM ${TABLES.BOOKS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting book:', error);
    return false;
  }
}

export async function searchBooks(query: string): Promise<Book[]> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const lowerQuery = query.toLowerCase();
    return webBooks
      .filter(
        (b) =>
          b.title.toLowerCase().includes(lowerQuery) || b.author.toLowerCase().includes(lowerQuery)
      )
      .map(webBookToBook);
  }

  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT * FROM ${TABLES.BOOKS}
       WHERE title LIKE ? OR author LIKE ?
       ORDER BY added_at DESC;`,
      [`%${query}%`, `%${query}%`]
    );
    return (result.values?.map(mapRowToBook) || []).filter((b): b is Book => b !== null);
  } catch (error) {
    console.error('Error searching books:', error);
    return [];
  }
}

export async function getBooksByFormat(formats: string[]): Promise<Book[]> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    return webBooks.filter((b) => formats.includes(b.format)).map(webBookToBook);
  }

  try {
    const database = await getDb();
    const placeholders = formats.map(() => '?').join(',');
    const result = await database.query(
      `SELECT * FROM ${TABLES.BOOKS} WHERE format IN (${placeholders}) ORDER BY added_at DESC;`,
      formats
    );
    return (result.values?.map(mapRowToBook) || []).filter((b): b is Book => b !== null);
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
    ensureWebInit();
    return webCollections.map(webCollectionToCollection);
  }

  try {
    const database = await getDb();
    const result = await database.query(`SELECT * FROM ${TABLES.COLLECTIONS} ORDER BY sort_order;`);
    return result.values?.map(mapRowToCollection) || [];
  } catch (error) {
    console.error('Error getting collections:', error);
    return [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function mapRowToBook(row: any): Book | null {
  // Validate required fields — return null for invalid rows instead of throwing,
  // so a single corrupted record doesn't wipe the entire library.
  if (!row.file_path) {
    console.error(`Book ${row.id} has missing file_path — skipping`, row);
    return null;
  }
  const metadata: import('../types/index').BookMetadata = {};
  if (row.isbn) metadata.isbn = row.isbn;
  if (row.publisher) metadata.publisher = row.publisher;
  if (row.publish_date) metadata.publishDate = row.publish_date;
  if (row.language) metadata.language = row.language;
  if (row.description) metadata.description = row.description;
  if (row.series) metadata.series = row.series;
  if (row.series_index != null) metadata.seriesIndex = row.series_index;
  if (row.rating != null) metadata.rating = row.rating;
  if (row.tags) {
    try {
      metadata.tags = JSON.parse(row.tags);
    } catch {
      metadata.tags = row.tags.split(',').map((t: string) => t.trim());
    }
  }

  // Parse genre/subgenres
  let genre: string | undefined;
  let subgenres: string[] | undefined;
  if (row.genre) genre = row.genre;
  if (row.subgenres) {
    try {
      subgenres = JSON.parse(row.subgenres);
    } catch {
      subgenres = row.subgenres.split(',').map((s: string) => s.trim());
    }
  }

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
    genre,
    subgenres,
    series: row.series || undefined,
    seriesIndex: row.series_index != null ? row.series_index : undefined,
    readStatus: row.read_status || 'unread',
    hardcoverId: row.hardcover_id != null ? row.hardcover_id : undefined,
    hardcoverReview: row.hardcover_review || undefined,
    communityRating: row.community_rating != null ? row.community_rating : undefined,
    communityRatingCount: row.community_rating_count != null ? row.community_rating_count : undefined,
    pageCount: row.page_count != null ? row.page_count : undefined,
    coverUrl: row.cover_url || undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

function webBookToBook(webBook: WebBook): Book {
  // Validate required fields to prevent crashes
  if (!webBook.filePath) {
    console.error(`WebBook ${webBook.id} has missing filePath`, webBook);
    throw new Error(`Book ${webBook.id} has invalid data: filePath is required`);
  }
  return {
    id: webBook.id,
    title: webBook.title,
    author: webBook.author,
    filePath: webBook.filePath,
    coverPath: webBook.coverPath,
    format: webBook.format,
    totalPages: webBook.totalPages,
    currentPage: webBook.currentPage,
    progress: webBook.progress > 1 ? webBook.progress / 100 : webBook.progress,
    lastRead: new Date(webBook.lastRead),
    dateAdded: new Date(webBook.dateAdded),
    source: webBook.source,
    sourceId: webBook.sourceId,
    sourceUrl: webBook.sourceUrl,
    downloaded: webBook.downloaded,
    genre: (webBook as any).genre,
    subgenres: (webBook as any).subgenres,
    series: (webBook as any).series,
    seriesIndex: (webBook as any).seriesIndex,
    readStatus: (webBook as any).readStatus || 'unread',
    metadata: (webBook as any).metadata,
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
    ensureWebInit();
    // Web fallback: update book directly
    const book = webBooks.find((b) => b.id === bookId);
    if (book) {
      book.currentPage = progress.currentPage;
      book.progress = progress.percentage / 100;
      book.readingLocation = progress.location;
      book.updatedAt = Date.now();
      saveWebData();
    }
    return true;
  }

  try {
    const database = await getDb();
    await database.run(
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
    ensureWebInit();
    const book = webBooks.find((b) => b.id === bookId);
    if (book) {
      return {
        id: `${bookId}-progress`,
        bookId,
        currentPage: book.currentPage,
        totalPages: book.totalPages,
        percentage: book.progress,
        location: book.readingLocation,
        lastReadAt: Math.floor(new Date(book.lastRead).getTime() / 1000),
        createdAt: Math.floor(new Date(book.dateAdded).getTime() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      };
    }
    return null;
  }

  try {
    const database = await getDb();
    const result = await database.query(
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
    // Key includes bookId so getBookmarks can find all bookmarks for a book
    localStorage.setItem(`bookmark_${bookmark.bookId}_${newBookmark.id}`, JSON.stringify(newBookmark));
    return newBookmark;
  }

  try {
    const database = await getDb();
    const id = bookmark.id || `${bookmark.bookId}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    await database.run(
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
    const prefix = `bookmark_${bookId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        const data = localStorage.getItem(key);
        if (data) {
          bookmarks.push(JSON.parse(data));
        }
      }
    }
    return bookmarks;
  }

  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT * FROM ${TABLES.BOOKMARKS} WHERE book_id = ? ORDER BY created_at DESC;`,
      [bookId]
    );
    return (result.values || []).map((row) => ({
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
    // Find and remove the bookmark key that ends with the bookmark id
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bookmark_') && key.endsWith(`_${id}`)) {
        localStorage.removeItem(key);
        return true;
      }
    }
    // Fallback: old key format
    localStorage.removeItem(`bookmark_${id}`);
    return true;
  }

  try {
    const database = await getDb();
    await database.run(`DELETE FROM ${TABLES.BOOKMARKS} WHERE id = ?;`, [id]);
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
  const id = highlight.id || `${highlight.bookId}-${Date.now()}`;

  if (!Capacitor.isNativePlatform()) {
    const newHighlight: Highlight = {
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
      pageNumber: highlight.pageNumber,
      rects: highlight.rects ? JSON.parse(highlight.rects) : undefined,
      timestamp: new Date(),
    };
    localStorage.setItem(`highlight_${newHighlight.id}`, JSON.stringify(newHighlight));
    return newHighlight;
  }

  try {
    const database = await getDb();
    const now = Math.floor(Date.now() / 1000);

    await database.run(
      `INSERT INTO ${TABLES.HIGHLIGHTS} (
        id, book_id, location, text, color, note, page_number, rects,
        chapter_id, chapter_title, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        highlight.bookId,
        highlight.location,
        highlight.text,
        highlight.color || '#ffff00',
        highlight.note || null,
        highlight.pageNumber || null,
        highlight.rects || null,
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
      pageNumber: highlight.pageNumber,
      rects: highlight.rects ? JSON.parse(highlight.rects) : undefined,
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

  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT * FROM ${TABLES.HIGHLIGHTS} WHERE book_id = ? ORDER BY created_at DESC;`,
      [bookId]
    );
    return (result.values || []).map((row) => ({
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
      pageNumber: row.page_number || undefined,
      rects: row.rects ? JSON.parse(row.rects) : undefined,
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

  try {
    const database = await getDb();
    await database.run(`DELETE FROM ${TABLES.HIGHLIGHTS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting highlight:', error);
    return false;
  }
}

export async function updateHighlight(
  id: string,
  updates: Partial<Pick<Highlight, 'color' | 'note'>>
): Promise<boolean> {
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

  try {
    const database = await getDb();
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

      await database.run(
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

  try {
    const database = await getDb();
    const todayStart = Math.floor(Date.now() / 1000);
    const today = todayStart - (todayStart % 86400);
    const now = Math.floor(Date.now() / 1000);

    // Check if exists
    const existingResult = await database.query(
      `SELECT * FROM ${TABLES.READING_STATS} WHERE book_id = ? AND date = ?;`,
      [bookId, today]
    );

    if (existingResult.values && existingResult.values.length > 0) {
      const row = existingResult.values[0];
      await database.run(
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
      await database.run(
        `INSERT INTO ${TABLES.READING_STATS} (
          id, book_id, date, pages_read, time_spent, session_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [`${bookId}-${today}`, bookId, today, pagesRead, timeSpent, 1, now, now]
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

  try {
    const database = await getDb();
    const startDate = Math.floor(Date.now() / 1000) - days * 86400;

    const result = await database.query(
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

  try {
    const database = await getDb();
    const startDate = Math.floor(Date.now() / 1000) - days * 86400;

    const result = await database.query(
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
  const defaultSummary = {
    totalBooksRead: 0,
    totalPagesRead: 0,
    totalTimeSpent: 0,
    averageSessionTime: 0,
  };

  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    // Web fallback: derive from webBooks
    const booksWithProgress = webBooks.filter((b) => b.progress > 0);
    return {
      totalBooksRead: booksWithProgress.filter((b) => b.progress >= 1).length,
      totalPagesRead: booksWithProgress.reduce((sum, b) => sum + (b.currentPage || 0), 0),
      totalTimeSpent: 0,
      averageSessionTime: 0,
    };
  }

  try {
    const database = await getDb();
    const summaryResult = await database.query(
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

  try {
    const database = await getDb();
    const result = await database.query(`SELECT value FROM ${TABLES.APP_SETTINGS} WHERE key = ?;`, [
      key,
    ]);
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

  try {
    const database = await getDb();
    await database.run(
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

  try {
    const database = await getDb();
    const result = await database.query(`SELECT key, value FROM ${TABLES.APP_SETTINGS};`);

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
  try {
    const database = await getDb();
    const result = await database.query(`SELECT * FROM ${TABLES.THEMES} ORDER BY name;`);
    return (result.values || []).map((row) => ({
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
  try {
    const database = await getDb();
    const result = await database.query(`SELECT * FROM ${TABLES.THEMES} WHERE id = ?;`, [id]);
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
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    if (!webBookCollections[collectionId]) {
      webBookCollections[collectionId] = [];
    }
    if (!webBookCollections[collectionId].includes(bookId)) {
      webBookCollections[collectionId].push(bookId);
      saveWebData();
    }
    return true;
  }

  try {
    const database = await getDb();
    const id = `${collectionId}-${bookId}`;
    const now = Math.floor(Date.now() / 1000);

    await database.run(
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

export async function removeBookFromCollection(
  bookId: string,
  collectionId: string
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    if (webBookCollections[collectionId]) {
      webBookCollections[collectionId] = webBookCollections[collectionId].filter(
        (id) => id !== bookId
      );
      saveWebData();
    }
    return true;
  }

  try {
    const database = await getDb();
    await database.run(
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
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const bookIds = webBookCollections[collectionId] || [];
    return webBooks.filter((b) => bookIds.includes(b.id)).map(webBookToBook);
  }

  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT b.* FROM ${TABLES.BOOKS} b
       INNER JOIN ${TABLES.BOOK_COLLECTIONS} bc ON b.id = bc.book_id
       WHERE bc.collection_id = ?
       ORDER BY bc.sort_order, b.added_at DESC;`,
      [collectionId]
    );
    return (result.values || []).map(mapRowToBook).filter((b): b is Book => b !== null);
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
    ensureWebInit();
    const newCollection: Collection = {
      ...collection,
      id: `collection-${Date.now()}`,
    };
    webCollections.push(newCollection as any);
    saveWebData();
    return newCollection;
  }

  try {
    const database = await getDb();
    const id = `collection-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    await database.run(
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
    ensureWebInit();
    const index = webCollections.findIndex((c) => c.id === id);
    if (index !== -1) {
      webCollections[index] = { ...webCollections[index], ...updates };
      saveWebData();
      return true;
    }
    return false;
  }

  try {
    const database = await getDb();
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

      await database.run(
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
    ensureWebInit();
    webCollections = webCollections.filter((c) => c.id !== id);
    saveWebData();
    return true;
  }

  try {
    const database = await getDb();
    await database.run(`DELETE FROM ${TABLES.COLLECTIONS} WHERE id = ?;`, [id]);
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
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    return webTags;
  }

  try {
    const database = await getDb();
    const result = await database.query(`SELECT * FROM ${TABLES.TAGS} ORDER BY name;`);
    return (result.values || []).map((row) => ({
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
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const id = `tag-${Date.now()}`;
    webTags.push({ id, name, color });
    saveWebData();
    return { id, name, color };
  }

  try {
    const database = await getDb();
    const id = `tag-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    await database.run(
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
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    if (!webBookTags[bookId]) {
      webBookTags[bookId] = [];
    }
    if (!webBookTags[bookId].includes(tagId)) {
      webBookTags[bookId].push(tagId);
      saveWebData();
    }
    return true;
  }

  try {
    const database = await getDb();
    const id = `${tagId}-${bookId}`;
    const now = Math.floor(Date.now() / 1000);

    await database.run(
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
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    if (webBookTags[bookId]) {
      webBookTags[bookId] = webBookTags[bookId].filter((id) => id !== tagId);
      saveWebData();
    }
    return true;
  }

  try {
    const database = await getDb();
    await database.run(`DELETE FROM ${TABLES.BOOK_TAGS} WHERE book_id = ? AND tag_id = ?;`, [
      bookId,
      tagId,
    ]);
    return true;
  } catch (error) {
    console.error('Error removing tag from book:', error);
    return false;
  }
}

export async function getBookTags(bookId: string): Promise<any[]> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const tagIds = webBookTags[bookId] || [];
    return webTags.filter((t) => tagIds.includes(t.id));
  }

  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT t.* FROM ${TABLES.TAGS} t
       INNER JOIN ${TABLES.BOOK_TAGS} bt ON t.id = bt.tag_id
       WHERE bt.book_id = ?
       ORDER BY t.name;`,
      [bookId]
    );
    return (result.values || []).map((row) => ({
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
// DATABASE EXPORT/IMPORT FOR BACKUP
// ============================================================================

/**
 * Export the entire database as a JSON object
 * This includes all books, collections, bookmarks, highlights, progress, settings, etc.
 */
export async function exportDatabase(): Promise<{
  version: number;
  exportDate: number;
  books: Book[];
  collections: Collection[];
  readingProgress: any[];
  bookmarks: Bookmark[];
  highlights: Highlight[];
  settings: Record<string, any>;
  tags: any[];
}> {
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
    data.books = await getAllBooks();

    // Export collections
    data.collections = await getAllCollections();

    // Export reading progress for all books
    for (const book of data.books) {
      const progress = await getReadingProgress(book.id);
      if (progress) {
        data.readingProgress.push(progress);
      }
    }

    // Export bookmarks
    for (const book of data.books) {
      const bookBookmarks = await getBookmarks(book.id);
      data.bookmarks.push(...bookBookmarks);
    }

    // Export highlights
    for (const book of data.books) {
      const bookHighlights = await getHighlights(book.id);
      data.highlights.push(...bookHighlights);
    }

    // Export settings
    data.settings = await getAllSettings();

    // Export tags
    data.tags = await getTags();

    return data;
  } catch (error) {
    console.error('Error exporting database:', error);
    throw new Error(
      `Database export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Import database from a JSON export
 * This will merge the imported data with existing data
 */
export async function importDatabase(
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
): Promise<{
  success: boolean;
  booksAdded: number;
  booksUpdated: number;
  collectionsAdded: number;
  bookmarksAdded: number;
  highlightsAdded: number;
  settingsRestored: number;
  errors: string[];
}> {
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
        const existing = await getBookById(book.id);
        if (existing) {
          if (overwrite || mergeStrategy === 'replace') {
            await updateBook(book.id, book);
            result.booksUpdated++;
          }
        } else {
          await addBook(book);
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
        const existing = data.collections.find((c) => c.id === collection.id);
        if (!existing) {
          // Collection creation is more complex, skip for now
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
        await upsertReadingProgress(progress.bookId, progress);
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
        await addBookmark(dbBookmark);
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
          pageNumber: highlight.location.pageNumber,
        };
        await addHighlight(dbHighlight);
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
        await setSetting(key, value);
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
 * Get all app settings for backup
 * This is a convenience method that wraps getAllSettings
 */
export async function getAllAppSettings(): Promise<Record<string, any>> {
  return getAllSettings();
}

// ============================================================================
// HARDCOVER OPERATIONS
// ============================================================================

export async function updateBookHardcoverData(
  id: string,
  data: {
    hardcoverId?: number;
    hardcoverReview?: string;
    communityRating?: number;
    communityRatingCount?: number;
    pageCount?: number;
    coverUrl?: string;
    readStatus?: string;
    rating?: number;
  }
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const index = webBooks.findIndex((b) => b.id === id);
    if (index !== -1) {
      webBooks[index] = { ...webBooks[index], ...data, updatedAt: Date.now() } as any;
      saveWebData();
      return true;
    }
    return false;
  }

  try {
    const database = await getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.hardcoverId !== undefined) { fields.push('hardcover_id = ?'); values.push(data.hardcoverId); }
    if (data.hardcoverReview !== undefined) { fields.push('hardcover_review = ?'); values.push(data.hardcoverReview); }
    if (data.communityRating !== undefined) { fields.push('community_rating = ?'); values.push(data.communityRating); }
    if (data.communityRatingCount !== undefined) { fields.push('community_rating_count = ?'); values.push(data.communityRatingCount); }
    if (data.pageCount !== undefined) { fields.push('page_count = ?'); values.push(data.pageCount); }
    if (data.coverUrl !== undefined) { fields.push('cover_url = ?'); values.push(data.coverUrl); }
    if (data.readStatus !== undefined) { fields.push('read_status = ?'); values.push(data.readStatus); }
    if (data.rating !== undefined) { fields.push('rating = ?'); values.push(data.rating); }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(Math.floor(Date.now() / 1000));
      values.push(id);
      await database.run(`UPDATE ${TABLES.BOOKS} SET ${fields.join(', ')} WHERE id = ?;`, values);
    }
    return true;
  } catch (error) {
    console.error('Error updating book hardcover data:', error);
    return false;
  }
}

export async function getBookByHardcoverId(hardcoverId: number): Promise<Book | null> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const found = webBooks.find((b) => (b as any).hardcoverId === hardcoverId);
    return found ? webBookToBook(found) : null;
  }

  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT * FROM ${TABLES.BOOKS} WHERE hardcover_id = ? LIMIT 1;`,
      [hardcoverId]
    );
    if (result.values && result.values.length > 0) {
      return mapRowToBook(result.values[0]);
    }
    return null;
  } catch (error) {
    console.error('Error getting book by hardcover ID:', error);
    return null;
  }
}

// Sync queue operations
export async function addToSyncQueue(item: {
  id: string;
  bookId: string;
  action: string;
  payload: string;
}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const queue = JSON.parse(localStorage.getItem('ebook_hardcover_queue') || '[]');
    queue.push({ ...item, createdAt: Date.now(), retryCount: 0 });
    localStorage.setItem('ebook_hardcover_queue', JSON.stringify(queue));
    return true;
  }

  try {
    const database = await getDb();
    await database.run(
      `INSERT OR REPLACE INTO ${TABLES.HARDCOVER_SYNC_QUEUE} (id, book_id, action, payload) VALUES (?, ?, ?, ?);`,
      [item.id, item.bookId, item.action, item.payload]
    );
    return true;
  } catch (error) {
    console.error('Error adding to sync queue:', error);
    return false;
  }
}

export async function getSyncQueue(): Promise<
  Array<{ id: string; bookId: string; action: string; payload: string; createdAt: number; retryCount: number }>
> {
  if (!Capacitor.isNativePlatform()) {
    return JSON.parse(localStorage.getItem('ebook_hardcover_queue') || '[]');
  }

  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT * FROM ${TABLES.HARDCOVER_SYNC_QUEUE} ORDER BY created_at ASC;`
    );
    return (result.values || []).map((row) => ({
      id: row.id,
      bookId: row.book_id,
      action: row.action,
      payload: row.payload,
      createdAt: row.created_at,
      retryCount: row.retry_count,
    }));
  } catch (error) {
    console.error('Error getting sync queue:', error);
    return [];
  }
}

export async function removeSyncQueueItem(id: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const queue = JSON.parse(localStorage.getItem('ebook_hardcover_queue') || '[]');
    localStorage.setItem(
      'ebook_hardcover_queue',
      JSON.stringify(queue.filter((q: any) => q.id !== id))
    );
    return true;
  }

  try {
    const database = await getDb();
    await database.run(`DELETE FROM ${TABLES.HARDCOVER_SYNC_QUEUE} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error removing sync queue item:', error);
    return false;
  }
}

export async function updateSyncQueueRetry(id: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const queue = JSON.parse(localStorage.getItem('ebook_hardcover_queue') || '[]');
    const item = queue.find((q: any) => q.id === id);
    if (item) item.retryCount = (item.retryCount || 0) + 1;
    localStorage.setItem('ebook_hardcover_queue', JSON.stringify(queue));
    return true;
  }

  try {
    const database = await getDb();
    await database.run(
      `UPDATE ${TABLES.HARDCOVER_SYNC_QUEUE} SET retry_count = retry_count + 1 WHERE id = ?;`,
      [id]
    );
    return true;
  } catch (error) {
    console.error('Error updating sync queue retry:', error);
    return false;
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
