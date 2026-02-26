import { useState, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import '../utils/pdfWorkerSetup';

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface PdfInfo {
  numPages: number;
  metadata: PdfMetadata;
  isEncrypted: boolean;
}

export interface UsePdfLoaderResult {
  loading: boolean;
  error: string | null;
  pdfDocument: pdfjsLib.PDFDocumentProxy | null;
  pdfInfo: PdfInfo | null;
  loadPdf: (data: ArrayBuffer | string, password?: string) => Promise<void>;
  getMetadata: () => Promise<PdfMetadata>;
  getPageText: (pageNumber: number) => Promise<string>;
  searchInPage: (pageNumber: number, query: string) => Promise<number[]>;
  cleanup: () => void;
}

/**
 * Hook for loading and managing PDF documents
 */
export const usePdfLoader = (): UsePdfLoaderResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfDocumentRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);

  const loadPdf = useCallback(async (data: ArrayBuffer | string, password?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Clean up previous document
      if (pdfDocumentRef.current) {
        await pdfDocumentRef.current.destroy();
        pdfDocumentRef.current = null;
      }

      const loadingTask = pdfjsLib.getDocument({
        data,
        password,
      });

      const pdf = await loadingTask.promise;
      pdfDocumentRef.current = pdf;

      // Extract metadata
      const metadata = await getMetadataFromPdf(pdf);
      const info: PdfInfo = {
        numPages: pdf.numPages,
        metadata,
        isEncrypted: !!password,
      };

      setPdfInfo(info);
      setLoading(false);
    } catch (err: any) {
      if (err?.name === 'PasswordException') {
        setError('This PDF requires a password to open.');
      } else {
        setError(err?.message || 'Failed to load PDF');
      }
      setLoading(false);
      pdfDocumentRef.current = null;
      setPdfInfo(null);
    }
  }, []);

  const getMetadataFromPdf = async (pdf: pdfjsLib.PDFDocumentProxy): Promise<PdfMetadata> => {
    try {
      const metadata = await pdf.getMetadata();
      const info = metadata.info as any;
      return {
        title: info?.Title,
        author: info?.Author,
        subject: info?.Subject,
        keywords: info?.Keywords,
        creator: info?.Creator,
        producer: info?.Producer,
        creationDate: info?.CreationDate,
        modificationDate: info?.ModDate,
      };
    } catch {
      return {};
    }
  };

  const getMetadata = useCallback(async (): Promise<PdfMetadata> => {
    if (!pdfDocumentRef.current) return {};
    return getMetadataFromPdf(pdfDocumentRef.current);
  }, []);

  const getPageText = useCallback(async (pageNumber: number): Promise<string> => {
    if (!pdfDocumentRef.current) return '';

    try {
      const page = await pdfDocumentRef.current.getPage(pageNumber);
      const textContent = await page.getTextContent();
      return textContent.items.map((item: any) => item.str).join(' ');
    } catch {
      return '';
    }
  }, []);

  const searchInPage = useCallback(
    async (pageNumber: number, query: string): Promise<number[]> => {
      if (!pdfDocumentRef.current) return [];

      try {
        const text = await getPageText(pageNumber);
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const matches: number[] = [];

        let index = 0;
        while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
          matches.push(index);
          index += lowerQuery.length;
        }

        return matches;
      } catch {
        return [];
      }
    },
    [getPageText]
  );

  const cleanup = useCallback(() => {
    if (pdfDocumentRef.current) {
      pdfDocumentRef.current.destroy();
      pdfDocumentRef.current = null;
    }
    setPdfInfo(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    pdfDocument: pdfDocumentRef.current,
    pdfInfo,
    loadPdf,
    getMetadata,
    getPageText,
    searchInPage,
    cleanup,
  };
};

/**
 * Hook for rendering PDF pages to canvas
 */
export const usePdfRenderer = () => {
  const renderTasksRef = useRef<Map<number, any>>(new Map());

  const renderPageToCanvas = useCallback(
    async (
      page: pdfjsLib.PDFPageProxy,
      canvas: HTMLCanvasElement,
      scale: number = 1,
      rotation: number = 0,
      options: {
        invertColors?: boolean;
        grayscale?: boolean;
      } = {}
    ): Promise<void> => {
      const viewport = page.getViewport({ scale, rotation });

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Apply CSS filters
      const filters: string[] = [];
      if (options.invertColors) filters.push('invert(1) hue-rotate(180deg)');
      if (options.grayscale) filters.push('grayscale(1)');
      context.filter = filters.length > 0 ? filters.join(' ') : 'none';

      const renderContext = {
        canvasContext: context as any,
        viewport: viewport,
      };

      // Cancel any existing render task
      const existingTask = renderTasksRef.current.get(page.pageNumber);
      if (existingTask) {
        existingTask.cancel();
      }

      const renderTask = page.render(renderContext as any);
      renderTasksRef.current.set(page.pageNumber, renderTask);

      try {
        await renderTask.promise;
        renderTasksRef.current.delete(page.pageNumber);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          throw err;
        }
      }
    },
    []
  );

  const generateThumbnail = useCallback(
    async (page: pdfjsLib.PDFPageProxy, maxSize: number = 200): Promise<string | null> => {
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(maxSize / viewport.width, maxSize / viewport.height);

      const canvas = document.createElement('canvas');
      await renderPageToCanvas(page, canvas, scale, 0, { grayscale: true });

      return canvas.toDataURL('image/jpeg', 0.7);
    },
    [renderPageToCanvas]
  );

  const cleanup = useCallback(() => {
    renderTasksRef.current.forEach((task) => task.cancel());
    renderTasksRef.current.clear();
  }, []);

  return {
    renderPageToCanvas,
    generateThumbnail,
    cleanup,
  };
};
