/**
 * Reading statistics and session tracking operations.
 */

import { Capacitor } from '@capacitor/core';
import { TABLES } from '../schema';
import { getDb, ensureWebInit, webBooks } from './connection';

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

/**
 * Record an individual reading session with timestamps.
 */
export async function recordIndividualSession(
  bookId: string,
  startTime: number,
  endTime: number,
  pagesRead: number,
  startPosition: number,
  endPosition: number
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const database = await getDb();
    const id = `session-${bookId}-${startTime}`;
    await database.run(
      `INSERT OR IGNORE INTO reading_sessions (id, book_id, start_time, end_time, pages_read, start_position, end_position)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [id, bookId, Math.floor(startTime / 1000), Math.floor(endTime / 1000), pagesRead, startPosition, endPosition]
    );
    return true;
  } catch (error) {
    console.error('Error recording individual session:', error);
    return false;
  }
}

/**
 * Get reading history timeline (individual sessions joined with book info).
 */
export async function getReadingTimeline(limit = 50): Promise<Array<{
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  coverPath: string | null;
  startTime: number;
  endTime: number;
  duration: number;
  pagesRead: number;
  startPosition: number;
  endPosition: number;
}>> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT rs.book_id, b.title as book_title, b.author as book_author, b.cover_path,
              rs.start_time, rs.end_time, (rs.end_time - rs.start_time) as duration,
              rs.pages_read, rs.start_position, rs.end_position
       FROM reading_sessions rs
       JOIN ${TABLES.BOOKS} b ON rs.book_id = b.id
       ORDER BY rs.start_time DESC
       LIMIT ?;`,
      [limit]
    );
    return (result.values || []).map((row: any) => ({
      bookId: row.book_id,
      bookTitle: row.book_title,
      bookAuthor: row.book_author,
      coverPath: row.cover_path,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      pagesRead: row.pages_read || 0,
      startPosition: row.start_position || 0,
      endPosition: row.end_position || 0,
    }));
  } catch (error) {
    console.error('Error getting reading timeline:', error);
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
