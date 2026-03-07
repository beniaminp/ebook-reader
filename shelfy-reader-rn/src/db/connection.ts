/**
 * Database connection management using expo-sqlite.
 * Much simpler than Capacitor SQLite -- just open the database synchronously.
 * No localStorage fallback needed -- React Native always has SQLite.
 */

import * as SQLite from 'expo-sqlite';
import {
  DB_NAME,
  getAllCreateStatements,
  getAllIndexStatements,
  getAllSeedStatements,
} from './schema';

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the singleton database instance.
 * Opens the database on first call; subsequent calls return the cached instance.
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
    // Enable WAL mode for better concurrent read/write performance
    db.runSync('PRAGMA journal_mode = WAL;');
    // Enable foreign key support (off by default in SQLite)
    db.runSync('PRAGMA foreign_keys = ON;');
  }
  return db;
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize the database: create tables, indexes, and seed data.
 * Safe to call multiple times -- all statements use IF NOT EXISTS / INSERT OR IGNORE.
 * Returns true on success, false on failure.
 */
export function initDatabase(): boolean {
  try {
    const database = getDb();

    // Create all tables
    const statements = getAllCreateStatements();
    for (const statement of statements) {
      database.runSync(statement);
    }

    // Create all indexes
    const indexes = getAllIndexStatements();
    for (const index of indexes) {
      try {
        database.runSync(index);
      } catch {
        // Index creation can fail if column doesn't exist yet -- safe to ignore
      }
    }

    // Seed default data
    const seeds = getAllSeedStatements();
    for (const seed of seeds) {
      database.runSync(seed);
    }

    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}
