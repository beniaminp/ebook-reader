import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';

// Set worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
 */
export class PdfService {
  /**
   * Load a PDF document from ArrayBuffer or base64 string
   */
  static async loadPdfDocument(
    data: ArrayBuffer | string,
    password?: string
  ): Promise<pdfjsLib.PDFDocumentProxy> {
    const loadingTask = pdfjsLib.getDocument({
      data,
      password,
    });
    return await loadingTask.promise;
  }

  /**
   * Get basic information about all pages in the PDF
   */
  static async getPagesInfo(pdf: pdfjsLib.PDFDocumentProxy): Promise<PdfPageInfo[]> {
    const pagesInfo: PdfPageInfo[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });

      pagesInfo.push({
        pageNumber: i,
        width: viewport.width,
        height: viewport.height,
        rotation: viewport.rotation,
      });
    }

    return pagesInfo;
  }

  /**
   * Extract text content from a specific page
   */
  static async getPageText(
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    preserveWhitespace: boolean = false
  ): Promise<string> {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    if (preserveWhitespace) {
      return textContent.items.map((item: any) => item.str).join('');
    }

    return textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract all text from a PDF
   */
  static async extractAllText(
    pdf: pdfjsLib.PDFDocumentProxy,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<number, string>> {
    const textMap = new Map<number, string>();

    for (let i = 1; i <= pdf.numPages; i++) {
      const text = await this.getPageText(pdf, i);
      textMap.set(i, text);
      onProgress?.(i, pdf.numPages);
    }

    return textMap;
  }

  /**
   * Search for text across all pages
   */
  static async searchPdf(
    pdf: pdfjsLib.PDFDocumentProxy,
    query: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<number, number[]>> {
    const results = new Map<number, number[]>();
    const lowerQuery = query.toLowerCase();

    for (let i = 1; i <= pdf.numPages; i++) {
      const text = await this.getPageText(pdf, i);
      const lowerText = text.toLowerCase();
      const matches: number[] = [];

      let index = 0;
      while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
        matches.push(index);
        index += lowerQuery.length;
      }

      if (matches.length > 0) {
        results.set(i, matches);
      }

      onProgress?.(i, pdf.numPages);
    }

    return results;
  }

  /**
   * Advanced search with context
   */
  static async searchWithContext(
    pdf: pdfjsLib.PDFDocumentProxy,
    query: string,
    contextLength: number = 50,
    onProgress?: (current: number, total: number) => void
  ): Promise<PdfSearchMatch[]> {
    const matches: PdfSearchMatch[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const text = await this.getPageText(pdf, i, true);
      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();

      let index = 0;
      while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
        const start = Math.max(0, index - contextLength);
        const end = Math.min(text.length, index + query.length + contextLength);
        const context = text.substring(start, end);

        matches.push({
          pageIndex: i - 1,
          pageNumber: i,
          position: index,
          length: query.length,
          context: `...${context}...`,
        });

        index += lowerQuery.length;
      }

      onProgress?.(i, pdf.numPages);
    }

    return matches;
  }

  /**
   * Extract table of contents / outline
   */
  static async getOutline(pdf: pdfjsLib.PDFDocumentProxy): Promise<PdfOutlineItem[]> {
    const outline = await pdf.getOutline();
    if (!outline) return [];

    const items: PdfOutlineItem[] = [];

    const processOutline = async (entries: any[], level: number = 0): Promise<void> => {
      for (const entry of entries) {
        let pageNumber = 0;

        if (entry.dest) {
          const dest = await pdf.getDestination(entry.dest);
          if (dest && dest[0]) {
            const ref = dest[0];
            const pageIndex = await pdf.getPageIndex(ref);
            pageNumber = pageIndex + 1;
          }
        }

        items.push({
          title: entry.title,
          pageNumber,
          level,
          children: [],
        });

        if (entry.items && entry.items.length > 0) {
          await processOutline(entry.items, level + 1);
        }
      }
    };

    await processOutline(outline);
    return items;
  }

  /**
   * Generate a thumbnail for a page
   */
  static async generateThumbnail(
    page: pdfjsLib.PDFPageProxy,
    maxSize: number = 200,
    quality: number = 0.8
  ): Promise<string> {
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(maxSize / viewport.width, maxSize / viewport.height);

    const canvas = document.createElement('canvas');
    const scaledViewport = page.getViewport({ scale });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    await page.render({
      canvasContext: context as any,
      viewport: scaledViewport,
    } as any).promise;

    return canvas.toDataURL('image/jpeg', quality);
  }

  /**
   * Generate thumbnails for multiple pages
   */
  static async generateThumbnails(
    pdf: pdfjsLib.PDFDocumentProxy,
    pages: number[],
    maxSize: number = 200,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<number, string>> {
    const thumbnails = new Map<number, string>();

    for (let i = 0; i < pages.length; i++) {
      const pageNumber = pages[i];
      try {
        const page = await pdf.getPage(pageNumber);
        const thumbnail = await this.generateThumbnail(page, maxSize);
        thumbnails.set(pageNumber, thumbnail);
      } catch (err) {
        console.error(`Failed to generate thumbnail for page ${pageNumber}:`, err);
      }
      onProgress?.(i + 1, pages.length);
    }

    return thumbnails;
  }

  /**
   * Get metadata from PDF
   */
  static async getMetadata(pdf: pdfjsLib.PDFDocumentProxy) {
    const metadata = await pdf.getMetadata();
    const info = metadata.info as any;

    return {
      title: info?.Title || '',
      author: info?.Author || '',
      subject: info?.Subject || '',
      keywords: info?.Keywords || '',
      creator: info?.Creator || '',
      producer: info?.Producer || '',
      creationDate: info?.CreationDate ? new Date(info.CreationDate) : null,
      modificationDate: info?.ModDate ? new Date(info.ModDate) : null,
      isEncrypted: (metadata as any).isEncrypted || false,
    };
  }

  /**
   * Check if PDF is password protected
   */
  static async isPasswordProtected(data: ArrayBuffer | string): Promise<boolean> {
    try {
      const loadingTask = pdfjsLib.getDocument({ data });
      await loadingTask.promise;
      return false;
    } catch (err: any) {
      return err?.name === 'PasswordException';
    }
  }

  /**
   * Calculate reading time estimate
   */
  static calculateReadingTime(
    totalPages: number,
    wordsPerPage: number = 300,
    wordsPerMinute: number = 250
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
   * Validate PDF data
   */
  static async validatePdf(data: ArrayBuffer | string): Promise<{
    isValid: boolean;
    error?: string;
    pageCount?: number;
  }> {
    try {
      const pdf = await this.loadPdfDocument(data);
      const pageCount = pdf.numPages;

      await pdf.destroy();

      return {
        isValid: true,
        pageCount,
      };
    } catch (err: any) {
      if (err?.name === 'PasswordException') {
        return {
          isValid: true,
          pageCount: undefined,
        };
      }

      return {
        isValid: false,
        error: err?.message || 'Invalid PDF file',
      };
    }
  }

  /**
   * Parse hex color to RGB values (0-255)
   */
  private static parseColorToRgb(hexColor: string): { r: number; g: number; b: number } {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  }

  /**
   * Save highlights to PDF as annotations using pdf-lib
   */
  static async saveAnnotationsToPdf(
    pdfArrayBuffer: ArrayBuffer,
    highlights: PdfHighlight[]
  ): Promise<ArrayBuffer> {
    try {
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
      const pages = pdfDoc.getPages();

      // Group highlights by page
      const highlightsByPage = new Map<number, PdfHighlight[]>();
      for (const highlight of highlights) {
        const pageHighlights = highlightsByPage.get(highlight.pageNumber) || [];
        pageHighlights.push(highlight);
        highlightsByPage.set(highlight.pageNumber, pageHighlights);
      }

      // Add highlights to each page
      for (const [pageNumber, pageHighlights] of highlightsByPage.entries()) {
        const pageIndex = pageNumber - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;

        const page = pages[pageIndex];
        const { height } = page.getSize();

        for (const highlight of pageHighlights) {
          const { r, g, b } = this.parseColorToRgb(highlight.color);

          // For each rect, add a highlight annotation
          for (const rect of highlight.rects) {
            // PDF coordinates: (0,0) is bottom-left, y increases upward
            // Our rect coordinates are from top-left, y increases downward
            const pdfX = rect.x;
            const pdfY = height - rect.y - rect.height;

            // Create a highlight annotation
            page.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: rect.width,
              height: rect.height,
              color: rgb(r / 255, g / 255, b / 255),
              opacity: 0.3,
            });
          }

          // If there's a note, add a text annotation
          if (highlight.note && highlight.rects.length > 0) {
            const firstRect = highlight.rects[0];
            const pdfX = firstRect.x;
            const pdfY = height - firstRect.y;

            // Add a text box with the note
            page.drawText(`Note: ${highlight.note}`, {
              x: pdfX,
              y: pdfY + 10,
              size: 10,
              color: rgb(0, 0, 0),
            });
          }
        }
      }

      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      return modifiedPdfBytes.buffer as ArrayBuffer;
    } catch (error) {
      console.error('Failed to save annotations to PDF:', error);
      throw new Error('Failed to save annotations to PDF');
    }
  }

  /**
   * Export an annotated PDF for a book
   * This loads the original PDF, applies highlights, and triggers download
   */
  static async exportAnnotatedPdf(
    pdfArrayBuffer: ArrayBuffer,
    highlights: PdfHighlight[],
    filename: string = 'annotated.pdf'
  ): Promise<void> {
    try {
      const annotatedPdf = await this.saveAnnotationsToPdf(pdfArrayBuffer, highlights);

      // Create a blob and trigger download
      const blob = new Blob([annotatedPdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export annotated PDF:', error);
      throw new Error('Failed to export annotated PDF');
    }
  }

  /**
   * Convert PDF page to image
   */
  static async pageToImage(
    page: pdfjsLib.PDFPageProxy,
    scale: number = 2,
    format: 'png' | 'jpeg' = 'png',
    quality: number = 0.95
  ): Promise<Blob> {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    await page.render({
      canvasContext: context as any,
      viewport: viewport,
    } as any).promise;

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        format === 'png' ? 'image/png' : 'image/jpeg',
        quality
      );
    });
  }
}

export default PdfService;
