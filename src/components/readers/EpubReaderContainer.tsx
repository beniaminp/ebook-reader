/**
 * EPUB Reader Container Component
 *
 * Complete example showing how to use the EPUB reader with controls
 * Integrates the reader, controls, progress tracking, and theming
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonIcon,
  IonToast,
  IonModal,
  IonSearchbar,
  IonSpinner,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { arrowBack, bookmarkOutline, bookmark, searchOutline, chevronBack, chevronForward } from 'ionicons/icons';

import { EpubReader } from './EpubReader';
import { EpubControls } from './EpubControls';
import type {
  EpubChapter,
  EpubTheme,
  EpubCfi,
  EpubMetadata,
  BookDataForReader,
  Book,
  EpubReaderRef,
  EpubSearchResult,
} from '../../types';
import { EPUB_THEMES } from '../../types';

interface EpubReaderContainerProps {
  book: Book;
  fileUri?: string;
  arrayBuffer?: ArrayBuffer;
  onBack?: () => void;
  onBookmark?: (bookId: string, location: string, textPreview?: string) => void;
  onProgressChange?: (cfi: EpubCfi, percentage: number) => void;
  initialLocation?: EpubCfi;
}

export const EpubReaderContainer: React.FC<EpubReaderContainerProps> = ({
  book,
  fileUri,
  arrayBuffer,
  onBack,
  onBookmark,
  onProgressChange,
  initialLocation,
}) => {
  const readerRef = useRef<EpubReaderRef>(null);

  const [currentLocation, setCurrentLocation] = useState<EpubCfi>(initialLocation || '');
  const [percentage, setPercentage] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [metadata, setMetadata] = useState<EpubMetadata | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  const [toolbarVisible, setToolbarVisible] = useState<boolean>(true);

  const [fontSize, setFontSize] = useState<number>(16);
  const [fontFamily, setFontFamily] = useState<string>('serif');
  const [lineHeight, setLineHeight] = useState<number>(1.6);
  const [currentTheme, setCurrentTheme] = useState<EpubTheme>(EPUB_THEMES.light);

  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Search state
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<EpubSearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);
  const [searching, setSearching] = useState<boolean>(false);

  const bookData: BookDataForReader = useMemo(() => ({
    book,
    fileUri,
    arrayBuffer,
    initialLocation,
  }), [book.id, fileUri, arrayBuffer, initialLocation]);

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
  }, []);

  const handleProgressChange = useCallback((cfi: EpubCfi, pct: number) => {
    setCurrentLocation(cfi);
    setPercentage(pct);

    // Estimate current page
    if (totalPages > 0) {
      setCurrentPage(Math.round(totalPages * pct));
    }

    // Propagate to parent for persistence
    onProgressChange?.(cfi, pct);
  }, [totalPages, onProgressChange]);

  const handleNext = useCallback(() => {
    readerRef.current?.next();
  }, []);

  const handlePrev = useCallback(() => {
    readerRef.current?.prev();
  }, []);

  const handleToggleToolbar = useCallback(() => {
    setToolbarVisible((v) => !v);
  }, []);

  const handleChapterChange = useCallback((chapter: EpubChapter, index: number) => {
    setCurrentChapterIndex(index);
  }, []);

  const handleLoadComplete = useCallback((meta: EpubMetadata) => {
    setMetadata(meta);
    showToastMessage(`Loaded: ${meta.title}`);
  }, [showToastMessage]);

  const handleError = useCallback((error: string) => {
    showToastMessage(`Error: ${error}`);
  }, [showToastMessage]);

  const handleToggleBookmark = useCallback(() => {
    if (isBookmarked) {
      // Remove bookmark logic would go here
      showToastMessage('Bookmark removed');
    } else {
      onBookmark?.(book.id, currentLocation);
      showToastMessage('Bookmark added');
    }
    setIsBookmarked((prev) => !prev);
  }, [book.id, currentLocation, isBookmarked, onBookmark, showToastMessage]);

  const handleSetFontSize = useCallback((size: number) => {
    setFontSize(size);
    readerRef.current?.setFontSize(size);
  }, []);

  const handleSetFontFamily = useCallback((family: string) => {
    setFontFamily(family);
    readerRef.current?.setFontFamily(family);
  }, []);

  const handleSetLineHeight = useCallback((height: number) => {
    setLineHeight(height);
    readerRef.current?.setLineHeight(height);
  }, []);

  const handleSetTheme = useCallback((theme: EpubTheme) => {
    setCurrentTheme(theme);
    readerRef.current?.setTheme(theme);
    showToastMessage(`Theme: ${theme.name}`);
  }, [showToastMessage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        readerRef.current?.prev();
      } else if (e.key === 'ArrowRight') {
        readerRef.current?.next();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get chapters from reader ref once loaded
  useEffect(() => {
    if (readerRef.current) {
      const readerChapters = readerRef.current.getChapters();
      if (readerChapters.length > 0) {
        setChapters(readerChapters);
      }
    }
  }, [metadata]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !readerRef.current) return;
    setSearching(true);
    try {
      const results = await readerRef.current.search(searchQuery);
      setSearchResults(results);
      setCurrentSearchIndex(0);
      if (results.length > 0) {
        readerRef.current.goToCfi(results[0].cfi);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const goToNextSearchResult = useCallback(() => {
    if (searchResults.length === 0 || !readerRef.current) return;
    const next = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(next);
    readerRef.current.goToCfi(searchResults[next].cfi);
  }, [searchResults, currentSearchIndex]);

  const goToPrevSearchResult = useCallback(() => {
    if (searchResults.length === 0 || !readerRef.current) return;
    const prev = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prev);
    readerRef.current.goToCfi(searchResults[prev].cfi);
  }, [searchResults, currentSearchIndex]);

  return (
    <IonPage className={`epub-reader-page${toolbarVisible ? '' : ' epub-reader-fullscreen'}`}>
      {toolbarVisible && (
        <IonHeader>
          <IonToolbar color="light">
            <IonButtons slot="start">
              <IonButton onClick={onBack}>
                <IonIcon icon={arrowBack} />
              </IonButton>
            </IonButtons>
            <IonTitle>{metadata?.title || book.title}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setSearchOpen(true)}>
                <IonIcon icon={searchOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
      )}

      <IonContent className="epub-reader-content" scrollY={false}>
        <div className="epub-reader-wrapper">
          <EpubReader
            ref={readerRef}
            bookData={bookData}
            initialLocation={initialLocation}
            onProgressChange={handleProgressChange}
            onChapterChange={handleChapterChange}
            onLoadComplete={handleLoadComplete}
            onError={handleError}
            onTapLeft={handlePrev}
            onTapCenter={handleToggleToolbar}
            onTapRight={handleNext}
          />
        </div>
      </IonContent>

      {toolbarVisible && (
        <EpubControls
          currentPage={currentPage}
          totalPages={totalPages}
          currentChapterIndex={currentChapterIndex}
          chapters={chapters}
          currentTheme={currentTheme}
          fontSize={fontSize}
          fontFamily={fontFamily}
          lineHeight={lineHeight}
          onNext={handleNext}
          onPrev={handlePrev}
          onGoToChapter={(index) => readerRef.current?.goToChapter(index)}
          onSetFontSize={handleSetFontSize}
          onSetFontFamily={handleSetFontFamily}
          onSetLineHeight={handleSetLineHeight}
          onSetTheme={handleSetTheme}
          onToggleBookmark={handleToggleBookmark}
          isBookmarked={isBookmarked}
          bookTitle={metadata?.title || book.title}
        />
      )}

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        position="middle"
      />

      {/* Search modal */}
      <IonModal isOpen={searchOpen} onDidDismiss={() => setSearchOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Search in Book</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setSearchOpen(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ padding: '16px' }}>
            <IonSearchbar
              value={searchQuery}
              onIonInput={(e) => setSearchQuery(e.detail.value || '')}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Search in book..."
              showCancelButton="focus"
            />
            <IonButton expand="block" onClick={handleSearch} style={{ marginTop: '8px' }}>
              Search
            </IonButton>

            {searching && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <IonSpinner />
                <p>Searching...</p>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    marginTop: '16px',
                    borderBottom: '1px solid var(--ion-color-light-shade)',
                  }}
                >
                  <span>
                    {currentSearchIndex + 1} of {searchResults.length} results
                  </span>
                  <div>
                    <IonButton size="small" fill="clear" onClick={goToPrevSearchResult}>
                      <IonIcon icon={chevronBack} />
                    </IonButton>
                    <IonButton size="small" fill="clear" onClick={goToNextSearchResult}>
                      <IonIcon icon={chevronForward} />
                    </IonButton>
                  </div>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {searchResults.map((result, idx) => (
                    <IonItem
                      key={idx}
                      button
                      onClick={() => {
                        setCurrentSearchIndex(idx);
                        readerRef.current?.goToCfi(result.cfi);
                        setSearchOpen(false);
                      }}
                      style={{
                        background:
                          idx === currentSearchIndex
                            ? 'var(--ion-color-light-tint)'
                            : undefined,
                      }}
                    >
                      <IonLabel>
                        <h3 style={{ fontSize: '13px', fontWeight: 600 }}>{result.chapterLabel}</h3>
                        <p style={{ fontSize: '12px' }}>{result.excerpt}</p>
                      </IonLabel>
                    </IonItem>
                  ))}
                </div>
              </>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)', marginTop: '20px' }}>
                No results found for "{searchQuery}"
              </p>
            )}
          </div>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default EpubReaderContainer;
