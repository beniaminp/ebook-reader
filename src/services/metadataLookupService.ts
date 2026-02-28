/**
 * Metadata Lookup Service
 *
 * Fetches book metadata (published date, genres, description, etc.)
 * from Google Books API and Open Library API.
 */

import type { BookMetadata } from '../types/index';

interface GoogleBooksVolume {
  volumeInfo?: {
    title?: string;
    publishedDate?: string;
    categories?: string[];
    description?: string;
    publisher?: string;
    language?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
  };
}

interface GoogleBooksResponse {
  items?: GoogleBooksVolume[];
}

interface OpenLibraryDoc {
  publish_date?: string[];
  subject?: string[];
  publisher?: string[];
  isbn?: string[];
  language?: string[];
  description?: string | { value: string };
}

interface OpenLibrarySearchResponse {
  docs?: Array<{
    key: string;
    publish_date?: string[];
    subject?: string[];
    publisher?: string[];
    isbn?: string[];
    language?: string[];
  }>;
}

async function fetchFromGoogleBooks(
  title: string,
  author?: string
): Promise<BookMetadata | null> {
  const query = author && author !== 'Unknown'
    ? `intitle:${title}+inauthor:${author}`
    : `intitle:${title}`;

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3`
  );
  if (!res.ok) return null;

  const data: GoogleBooksResponse = await res.json();
  if (!data.items || data.items.length === 0) return null;

  const info = data.items[0].volumeInfo;
  if (!info) return null;

  const metadata: BookMetadata = {};

  if (info.publishedDate) metadata.publishDate = info.publishedDate;
  if (info.categories) metadata.genres = info.categories;
  if (info.description) metadata.description = info.description;
  if (info.publisher) metadata.publisher = info.publisher;
  if (info.language) metadata.language = info.language;

  if (info.industryIdentifiers) {
    const isbn13 = info.industryIdentifiers.find((i) => i.type === 'ISBN_13');
    const isbn10 = info.industryIdentifiers.find((i) => i.type === 'ISBN_10');
    metadata.isbn = isbn13?.identifier || isbn10?.identifier;
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

async function fetchFromOpenLibrary(
  title: string,
  author?: string
): Promise<BookMetadata | null> {
  const query = author && author !== 'Unknown'
    ? `${title} ${author}`
    : title;

  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3&fields=key,publish_date,subject,publisher,isbn,language`
  );
  if (!res.ok) return null;

  const data: OpenLibrarySearchResponse = await res.json();
  if (!data.docs || data.docs.length === 0) return null;

  const doc = data.docs[0];
  const metadata: BookMetadata = {};

  if (doc.publish_date?.[0]) metadata.publishDate = doc.publish_date[0];
  if (doc.subject) metadata.genres = doc.subject.slice(0, 5);
  if (doc.publisher?.[0]) metadata.publisher = doc.publisher[0];
  if (doc.isbn?.[0]) metadata.isbn = doc.isbn[0];
  if (doc.language?.[0]) metadata.language = doc.language[0];

  return Object.keys(metadata).length > 0 ? metadata : null;
}

/**
 * Fetch book metadata from online APIs.
 * Tries Google Books first, falls back to Open Library.
 * Returns null on failure (network error, no results).
 */
export async function fetchBookMetadata(
  title: string,
  author?: string
): Promise<BookMetadata | null> {
  try {
    const googleResult = await fetchFromGoogleBooks(title, author);
    if (googleResult) return googleResult;

    const olResult = await fetchFromOpenLibrary(title, author);
    return olResult;
  } catch {
    // Network unavailable or other error — silently return null
    return null;
  }
}

export const metadataLookupService = {
  fetchBookMetadata,
};
