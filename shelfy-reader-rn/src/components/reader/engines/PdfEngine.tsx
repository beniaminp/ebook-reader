import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Pdf from 'react-native-pdf';
import type {
  ReaderEngineRef,
  ReaderEngineProps,
  Chapter,
  ReaderProgress,
  ReaderLocation,
  ReaderTheme,
} from './types';

export const PdfEngine = forwardRef<ReaderEngineRef, ReaderEngineProps>(
  function PdfEngine(props, ref) {
    const {
      bookData,
      readerTheme,
      initialLocation,
      onLocationChange,
      onProgressChange,
      onTap,
    } = props;

    const pdfRef = useRef<any>(null);
    const [currentPage, setCurrentPage] = useState(
      initialLocation ? parseInt(initialLocation, 10) || 1 : 1
    );
    const [totalPages, setTotalPages] = useState(0);
    const [source, setSource] = useState<{ uri: string } | null>(null);

    // Convert ArrayBuffer to base64 data URI for PDF viewer
    React.useEffect(() => {
      if (bookData) {
        const bytes = new Uint8Array(bookData);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        setSource({ uri: `data:application/pdf;base64,${base64}` });
      }
    }, [bookData]);

    const updateProgress = useCallback(
      (page: number, total: number) => {
        const progress: ReaderProgress = {
          current: page,
          total,
          fraction: total > 0 ? (page - 1) / (total - 1) : 0,
          location: String(page),
        };
        onProgressChange?.(progress);
        onLocationChange?.(String(page));
      },
      [onProgressChange, onLocationChange]
    );

    useImperativeHandle(ref, () => ({
      goToNext: () => {
        const next = Math.min(currentPage + 1, totalPages);
        setCurrentPage(next);
      },
      goToPrev: () => {
        const prev = Math.max(currentPage - 1, 1);
        setCurrentPage(prev);
      },
      goToLocation: (location: string) => {
        const page = parseInt(location, 10);
        if (page >= 1 && page <= totalPages) {
          setCurrentPage(page);
        }
      },
      goToChapter: () => {},
      goToPage: (page: number) => setCurrentPage(page),
      getCurrentLocation: () => ({
        page: currentPage,
        fraction: totalPages > 0 ? (currentPage - 1) / (totalPages - 1) : 0,
      }),
      getProgress: (): ReaderProgress => ({
        current: currentPage,
        total: totalPages,
        fraction: totalPages > 0 ? (currentPage - 1) / (totalPages - 1) : 0,
        location: String(currentPage),
      }),
      getTOC: () => [],
      getTotalPages: () => totalPages,
      search: async () => [],
      clearSearch: () => {},
      addHighlight: () => {},
      removeHighlight: () => {},
      applyTheme: () => {},
      setFontSize: () => {},
      setFontFamily: () => {},
      setLineHeight: () => {},
    }));

    if (!source) {
      return (
        <View style={[styles.container, { backgroundColor: readerTheme.backgroundColor }]}>
          <Text style={{ color: readerTheme.textColor }}>Loading PDF...</Text>
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: readerTheme.backgroundColor }]}>
        <Pdf
          ref={pdfRef}
          source={source}
          page={currentPage}
          onLoadComplete={(numberOfPages) => {
            setTotalPages(numberOfPages);
            updateProgress(currentPage, numberOfPages);
          }}
          onPageChanged={(page, numberOfPages) => {
            setCurrentPage(page);
            updateProgress(page, numberOfPages);
          }}
          onError={(error) => console.error('PDF error:', error)}
          enablePaging
          horizontal
          style={styles.pdf}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
