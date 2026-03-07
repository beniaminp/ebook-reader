/**
 * Collection CRUD and book-collection association operations using expo-sqlite.
 */

import { TABLES } from '../schema';
import type { Book, Collection } from '../../types/index';
import { getDb } from '../connection';
import { mapRowToBook } from './bookRepository';

// ============================================================================
// ROW MAPPERS
// ============================================================================

function mapRowToCollection(row: any): Collection {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    sortOrder: row.sort_order,
  };
}

// ============================================================================
// COLLECTION OPERATIONS
// ============================================================================

export function getAllCollections(): Collection[] {
  try {
    const database = getDb();
    const rows = database.getAllSync(
      `SELECT * FROM ${TABLES.COLLECTIONS} ORDER BY sort_order;`
    );
    return (rows as any[]).map(mapRowToCollection);
  } catch (error) {
    console.error('Error getting collections:', error);
    return [];
  }
}

export function createCollection(collection: Omit<Collection, 'id'>): Collection | null {
  try {
    const database = getDb();
    const id = `collection-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    database.runSync(
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

export function updateCollection(
  id: string,
  updates: Partial<Omit<Collection, 'id'>>
): boolean {
  try {
    const database = getDb();
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

      database.runSync(
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

export function deleteCollection(id: string): boolean {
  try {
    const database = getDb();
    database.runSync(`DELETE FROM ${TABLES.COLLECTIONS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting collection:', error);
    return false;
  }
}

// ============================================================================
// BOOK-COLLECTION ASSOCIATION
// ============================================================================

export function addBookToCollection(
  bookId: string,
  collectionId: string,
  sortOrder = 0
): boolean {
  try {
    const database = getDb();
    const id = `${collectionId}-${bookId}`;
    const now = Math.floor(Date.now() / 1000);

    database.runSync(
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

export function removeBookFromCollection(bookId: string, collectionId: string): boolean {
  try {
    const database = getDb();
    database.runSync(
      `DELETE FROM ${TABLES.BOOK_COLLECTIONS} WHERE book_id = ? AND collection_id = ?;`,
      [bookId, collectionId]
    );
    return true;
  } catch (error) {
    console.error('Error removing book from collection:', error);
    return false;
  }
}

export function getBooksInCollection(collectionId: string): Book[] {
  try {
    const database = getDb();
    const rows = database.getAllSync(
      `SELECT b.* FROM ${TABLES.BOOKS} b
       INNER JOIN ${TABLES.BOOK_COLLECTIONS} bc ON b.id = bc.book_id
       WHERE bc.collection_id = ?
       ORDER BY bc.sort_order, b.added_at DESC;`,
      [collectionId]
    );
    return (rows as any[]).map(mapRowToBook).filter((b): b is Book => b !== null);
  } catch (error) {
    console.error('Error getting books in collection:', error);
    return [];
  }
}
