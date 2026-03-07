/**
 * React hooks for managing bookmarks, highlights, and annotations
 *
 * React Native version: uses the RN database service imports.
 * Types are imported from the RN types directory.
 */

import { useState, useEffect, useCallback } from 'react';
import type { EpubCfi } from '../types';
import type { Bookmark, Highlight, Annotation } from '../types';
import {
  addBookmark as dbAddBookmark,
  getBookmarks as dbGetBookmarks,
  deleteBookmark as dbDeleteBookmark,
  addHighlight as dbAddHighlight,
  getHighlights as dbGetHighlights,
  deleteHighlight as dbDeleteHighlight,
  updateHighlight as dbUpdateHighlight,
} from '../services/database';

// ============================================================================
// HIGHLIGHT COLORS
// ============================================================================

export const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Green', value: '#00ff00' },
  { name: 'Blue', value: '#00ffff' },
  { name: 'Pink', value: '#ff00ff' },
  { name: 'Orange', value: '#ffa500' },
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]['value'];

// ============================================================================
// BOOKMARKS HOOK
// ============================================================================

export interface UseBookmarksReturn {
  bookmarks: Bookmark[];
  isBookmarked: boolean;
  addBookmark: (cfi: EpubCfi, chapterTitle?: string, textPreview?: string) => Promise<Bookmark>;
  removeBookmark: (id: string) => Promise<boolean>;
  checkBookmarked: (cfi: EpubCfi) => boolean;
  refreshBookmarks: () => Promise<void>;
}

export const useBookmarks = (bookId: string, currentCfi: EpubCfi = ''): UseBookmarksReturn => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const refreshBookmarks = useCallback(async () => {
    try {
      const bookBookmarks = await dbGetBookmarks(bookId);
      setBookmarks(bookBookmarks);
    } catch (err) {
      console.warn('[useBookmarks] Failed to load bookmarks:', err);
    }
  }, [bookId]);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  const addBookmark = useCallback(
    async (cfi: EpubCfi, chapterTitle?: string, textPreview?: string): Promise<Bookmark> => {
      const bookmark = await dbAddBookmark({
        id: `${bookId}-${Date.now()}`,
        bookId,
        location: cfi,
        text: textPreview,
        chapter: chapterTitle,
      });
      await refreshBookmarks();
      if (!bookmark) {
        throw new Error('Failed to add bookmark');
      }
      return bookmark;
    },
    [bookId, refreshBookmarks]
  );

  const removeBookmark = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await dbDeleteBookmark(id);
        await refreshBookmarks();
        return true;
      } catch {
        return false;
      }
    },
    [refreshBookmarks]
  );

  const checkBookmarked = useCallback(
    (cfi: EpubCfi): boolean => {
      return bookmarks.some((b) => b.location?.cfi === cfi);
    },
    [bookmarks]
  );

  const isBookmarked = currentCfi ? checkBookmarked(currentCfi) : false;

  return {
    bookmarks,
    isBookmarked,
    addBookmark,
    removeBookmark,
    checkBookmarked,
    refreshBookmarks,
  };
};

// ============================================================================
// HIGHLIGHTS HOOK
// ============================================================================

export interface UseHighlightsReturn {
  highlights: Highlight[];
  colors: typeof HIGHLIGHT_COLORS;
  addHighlight: (
    cfiRange: string,
    text: string,
    color?: HighlightColor,
    note?: string
  ) => Promise<Highlight>;
  removeHighlight: (id: string) => Promise<boolean>;
  updateHighlight: (
    id: string,
    updates: { color?: HighlightColor; note?: string }
  ) => Promise<boolean>;
  refreshHighlights: () => Promise<void>;
}

export const useHighlights = (bookId: string): UseHighlightsReturn => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const refreshHighlights = useCallback(async () => {
    try {
      const bookHighlights = await dbGetHighlights(bookId);
      setHighlights(bookHighlights);
    } catch (err) {
      console.warn('[useHighlights] Failed to load highlights:', err);
    }
  }, [bookId]);

  useEffect(() => {
    refreshHighlights();
  }, [refreshHighlights]);

  const addHighlight = useCallback(
    async (cfiRange: string, text: string, color?: HighlightColor, note?: string): Promise<Highlight> => {
      const highlight = await dbAddHighlight({
        bookId,
        location: cfiRange,
        text,
        color: color || HIGHLIGHT_COLORS[0].value,
        note,
      });
      await refreshHighlights();
      if (!highlight) {
        throw new Error('Failed to add highlight');
      }
      return highlight;
    },
    [bookId, refreshHighlights]
  );

  const removeHighlight = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await dbDeleteHighlight(id);
        await refreshHighlights();
        return true;
      } catch {
        return false;
      }
    },
    [refreshHighlights]
  );

  const updateHighlightFn = useCallback(
    async (id: string, updates: { color?: HighlightColor; note?: string }): Promise<boolean> => {
      try {
        await dbUpdateHighlight(id, updates);
        await refreshHighlights();
        return true;
      } catch {
        return false;
      }
    },
    [refreshHighlights]
  );

  return {
    highlights,
    colors: HIGHLIGHT_COLORS,
    addHighlight,
    removeHighlight,
    updateHighlight: updateHighlightFn,
    refreshHighlights,
  };
};

// ============================================================================
// ANNOTATIONS HOOK
// ============================================================================

export interface UseAnnotationsReturn {
  annotations: Annotation[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing annotations.
 * Note: Full annotation CRUD will be implemented once the annotationsService
 * is ported to React Native. This hook currently provides a placeholder
 * interface backed by bookmark and highlight data.
 */
export const useAnnotations = (bookId: string): UseAnnotationsReturn => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Annotations will be loaded from a dedicated annotations table
      // once that repository is ported. For now, return an empty array.
      setAnnotations([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load annotations');
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    annotations,
    isLoading,
    error,
    refresh,
  };
};

// ============================================================================
// COMBINED ANNOTATIONS HOOK
// ============================================================================

export interface UseAllAnnotationsReturn {
  bookmarks: Bookmark[];
  highlights: Highlight[];
  annotations: Annotation[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useAllAnnotations = (bookId: string): UseAllAnnotationsReturn => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [bmarks, hlights] = await Promise.all([
        dbGetBookmarks(bookId),
        dbGetHighlights(bookId),
      ]);
      setBookmarks(bmarks);
      setHighlights(hlights);
      setAnnotations([]); // Placeholder until annotations repo is ported
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load annotations');
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    bookmarks,
    highlights,
    annotations,
    isLoading,
    error,
    refresh,
  };
};

// ============================================================================
// SELECTION HOOK (for text selection in reader)
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
 * Hook for managing text selection in the reader
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
