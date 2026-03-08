/**
 * EPUB Helper Utilities
 *
 * Utility functions for working with EPUB files, CFIs, and chapters.
 * Pure string/regex based — no DOM APIs.
 */

import type { EpubCfi } from '../types/epub';
import type { Chapter } from '../types/reader';

/**
 * Parse a CFI (Canonical Fragment Identifier) to extract components
 *
 * CFI format: /body/!/path/to/content
 * Example: /6/4[chap1ref]/2/1:3[bold]^
 */
export interface ParsedCfi {
  path: string;
  index?: string;
  textOffset?: string;
  isRange?: boolean;
  isSpatial?: boolean;
}

export const parseCfi = (cfi: string): ParsedCfi => {
  const result: ParsedCfi = {
    path: cfi,
  };

  // Check for text offset (e.g., :3)
  const textOffsetMatch = cfi.match(/:(\d+)(\[.*?\])?$/);
  if (textOffsetMatch) {
    result.textOffset = textOffsetMatch[1];
    result.path = cfi.substring(0, cfi.indexOf(':'));
  }

  // Check for spatial offset (e.g., ~)
  if (cfi.includes('~')) {
    result.isSpatial = true;
  }

  // Check for range (e.g., ,)
  if (cfi.includes(',')) {
    result.isRange = true;
  }

  return result;
};

/**
 * Compare two CFIs to determine order
 * Returns: -1 if cfi1 < cfi2, 0 if equal, 1 if cfi1 > cfi2
 */
export const compareCfi = (cfi1: string, cfi2: string): number => {
  if (cfi1 === cfi2) return 0;

  const segments1 = cfi1.split('/').slice(1); // Remove empty first element
  const segments2 = cfi2.split('/').slice(1);

  const minLength = Math.min(segments1.length, segments2.length);

  for (let i = 0; i < minLength; i++) {
    const num1 = parseInt(segments1[i].replace(/[[\]:]/g, ''), 10);
    const num2 = parseInt(segments2[i].replace(/[[\]:]/g, ''), 10);

    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }

  // If all compared segments are equal, the shorter one comes first
  return segments1.length < segments2.length ? -1 : 1;
};

/**
 * Check if a CFI is within a range
 */
export const isCfiInRange = (cfi: string, rangeCfi: string): boolean => {
  const [start, end] = rangeCfi.split(',');
  if (!end) return false;

  return compareCfi(cfi, start) >= 0 && compareCfi(cfi, end) <= 0;
};

/**
 * Create a CFI range from two CFIs
 */
export const createCfiRange = (startCfi: string, endCfi: string): string => {
  return `${startCfi},${endCfi}`;
};

/**
 * Get the parent chapter CFI for a given CFI
 */
export const getParentChapterCfi = (cfi: string): string => {
  const segments = cfi.split('/');
  // Go up two levels (step and element)
  if (segments.length > 3) {
    return segments.slice(0, -2).join('/');
  }
  return cfi;
};

/**
 * Trim a CFI to remove text/spatial offsets
 */
export const trimCfi = (cfi: string): string => {
  let trimmed = cfi;

  // Remove text offset
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex > 0) {
    trimmed = trimmed.substring(0, colonIndex);
  }

  // Remove spatial offset
  const tildeIndex = trimmed.indexOf('~');
  if (tildeIndex > 0) {
    trimmed = trimmed.substring(0, tildeIndex);
  }

  // Remove range
  const commaIndex = trimmed.indexOf(',');
  if (commaIndex > 0) {
    trimmed = trimmed.substring(0, commaIndex);
  }

  return trimmed;
};

/**
 * Flatten chapter tree for list display
 */
export const flattenChapters = (
  chapters: Chapter[],
  level = 0,
): Array<Chapter & { level: number }> => {
  const result: Array<Chapter & { level: number }> = [];

  for (const chapter of chapters) {
    result.push({ ...chapter, level });
    if (chapter.subitems) {
      result.push(...flattenChapters(chapter.subitems, level + 1));
    }
  }

  return result;
};

/**
 * Find chapter by href
 */
export const findChapterByHref = (chapters: Chapter[], href: string): Chapter | null => {
  for (const chapter of chapters) {
    if (chapter.href === href) {
      return chapter;
    }
    if (chapter.subitems) {
      const found = findChapterByHref(chapter.subitems, href);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Find chapter by ID
 */
export const findChapterById = (chapters: Chapter[], id: string): Chapter | null => {
  for (const chapter of chapters) {
    if (chapter.id === id) {
      return chapter;
    }
    if (chapter.subitems) {
      const found = findChapterById(chapter.subitems, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Get chapter path (array of parent chapters)
 */
export const getChapterPath = (chapters: Chapter[], targetId: string): Chapter[] => {
  const path: Chapter[] = [];

  const search = (items: Chapter[], parentPath: Chapter[] = []): boolean => {
    for (const chapter of items) {
      const currentPath = [...parentPath, chapter];

      if (chapter.id === targetId) {
        path.push(...currentPath);
        return true;
      }

      if (chapter.subitems && search(chapter.subitems, currentPath)) {
        return true;
      }
    }
    return false;
  };

  search(chapters);
  return path;
};

/**
 * Calculate estimated pages for EPUB based on word count
 * Rough estimate: ~250 words per page
 */
export const estimatePageCount = (wordCount: number): number => {
  const wordsPerPage = 250;
  return Math.max(1, Math.ceil(wordCount / wordsPerPage));
};

/**
 * Calculate word count from HTML content (regex-based, no DOM)
 */
export const countWordsInHtml = (html: string): number => {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, ' ');
  // Remove extra whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();
  // Count words
  return cleanText.split(' ').filter(Boolean).length;
};

/**
 * Format reading time estimate
 */
export const formatReadingTime = (wordCount: number): string => {
  const wordsPerMinute = 200;
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

/**
 * Generate a unique ID for EPUB content
 */
export const generateEpubContentId = (bookId: string, chapterHref: string): string => {
  return `epub_${bookId}_${chapterHref.replace(/[^a-zA-Z0-9]/g, '_')}`;
};

/**
 * Validate CFI format
 */
export const isValidCfi = (cfi: string): boolean => {
  // Basic CFI validation
  return /^\/[\d\[\]:a-zA-Z]+(~[\d\[\]:a-zA-Z]+)?(:\d+(\[.*?\])?)?(,[\d\[\]:a-zA-Z]+(~[\d\[\]:a-zA-Z]+)?(:\d+(\[.*?\])?)?)?$/.test(
    cfi,
  );
};

/**
 * Sanitize CFI for storage
 */
export const sanitizeCfi = (cfi: string): string => {
  return cfi.replace(/[^\/\d\[\]:a-zA-Z,~]/g, '');
};

/**
 * CFI utilities collection
 */
export const cfiUtils = {
  parse: parseCfi,
  compare: compareCfi,
  isInRange: isCfiInRange,
  createRange: createCfiRange,
  getParentChapter: getParentChapterCfi,
  trim: trimCfi,
  isValid: isValidCfi,
  sanitize: sanitizeCfi,
};

/**
 * Chapter utilities collection
 */
export const chapterUtils = {
  flatten: flattenChapters,
  findByHref: findChapterByHref,
  findById: findChapterById,
  getPath: getChapterPath,
};

/**
 * Content utilities collection
 */
export const contentUtils = {
  countWords: countWordsInHtml,
  estimatePages: estimatePageCount,
  formatReadingTime,
  generateContentId: generateEpubContentId,
};
