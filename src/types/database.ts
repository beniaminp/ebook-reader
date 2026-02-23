/**
 * Database-specific types
 * These types match the SQLite schema structure
 */

export interface ReadingProgress {
  id: string;
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  location?: string; // CFI for EPUB, page number string for PDF
  chapterId?: string;
  chapterTitle?: string;
  lastReadAt: number; // Unix timestamp in seconds
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}
