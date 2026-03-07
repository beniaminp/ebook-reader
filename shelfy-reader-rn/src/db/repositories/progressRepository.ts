/**
 * Reading progress operations using expo-sqlite.
 */

import { TABLES } from '../schema';
import type { ReadingProgress } from '../../types/index';
import { getDb } from '../connection';

export function upsertReadingProgress(
  bookId: string,
  progress: Omit<ReadingProgress, 'id' | 'bookId' | 'createdAt' | 'updatedAt'>
): boolean {
  try {
    const database = getDb();
    database.runSync(
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

/**
 * Update the furthest reading progress for a book.
 * Only saves if the new percentage exceeds the currently stored value.
 * @param bookId - The book ID
 * @param percentage - The new percentage (0-100 scale)
 */
export function updateFurthestProgress(bookId: string, percentage: number): boolean {
  try {
    const database = getDb();
    // Only update if new value is greater than the existing one.
    database.runSync(
      `UPDATE ${TABLES.READING_PROGRESS}
       SET furthest_progress = MAX(COALESCE(furthest_progress, 0), ?),
           updated_at = ?
       WHERE book_id = ?;`,
      [percentage, Math.floor(Date.now() / 1000), bookId]
    );
    return true;
  } catch (error) {
    console.error('Error updating furthest progress:', error);
    return false;
  }
}

export function getReadingProgress(bookId: string): ReadingProgress | null {
  try {
    const database = getDb();
    const row = database.getFirstSync(
      `SELECT * FROM ${TABLES.READING_PROGRESS} WHERE book_id = ?;`,
      [bookId]
    ) as any;

    if (row) {
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
