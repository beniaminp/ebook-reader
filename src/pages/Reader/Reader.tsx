import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonSpinner,
  IonButton,
  IonModal,
  IonIcon,
  IonToast,
  IonProgressBar,
  IonText,
} from '@ionic/react';
import { arrowBack } from 'ionicons/icons';

import { useAppStore } from '../../stores/useAppStore';
import { databaseService } from '../../services/database';
import { calibreWebService } from '../../services/calibreWebService';
import { useCalibreWebStore } from '../../stores/calibreWebStore';
import { webFileStorage } from '../../services/webFileStorage';
import { EpubReaderContainer } from '../../components/readers/EpubReaderContainer';
import { PdfReader } from '../../components/readers/PdfReader';
import { TextReader } from '../../components/readers/TextReader';
import { HtmlReader } from '../../components/readers/HtmlReader';
import { MarkdownReader } from '../../components/readers/MarkdownReader';
import { ReadingSettingsPanel } from '../../components/reader-ui/ReadingSettingsPanel';
import type { Book } from '../../types/index';
import type { ReadingProgress } from '../../types/database';

type LoadState = 'loading' | 'downloading' | 'loaded' | 'error' | 'format-unsupported';

/** Detect the effective format from the file extension or book.format field */
function detectFormat(filePath: string, bookFormat: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (ext === 'txt') return 'txt';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'md' || ext === 'markdown') return 'md';
  return bookFormat;
}

const SUPPORTED_FORMATS = ['epub', 'pdf', 'txt', 'html', 'htm', 'md', 'markdown'];

