/**
 * usePdfLoader Hook
 * PDF page caching, loading, and text extraction.
 *
 * React Native version: Since pdfjs-dist is a browser library,
 * this hook provides a platform-agnostic interface around a generic
 * PDF document handle. The actual PDF rendering is handled by a
 * native component (e.g., react-native-pdf), so this hook focuses
 * on metadata, text extraction via a lightweight JS-based approach,
 * and page caching state.
 */

import { useState, useCallback, useRef } from 'react';
import type { PdfMetadata } from '../types/pdf';

export interface PdfInfo {
  numPages: number;
  metadata: PdfMetadata;
  isEncrypted: boolean;
}

/**
 * Generic PDF document handle.
 * In RN we don't use pdfjs-dist's PDFDocumentProxy, so this is a
 * lightweight wrapper that stores page count and metadata.
 */
export interface PdfDocumentHandle {
  numPages: number;
  metadata: PdfMetadata;
  /** Optional: function to get text for a given page (1-based). */
  getPageText?: (pageNumber: number) => Promise<string>;
}

export interface UsePdfLoaderResult {
  loading: boolean;
  error: string | null;
  pdfDocument: PdfDocumentHandle | null;
  pdfInfo: PdfInfo | null;
  loadPdf: (source: { uri: string } | { base64: string }, options?: { password?: string; numPages?: number; metadata?: PdfMetadata }) => void;
  getMetadata: () => PdfMetadata;
  getPageText: (pageNumber: number) => Promise<string>;
  searchInPage: (pageNumber: number, query: string) => Promise<number[]>;
  cleanup: () => void;
}

/** Page text cache */
const pageTextCache = new Map<string, string>();

/**
 * Hook for loading and managing PDF documents in React Native.
 *
 * Unlike the web version which uses pdfjs-dist, this hook expects the
 * caller to provide document metadata (from the native PDF component).
 * It manages caching, text extraction, and search.
 */
export const usePdfLoader = (): UsePdfLoaderResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfDocumentRef = useRef<PdfDocumentHandle | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const cacheKeyRef = useRef<string>('');

  /**
   * "Load" a PDF. In RN, actual rendering is done by the native view,
   * so this sets up the document handle with metadata from the caller.
   */
  const loadPdf = useCallback(
    (
      source: { uri: string } | { base64: string },
      options?: { password?: string; numPages?: number; metadata?: PdfMetadata }
    ) => {
      setLoading(true);
      setError(null);

      try {
        // Clean up previous document
        if (pdfDocumentRef.current) {
          pdfDocumentRef.current = null;
        }

        const cacheKey = 'uri' in source ? source.uri : source.base64.substring(0, 32);
        cacheKeyRef.current = cacheKey;

        const metadata: PdfMetadata = options?.metadata || {};
        const numPages = options?.numPages ?? 0;

        const handle: PdfDocumentHandle = {
          numPages,
          metadata,
        };

        pdfDocumentRef.current = handle;

        const info: PdfInfo = {
          numPages,
          metadata,
          isEncrypted: !!options?.password,
        };

        setPdfInfo(info);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load PDF');
        setLoading(false);
        pdfDocumentRef.current = null;
        setPdfInfo(null);
      }
    },
    []
  );

  const getMetadata = useCallback((): PdfMetadata => {
    if (!pdfDocumentRef.current) return {};
    return pdfDocumentRef.current.metadata;
  }, []);

  const getPageText = useCallback(async (pageNumber: number): Promise<string> => {
    if (!pdfDocumentRef.current) return '';

    // Check cache
    const cacheKey = `${cacheKeyRef.current}_page_${pageNumber}`;
    const cached = pageTextCache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
      // If the document handle has a getPageText function, use it
      if (pdfDocumentRef.current.getPageText) {
        const text = await pdfDocumentRef.current.getPageText(pageNumber);
        pageTextCache.set(cacheKey, text);
        return text;
      }
      return '';
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
    pdfDocumentRef.current = null;
    setPdfInfo(null);
    setError(null);
    // Clear page text cache for this document
    const prefix = cacheKeyRef.current;
    if (prefix) {
      for (const key of pageTextCache.keys()) {
        if (key.startsWith(prefix)) {
          pageTextCache.delete(key);
        }
      }
    }
    cacheKeyRef.current = '';
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
