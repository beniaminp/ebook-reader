/**
 * EPUB Utilities Index
 *
 * Exports all EPUB-related utility functions
 */

export {
  parseCfi,
  compareCfi,
  isCfiInRange,
  createCfiRange,
  getParentChapterCfi,
  trimCfi,
  isValidCfi,
  sanitizeCfi,
  cfiUtils,
} from './epubHelpers';

export {
  flattenChapters,
  findChapterByHref,
  findChapterById,
  getChapterPath,
  chapterUtils,
} from './epubHelpers';

export {
  countWordsInHtml,
  estimatePageCount,
  formatReadingTime,
  generateEpubContentId,
  contentUtils,
} from './epubHelpers';
