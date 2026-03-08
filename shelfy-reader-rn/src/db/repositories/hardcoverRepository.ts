/**
 * Hardcover integration and sync queue operations.
 * React Native version using expo-sqlite (synchronous API).
 */

import { TABLES } from '../schema';
import type { Book } from '../../types/index';
import { getDb } from '../connection';
import { mapRowToBook } from './bookRepository';

export function updateBookHardcoverData(
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
): boolean {
  try {
    const database = getDb();
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
      database.runSync(
        `UPDATE ${TABLES.BOOKS} SET ${fields.join(', ')} WHERE id = ?;`,
        values
      );
    }
    return true;
  } catch (error) {
    console.error('Error updating book hardcover data:', error);
    return false;
  }
}

export function getBookByHardcoverId(hardcoverId: number): Book | null {
  try {
    const database = getDb();
    const row = database.getFirstSync(
      `SELECT * FROM ${TABLES.BOOKS} WHERE hardcover_id = ? LIMIT 1;`,
      [hardcoverId]
    );
    if (row) {
      return mapRowToBook(row);
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

export function addToSyncQueue(item: {
  id: string;
  bookId: string;
  action: string;
  payload: string;
}): boolean {
  try {
    const database = getDb();
    database.runSync(
      `INSERT OR REPLACE INTO ${TABLES.HARDCOVER_SYNC_QUEUE} (id, book_id, action, payload) VALUES (?, ?, ?, ?);`,
      [item.id, item.bookId, item.action, item.payload]
    );
    return true;
  } catch (error) {
    console.error('Error adding to sync queue:', error);
    return false;
  }
}

export function getSyncQueue(): Array<{
  id: string;
  bookId: string;
  action: string;
  payload: string;
  createdAt: number;
  retryCount: number;
}> {
  try {
    const database = getDb();
    const rows = database.getAllSync(
      `SELECT * FROM ${TABLES.HARDCOVER_SYNC_QUEUE} ORDER BY created_at ASC;`
    );
    return (rows as any[]).map((row) => ({
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

export function removeSyncQueueItem(id: string): boolean {
  try {
    const database = getDb();
    database.runSync(
      `DELETE FROM ${TABLES.HARDCOVER_SYNC_QUEUE} WHERE id = ?;`,
      [id]
    );
    return true;
  } catch (error) {
    console.error('Error removing sync queue item:', error);
    return false;
  }
}

export function updateSyncQueueRetry(id: string): boolean {
  try {
    const database = getDb();
    database.runSync(
      `UPDATE ${TABLES.HARDCOVER_SYNC_QUEUE} SET retry_count = retry_count + 1 WHERE id = ?;`,
      [id]
    );
    return true;
  } catch (error) {
    console.error('Error updating sync queue retry:', error);
    return false;
  }
}
