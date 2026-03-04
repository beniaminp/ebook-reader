/**
 * Metadata Lookup Service
 *
 * Fetches book metadata (published date, genres, description, etc.)
 * from Google Books API and Open Library API.
 */

import type { BookMetadata, Book } from '../types/index';

interface GoogleBooksVolume {
  volumeInfo?: {
    title?: string;
    publishedDate?: string;
    categories?: string[];
    description?: string;
    publisher?: string;
    language?: string;
    pageCount?: number;
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
  };
}

interface GoogleBooksResponse {
  items?: GoogleBooksVolume[];
}

interface OpenLibrarySearchResponse {
  docs?: Array<{
    key: string;
    publish_date?: string[];
    subject?: string[];
    publisher?: string[];
    isbn?: string[];
    language?: string[];
    number_of_pages_median?: number;
    cover_i?: number;
    ratings_average?: number;
    ratings_count?: number;
  }>;
}

interface OpenLibraryRatingsResponse {
  summary?: {
    average?: number;
    count?: number;
  };
}

/**
 * Parse categories/subjects into a main genre and subgenres.
 *
 * Google Books returns categories like:
 *   ["Fiction / Thriller / General", "Fiction / Mystery & Detective"]
 * Open Library returns subjects like:
 *   ["Fiction", "Thriller", "Mystery", "English literature", "Suspense"]
 *
 * Strategy:
 * - Main genre = first broad category (e.g. "Fiction", "Science", "History")
 * - Subgenres = all unique narrower categories after deduplication
 */
