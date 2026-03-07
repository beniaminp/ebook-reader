import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useThemeStore } from '../../../stores/useThemeStore';
import { EpubEngine } from '../engines/EpubEngine';
import { PdfEngine } from '../engines/PdfEngine';
import { ComicEngine } from '../engines/ComicEngine';
import { TextEngine } from '../engines/TextEngine';
import { ReaderToolbar } from './ReaderToolbar';
import { ReaderBottomBar } from './ReaderBottomBar';
import { SettingsSheet } from './SettingsSheet';
import type { ReaderEngineRef, ReaderTheme, Chapter, ReaderProgress } from '../engines/types';
import type { Book, Bookmark, Highlight, ReadingLocation } from '../../../types';
import { isComicFormat, isPdfFormat, isWebViewFormat, type BookFormat } from '../../../utils/formatUtils';

/** Convert margin size name to pixel value */
function marginSizeToNumber(size: string): number {
  switch (size) {
    case 'small': return 8;
    case 'large': return 32;
    case 'medium':
    default: return 16;
  }
}

/** Extract a CFI or location string from a ReadingLocation or string */
function locationToString(location: ReadingLocation | string | undefined): string {
  if (!location) return '';
  if (typeof location === 'string') return location;
  return location.cfi || String(location.position || 0);
}

interface ReaderContainerProps {
  book: Book | null;
  bookData: ArrayBuffer | null;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onLocationChange: (location: string) => void;
  onAddBookmark: (bookmark: Omit<Bookmark, 'id'>) => void;
  onRemoveBookmark: (id: string) => void;
  onAddHighlight: (highlight: Omit<Highlight, 'id'>) => void;
  onRemoveHighlight: (id: string) => void;
}

export const ReaderContainer = forwardRef<ReaderEngineRef, ReaderContainerProps>(
  function ReaderContainer(props, ref) {
    const {
      book,
      bookData,
      bookmarks,
      highlights,
      loading,
      error,
      onClose,
      onLocationChange,
      onAddBookmark,
      onRemoveBookmark,
      onAddHighlight,
      onRemoveHighlight,
    } = props;

    const { theme } = useTheme();
    const themeStore = useThemeStore();
    const engineRef = useRef<ReaderEngineRef>(null);

    const [toolbarVisible, setToolbarVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [toc, setToc] = useState<Chapter[]>([]);
    const [progress, setProgress] = useState<ReaderProgress | null>(null);

    useImperativeHandle(ref, () => engineRef.current!);

    const readerTheme: ReaderTheme = {
      backgroundColor: theme.readerBg,
      textColor: theme.readerText,
      linkColor: theme.readerLink,
      fontSize: themeStore.fontSize,
      fontFamily: themeStore.fontFamily,
      lineHeight: themeStore.lineHeight,
      letterSpacing: themeStore.letterSpacing,
      textAlign: themeStore.textAlign as any,
      marginSize: marginSizeToNumber(themeStore.marginSize),
    };

    const handleTap = useCallback(
      (zone: 'left' | 'center' | 'right') => {
        if (zone === 'center') {
          setToolbarVisible((v) => !v);
        } else if (zone === 'left') {
          engineRef.current?.goToPrev();
        } else if (zone === 'right') {
          engineRef.current?.goToNext();
        }
      },
      []
    );

    const handleProgressChange = useCallback((p: ReaderProgress) => {
      setProgress(p);
    }, []);

    if (loading) {
      return (
        <View style={[styles.center, { backgroundColor: theme.readerBg }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 12 }}>
            Loading book...
          </Text>
        </View>
      );
    }

    if (error || !book || !bookData) {
      return (
        <View style={[styles.center, { backgroundColor: theme.readerBg }]}>
          <Text style={{ color: theme.error, fontSize: 16 }}>
            {error || 'Book not available'}
          </Text>
        </View>
      );
    }

    const renderEngine = () => {
      const format = book.format;

      if (isPdfFormat(format)) {
        return (
          <PdfEngine
            ref={engineRef}
            bookData={bookData}
            format={format}
            initialLocation={book.lastLocation}
            readerTheme={readerTheme}
            onLocationChange={onLocationChange}
            onProgressChange={handleProgressChange}
            onTap={handleTap}
          />
        );
      }

      if (isComicFormat(format)) {
        return (
          <ComicEngine
            ref={engineRef}
            bookData={bookData}
            format={format}
            initialLocation={book.lastLocation}
            readerTheme={readerTheme}
            onLocationChange={onLocationChange}
            onProgressChange={handleProgressChange}
          />
        );
      }

      if (format === 'txt' || format === 'html' || format === 'md') {
        return (
          <TextEngine
            ref={engineRef}
            bookData={bookData}
            format={format}
            initialLocation={book.lastLocation}
            readerTheme={readerTheme}
            onLocationChange={onLocationChange}
            onProgressChange={handleProgressChange}
            onTap={handleTap}
          />
        );
      }

      // EPUB, MOBI, AZW3, FB2, DOCX, ODT → WebView engine
      return (
        <EpubEngine
          ref={engineRef}
          bookData={bookData}
          format={format}
          initialLocation={book.lastLocation}
          highlights={highlights.map((h) => ({
            id: h.id,
            cfi: locationToString(h.location),
            color: h.color || '#FFF176',
          }))}
          readerTheme={readerTheme}
          onLocationChange={onLocationChange}
          onTocLoaded={setToc}
          onProgressChange={handleProgressChange}
          onTap={handleTap}
          onSelectionChange={(sel) => {
            // Handle text selection for highlights
          }}
        />
      );
    };

    return (
      <View style={styles.container}>
        {renderEngine()}

        <ReaderToolbar
          visible={toolbarVisible}
          title={book.title}
          onClose={onClose}
          onSettingsPress={() => setSettingsVisible(true)}
          onBookmarkPress={() => {
            if (!progress) return;
            const currentLoc = engineRef.current?.getCurrentLocation();
            const cfi = currentLoc?.cfi || String(progress.current);
            onAddBookmark({
              bookId: book.id,
              location: {
                bookId: book.id,
                cfi,
                position: progress.fraction || 0,
              },
              text: '',
              chapter: currentLoc?.chapterLabel,
              timestamp: new Date(),
            });
          }}
        />

        <ReaderBottomBar
          visible={toolbarVisible}
          progress={progress}
          onSliderChange={(value) => {
            if (progress) {
              const page = Math.round(value * progress.total);
              engineRef.current?.goToPage(page);
            }
          }}
        />

        <SettingsSheet
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          onFontSizeChange={(size) => engineRef.current?.setFontSize(size)}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
