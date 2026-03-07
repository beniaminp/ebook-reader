/**
 * Bookmark CRUD operations using expo-sqlite.
 */

import { TABLES } from '../schema';
import type { Bookmark } from '../../types/index';
import { getDb } from '../connection';
import type { DbBookmark } from './bookRepository';

export function addBookmark(bookmark: DbBookmark): Bookmark | null {
  try {
    const database = getDb();
    const id = bookmark.id || `${bookmark.bookId}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    database.runSync(
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

export function getBookmarks(bookId: string): Bookmark[] {
  try {
    const database = getDb();
    const rows = database.getAllSync(
      `SELECT * FROM ${TABLES.BOOKMARKS} WHERE book_id = ? ORDER BY created_at DESC;`,
      [bookId]
    );
    return (rows as any[]).map((row) => ({
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

export function deleteBookmark(id: string): boolean {
  try {
    const database = getDb();
    database.runSync(`DELETE FROM ${TABLES.BOOKMARKS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return false;
  }
}
