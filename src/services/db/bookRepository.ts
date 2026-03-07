/**
 * Book CRUD operations.
 */

import { Capacitor } from '@capacitor/core';
import { TABLES } from '../schema';
import type { Book, BookMetadata, ReadingProgress } from '../../types/index';
import { webFileStorage } from '../webFileStorage';
import { getDb, ensureWebInit, saveWebData, webBooks, type WebBook } from './connection';

// ============================================================================
// INTERNAL TYPES
// ============================================================================

// These are re-exported from the facade for backward compatibility.
export interface DbBookmark {
  id: string;
  bookId: string;
  location: string; // CFI or page number as string
  pageNumber?: number;
  chapter?: string;
  text?: string;
}

export interface DbHighlight {
  id?: string;
  bookId: string;
  location: string; // CFI or page number as string
  text: string;
  color: string;
  note?: string;
  tags?: string; // JSON stringified array of tag strings
  pageNumber?: number;
  rects?: string; // JSON stringified array of {x, y, width, height}
}

// ============================================================================
// ROW MAPPERS
// ============================================================================

export function mapRowToBook(row: any): Book | null {
  // Validate required fields — return null for invalid rows instead of throwing,
  // so a single corrupted record doesn't wipe the entire library.
  if (!row.file_path) {
    console.error(`Book ${row.id} has missing file_path — skipping`, row);
    return null;
  }
  const metadata: BookMetadata = {};
  if (row.isbn) metadata.isbn = row.isbn;
  if (row.publisher) metadata.publisher = row.publisher;
  if (row.publish_date) metadata.publishDate = row.publish_date;
  if (row.language) metadata.language = row.language;
  if (row.description) metadata.description = row.description;
  if (row.series) metadata.series = row.series;
  if (row.series_index != null) metadata.seriesIndex = row.series_index;
  if (row.rating != null) metadata.rating = row.rating;
  if (row.tags) {
    try {
      metadata.tags = JSON.parse(row.tags);
    } catch {
      metadata.tags = row.tags.split(',').map((t: string) => t.trim());
    }
  }

  // Parse genre/subgenres
  let genre: string | undefined;
  let subgenres: string[] | undefined;
  if (row.genre) genre = row.genre;
  if (row.subgenres) {
    try {
      subgenres = JSON.parse(row.subgenres);
    } catch {
      subgenres = row.subgenres.split(',').map((s: string) => s.trim());
    }
  }

  return {
    id: row.id,
    title: row.title,
    author: row.author,
    filePath: row.file_path,
    coverPath: row.cover_path,
    format: row.format?.toLowerCase() as Book['format'],
    totalPages: row.total_pages || 0,
    currentPage: 0,
    progress: 0,
    lastRead: new Date(row.last_opened_at || row.added_at * 1000),
    dateAdded: new Date(row.added_at * 1000),
    source: row.source || 'local',
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    downloaded: row.downloaded === 1,
    genre,
    subgenres,
    series: row.series || undefined,
    seriesIndex: row.series_index != null ? row.series_index : undefined,
    readStatus: row.read_status || 'unread',
    hardcoverId: row.hardcover_id != null ? row.hardcover_id : undefined,
    hardcoverReview: row.hardcover_review || undefined,
    communityRating: row.community_rating != null ? row.community_rating : undefined,
    communityRatingCount: row.community_rating_count != null ? row.community_rating_count : undefined,
    pageCount: row.page_count != null ? row.page_count : undefined,
    coverUrl: row.cover_url || undefined,
    review: row.review || undefined,
    fileHash: row.file_hash || undefined,
    fileSize: row.file_size || undefined,
    furthestProgress: row.furthest_progress != null ? row.furthest_progress / 100 : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

export function webBookToBook(webBook: WebBook): Book {
  // Validate required fields to prevent crashes
  if (!webBook.filePath) {
    console.error(`WebBook ${webBook.id} has missing filePath`, webBook);
    throw new Error(`Book ${webBook.id} has invalid data: filePath is required`);
  }
  return {
    id: webBook.id,
    title: webBook.title,
    author: webBook.author,
    filePath: webBook.filePath,
    coverPath: webBook.coverPath,
    format: webBook.format,
    totalPages: webBook.totalPages,
    currentPage: webBook.currentPage,
    progress: webBook.progress > 1 ? webBook.progress / 100 : webBook.progress,
    lastRead: new Date(webBook.lastRead),
    dateAdded: new Date(webBook.dateAdded),
    source: webBook.source,
    sourceId: webBook.sourceId,
    sourceUrl: webBook.sourceUrl,
    downloaded: webBook.downloaded,
    genre: (webBook as any).genre,
    subgenres: (webBook as any).subgenres,
    series: (webBook as any).series,
    seriesIndex: (webBook as any).seriesIndex,
    readStatus: (webBook as any).readStatus || 'unread',
    furthestProgress: (webBook as any).furthestProgress,
    metadata: (webBook as any).metadata,
  };
}

// ============================================================================
// BOOK OPERATIONS
// ============================================================================

export async function getAllBooks(): Promise<Book[]> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    return webBooks.map(webBookToBook);
  }

  try {
    const database = await getDb();
    const result = await database.query(`SELECT * FROM ${TABLES.BOOKS} ORDER BY added_at DESC;`);
    const books = (result.values?.map(mapRowToBook) || []).filter((b): b is Book => b !== null);

    // Load reading progress for all books
    const progressResult = await database.query(`SELECT * FROM ${TABLES.READING_PROGRESS};`);
    const progressMap = new Map<string, ReadingProgress>();
    if (progressResult.values) {
      for (const row of progressResult.values) {
        progressMap.set(row.book_id, {
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
        });
      }
    }

    // Also extract furthest_progress from the raw query results
    const furthestMap = new Map<string, number>();
    if (progressResult.values) {
      for (const row of progressResult.values) {
        if (row.furthest_progress != null) {
          furthestMap.set(row.book_id, row.furthest_progress / 100);
        }
      }
    }

    // Merge progress into books
    return books.map((book) => {
      const progress = progressMap.get(book.id);
      const furthestProgress = furthestMap.get(book.id);
      if (progress) {
        return {
          ...book,
          currentPage: progress.currentPage,
          totalPages: progress.totalPages,
          progress: progress.percentage / 100, // Convert from percentage to decimal
          lastRead: new Date(progress.lastReadAt * 1000),
          furthestProgress,
        };
      }
      return book;
    });
  } catch (error) {
    console.error('Error getting books:', error);
    return [];
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const found = webBooks.find((b) => b.id === id);
    return found ? webBookToBook(found) : null;
  }

  try {
    const database = await getDb();
    const result = await database.query(`SELECT * FROM ${TABLES.BOOKS} WHERE id = ? LIMIT 1;`, [
      id,
    ]);
    if (result.values && result.values.length > 0) {
      return mapRowToBook(result.values[0]);
    }
    return null;
  } catch (error) {
    console.error('Error getting book:', error);
    return null;
  }
}

