/**
 * React hooks for managing bookmarks, highlights, and annotations
 */

import { useState, useEffect, useCallback } from 'react';
import {
  annotationsService,
  HIGHLIGHT_COLORS,
  type EpubBookmark,
  type EpubHighlight,
  type EpubAnnotation,
  type HighlightColor,
} from '../services/annotationsService';
import type { EpubCfi } from '../types';

// ============================================================================
// BOOKMARKS HOOK
// ============================================================================

export interface UseBookmarksReturn {
  bookmarks: EpubBookmark[];
  isBookmarked: boolean;
  addBookmark: (cfi: EpubCfi, chapterTitle?: string, textPreview?: string) => Promise<EpubBookmark>;
  removeBookmark: (id: string) => Promise<boolean>;
  updateBookmarkNote: (id: string, note: string) => Promise<boolean>;
  checkBookmarked: (cfi: EpubCfi) => boolean;
  refreshBookmarks: () => Promise<void>;
}

export const useBookmarks = (bookId: string, currentCfi: EpubCfi = ''): UseBookmarksReturn => {
  const [bookmarks, setBookmarks] = useState<EpubBookmark[]>([]);

  const refreshBookmarks = useCallback(async () => {
    const bookBookmarks = annotationsService.getBookmarks(bookId);
    setBookmarks(bookBookmarks);
  }, [bookId]);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  const addBookmark = useCallback(
    async (cfi: EpubCfi, chapterTitle?: string, textPreview?: string) => {
      const bookmark = await annotationsService.addBookmark(bookId, cfi, chapterTitle, textPreview);
      await refreshBookmarks();
      return bookmark;
    },
    [bookId, refreshBookmarks]
  );

  const removeBookmark = useCallback(
    async (id: string) => {
      const result = await annotationsService.removeBookmark(id);
      if (result) {
        await refreshBookmarks();
      }
      return result;
    },
    [refreshBookmarks]
  );

  const updateBookmarkNote = useCallback(async (id: string, note: string) => {
    return await annotationsService.updateBookmarkNote(id, note);
  }, []);

  const checkBookmarked = useCallback(
    (cfi: EpubCfi) => {
      return annotationsService.isBookmarked(bookId, cfi);
    },
    [bookId]
  );

  const isBookmarked = currentCfi ? checkBookmarked(currentCfi) : false;

  return {
    bookmarks,
    isBookmarked,
    addBookmark,
    removeBookmark,
    updateBookmarkNote,
    checkBookmarked,
    refreshBookmarks,
  };
};

// ============================================================================
// HIGHLIGHTS HOOK
// ============================================================================

export interface UseHighlightsReturn {
  highlights: EpubHighlight[];
  colors: typeof HIGHLIGHT_COLORS;
  addHighlight: (
    cfiRange: string,
    text: string,
    color?: HighlightColor,
    note?: string
  ) => Promise<EpubHighlight>;
  removeHighlight: (id: string) => Promise<boolean>;
  updateHighlight: (
    id: string,
    updates: { color?: HighlightColor; note?: string }
  ) => Promise<boolean>;
  getHighlightsAtCfi: (cfi: EpubCfi) => EpubHighlight[];
  refreshHighlights: () => Promise<void>;
}

export const useHighlights = (bookId: string): UseHighlightsReturn => {
  const [highlights, setHighlights] = useState<EpubHighlight[]>([]);

  const refreshHighlights = useCallback(async () => {
    const bookHighlights = annotationsService.getHighlights(bookId);
    setHighlights(bookHighlights);
  }, [bookId]);

  useEffect(() => {
    refreshHighlights();
  }, [refreshHighlights]);

  const addHighlight = useCallback(
    async (cfiRange: string, text: string, color?: HighlightColor, note?: string) => {
      const highlight = await annotationsService.addHighlight(
        bookId,
        cfiRange,
        text,
        color || HIGHLIGHT_COLORS[0].value,
        note
      );
      await refreshHighlights();
      return highlight;
    },
    [bookId, refreshHighlights]
  );

  const removeHighlight = useCallback(
    async (id: string) => {
      const result = await annotationsService.removeHighlight(id);
      if (result) {
        await refreshHighlights();
      }
      return result;
    },
    [refreshHighlights]
  );

  const updateHighlight = useCallback(
    async (id: string, updates: { color?: HighlightColor; note?: string }) => {
      const result = await annotationsService.updateHighlight(id, updates);
      if (result) {
        await refreshHighlights();
      }
      return result;
    },
    [refreshHighlights]
  );

  const getHighlightsAtCfi = useCallback(
    (cfi: EpubCfi) => {
      return annotationsService.getHighlightsAtCfi(bookId, cfi);
    },
    [bookId]
  );

  return {
    highlights,
    colors: HIGHLIGHT_COLORS,
    addHighlight,
    removeHighlight,
    updateHighlight,
    getHighlightsAtCfi,
    refreshHighlights,
  };
};

