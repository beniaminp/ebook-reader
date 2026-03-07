/**
 * Database connection management and web platform fallback state.
 * This is the foundation module that other repository files import from.
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import {
  DB_NAME,
  getAllCreateStatements,
  getAllIndexStatements,
  getAllSeedStatements,
  MIGRATION_SQL,
} from '../schema';
import type { Book, Collection } from '../../types/index';

// ============================================================================
// SQLITE CONNECTION STATE
// ============================================================================

const sqliteConnection = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;
let initPromise: Promise<boolean> | null = null;

// ============================================================================
// WEB PLATFORM FALLBACK TYPES & STATE
// ============================================================================

export interface WebBook extends Book {
  createdAt: number;
  updatedAt: number;
  readingLocation?: string;
}

export interface WebCollection extends Collection {
  createdAt: number;
  updatedAt: number;
}

export let webBooks: WebBook[] = [];
export let webCollections: WebCollection[] = [];
export let webTags: Array<{ id: string; name: string; color?: string }> = [];
export let webBookTags: Record<string, string[]> = {}; // bookId -> tagIds
export let webBookCollections: Record<string, string[]> = {}; // collectionId -> bookIds

/** Allow repository modules to replace the module-level arrays. */
export function setWebBooks(books: WebBook[]) { webBooks = books; }
export function setWebCollections(collections: WebCollection[]) { webCollections = collections; }
export function setWebTags(tags: Array<{ id: string; name: string; color?: string }>) { webTags = tags; }
export function setWebBookTags(bt: Record<string, string[]>) { webBookTags = bt; }
export function setWebBookCollections(bc: Record<string, string[]>) { webBookCollections = bc; }

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

// ============================================================================
// WEB HELPERS
// ============================================================================

export function saveWebData() {
  localStorage.setItem('ebook_books', JSON.stringify(webBooks));
  localStorage.setItem('ebook_collections', JSON.stringify(webCollections));
  localStorage.setItem('ebook_tags', JSON.stringify(webTags));
  localStorage.setItem('ebook_book_tags', JSON.stringify(webBookTags));
  localStorage.setItem('ebook_book_collections', JSON.stringify(webBookCollections));
}

/** Ensure the web database (localStorage) has been loaded into memory. */
export function ensureWebInit() {
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
        try {
          await db.execute(index);
        } catch {
          // Index creation can fail if column doesn't exist yet (pre-migration)
        }
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
export async function getDb(): Promise<SQLiteDBConnection> {
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