export async function addBook(book: Omit<Book, 'dateAdded'>): Promise<boolean> {
  const now = Date.now();

  // Validate required fields before adding to database
  if (!book.filePath) {
    console.error('Cannot add book: filePath is required', book);
    throw new Error('Cannot add book: filePath is required');
  }
  if (!book.format) {
    console.error('Cannot add book: format is required', book);
    throw new Error('Cannot add book: format is required');
  }

  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const webBook: WebBook = {
      ...book,
      dateAdded: new Date(now),
      createdAt: now,
      updatedAt: now,
    };
    webBooks.push(webBook);
    saveWebData();
    return true;
  }

  try {
    const database = await getDb();
    await database.run(
      `INSERT INTO ${TABLES.BOOKS} (
        id, title, author, file_path, file_name, file_size, format,
        cover_path, total_pages, language, publisher, publish_date, isbn,
        description, source, source_id, source_url, downloaded, series,
        series_index, rating, tags, file_hash, added_at, last_opened_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        book.id,
        book.title,
        book.author,
        book.filePath,
        book.title + (book.format === 'epub' ? '.epub' : '.pdf'),
        0,
        book.format.toUpperCase(),
        book.coverPath || null,
        book.totalPages || null,
        null,
        null,
        null,
        null,
        null,
        book.source || 'local',
        book.sourceId || null,
        book.sourceUrl || null,
        book.downloaded ? 1 : 0,
        null,
        null,
        null,
        null,
        book.fileHash || null,
        Math.floor(now / 1000),
        null,
        Math.floor(now / 1000),
        Math.floor(now / 1000),
      ]
    );
    return true;
  } catch (error) {
    console.error('Error adding book:', error);
    return false;
  }
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const index = webBooks.findIndex((b) => b.id === id);
    if (index !== -1) {
      webBooks[index] = { ...webBooks[index], ...updates, updatedAt: Date.now() };
      saveWebData();
      return true;
    }
    return false;
  }

  try {
    const database = await getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.author !== undefined) {
      fields.push('author = ?');
      values.push(updates.author);
    }
    if (updates.coverPath !== undefined) {
      fields.push('cover_path = ?');
      values.push(updates.coverPath);
    }
    if (updates.currentPage !== undefined) {
      fields.push('current_page = ?');
      values.push(updates.currentPage);
    }
    if (updates.progress !== undefined) {
      fields.push('progress = ?');
      values.push(updates.progress);
    }
    if (updates.lastRead !== undefined) {
      fields.push('last_read = ?');
      values.push(updates.lastRead.getTime());
    }
    if (updates.filePath !== undefined) {
      fields.push('file_path = ?');
      values.push(updates.filePath);
    }
    if (updates.downloaded !== undefined) {
      fields.push('downloaded = ?');
      values.push(updates.downloaded ? 1 : 0);
    }
    if (updates.format !== undefined) {
      fields.push('format = ?');
      values.push(updates.format.toUpperCase());
    }
    if (updates.source !== undefined) {
      fields.push('source = ?');
      values.push(updates.source);
    }
    if (updates.sourceId !== undefined) {
      fields.push('source_id = ?');
      values.push(updates.sourceId);
    }
    if (updates.sourceUrl !== undefined) {
      fields.push('source_url = ?');
      values.push(updates.sourceUrl);
    }
    if ((updates as any).series !== undefined) {
      fields.push('series = ?');
      values.push((updates as any).series || null);
    }
    if ((updates as any).seriesIndex !== undefined) {
      fields.push('series_index = ?');
      values.push((updates as any).seriesIndex ?? null);
    }
    if ((updates as any).readStatus !== undefined) {
      fields.push('read_status = ?');
      values.push((updates as any).readStatus);
    }
    if ((updates as any).review !== undefined) {
      fields.push('review = ?');
      values.push((updates as any).review || null);
    }
    if ((updates as any).fileHash !== undefined) {
      fields.push('file_hash = ?');
      values.push((updates as any).fileHash || null);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(Math.floor(Date.now() / 1000));
      values.push(id);

      await database.run(`UPDATE ${TABLES.BOOKS} SET ${fields.join(', ')} WHERE id = ?;`, values);
    }
    return true;
  } catch (error) {
    console.error('Error updating book:', error);
    return false;
  }
}

export async function updateBookMetadata(
  id: string,
  metadata: BookMetadata
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const index = webBooks.findIndex((b) => b.id === id);
    if (index !== -1) {
      webBooks[index] = {
        ...webBooks[index],
        metadata: { ...(webBooks[index] as any).metadata, ...metadata },
        genre: metadata.genre ?? (webBooks[index] as any).genre,
        subgenres: metadata.subgenres ?? (webBooks[index] as any).subgenres,
        updatedAt: Date.now(),
      } as any;
      saveWebData();
      return true;
    }
    return false;
  }

  try {
    const database = await getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (metadata.description !== undefined) {
      fields.push('description = ?');
      values.push(metadata.description);
    }
    if (metadata.publisher !== undefined) {
      fields.push('publisher = ?');
      values.push(metadata.publisher);
    }
    if (metadata.publishDate !== undefined) {
      fields.push('publish_date = ?');
      values.push(metadata.publishDate);
    }
    if (metadata.isbn !== undefined) {
      fields.push('isbn = ?');
      values.push(metadata.isbn);
    }
    if (metadata.language !== undefined) {
      fields.push('language = ?');
      values.push(metadata.language);
    }
    if (metadata.series !== undefined) {
      fields.push('series = ?');
      values.push(metadata.series);
    }
    if (metadata.seriesIndex !== undefined) {
      fields.push('series_index = ?');
      values.push(metadata.seriesIndex);
    }
    if (metadata.rating !== undefined) {
      fields.push('rating = ?');
      values.push(metadata.rating);
    }
    if (metadata.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(metadata.tags));
    }
    if (metadata.genre !== undefined) {
      fields.push('genre = ?');
      values.push(metadata.genre);
    }
    if (metadata.subgenres !== undefined) {
      fields.push('subgenres = ?');
      values.push(JSON.stringify(metadata.subgenres));
    }
    if (metadata.communityRating !== undefined) {
      fields.push('community_rating = ?');
      values.push(metadata.communityRating);
    }
    if (metadata.communityRatingCount !== undefined) {
      fields.push('community_rating_count = ?');
      values.push(metadata.communityRatingCount);
    }
    if (metadata.pageCount !== undefined) {
      fields.push('page_count = ?');
      values.push(metadata.pageCount);
    }
    if (metadata.coverUrl !== undefined) {
      fields.push('cover_url = ?');
      values.push(metadata.coverUrl);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(Math.floor(Date.now() / 1000));
      values.push(id);
      await database.run(
        `UPDATE ${TABLES.BOOKS} SET ${fields.join(', ')} WHERE id = ?;`,
        values
      );
    }
    return true;
  } catch (error) {
    console.error('Error updating book metadata:', error);
    return false;
  }
}

export async function deleteBook(id: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const idx = webBooks.findIndex((b) => b.id === id);
    if (idx !== -1) webBooks.splice(idx, 1);
    saveWebData();
    // Clean up the file from IndexedDB
    webFileStorage.deleteFile(id).catch(() => {});
    return true;
  }

  try {
    const database = await getDb();
    await database.run(`DELETE FROM ${TABLES.BOOKS} WHERE id = ?;`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting book:', error);
    return false;
  }
}

export async function searchBooks(query: string): Promise<Book[]> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const lowerQuery = query.toLowerCase();
    return webBooks
      .filter(
        (b) =>
          b.title.toLowerCase().includes(lowerQuery) || b.author.toLowerCase().includes(lowerQuery)
      )
      .map(webBookToBook);
  }

  try {
    const database = await getDb();
    const result = await database.query(
      `SELECT * FROM ${TABLES.BOOKS}
       WHERE title LIKE ? OR author LIKE ?
       ORDER BY added_at DESC;`,
      [`%${query}%`, `%${query}%`]
    );
    return (result.values?.map(mapRowToBook) || []).filter((b): b is Book => b !== null);
  } catch (error) {
    console.error('Error searching books:', error);
    return [];
  }
}

export async function getBooksByFormat(formats: string[]): Promise<Book[]> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    return webBooks.filter((b) => formats.includes(b.format)).map(webBookToBook);
  }

  try {
    const database = await getDb();
    const placeholders = formats.map(() => '?').join(',');
    const result = await database.query(
      `SELECT * FROM ${TABLES.BOOKS} WHERE format IN (${placeholders}) ORDER BY added_at DESC;`,
      formats
    );
    return (result.values?.map(mapRowToBook) || []).filter((b): b is Book => b !== null);
  } catch (error) {
    console.error('Error getting books by format:', error);
    return [];
  }
}
