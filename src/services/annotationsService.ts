/**
 * Annotations Service
 *
 * Handles bookmarks, highlights, and annotations for EPUB and PDF books
 * Integrates with the database service for persistence
 */

import type { Book, Bookmark, Highlight } from '../types';
import type { EpubCfi } from '../types';

// EPUB-specific annotation types
export interface EpubBookmark {
  id: string;
  bookId: string;
  cfi: EpubCfi;
  chapterTitle?: string;
  textPreview?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EpubHighlight {
  id: string;
  bookId: string;
  cfiRange: string; // EPUB CFI range for the selection
  text: string;
  color: string;
  note?: string;
  tags?: string[];
  chapterTitle?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EpubAnnotation {
  id: string;
  bookId: string;
  cfi: EpubCfi;
  content: string;
  type: 'note' | 'definition' | 'translation';
  color?: string;
  chapterTitle?: string;
  createdAt: number;
  updatedAt: number;
}

export type AnnotationItem = EpubBookmark | EpubHighlight | EpubAnnotation;

// Color options for highlights
export const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Green', value: '#00ff00' },
  { name: 'Blue', value: '#00ffff' },
  { name: 'Pink', value: '#ff00ff' },
  { name: 'Orange', value: '#ffa500' },
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]['value'];

/**
 * Generate a unique ID for annotations
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parse CFI range to get start and end CFIs
 */
export function parseCfiRange(cfiRange: string): { start: string; end: string } | null {
  const parts = cfiRange.split(',');
  if (parts.length === 2) {
    return { start: parts[0], end: parts[1] };
  }
  return null;
}

/**
 * Check if a CFI is within a CFI range
 */
export function isCfiInRange(cfi: EpubCfi, cfiRange: string): boolean {
  const parsed = parseCfiRange(cfiRange);
  if (!parsed) return false;

  // Simple string comparison for CFIs (not perfect but works for most cases)
  const cfiTrimmed = cfi.split(':')[0];
  const startTrimmed = parsed.start.split(':')[0];
  const endTrimmed = parsed.end.split(':')[0];

  return cfiTrimmed >= startTrimmed && cfiTrimmed <= endTrimmed;
}

/**
 * Get text preview from a CFI location
 */
export async function getTextPreviewFromCfi(
  rendition: any,
  cfi: EpubCfi,
  maxLength = 100
): Promise<string> {
  try {
    const contents = await rendition.getRange(cfi);
    const text = contents.toString();
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  } catch (error) {
    console.error('Failed to get text preview:', error);
    return '';
  }
}

/**
 * Annotation Service Class
 */
class AnnotationsService {
  private bookmarks: Map<string, EpubBookmark> = new Map();
  private highlights: Map<string, EpubHighlight> = new Map();
  private annotations: Map<string, EpubAnnotation> = new Map();

  /**
   * Initialize service with data from database
   */
  async initialize(): Promise<void> {
    // Will be implemented to load from database
    console.log('AnnotationsService initialized');
  }

  // ============================================================================
  // BOOKMARKS
  // ============================================================================

  /**
   * Add a bookmark
   */
  async addBookmark(
    bookId: string,
    cfi: EpubCfi,
    chapterTitle?: string,
    textPreview?: string,
    note?: string
  ): Promise<EpubBookmark> {
    const id = generateId();
    const now = Date.now();

    const bookmark: EpubBookmark = {
      id,
      bookId,
      cfi,
      chapterTitle,
      textPreview,
      note,
      createdAt: now,
      updatedAt: now,
    };

    this.bookmarks.set(id, bookmark);
    await this.saveToDatabase('bookmark', bookmark);

    return bookmark;
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(id: string): Promise<boolean> {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark) return false;

    this.bookmarks.delete(id);
    await this.deleteFromDatabase('bookmark', id);

    return true;
  }

  /**
   * Check if a location is bookmarked
   */
  isBookmarked(bookId: string, cfi: EpubCfi): boolean {
    return Array.from(this.bookmarks.values()).some((b) => b.bookId === bookId && b.cfi === cfi);
  }

  /**
   * Get all bookmarks for a book
   */
  getBookmarks(bookId: string): EpubBookmark[] {
    return Array.from(this.bookmarks.values())
      .filter((b) => b.bookId === bookId)
      .sort((a, b) => a.cfi.localeCompare(b.cfi));
  }

  /**
   * Get a bookmark by ID
   */
  getBookmark(id: string): EpubBookmark | undefined {
    return this.bookmarks.get(id);
  }

  /**
   * Update a bookmark note
   */
  async updateBookmarkNote(id: string, note: string): Promise<boolean> {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark) return false;

    bookmark.note = note;
    bookmark.updatedAt = Date.now();

    await this.saveToDatabase('bookmark', bookmark);
    return true;
  }

  // ============================================================================
  // HIGHLIGHTS
  // ============================================================================

  /**
   * Add a highlight
   */
  async addHighlight(
    bookId: string,
    cfiRange: string,
    text: string,
    color: HighlightColor = HIGHLIGHT_COLORS[0].value,
    note?: string,
    chapterTitle?: string
  ): Promise<EpubHighlight> {
    const id = generateId();
    const now = Date.now();

    const highlight: EpubHighlight = {
      id,
      bookId,
      cfiRange,
      text,
      color,
      note,
      chapterTitle,
      createdAt: now,
      updatedAt: now,
    };

    this.highlights.set(id, highlight);
    await this.saveToDatabase('highlight', highlight);

    return highlight;
  }

