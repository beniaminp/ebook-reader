/**
 * Tag CRUD and book-tag association operations.
 */

import { Capacitor } from '@capacitor/core';
import { TABLES } from '../schema';
import { getDb, ensureWebInit, saveWebData, webTags, webBookTags } from './connection';

export async function getTags(): Promise<any[]> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    return webTags;
  }

  try {
    const database = await getDb();
    const result = await database.query(`SELECT * FROM ${TABLES.TAGS} ORDER BY name;`);
    return (result.values || []).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
    }));
  } catch (error) {
    console.error('Error getting tags:', error);
    return [];
  }
}

export async function createTag(name: string, color?: string): Promise<any | null> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const id = `tag-${Date.now()}`;
    webTags.push({ id, name, color });
    saveWebData();
    return { id, name, color };
  }

  try {
    const database = await getDb();
    const id = `tag-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    await database.run(
      `INSERT INTO ${TABLES.TAGS} (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
      [id, name, color || null, now, now]
    );

    return { id, name, color };
  } catch (error) {
    console.error('Error creating tag:', error);
    return null;
  }
}

export async function addTagToBook(bookId: string, tagId: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    if (!webBookTags[bookId]) {
      webBookTags[bookId] = [];
    }
    if (!webBookTags[bookId].includes(tagId)) {
      webBookTags[bookId].push(tagId);
      saveWebData();
    }
    return true;
  }

  try {
    const database = await getDb();
    const id = `${tagId}-${bookId}`;
    const now = Math.floor(Date.now() / 1000);

    await database.run(
      `INSERT OR IGNORE INTO ${TABLES.BOOK_TAGS} (id, book_id, tag_id, added_at) VALUES (?, ?, ?, ?);`,
      [id, bookId, tagId, now]
    );
    return true;
  } catch (error) {
    console.error('Error adding tag to book:', error);
    return false;
  }
}

export async function removeTagFromBook(bookId: string, tagId: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    if (webBookTags[bookId]) {
      webBookTags[bookId] = webBookTags[bookId].filter((id) => id !== tagId);
      saveWebData();
    }
    return true;
  }

  try {
    const database = await getDb();
    await database.run(`DELETE FROM ${TABLES.BOOK_TAGS} WHERE book_id = ? AND tag_id = ?;`, [
      bookId,
      tagId,
    ]);
    return true;
  } catch (error) {
    console.error('Error removing tag from book:', error);
    return false;
  }
}

export async function getBookTags(bookId: string): Promise<any[]> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const tagIds = webBookTags[bookId] || [];
    return webTags.filter((t) => tagIds.includes(t.id));
  }

  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT t.* FROM ${TABLES.TAGS} t
       INNER JOIN ${TABLES.BOOK_TAGS} bt ON t.id = bt.tag_id
       WHERE bt.book_id = ?
       ORDER BY t.name;`,
      [bookId]
    );
    return (result.values || []).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
    }));
  } catch (error) {
    console.error('Error getting book tags:', error);
    return [];
  }
}
