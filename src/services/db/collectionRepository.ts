/**
 * Collection CRUD and book-collection association operations.
 */

import { Capacitor } from '@capacitor/core';
import { TABLES } from '../schema';
import type { Book, Collection } from '../../types/index';
import {
  getDb,
  ensureWebInit,
  saveWebData,
  webBooks,
  webCollections,
  webBookCollections,
  type WebCollection,
} from './connection';
import { mapRowToBook, webBookToBook } from './bookRepository';

// ============================================================================
// ROW MAPPERS
// ============================================================================

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
    const idx = webCollections.findIndex((c) => c.id === id);
    if (idx !== -1) webCollections.splice(idx, 1);
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
// BOOK-COLLECTION ASSOCIATION
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