const Reader: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const history = useHistory();

  const { books, setCurrentBook, updateProgress } = useAppStore();

  const [book, setBook] = useState<Book | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Reading session tracking
  const sessionStartRef = React.useRef<number>(Date.now());
  const sessionPagesRef = React.useRef<number>(0);

  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [effectiveFormat, setEffectiveFormat] = useState<string>('');
  const [initialLocation, setInitialLocation] = useState<string | undefined>(undefined);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');

  const { setDownloadProgress: storeSetDownloadProgress, removeDownloadProgress } = useCalibreWebStore();

  // Load book from store or database
  useEffect(() => {
    const loadBook = async () => {
      setLoadState('loading');

      // Try from store first
      let foundBook = books.find((b) => b.id === bookId) || null;

      if (!foundBook) {
        try {
          foundBook = await databaseService.getBookById(bookId);
        } catch {
          // ignore
        }
      }

      if (!foundBook) {
        setErrorMessage(`Book not found (id: ${bookId})`);
        setLoadState('error');
        return;
      }

      setBook(foundBook);
      setCurrentBook(foundBook);

      // Load saved reading progress
      try {
        const progress: ReadingProgress | null = await databaseService.getReadingProgress(bookId);
        if (progress?.location) {
          setInitialLocation(progress.location);
        }
      } catch {
        // no prior progress is fine
      }

      // For Calibre-Web books not yet downloaded, trigger lazy download
      let resolvedFilePath = foundBook.filePath;
      if (foundBook.source === 'calibre-web' && !foundBook.downloaded) {
        const calibreBookId = foundBook.sourceId ? parseInt(foundBook.sourceId, 10) : null;
        if (calibreBookId && !isNaN(calibreBookId)) {
          setLoadState('downloading');
          setDownloadStatus('Preparing download...');
          setDownloadProgress(0);
          try {
            await calibreWebService.initialize();
            // Fetch the CalibreWeb book to get format info
            const cwBook = await calibreWebService.fetchBook(calibreBookId);
            if (!cwBook) {
              throw new Error('Could not fetch book metadata from server');
            }
            const formats = calibreWebService.getAvailableFormats(cwBook);
            const preferredFormat = formats.find(f => f === 'EPUB') || formats.find(f => f === 'PDF') || formats[0];
            if (!preferredFormat) {
              throw new Error('No downloadable format available');
            }
            setDownloadStatus(`Downloading ${preferredFormat}...`);
            const localPath = await calibreWebService.downloadBook(
              cwBook,
              preferredFormat,
              (progress) => {
                setDownloadProgress(progress.progress / 100);
                storeSetDownloadProgress(calibreBookId, progress);
                if (progress.status === 'failed') {
                  throw new Error(progress.error || 'Download failed');
                }
              }
            );
            if (!localPath) {
              throw new Error('Download failed — no file path returned');
            }
            // Update the book record to mark as downloaded
            await databaseService.updateBook(foundBook.id, { downloaded: true, filePath: localPath });
            resolvedFilePath = localPath;
            foundBook = { ...foundBook, downloaded: true, filePath: localPath };
            removeDownloadProgress(calibreBookId);
            setDownloadStatus('');
          } catch (dlErr) {
            setErrorMessage(dlErr instanceof Error ? dlErr.message : 'Download failed');
            setLoadState('error');
            return;
          }
        }
      }

      // Load the actual file data
      if (!resolvedFilePath) {
        setErrorMessage('Book file path is missing.');
        setLoadState('error');
        return;
      }

      const fmt = detectFormat(resolvedFilePath, foundBook.format);
      setEffectiveFormat(fmt);

      if (!SUPPORTED_FORMATS.includes(fmt)) {
        setErrorMessage(`Format "${fmt}" is not currently supported.`);
        setLoadState('format-unsupported');
        return;
      }

      try {
        let buffer: ArrayBuffer | null = null;

        // Load from IndexedDB if the file was stored there (web file imports)
        if (resolvedFilePath.startsWith('indexeddb://')) {
          buffer = await webFileStorage.getFile(foundBook.id);
          if (!buffer) {
            throw new Error('Book file not found in local storage. Please re-import the book.');
          }
        }

        if (buffer) {
          // We already have the ArrayBuffer from IndexedDB
          if (fmt === 'txt' || fmt === 'html' || fmt === 'htm' || fmt === 'md' || fmt === 'markdown') {
            const decoder = new TextDecoder();
            setTextContent(decoder.decode(buffer));
          } else {
            setFileData(buffer);
          }
        } else {
          // Fetch from URL (native file path or blob URL)
          const response = await fetch(resolvedFilePath);
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
          }

          if (fmt === 'txt' || fmt === 'html' || fmt === 'htm' || fmt === 'md' || fmt === 'markdown') {
            const text = await response.text();
            setTextContent(text);
          } else {
            setFileData(await response.arrayBuffer());
          }
        }

        setLoadState('loaded');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load book file.');
        setLoadState('error');
      }
    };

    loadBook();
  }, [bookId]);

  const recordSession = useCallback(async (bookId: string) => {
    const timeSpent = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    if (timeSpent > 5) {
      try {
        await databaseService.recordReadingSession(bookId, sessionPagesRef.current, timeSpent);
      } catch {
        // Non-critical; ignore errors
      }
    }
  }, []);

  const handleBack = useCallback(async () => {
    if (book) {
      await recordSession(book.id);
    }
    setCurrentBook(null);
    history.push('/library');
  }, [book, history, setCurrentBook, recordSession]);

  const handleEpubProgress = useCallback(
    (cfi: string, percentage: number) => {
      if (!book) return;
      updateProgress(book.id, Math.round(percentage), 100, cfi);
      sessionPagesRef.current += 1;
    },
    [book, updateProgress]
  );

  const handlePdfPageChange = useCallback(
    (pageNumber: number, totalPages: number) => {
      if (!book) return;
      updateProgress(book.id, pageNumber, totalPages, String(pageNumber));
      sessionPagesRef.current += 1;
    },
    [book, updateProgress]
  );

  const handleTextProgress = useCallback(
    (progress: number) => {
      if (!book) return;
      updateProgress(book.id, progress, 100, String(progress));
    },
    [book, updateProgress]
  );

  const handlePdfBookmarkToggle = useCallback(
    async (pageNumber: number) => {
      if (!book) return;
      try {
        await useAppStore.getState().addBookmark(
          book.id,
          String(pageNumber),
          pageNumber,
          undefined,
          `Page ${pageNumber}`
        );
        setToastMessage(`Bookmark ${useAppStore.getState().hasBookmark(book.id, pageNumber) ? 'added' : 'removed'}`);
      } catch {
        setToastMessage('Failed to toggle bookmark');
      }
    },
    [book]
  );

  const handleEpubBookmark = useCallback(
    async (bookIdParam: string, location: string, textPreview?: string) => {
      try {
        await useAppStore.getState().addBookmark(bookIdParam, location, undefined, undefined, textPreview);
        setToastMessage('Bookmark added');
      } catch {
        setToastMessage('Failed to add bookmark');
      }
    },
    []
  );

  // Loading state
  if (loadState === 'loading') {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '16px',
            }}
          >
            <IonSpinner name="crescent" />
            <p>Loading book...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Downloading state (Calibre-Web lazy download)
  if (loadState === 'downloading') {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '16px',
              padding: '0 32px',
            }}
          >
            <IonSpinner name="crescent" />
            <IonText>
              <p style={{ textAlign: 'center' }}>{downloadStatus || 'Downloading book...'}</p>
            </IonText>
            <IonProgressBar value={downloadProgress} style={{ width: '100%' }} />
            <IonText color="medium">
              <p style={{ fontSize: '13px' }}>{Math.round(downloadProgress * 100)}%</p>
            </IonText>
            <IonButton fill="outline" color="medium" onClick={handleBack}>
              Cancel
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Error / unsupported format states
  if (loadState === 'error' || loadState === 'format-unsupported') {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '16px',
              textAlign: 'center',
            }}
          >
            <IonIcon icon={arrowBack} style={{ fontSize: '48px', color: 'var(--ion-color-danger)' }} />
            <p style={{ color: 'var(--ion-color-danger)', maxWidth: '300px' }}>{errorMessage}</p>
            <IonButton onClick={handleBack} fill="outline">
              Back to Library
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Loaded - render appropriate reader
  if (!book) return null;

  const bookInfo = { id: book.id, title: book.title, author: book.author };

  return (
    <>
      {effectiveFormat === 'epub' && fileData && (
        <EpubReaderContainer
          book={book}
          arrayBuffer={fileData}
          initialLocation={initialLocation}
          onBack={handleBack}
          onBookmark={handleEpubBookmark}
          onProgressChange={handleEpubProgress}
        />
      )}

      {effectiveFormat === 'pdf' && fileData && (
        <PdfReader
          book={{
            id: book.id,
            title: book.title,
            author: book.author,
            currentPage: initialLocation ? parseInt(initialLocation, 10) || 1 : 1,
          }}
          pdfData={fileData}
          onPageChange={handlePdfPageChange}
          onBookmarkToggle={handlePdfBookmarkToggle}
          onClose={handleBack}
        />
      )}

      {effectiveFormat === 'txt' && (
        <TextReader
          book={bookInfo}
          textContent={textContent}
          onClose={handleBack}
          onProgressChange={handleTextProgress}
        />
      )}

      {(effectiveFormat === 'html' || effectiveFormat === 'htm') && (
        <HtmlReader
          book={bookInfo}
          htmlContent={textContent}
          onClose={handleBack}
          onProgressChange={handleTextProgress}
        />
      )}

      {(effectiveFormat === 'md' || effectiveFormat === 'markdown') && (
        <MarkdownReader
          book={bookInfo}
          markdownContent={textContent}
          onClose={handleBack}
          onProgressChange={handleTextProgress}
        />
      )}

      {/* Reading settings modal (triggered from toolbar in sub-components) */}
      <IonModal
        isOpen={settingsOpen}
        onDidDismiss={() => setSettingsOpen(false)}
        breakpoints={[0, 0.5, 0.85]}
        initialBreakpoint={0.5}
      >
        <ReadingSettingsPanel onDismiss={() => setSettingsOpen(false)} />
      </IonModal>

      <IonToast
        isOpen={!!toastMessage}
        message={toastMessage}
        duration={2000}
        position="bottom"
        onDidDismiss={() => setToastMessage('')}
      />
    </>
  );
};

export default Reader;
