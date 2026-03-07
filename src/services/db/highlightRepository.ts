/**
 * Highlight CRUD operations.
 */

import { Capacitor } from '@capacitor/core';
import { TABLES } from '../schema';
import type { Highlight } from '../../types/index';
import { getDb } from './connection';
import type { DbHighlight } from './bookRepository';

export async function addHighlight(highlight: DbHighlight): Promise<Highlight | null> {
  const id = highlight.id || `${highlight.bookId}-${Date.now()}`;

  if (!Capacitor.isNativePlatform()) {
    const newHighlight: Highlight = {
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
      timestamp: new Date(),
    };
    localStorage.setItem(`highlight_${newHighlight.id}`, JSON.stringify(newHighlight));
    return newHighlight;
  }

  try {
    const database = await getDb();
    const now = Math.floor(Date.now() / 1000);

    await database.run(
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

export async function getHighlights(bookId: string): Promise<Highlight[]> {
  if (!Capacitor.isNativePlatform()) {
    const highlights: Highlight[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`highlight_${bookId}`)) {
        const data = localStorage.getItem(key);
        if (data) {
          highlights.push(JSON.parse(data));
        }
      }
    }
    return highlights;
  }

  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT * FROM ${TABLES.HIGHLIGHTS} WHERE book_id = ? ORDER BY created_at DESC;`,
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

export async function deleteHighlight(id: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.removeItem(`highlight_${id}`);
    return true;
  }

  try {
    const database = await getDb();
    await database.run(`DELETE FROM ${TABLES.HIGHLIGHTS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting highlight:', error);
    return false;
  }
}

export async function updateHighlight(
  id: string,
  updates: Partial<Pick<Highlight, 'color' | 'note' | 'tags'>>
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const key = `highlight_${id}`;
    const data = localStorage.getItem(key);
    if (data) {
      const highlight = JSON.parse(data);
      const updated = { ...highlight, ...updates };
      localStorage.setItem(key, JSON.stringify(updated));
      return true;
    }
    return false;
  }

  try {
    const database = await getDb();
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

      await database.run(
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
