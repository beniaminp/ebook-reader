/**
 * Highlight CRUD operations using expo-sqlite.
 */

import { TABLES } from '../schema';
import type { Highlight } from '../../types/index';
import { getDb } from '../connection';
import type { DbHighlight } from './bookRepository';

export function addHighlight(highlight: DbHighlight): Highlight | null {
  const id = highlight.id || `${highlight.bookId}-${Date.now()}`;

  try {
    const database = getDb();
    const now = Math.floor(Date.now() / 1000);

    database.runSync(
      `INSERT INTO ${TABLES.HIGHLIGHTS} (
        id, book_id, location, text, color, note, tags, page_number, rects,
        chapter_id, chapter_title, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        highlight.bookId,
        highlight.location,
        highlight.text,
        highlight.color || '#ffff00',
        highlight.note || null,
        highlight.tags || null,
        highlight.pageNumber || null,
        highlight.rects || null,
        null,
        null,
        now,
        now,
      ]
    );

    return {
      id,
      bookId: highlight.bookId,
      location: {
        bookId: highlight.bookId,
        cfi: highlight.location,
        position: 0,
      },
      text: highlight.text,
      color: highlight.color,
      note: highlight.note,
      tags: highlight.tags ? JSON.parse(highlight.tags) : undefined,
      pageNumber: highlight.pageNumber,
      rects: highlight.rects ? JSON.parse(highlight.rects) : undefined,
      timestamp: new Date(now * 1000),
    };
  } catch (error) {
    console.error('Error adding highlight:', error);
    return null;
  }
}

export function getHighlights(bookId: string): Highlight[] {
  try {
    const database = getDb();
    const rows = database.getAllSync(
      `SELECT * FROM ${TABLES.HIGHLIGHTS} WHERE book_id = ? ORDER BY created_at DESC;`,
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
      text: row.text,
      color: row.color,
      note: row.note || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      pageNumber: row.page_number || undefined,
      rects: row.rects ? JSON.parse(row.rects) : undefined,
      timestamp: new Date(row.created_at * 1000),
    }));
  } catch (error) {
    console.error('Error getting highlights:', error);
    return [];
  }
}

export function deleteHighlight(id: string): boolean {
  try {
    const database = getDb();
    database.runSync(`DELETE FROM ${TABLES.HIGHLIGHTS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting highlight:', error);
    return false;
  }
}

export function updateHighlight(
  id: string,
  updates: Partial<Pick<Highlight, 'color' | 'note' | 'tags'>>
): boolean {
  try {
    const database = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.note !== undefined) {
      fields.push('note = ?');
      values.push(updates.note);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(Math.floor(Date.now() / 1000));
      values.push(id);

      database.runSync(
        `UPDATE ${TABLES.HIGHLIGHTS} SET ${fields.join(', ')} WHERE id = ?;`,
        values
      );
    }
    return true;
  } catch (error) {
    console.error('Error updating highlight:', error);
    return false;
  }
}
