/**
 * PDF Service - Utility functions for PDF operations
 *
 * React Native version:
 * - pdf.js and pdf-lib are browser-only libraries that rely on DOM/canvas
 * - In RN, PDF rendering is handled by react-native-pdf (native component)
 * - This service provides the type interfaces and utility functions that
 *   do NOT depend on pdfjs-dist or canvas
 * - Rendering, thumbnail generation, and annotation overlay are handled
 *   by the PDF reader component using react-native-pdf
 *
 * Functions that require pdfjs-dist or canvas are stubbed with TODO comments.
 */

/** Default estimated average words per PDF page for reading-time calculation */
const DEFAULT_WORDS_PER_PAGE = 300;
/** Average reading speed in words per minute */
const DEFAULT_WORDS_PER_MINUTE = 250;

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PdfSearchMatch {
  pageIndex: number;
  pageNumber: number;
  position: number;
  length: number;
  context: string;
}

export interface PdfOutlineItem {
  title: string;
  pageNumber: number;
  level: number;
  children: PdfOutlineItem[];
}

export interface PdfHighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfHighlight {
  id: string;
  bookId: string;
  pageNumber: number;
  text: string;
  rects: PdfHighlightRect[];
  color: string;
  note?: string;
  createdAt: Date;
}

/**
 * PDF Service - Utility functions for PDF operations
 *
 * In React Native, most PDF rendering is delegated to react-native-pdf.
 * This class provides non-rendering utilities and type exports.
 */
export class PdfService {
  /**
   * Load a PDF document from ArrayBuffer or base64 string.
   *
   * TODO: pdfjs-dist does not work in React Native (requires DOM/canvas).
   * PDF loading for rendering is handled by react-native-pdf.
   * For text extraction or search, consider a native module or server-side solution.
   */
  static async loadPdfDocument(
    _data: ArrayBuffer | string,
    _password?: string
  ): Promise<any> {
    // TODO: Implement using a React Native compatible PDF parsing library
    throw new Error(
      'PDF document loading via pdfjs-dist is not supported in React Native. ' +
      'Use react-native-pdf for rendering.'
    );
  }

  /**
   * Get basic information about all pages in the PDF.
   *
   * TODO: Requires pdfjs-dist which is browser-only.
   */
  static async getPagesInfo(_pdf: any): Promise<PdfPageInfo[]> {
    // TODO: Implement with RN-compatible PDF library
    console.warn('getPagesInfo not yet implemented for React Native');
    return [];
  }

  /**
   * Extract text content from a specific page.
   *
   * TODO: Requires pdfjs-dist text layer which is browser-only.
   */
  static async getPageText(
    _pdf: any,
    _pageNumber: number,
    _preserveWhitespace: boolean = false
  ): Promise<string> {
    // TODO: Implement with RN-compatible PDF text extraction
    console.warn('getPageText not yet implemented for React Native');
    return '';
  }

  /**
   * Extract all text from a PDF.
   *
   * TODO: Requires pdfjs-dist which is browser-only.
   */
  static async extractAllText(
    _pdf: any,
    _onProgress?: (current: number, total: number) => void
  ): Promise<Map<number, string>> {
    // TODO: Implement with RN-compatible PDF text extraction
    console.warn('extractAllText not yet implemented for React Native');
    return new Map();
  }

  /**
   * Search for text across all pages.
   *
   * TODO: Requires text extraction which is not yet available.
   */
  static async searchPdf(
    _pdf: any,
    _query: string,
    _onProgress?: (current: number, total: number) => void
  ): Promise<Map<number, number[]>> {
    // TODO: Implement when text extraction is available
    console.warn('searchPdf not yet implemented for React Native');
    return new Map();
  }

  /**
   * Advanced search with context.
   *
   * TODO: Requires text extraction which is not yet available.
   */
  static async searchWithContext(
    _pdf: any,
    _query: string,
    _contextLength: number = 50,
    _onProgress?: (current: number, total: number) => void
  ): Promise<PdfSearchMatch[]> {
    // TODO: Implement when text extraction is available
    console.warn('searchWithContext not yet implemented for React Native');
    return [];
  }

  /**
   * Extract table of contents / outline.
   *
   * TODO: Requires pdfjs-dist which is browser-only.
   */
  static async getOutline(_pdf: any): Promise<PdfOutlineItem[]> {
    // TODO: Implement with RN-compatible PDF library
    console.warn('getOutline not yet implemented for React Native');
    return [];
  }