function parseGenres(categories: string[]): { genre: string; subgenres: string[] } {
  const allParts: string[] = [];

  for (const cat of categories) {
    // Split on " / " (Google Books style) or " - " separators
    const parts = cat.split(/\s*[/\-]\s*/).map((p) => p.trim()).filter(Boolean);
    allParts.push(...parts);
  }

  // Remove generic terms and deduplicate
  const generic = new Set(['General', 'General & Miscellaneous']);
  const unique = [...new Set(allParts)].filter((p) => !generic.has(p));

  if (unique.length === 0) {
    return { genre: categories[0] || 'Unknown', subgenres: [] };
  }

  const genre = unique[0];
  const subgenres = unique.slice(1);

  return { genre, subgenres };
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
  if (info.categories) {
    metadata.genres = info.categories;
    const { genre, subgenres } = parseGenres(info.categories);
    metadata.genre = genre;
    metadata.subgenres = subgenres;
  }
  if (info.description) metadata.description = info.description;
  if (info.publisher) metadata.publisher = info.publisher;
  if (info.language) metadata.language = info.language;
  if (info.pageCount) metadata.pageCount = info.pageCount;

  if (info.industryIdentifiers) {
    const isbn13 = info.industryIdentifiers.find((i) => i.type === 'ISBN_13');
    const isbn10 = info.industryIdentifiers.find((i) => i.type === 'ISBN_10');
    metadata.isbn = isbn13?.identifier || isbn10?.identifier;
  }

  if (info.imageLinks?.thumbnail) {
    metadata.coverUrl = info.imageLinks.thumbnail.replace('http://', 'https://');
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
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3&fields=key,publish_date,subject,publisher,isbn,language,number_of_pages_median,cover_i,ratings_average,ratings_count`
  );
  if (!res.ok) return null;

  const data: OpenLibrarySearchResponse = await res.json();
  if (!data.docs || data.docs.length === 0) return null;

  const doc = data.docs[0];
  const metadata: BookMetadata = {};

  if (doc.publish_date?.[0]) metadata.publishDate = doc.publish_date[0];
  if (doc.subject && doc.subject.length > 0) {
    metadata.genres = doc.subject.slice(0, 10);
    const { genre, subgenres } = parseGenres(doc.subject.slice(0, 10));
    metadata.genre = genre;
    metadata.subgenres = subgenres;
  }
  if (doc.publisher?.[0]) metadata.publisher = doc.publisher[0];
  if (doc.isbn?.[0]) metadata.isbn = doc.isbn[0];
  if (doc.language?.[0]) metadata.language = doc.language[0];
  if (doc.number_of_pages_median) metadata.pageCount = doc.number_of_pages_median;
  if (doc.ratings_average) metadata.communityRating = doc.ratings_average;
  if (doc.ratings_count) metadata.communityRatingCount = doc.ratings_count;
  if (doc.cover_i) {
    metadata.coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

/**
 * Fetch enriched metadata from Open Library using ISBN (more precise).
 */
async function fetchOpenLibraryByIsbn(isbn: string): Promise<BookMetadata | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&limit=1&fields=key,publish_date,subject,publisher,isbn,language,number_of_pages_median,cover_i,ratings_average,ratings_count`
    );
    if (!res.ok) return null;
    const data: OpenLibrarySearchResponse = await res.json();
    if (!data.docs || data.docs.length === 0) return null;

    const doc = data.docs[0];
    const metadata: BookMetadata = {};

    if (doc.publish_date?.[0]) metadata.publishDate = doc.publish_date[0];
    if (doc.subject && doc.subject.length > 0) {
      metadata.genres = doc.subject.slice(0, 10);
      const { genre, subgenres } = parseGenres(doc.subject.slice(0, 10));
      metadata.genre = genre;
      metadata.subgenres = subgenres;
    }
    if (doc.publisher?.[0]) metadata.publisher = doc.publisher[0];
    if (doc.number_of_pages_median) metadata.pageCount = doc.number_of_pages_median;
    if (doc.ratings_average) metadata.communityRating = doc.ratings_average;
    if (doc.ratings_count) metadata.communityRatingCount = doc.ratings_count;
    if (doc.cover_i) {
      metadata.coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    }

    // Also fetch ratings from the dedicated ratings API
    if (doc.key) {
      try {
        const ratingsRes = await fetch(`https://openlibrary.org${doc.key}/ratings.json`);
        if (ratingsRes.ok) {
          const ratings: OpenLibraryRatingsResponse = await ratingsRes.json();
          if (ratings.summary?.average) metadata.communityRating = ratings.summary.average;
          if (ratings.summary?.count) metadata.communityRatingCount = ratings.summary.count;
        }
      } catch { /* ignore ratings fetch failure */ }
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  } catch {
    return null;
  }
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

/**
 * Fetch enriched metadata by merging Google Books + Open Library data.
 * Google Books provides better descriptions; Open Library provides community ratings.
 */
export async function fetchEnrichedMetadata(
  title: string,
  author?: string,
  isbn?: string
): Promise<BookMetadata | null> {
  try {
    const promises: Promise<BookMetadata | null>[] = [
      fetchFromGoogleBooks(title, author),
    ];

    if (isbn) {
      promises.push(fetchOpenLibraryByIsbn(isbn));
    } else {
      promises.push(fetchFromOpenLibrary(title, author));
    }

    const [googleResult, olResult] = await Promise.all(promises);

    if (!googleResult && !olResult) return null;

    // Merge: Google for descriptions, OL for community ratings, union genres
    const merged: BookMetadata = {};

    // Prefer Google for descriptions and publishers
    const primary = googleResult || olResult;
    const secondary = googleResult ? olResult : null;

    if (primary) Object.assign(merged, primary);
    if (secondary) {
      // Fill in missing fields from secondary
      if (!merged.description && secondary.description) merged.description = secondary.description;
      if (!merged.publisher && secondary.publisher) merged.publisher = secondary.publisher;
      if (!merged.publishDate && secondary.publishDate) merged.publishDate = secondary.publishDate;
      if (!merged.isbn && secondary.isbn) merged.isbn = secondary.isbn;
      if (!merged.language && secondary.language) merged.language = secondary.language;
      if (!merged.pageCount && secondary.pageCount) merged.pageCount = secondary.pageCount;
      if (!merged.coverUrl && secondary.coverUrl) merged.coverUrl = secondary.coverUrl;

      // Prefer OL community ratings
      if (secondary.communityRating) merged.communityRating = secondary.communityRating;
      if (secondary.communityRatingCount) merged.communityRatingCount = secondary.communityRatingCount;

      // Union genres
      if (secondary.genres && merged.genres) {
        const allGenres = [...new Set([...merged.genres, ...secondary.genres])];
        merged.genres = allGenres.slice(0, 10);
        const { genre, subgenres } = parseGenres(allGenres);
        merged.genre = genre;
        merged.subgenres = subgenres;
      } else if (secondary.genres) {
        merged.genres = secondary.genres;
        merged.genre = secondary.genre;
        merged.subgenres = secondary.subgenres;
      }
    }

    return Object.keys(merged).length > 0 ? merged : null;
  } catch {
    return null;
  }
}

/**
 * Batch enrich all books missing metadata.
 * Processes 3 concurrently with 1s delay between batches.
 */
export async function enrichAllBooks(
  books: Book[],
  onProgress?: (completed: number, total: number) => void
): Promise<number> {
  const needsEnrichment = books.filter(
    (b) => !b.metadata?.description && !b.communityRating
  );
  if (needsEnrichment.length === 0) return 0;

  const BATCH_SIZE = 3;
  const BATCH_DELAY = 1000;
  let enriched = 0;
  const results: Array<{ bookId: string; metadata: BookMetadata }> = [];

  for (let i = 0; i < needsEnrichment.length; i += BATCH_SIZE) {
    const batch = needsEnrichment.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (book) => {
        const metadata = await fetchEnrichedMetadata(
          book.title,
          book.author,
          book.metadata?.isbn
        );
        return { bookId: book.id, metadata };
      })
    );

    for (const { bookId, metadata } of batchResults) {
      if (metadata) {
        results.push({ bookId, metadata });
        enriched++;
      }
    }

    onProgress?.(Math.min(i + BATCH_SIZE, needsEnrichment.length), needsEnrichment.length);

    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < needsEnrichment.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  // Persist enrichment results
  const { databaseService } = await import('./database');
  for (const { bookId, metadata } of results) {
    await databaseService.updateBookMetadata(bookId, metadata);
  }

  return enriched;
}

/**
 * Fetch similar books based on subjects via Open Library subjects API.
 */
export async function fetchSimilarBooks(
  subjects: string[]
): Promise<Array<{ title: string; author: string; coverUrl?: string }>> {
  if (subjects.length === 0) return [];

  try {
    // Use the first subject for discovery
    const subject = subjects[0].toLowerCase().replace(/\s+/g, '_');
    const res = await fetch(
      `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=6`
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.works || data.works.length === 0) return [];

    return data.works.map((work: any) => ({
      title: work.title,
      author: work.authors?.[0]?.name || 'Unknown',
      coverUrl: work.cover_id
        ? `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg`
        : undefined,
    }));
  } catch {
    return [];
  }
}

export const metadataLookupService = {
  fetchBookMetadata,
  fetchEnrichedMetadata,
  enrichAllBooks,
  fetchSimilarBooks,
};
