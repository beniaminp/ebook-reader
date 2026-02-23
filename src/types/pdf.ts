/**
 * PDF-specific types for the ebook reader
 */

import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';

// PDF Reader Props
export interface PdfReaderProps {
  book: {
    id: string;
    title: string;
    currentPage?: number;
  };
  pdfData: ArrayBuffer | string;
  onPageChange?: (pageNumber: number, totalPages: number) => void;
  onBookmarkToggle?: (pageNumber: number) => void;
  onClose?: () => void;
}

// PDF View Modes
export type PdfZoomMode = 'fit-width' | 'fit-page' | 'custom';
export type PdfViewMode = 'single' | 'continuous' | 'scrolling';

// PDF State
export interface PdfState {
  document: PDFDocumentProxy | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
  zoomMode: PdfZoomMode;
  viewMode: PdfViewMode;
  rotation: number;
  scrollOffset: number;
}

// PDF Settings
export interface PdfSettings {
  zoomMode: PdfZoomMode;
  defaultZoom: number;
  viewMode: PdfViewMode;
  invertColors: boolean;
  enableTextSelection: boolean;
  enableDoubleTapZoom: boolean;
  autoRotate: boolean;
  sidebarVisible: boolean;
  thumbnailSize: number;
  scrollSpeed: number;
}

// PDF Metadata
export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  isEncrypted?: boolean;
}

// PDF Outline (Table of Contents)
export interface PdfOutlineItem {
  id: string;
  title: string;
  pageNumber: number;
  level: number;
  children: PdfOutlineItem[];
  parentId?: string;
}

// PDF Search Result
export interface PdfSearchMatch {
  id: string;
  pageNumber: number;
  pageIndex: number;
  position: number;
  length: number;
  text: string;
  contextBefore: string;
  contextAfter: string;
}

// PDF Search State
export interface PdfSearchState {
  query: string;
  results: PdfSearchMatch[];
  currentResultIndex: number;
  isSearching: boolean;
  matchCase: boolean;
  wholeWord: boolean;
}

// PDF Page Info
export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  aspectRatio: number;
}

// PDF Render Options
export interface PdfRenderOptions {
  scale: number;
  rotation: number;
  invertColors?: boolean;
  grayscale?: boolean;
  enhanceContrast?: boolean;
}

// PDF Thumbnail
export interface PdfThumbnail {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  loading: boolean;
  error?: string;
}

// PDF Progress
export interface PdfReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  lastReadAt: number;
  timeSpent: number; // in seconds
}

// PDF Annotation
export interface PdfAnnotation {
  id: string;
  bookId: string;
  pageNumber: number;
  type: 'highlight' | 'bookmark' | 'note' | 'underline';
  content?: string;
  color?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: number;
  updatedAt: number;
}

// PDF Reading Statistics
export interface PdfReadingStats {
  bookId: string;
  totalPagesRead: number;
  totalReadingTime: number; // in seconds
  averageReadingSpeed: number; // pages per minute
  longestReadingSession: number; // in seconds
  lastReadAt: number;
  firstReadAt: number;
}

// PDF Export Options
export interface PdfExportOptions {
  format: 'pdf' | 'images' | 'text';
  pageRange?: {
    start: number;
    end: number;
  };
  imageFormat?: 'png' | 'jpeg';
  imageQuality?: number;
  includeAnnotations?: boolean;
}

// PDF Print Options
export interface PdfPrintOptions {
  pageRange?: {
    start: number;
    end: number;
  };
  fitToPage?: boolean;
  duplex?: boolean;
  colorMode?: 'color' | 'grayscale';
}

// Error types
export interface PdfError extends Error {
  code?: 'PASSWORD_REQUIRED' | 'INVALID_PDF' | 'LOAD_FAILED' | 'RENDER_FAILED';
  details?: any;
}

// PDF Loading State
export type PdfLoadingState =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'error'
  | 'password_required';

// Helper type for PDF.js compatibility
export type PdfDocument = PDFDocumentProxy;
export type PdfPage = PDFPageProxy;
export type PdfRenderTask = RenderTask;
