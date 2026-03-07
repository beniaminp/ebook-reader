/**
 * Reading progress operations.
 */

import { Capacitor } from '@capacitor/core';
import { TABLES } from '../schema';
import type { ReadingProgress } from '../../types/index';
import { getDb, ensureWebInit, saveWebData, webBooks } from './connection';

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

/**
 * Update the furthest reading progress for a book.
 * Only saves if the new percentage exceeds the currently stored value.
 * @param bookId - The book ID
 * @param percentage - The new percentage (0-100 scale)
 */
export async function updateFurthestProgress(
  bookId: string,
  percentage: number
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const book = webBooks.find((b) => b.id === bookId);
    if (book) {
      const currentFurthest = (book as any).furthestProgress || 0;
      const newDecimal = percentage / 100;
      if (newDecimal > currentFurthest) {
        (book as any).furthestProgress = newDecimal;
        book.updatedAt = Date.now();
        saveWebData();
      }
    }
    return true;
  }

  try {
    const database = await getDb();
    // Use reading_progress table to store furthest_progress alongside current progress.
    // Only update if new value is greater than the existing one.
    await database.run(
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