  /**
   * Remove a highlight
   */
  async removeHighlight(id: string): Promise<boolean> {
    const highlight = this.highlights.get(id);
    if (!highlight) return false;

    this.highlights.delete(id);
    await this.deleteFromDatabase('highlight', id);

    return true;
  }

  /**
   * Update a highlight
   */
  async updateHighlight(
    id: string,
    updates: Partial<Pick<EpubHighlight, 'color' | 'note'>>
  ): Promise<boolean> {
    const highlight = this.highlights.get(id);
    if (!highlight) return false;

    Object.assign(highlight, updates);
    highlight.updatedAt = Date.now();

    await this.saveToDatabase('highlight', highlight);
    return true;
  }

  /**
   * Get all highlights for a book
   */
  getHighlights(bookId: string): EpubHighlight[] {
    return Array.from(this.highlights.values())
      .filter((h) => h.bookId === bookId)
      .sort((a, b) => a.cfiRange.localeCompare(b.cfiRange));
  }

  /**
   * Get highlights at a specific CFI location
   */
  getHighlightsAtCfi(bookId: string, cfi: EpubCfi): EpubHighlight[] {
    return this.getHighlights(bookId).filter((h) => isCfiInRange(cfi, h.cfiRange));
  }

  // ============================================================================
  // ANNOTATIONS
  // ============================================================================

  /**
   * Add an annotation (note)
   */
  async addAnnotation(
    bookId: string,
    cfi: EpubCfi,
    content: string,
    type: 'note' | 'definition' | 'translation' = 'note',
    chapterTitle?: string
  ): Promise<EpubAnnotation> {
    const id = generateId();
    const now = Date.now();

    const annotation: EpubAnnotation = {
      id,
      bookId,
      cfi,
      content,
      type,
      chapterTitle,
      createdAt: now,
      updatedAt: now,
    };

    this.annotations.set(id, annotation);
    await this.saveToDatabase('annotation', annotation);

    return annotation;
  }

  /**
   * Remove an annotation
   */
  async removeAnnotation(id: string): Promise<boolean> {
    const annotation = this.annotations.get(id);
    if (!annotation) return false;

    this.annotations.delete(id);
    await this.deleteFromDatabase('annotation', id);

    return true;
  }

  /**
   * Update an annotation
   */
  async updateAnnotation(id: string, content: string): Promise<boolean> {
    const annotation = this.annotations.get(id);
    if (!annotation) return false;

    annotation.content = content;
    annotation.updatedAt = Date.now();

    await this.saveToDatabase('annotation', annotation);
    return true;
  }

  /**
   * Get all annotations for a book
   */
  getAnnotations(bookId: string): EpubAnnotation[] {
    return Array.from(this.annotations.values())
      .filter((a) => a.bookId === bookId)
      .sort((a, b) => a.cfi.localeCompare(b.cfi));
  }

  // ============================================================================
  // DATABASE INTEGRATION
  // ============================================================================

  private async saveToDatabase(
    type: 'bookmark' | 'highlight' | 'annotation',
    item: EpubBookmark | EpubHighlight | EpubAnnotation
  ): Promise<void> {
    // TODO: Integrate with database service
    // For now, just log
    console.log(`Saving ${type} to database:`, item);
  }

  private async deleteFromDatabase(
    type: 'bookmark' | 'highlight' | 'annotation',
    id: string
  ): Promise<void> {
    // TODO: Integrate with database service
    // For now, just log
    console.log(`Deleting ${type} from database:`, id);
  }

  // ============================================================================
  // EXPORT/IMPORT
  // ============================================================================

  /**
   * Export all annotations for a book to JSON
   */
  exportBookAnnotations(bookId: string): string {
    const bookmarks = this.getBookmarks(bookId);
    const highlights = this.getHighlights(bookId);
    const annotations = this.getAnnotations(bookId);

    return JSON.stringify(
      {
        bookId,
        bookmarks,
        highlights,
        annotations,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  /**
   * Import annotations from JSON
   */
  importBookAnnotations(json: string): {
    bookmarks: number;
    highlights: number;
    annotations: number;
  } {
    try {
      const data = JSON.parse(json);

      let bookmarkCount = 0;
      let highlightCount = 0;
      let annotationCount = 0;

      if (data.bookmarks) {
        for (const bm of data.bookmarks) {
          this.bookmarks.set(bm.id, bm);
          bookmarkCount++;
        }
      }

      if (data.highlights) {
        for (const hl of data.highlights) {
          this.highlights.set(hl.id, hl);
          highlightCount++;
        }
      }

      if (data.annotations) {
        for (const an of data.annotations) {
          this.annotations.set(an.id, an);
          annotationCount++;
        }
      }

      return { bookmarks: bookmarkCount, highlights: highlightCount, annotations: annotationCount };
    } catch (error) {
      console.error('Failed to import annotations:', error);
      return { bookmarks: 0, highlights: 0, annotations: 0 };
    }
  }

  /**
   * Clear all data for a book
   */
  async clearBookData(bookId: string): Promise<void> {
    const bookmarkIds = Array.from(this.bookmarks.values())
      .filter((b) => b.bookId === bookId)
      .map((b) => b.id);

    const highlightIds = Array.from(this.highlights.values())
      .filter((h) => h.bookId === bookId)
      .map((h) => h.id);

    const annotationIds = Array.from(this.annotations.values())
      .filter((a) => a.bookId === bookId)
      .map((a) => a.id);

    for (const id of bookmarkIds) {
      await this.removeBookmark(id);
    }

    for (const id of highlightIds) {
      await this.removeHighlight(id);
    }

    for (const id of annotationIds) {
      await this.removeAnnotation(id);
    }
  }
}

// Export singleton instance
export const annotationsService = new AnnotationsService();
