/**
 * usePdfHighlights Hook
 *
 * Manages PDF highlights state and persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '../services/database';
import type { Highlight, HighlightRect } from '../types/index';
import type { PdfHighlight } from '../services/pdfService';

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
        const loadedHighlights = await databaseService.getHighlights(bookId);
        const pdfHighlights: PdfHighlight[] = loadedHighlights
          .filter((h) => h.pageNumber !== undefined && h.rects !== undefined)
          .map((h) => ({
            id: h.id,
            bookId: h.bookId,
            pageNumber: h.pageNumber!,
            text: h.text,
            rects: h.rects!,
            color: h.color,
            note: h.note,
            createdAt: h.timestamp as any,
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

  const addHighlight = useCallback(async (highlight: Omit<Highlight, 'id' | 'timestamp'>) => {
    try {
      const newHighlight = await databaseService.addHighlight({
        ...highlight,
        location: highlight.location.pageNumber
          ? String(highlight.location.pageNumber)
          : highlight.location.cfi || String(highlight.location.position),
        tags: highlight.tags ? JSON.stringify(highlight.tags) : undefined,
        rects: highlight.rects ? JSON.stringify(highlight.rects) : undefined,
      });

      if (newHighlight && newHighlight.pageNumber && newHighlight.rects) {
        const pdfHighlight: PdfHighlight = {
          id: newHighlight.id,
          bookId: newHighlight.bookId,
          pageNumber: newHighlight.pageNumber,
          text: newHighlight.text,
          rects: newHighlight.rects,
          color: newHighlight.color,
          note: newHighlight.note,
          createdAt: newHighlight.timestamp as any,
        };
        setHighlights((prev) => [...prev, pdfHighlight]);
        return newHighlight;
      }
      return null;
    } catch (error) {
      console.error('Failed to add highlight:', error);
      return null;
    }
  }, []);

  const deleteHighlight = useCallback(async (id: string) => {
    try {
      await databaseService.deleteHighlight(id);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      return true;
    } catch (error) {
      console.error('Failed to delete highlight:', error);
      return false;
    }
  }, []);

  const updateHighlight = useCallback(
    async (id: string, updates: { color?: string; note?: string }) => {
      try {
        await databaseService.updateHighlight(id, updates);
        setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
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
    updateHighlight,
    getHighlightsForPage,
  };
}
