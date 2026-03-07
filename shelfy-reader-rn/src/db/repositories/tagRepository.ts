/**
 * Tag CRUD and book-tag association operations using expo-sqlite.
 */

import { TABLES } from '../schema';
import { getDb } from '../connection';

export function getTags(): any[] {
  try {
    const database = getDb();
    const rows = database.getAllSync(
      `SELECT * FROM ${TABLES.TAGS} ORDER BY name;`
    );
    return (rows as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
    }));
  } catch (error) {
    console.error('Error getting tags:', error);
    return [];
  }
}

export function createTag(name: string, color?: string): any | null {
  try {
    const database = getDb();
    const id = `tag-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    database.runSync(
      `INSERT INTO ${TABLES.TAGS} (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
      [id, name, color || null, now, now]
    );

    return { id, name, color };
  } catch (error) {
    console.error('Error creating tag:', error);
    return null;
  }
}

export function addTagToBook(bookId: string, tagId: string): boolean {
  try {
    const database = getDb();
    const id = `${tagId}-${bookId}`;
    const now = Math.floor(Date.now() / 1000);

    database.runSync(
      `INSERT OR IGNORE INTO ${TABLES.BOOK_TAGS} (id, book_id, tag_id, added_at) VALUES (?, ?, ?, ?);`,
      [id, bookId, tagId, now]
    );
    return true;
  } catch (error) {
    console.error('Error adding tag to book:', error);
    return false;
  }
}

export function removeTagFromBook(bookId: string, tagId: string): boolean {
  try {
    const database = getDb();
    database.runSync(
      `DELETE FROM ${TABLES.BOOK_TAGS} WHERE book_id = ? AND tag_id = ?;`,
      [bookId, tagId]
    );
    return true;
  } catch (error) {
    console.error('Error removing tag from book:', error);
    return false;
  }
}

export function getBookTags(bookId: string): any[] {
  try {
    const database = getDb();
    const rows = database.getAllSync(
      `SELECT t.* FROM ${TABLES.TAGS} t
       INNER JOIN ${TABLES.BOOK_TAGS} bt ON t.id = bt.tag_id
       WHERE bt.book_id = ?
       ORDER BY t.name;`,
      [bookId]
    );
    return (rows as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
    }));
  } catch (error) {
    console.error('Error getting book tags:', error);
    return [];
  }
}