// ============================================================================
// ANNOTATIONS HOOK
// ============================================================================

export interface UseAnnotationsReturn {
  annotations: EpubAnnotation[];
  addAnnotation: (
    cfi: EpubCfi,
    content: string,
    type?: 'note' | 'definition' | 'translation'
  ) => Promise<EpubAnnotation>;
  removeAnnotation: (id: string) => Promise<boolean>;
  updateAnnotation: (id: string, content: string) => Promise<boolean>;
  refreshAnnotations: () => Promise<void>;
}

export const useAnnotations = (bookId: string): UseAnnotationsReturn => {
  const [annotations, setAnnotations] = useState<EpubAnnotation[]>([]);

  const refreshAnnotations = useCallback(async () => {
    const bookAnnotations = annotationsService.getAnnotations(bookId);
    setAnnotations(bookAnnotations);
  }, [bookId]);

  useEffect(() => {
    refreshAnnotations();
  }, [refreshAnnotations]);

  const addAnnotation = useCallback(
    async (cfi: EpubCfi, content: string, type: 'note' | 'definition' | 'translation' = 'note') => {
      const annotation = await annotationsService.addAnnotation(bookId, cfi, content, type);
      await refreshAnnotations();
      return annotation;
    },
    [bookId, refreshAnnotations]
  );

  const removeAnnotation = useCallback(
    async (id: string) => {
      const result = await annotationsService.removeAnnotation(id);
      if (result) {
        await refreshAnnotations();
      }
      return result;
    },
    [refreshAnnotations]
  );

  const updateAnnotation = useCallback(
    async (id: string, content: string) => {
      const result = await annotationsService.updateAnnotation(id, content);
      if (result) {
        await refreshAnnotations();
      }
      return result;
    },
    [refreshAnnotations]
  );

  return {
    annotations,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    refreshAnnotations,
  };
};

// ============================================================================
// COMBINED ANNOTATIONS HOOK
// ============================================================================

export interface UseAllAnnotationsReturn {
  bookmarks: EpubBookmark[];
  highlights: EpubHighlight[];
  annotations: EpubAnnotation[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  exportToJson: () => string;
  clearAll: () => Promise<void>;
}

export const useAllAnnotations = (bookId: string): UseAllAnnotationsReturn => {
  const [bookmarks, setBookmarks] = useState<EpubBookmark[]>([]);
  const [highlights, setHighlights] = useState<EpubHighlight[]>([]);
  const [annotations, setAnnotations] = useState<EpubAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setBookmarks(annotationsService.getBookmarks(bookId));
      setHighlights(annotationsService.getHighlights(bookId));
      setAnnotations(annotationsService.getAnnotations(bookId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load annotations');
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const exportToJson = useCallback(() => {
    return annotationsService.exportBookAnnotations(bookId);
  }, [bookId]);

  const clearAll = useCallback(async () => {
    await annotationsService.clearBookData(bookId);
    await refresh();
  }, [bookId, refresh]);

  return {
    bookmarks,
    highlights,
    annotations,
    isLoading,
    error,
    refresh,
    exportToJson,
    clearAll,
  };
};

// ============================================================================
// SELECTION HOOK (for text selection in EPUB)
// ============================================================================

export interface TextSelection {
  cfiRange: string;
  text: string;
}

export interface UseSelectionReturn {
  selection: TextSelection | null;
  isSelecting: boolean;
  startSelection: () => void;
  clearSelection: () => void;
  getSelectedText: () => string;
  setSelectionFromCfi: (cfiRange: string, text: string) => void;
}

/**
 * Hook for managing text selection in EPUB reader
 * This should be used with epub.js selection events
 */
export const useSelection = (): UseSelectionReturn => {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const startSelection = useCallback(() => {
    setIsSelecting(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setIsSelecting(false);
  }, []);

  const getSelectedText = useCallback(() => {
    return selection?.text || '';
  }, [selection]);

  // This would typically be called from epub.js selection event
  const setSelectionFromCfi = useCallback((cfiRange: string, text: string) => {
    setSelection({ cfiRange, text });
    setIsSelecting(false);
  }, []);

  return {
    selection,
    isSelecting,
    startSelection,
    clearSelection,
    getSelectedText,
    setSelectionFromCfi,
  };
};
