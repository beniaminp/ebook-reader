/**
 * Bookmark CRUD operations.
 */

import { Capacitor } from '@capacitor/core';
import { TABLES } from '../schema';
import type { Bookmark } from '../../types/index';
import { getDb } from './connection';
import type { DbBookmark } from './bookRepository';

export async function addBookmark(bookmark: DbBookmark): Promise<Bookmark | null> {
  if (!Capacitor.isNativePlatform()) {
    const newBookmark: Bookmark = {
      id: bookmark.id,
      bookId: bookmark.bookId,
      location: {
        bookId: bookmark.bookId,
        cfi: bookmark.location,
        position: 0,
      },
      text: bookmark.text,
      chapter: bookmark.chapter,
      timestamp: new Date(),
    };
    // Key includes bookId so getBookmarks can find all bookmarks for a book
    localStorage.setItem(`bookmark_${bookmark.bookId}_${newBookmark.id}`, JSON.stringify(newBookmark));
    return newBookmark;
  }

  try {
    const database = await getDb();
    const id = bookmark.id || `${bookmark.bookId}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    await database.run(
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

export async function getBookmarks(bookId: string): Promise<Bookmark[]> {
  if (!Capacitor.isNativePlatform()) {
    const bookmarks: Bookmark[] = [];
    const prefix = `bookmark_${bookId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        const data = localStorage.getItem(key);
        if (data) {
          bookmarks.push(JSON.parse(data));
        }
      }
    }
    return bookmarks;
  }

  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT * FROM ${TABLES.BOOKMARKS} WHERE book_id = ? ORDER BY created_at DESC;`,
      [bookId]
    );
    return (result.values || []).map((row) => ({
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

export async function deleteBookmark(id: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Find and remove the bookmark key that ends with the bookmark id
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bookmark_') && key.endsWith(`_${id}`)) {
        localStorage.removeItem(key);
        return true;
      }
    }
    // Fallback: old key format
    localStorage.removeItem(`bookmark_${id}`);
    return true;
  }

  try {
    const database = await getDb();
    await database.run(`DELETE FROM ${TABLES.BOOKMARKS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return false;
  }
}
