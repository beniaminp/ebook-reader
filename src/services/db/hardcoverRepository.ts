/**
 * Hardcover integration and sync queue operations.
 */

import { Capacitor } from '@capacitor/core';
import { TABLES } from '../schema';
import type { Book } from '../../types/index';
import { getDb, ensureWebInit, saveWebData, webBooks } from './connection';
import { mapRowToBook, webBookToBook } from './bookRepository';

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

// ============================================================================
// SYNC QUEUE OPERATIONS
// ============================================================================

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
