/**
 * Utilities Index
 *
 * Barrel export file for all utility modules.
 */

// EPUB helpers
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
  flattenChapters,
  findChapterByHref,
  findChapterById,
  getChapterPath,
  chapterUtils,
  countWordsInHtml,
  estimatePageCount,
  formatReadingTime,
  generateEpubContentId,
  contentUtils,
} from './epubHelpers';

// Format utilities
export {
  detectFormat,
  getFormatDisplayName,
  isWebViewFormat,
  isPdfFormat,
  isComicFormat,
  formatFileSize,
  formatReadingTime as formatReadingTimeFromMinutes,
  formatDate,
  formatPercentage,
} from './formatUtils';

// Clipboard
export { copyToClipboard } from './clipboard';

// Data converters
export {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  snakeToCamel,
  camelToSnake,
  mapRowKeys,
  mapToDbKeys,
} from './converters';
