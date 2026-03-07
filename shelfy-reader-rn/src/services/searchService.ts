import { getAllBooks } from './database';
import type { Book } from '../types';

export interface BookSearchResult {
  book: Book;
  matchType: 'title' | 'author' | 'genre' | 'series';
  relevance: number;
}

export async function searchLibrary(query: string): Promise<BookSearchResult[]> {
  if (!query.trim()) return [];

  const books = await getAllBooks();
  const q = query.toLowerCase().trim();
  const results: BookSearchResult[] = [];

  for (const book of books) {
    let matchType: BookSearchResult['matchType'] | null = null;
    let relevance = 0;

    // Title match (highest priority)
    if (book.title.toLowerCase().includes(q)) {
      matchType = 'title';
      relevance = book.title.toLowerCase().startsWith(q) ? 100 : 80;
    }
    // Author match
    else if (book.author?.toLowerCase().includes(q)) {
      matchType = 'author';
      relevance = 60;
    }
    // Genre match
    else if (book.genre?.toLowerCase().includes(q)) {
      matchType = 'genre';
      relevance = 40;
    }
    // Series match
    else if (book.series?.toLowerCase().includes(q)) {
      matchType = 'series';
      relevance = 50;
    }

    if (matchType) {
      results.push({ book, matchType, relevance });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

export function filterBooks(
  books: Book[],
  filters: {
    format?: string;
    readStatus?: string;
    author?: string;
    hasProgress?: boolean;
  }
): Book[] {
  return books.filter((book) => {
    if (filters.format && book.format !== filters.format) return false;
    if (filters.readStatus && book.readStatus !== filters.readStatus) return false;
    if (filters.author && book.author !== filters.author) return false;
    if (filters.hasProgress !== undefined) {
      const hasProgress = (book.progress ?? 0) > 0;
      if (filters.hasProgress !== hasProgress) return false;
    }
    return true;
  });
}

export function sortBooks(
  books: Book[],
  sortBy: 'title' | 'author' | 'recent' | 'added' | 'progress'
): Book[] {
  return [...books].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'author':
        return (a.author ?? '').localeCompare(b.author ?? '');
      case 'recent':
        return (
          new Date(b.lastRead ?? b.dateAdded).getTime() -
          new Date(a.lastRead ?? a.dateAdded).getTime()
        );
      case 'progress':
        return (b.progress ?? 0) - (a.progress ?? 0);
      case 'added':
      default:
        return (
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
        );
    }
  });
}