  /**
   * Generate a thumbnail for a page.
   *
   * TODO: Requires canvas rendering which is browser-only.
   * In RN, thumbnails can be generated using react-native-pdf's
   * built-in thumbnail support or a native module.
   */
  static async generateThumbnail(
    _page: any,
    _maxSize: number = 200,
    _quality: number = 0.8
  ): Promise<string> {
    // TODO: Implement with react-native-pdf or native module
    throw new Error('Thumbnail generation requires canvas, not available in React Native');
  }

  /**
   * Generate thumbnails for multiple pages.
   *
   * TODO: Requires canvas rendering which is browser-only.
   */
  static async generateThumbnails(
    _pdf: any,
    _pages: number[],
    _maxSize: number = 200,
    _onProgress?: (current: number, total: number) => void
  ): Promise<Map<number, string>> {
    // TODO: Implement with native module
    console.warn('generateThumbnails not yet implemented for React Native');
    return new Map();
  }

  /**
   * Get metadata from PDF.
   *
   * TODO: Requires pdfjs-dist which is browser-only.
   * Consider using a lightweight PDF header parser for metadata.
   */
  static async getMetadata(_pdf: any) {
    // TODO: Implement lightweight PDF metadata extraction
    console.warn('getMetadata not yet implemented for React Native');
    return {
      title: '',
      author: '',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
      creationDate: null as Date | null,
      modificationDate: null as Date | null,
      isEncrypted: false,
    };
  }

  /**
   * Check if PDF is password protected.
   *
   * TODO: Requires pdfjs-dist which is browser-only.
   */
  static async isPasswordProtected(_data: ArrayBuffer | string): Promise<boolean> {
    // TODO: Implement with lightweight PDF header check
    console.warn('isPasswordProtected not yet implemented for React Native');
    return false;
  }

  /**
   * Calculate reading time estimate.
   * This is a pure calculation — works in any environment.
   */
  static calculateReadingTime(
    totalPages: number,
    wordsPerPage: number = DEFAULT_WORDS_PER_PAGE,
    wordsPerMinute: number = DEFAULT_WORDS_PER_MINUTE
  ): {
    minutes: number;
    hours: number;
    displayText: string;
  } {
    const totalWords = totalPages * wordsPerPage;
    const minutes = Math.ceil(totalWords / wordsPerMinute);
    const hours = Math.round((minutes / 60) * 10) / 10;

    return {
      minutes,
      hours,
      displayText:
        hours < 1
          ? `${minutes} min read`
          : hours < 24
            ? `${hours} hr read`
            : `${Math.round((hours / 24) * 10) / 10} days read`,
    };
  }

  /**
   * Validate PDF data by checking magic bytes.
   * Works without pdfjs-dist — just checks the %PDF- header.
   */
  static async validatePdf(data: ArrayBuffer | string): Promise<{
    isValid: boolean;
    error?: string;
    pageCount?: number;
  }> {
    try {
      if (typeof data === 'string') {
        // Base64 string — decode first 5 chars
        const decoded = atob(data.slice(0, 8));
        if (!decoded.startsWith('%PDF-')) {
          return { isValid: false, error: 'Not a valid PDF file (missing header)' };
        }
        return { isValid: true };
      }

      // ArrayBuffer — check first 5 bytes
      const header = new Uint8Array(data.slice(0, 5));
      const headerStr = String.fromCharCode(...header);
      if (!headerStr.startsWith('%PDF-')) {
        return { isValid: false, error: 'Not a valid PDF file (missing header)' };
      }

      return { isValid: true };
    } catch (err: unknown) {
      return {
        isValid: false,
        error: err instanceof Error ? err.message : 'Invalid PDF file',
      };
    }
  }

  /**
   * Parse hex color to RGB values (0-255)
   */
  static parseColorToRgb(hexColor: string): { r: number; g: number; b: number } {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  }

  /**
   * Save highlights to PDF as annotations using pdf-lib.
   *
   * TODO: pdf-lib may work in RN but needs testing.
   * The pdf-lib library is pure JS but uses some browser APIs
   * for certain features. Basic document modification should work.
   */
  static async saveAnnotationsToPdf(
    _pdfArrayBuffer: ArrayBuffer,
    _highlights: PdfHighlight[]
  ): Promise<ArrayBuffer> {
    // TODO: Test and implement pdf-lib in React Native
    throw new Error('saveAnnotationsToPdf not yet implemented for React Native');
  }

  /**
   * Export an annotated PDF for a book.
   *
   * TODO: Requires pdf-lib and file sharing (expo-sharing).
   */
  static async exportAnnotatedPdf(
    _pdfArrayBuffer: ArrayBuffer,
    _highlights: PdfHighlight[],
    _filename: string = 'annotated.pdf'
  ): Promise<void> {
    // TODO: Implement using pdf-lib + expo-sharing
    throw new Error('exportAnnotatedPdf not yet implemented for React Native');
  }
}

export default PdfService;
