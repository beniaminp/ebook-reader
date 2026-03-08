import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Crypto from 'expo-crypto';
import { useAppStore } from '../../src/stores/useAppStore';
import { useTheme } from '../../src/theme/ThemeContext';
import { ReaderContainer } from '../../src/components/reader/ui/ReaderContainer';
import { readBookFile } from '../../src/services/fileStorage';
import * as db from '../../src/services/database';
import type { Book, Bookmark, Highlight, ReadingLocation } from '../../src/types';
import type { ReaderEngineRef } from '../../src/components/reader/engines/types';
import type { DbBookmark, DbHighlight } from '../../src/db/repositories/bookRepository';

export default function ReaderScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  const [book, setBook] = useState<Book | null>(null);
  const [bookData, setBookData] = useState<ArrayBuffer | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<ReaderEngineRef>(null);

  useEffect(() => {
    loadBook();
  }, [bookId]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      saveProgress();
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  const loadBook = async () => {
    if (!bookId) return;
    try {
      setLoading(true);
      const bookRecord = await db.getBook(bookId);
      if (!bookRecord) {
        setError('Book not found');
        return;
      }
      setBook(bookRecord);

      const data = await readBookFile(bookRecord.filePath);
      setBookData(data);

      const bm = await db.getBookmarks(bookId);
      setBookmarks(bm);

      const hl = await db.getHighlights(bookId);
      setHighlights(hl);

      await db.updateBook(bookId, {
        lastRead: new Date(),
      });
    } catch (e) {
      console.error('Failed to load book:', e);
      setError('Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = useCallback(async () => {
    if (!book || !engineRef.current) return;
    try {
      const progress = engineRef.current.getProgress();
      if (progress) {
        await db.updateReadingProgress(book.id, {
          percentage: progress.fraction * 100,
          currentPage: progress.current,
          totalPages: progress.total,
          location: progress.location,
          lastReadAt: Math.floor(Date.now() / 1000),
        });
        useAppStore.getState().updateProgress(book.id, progress.current, progress.total, progress.location);
      }
    } catch (e) {
      console.error('Failed to save progress:', e);
    }
  }, [book]);

  const handleLocationChange = useCallback(
    async (location: string) => {
      if (!book) return;
      try {
        const progress = engineRef.current?.getProgress();
        if (progress) {
          await db.updateReadingProgress(book.id, {
            percentage: progress.fraction * 100,
            currentPage: progress.current,
            totalPages: progress.total,
            location,
            lastReadAt: Math.floor(Date.now() / 1000),
          });
          useAppStore.getState().updateProgress(book.id, progress.current, progress.total, location);
        }
      } catch (e) {
        console.error('Failed to update progress:', e);
      }
    },
    [book]
  );

  const handleAddBookmark = useCallback(
    async (bookmark: Omit<Bookmark, 'id'>) => {
      if (!book) return;
      const id = Crypto.randomUUID();
      const location = bookmark.location;
      const locationStr = typeof location === 'string' ? location : (location?.cfi || JSON.stringify(location));
      const dbBookmark: DbBookmark = {
        id,
        bookId: bookmark.bookId,
        location: locationStr,
        chapter: bookmark.chapter,
        text: bookmark.text,
      };
      const result = db.addBookmark(dbBookmark);
      if (result) {
        const bm: Bookmark = { ...bookmark, id };
        setBookmarks((prev) => [...prev, bm]);
      }
    },
    [book]
  );

  const handleRemoveBookmark = useCallback(async (id: string) => {
    await db.deleteBookmark(id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleAddHighlight = useCallback(
    async (highlight: Omit<Highlight, 'id'>) => {
      if (!book) return;
      const id = Crypto.randomUUID();
      const location = highlight.location;
      const locationStr = typeof location === 'string' ? location : (location?.cfi || JSON.stringify(location));
      const dbHighlight: DbHighlight = {
        id,
        bookId: highlight.bookId,
        location: locationStr,
        text: highlight.text,
        color: highlight.color,
        note: highlight.note,
        pageNumber: highlight.pageNumber,
        rects: highlight.rects ? JSON.stringify(highlight.rects) : undefined,
        tags: highlight.tags ? JSON.stringify(highlight.tags) : undefined,
      };
      const result = db.addHighlight(dbHighlight);
      if (result) {
        const hl: Highlight = { ...highlight, id };
        setHighlights((prev) => [...prev, hl]);
      }
    },
    [book]
  );

  const handleRemoveHighlight = useCallback(async (id: string) => {
    await db.deleteHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleClose = useCallback(() => {
    saveProgress();
    router.back();
  }, [saveProgress, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.readerBg }]}>
      <StatusBar hidden />
      <ReaderContainer
        ref={engineRef}
        book={book}
        bookData={bookData}
        bookmarks={bookmarks}
        highlights={highlights}
        loading={loading}
        error={error}
        onClose={handleClose}
        onLocationChange={handleLocationChange}
        onAddBookmark={handleAddBookmark}
        onRemoveBookmark={handleRemoveBookmark}
        onAddHighlight={handleAddHighlight}
        onRemoveHighlight={handleRemoveHighlight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
