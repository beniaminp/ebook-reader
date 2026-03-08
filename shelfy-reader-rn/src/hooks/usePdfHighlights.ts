/**
 * usePdfHighlights Hook
 *
 * Manages PDF highlights state and persistence.
 *
 * React Native version: Uses the RN database service (SQLite)
 * for loading, adding, updating, and deleting highlights.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getHighlights,
  addHighlight as dbAddHighlight,
  deleteHighlight as dbDeleteHighlight,
  updateHighlight as dbUpdateHighlight,
} from '../services/database';
import type { DbHighlight } from '../services/database';
import type { Highlight, HighlightRect } from '../types/index';

/** PDF-specific highlight with required pageNumber and rects */
export interface PdfHighlight {
  id: string;
  bookId: string;
  pageNumber: number;
  text: string;
  rects: HighlightRect[];
  color: string;
  note?: string;
  createdAt: Date;
}

interface UsePdfHighlightsProps {
  bookId: string;
}

export function usePdfHighlights({ bookId }: UsePdfHighlightsProps) {
  const [highlights, setHighlights] = useState<PdfHighlight[]>([]);
  const [loading, setLoading] = useState(true);

  // Load highlights on mount
  useEffect(() => {
    const loadHighlights = async () => {
      try {
        const loadedHighlights = await getHighlights(bookId);
        const pdfHighlights: PdfHighlight[] = loadedHighlights
          .filter(
            (h: Highlight) => h.pageNumber !== undefined && h.rects !== undefined
          )
          .map((h: Highlight) => ({
            id: h.id,
            bookId: h.bookId,
            pageNumber: h.pageNumber!,
            text: h.text,
            rects: h.rects!,
            color: h.color,
            note: h.note,
            createdAt: h.timestamp instanceof Date ? h.timestamp : new Date(h.timestamp),
          }));
        setHighlights(pdfHighlights);
      } catch (error) {
        console.error('Failed to load highlights:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHighlights();
  }, [bookId]);

  const addHighlight = useCallback(
    async (highlight: Omit<Highlight, 'id' | 'timestamp'>) => {
      try {
        const location = highlight.location.pageNumber
          ? String(highlight.location.pageNumber)
          : highlight.location.cfi || String(highlight.location.position);

        const dbHighlight: DbHighlight = {
          bookId: highlight.bookId,
          location,
          text: highlight.text,
          color: highlight.color,
          note: highlight.note,
          tags: highlight.tags ? JSON.stringify(highlight.tags) : undefined,
          pageNumber: highlight.pageNumber,
          rects: highlight.rects ? JSON.stringify(highlight.rects) : undefined,
        };

        const newHighlight = dbAddHighlight(dbHighlight);

        if (newHighlight && highlight.pageNumber && highlight.rects) {
          const pdfHighlight: PdfHighlight = {
            id: newHighlight.id,
            bookId: highlight.bookId,
            pageNumber: highlight.pageNumber,
            text: highlight.text,
            rects: highlight.rects,
            color: highlight.color,
            note: highlight.note,
            createdAt: new Date(),
          };
          setHighlights((prev) => [...prev, pdfHighlight]);
          return pdfHighlight;
        }
        return null;
      } catch (error) {
        console.error('Failed to add highlight:', error);
        return null;
      }
    },
    []
  );

  const deleteHighlight = useCallback(async (id: string) => {
    try {
      await dbDeleteHighlight(id);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      return true;
    } catch (error) {
      console.error('Failed to delete highlight:', error);
      return false;
    }
  }, []);

  const updateHighlightData = useCallback(
    async (id: string, updates: { color?: string; note?: string }) => {
      try {
        await dbUpdateHighlight(id, updates);
        setHighlights((prev) =>
          prev.map((h) => (h.id === id ? { ...h, ...updates } : h))
        );
        return true;
      } catch (error) {
        console.error('Failed to update highlight:', error);
        return false;
      }
    },
    []
  );

  const getHighlightsForPage = useCallback(
    (pageNumber: number) => {
      return highlights.filter((h) => h.pageNumber === pageNumber);
    },
    [highlights]
  );

  return {
    highlights,
    loading,
    addHighlight,
    deleteHighlight,
    updateHighlight: updateHighlightData,
    getHighlightsForPage,
  };
}
