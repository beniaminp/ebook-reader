import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonSpinner,
  IonButton,
  IonIcon,
  IonToast,
  IonProgressBar,
  IonText,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonTextarea,
} from '@ionic/react';
import { arrowBack, closeOutline } from 'ionicons/icons';

import { useAppStore } from '../../stores/useAppStore';
import { useReadingGoalsStore } from '../../stores/useReadingGoalsStore';
import { databaseService } from '../../services/database';
import { calibreWebService } from '../../services/calibreWebService';
import { useCalibreWebStore } from '../../stores/calibreWebStore';
import { webFileStorage } from '../../services/webFileStorage';
import { chmService } from '../../services/chmService';
import { docxService } from '../../services/docxService';
import { odtService } from '../../services/odtService';
import { UnifiedReaderContainer } from '../../components/readers/UnifiedReaderContainer';
import StarRating from '../../components/common/StarRating';
import type { Book } from '../../types/index';
import type { ReadingProgress } from '../../types/database';
import type { ReaderFormat } from '../../types/reader';

type LoadState = 'loading' | 'downloading' | 'loaded' | 'error' | 'format-unsupported';

/** Detect the effective format from the file extension or book.format field */
function detectFormat(filePath: string, bookFormat?: string): string {
  if (!filePath) {
    console.warn('detectFormat called with undefined filePath, falling back to bookFormat');
    return bookFormat || 'txt';
  }
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (ext === 'epub') return 'epub';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'txt') return 'txt';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'md' || ext === 'markdown') return 'md';
  if (ext === 'mobi') return 'mobi';
  if (ext === 'azw' || ext === 'azw3') return 'azw3';
  if (ext === 'fb2') return 'fb2';
  if (ext === 'cbz') return 'cbz';
  if (ext === 'cbr') return 'cbr';
  if (ext === 'chm') return 'chm';
  if (ext === 'docx') return 'docx';
  if (ext === 'odt') return 'odt';
  // Fallback to bookFormat, with a final fallback to 'txt'
  return bookFormat || 'txt';
}

const SUPPORTED_FORMATS = [
  'epub',
  'pdf',
  'txt',
  'html',
  'htm',
  'md',
  'markdown',
  'mobi',
  'azw3',
  'fb2',
  'cbz',
  'cbr',
  'docx',
  'odt',
];
const UNSUPPORTED_FORMATS = ['chm'];

/** Formats that should be loaded as text rather than ArrayBuffer. */
const TEXT_FORMATS = new Set(['txt', 'html', 'htm', 'md', 'markdown']);

/** Convert DOCX or ODT binary data to HTML string. */
async function convertDocumentToHtml(buffer: ArrayBuffer, format: string): Promise<string> {
  if (format === 'docx') {
    return await docxService.convertDocxToHtml(buffer);
  }
  if (format === 'odt') {
    return await odtService.convertOdtToHtml(buffer);
  }
  throw new Error(`Unsupported conversion format: ${format}`);
}

const Reader: React.FC = () => {
  const params = useParams<{ bookId?: string }>();
  const history = useHistory();

  // IonRouterOutlet can keep this component mounted when the route doesn't
  // match, causing useParams to return undefined. Fall back to extracting the
  // bookId from the URL path.
  const bookId = params.bookId || (() => {
    const match = window.location.pathname.match(/\/reader\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  })();

  const { setCurrentBook, updateProgress } = useAppStore();

  const [book, setBook] = useState<Book | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Reading session tracking — reset on bookId change
  const sessionStartRef = React.useRef<number>(Date.now());
  const sessionPagesRef = React.useRef<number>(0);
  const bookIdRef = React.useRef<string | undefined>(bookId);
  const sessionRecordedRef = React.useRef<boolean>(false);
  useEffect(() => {
    sessionStartRef.current = Date.now();
    sessionPagesRef.current = 0;
    bookIdRef.current = bookId;
    sessionRecordedRef.current = false;
  }, [bookId]);

  // Record reading time on unmount (ensures streak tracking even if back button not used)
  useEffect(() => {
    return () => {
      if (bookIdRef.current && !sessionRecordedRef.current) {
        const timeSpent = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        if (timeSpent > 5) {
          const minutesRead = timeSpent / 60;
          if (minutesRead > 0) {
            useReadingGoalsStore.getState().addReadingTime(minutesRead);
          }
          // Fire-and-forget: record the DB session too
          databaseService
            .recordReadingSession(bookIdRef.current, sessionPagesRef.current, timeSpent)
            .catch(() => {});
        }
      }
    };
  }, []);

  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [effectiveFormat, setEffectiveFormat] = useState<string>('');
  const [initialLocation, setInitialLocation] = useState<string | undefined>(undefined);

  const [toastMessage, setToastMessage] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');

  // Post-finish review prompt
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const reviewPromptShownRef = useRef(false);
  const prevProgressRef = useRef(0);

  const { setDownloadProgress: storeSetDownloadProgress, removeDownloadProgress } =
    useCalibreWebStore();

  // Load book from store or database
  useEffect(() => {
    if (!bookId || typeof bookId !== 'string' || bookId === 'undefined' || bookId.length < 2) {
      setErrorMessage(`Book not found (id: ${bookId})`);
      setLoadState('error');
      return;
    }
    const loadBook = async () => {
      setLoadState('loading');

      // Read books directly from store state to avoid a stale closure.
      // setCurrentBook and updateProgress are Zustand actions and are stable
      // across renders, so they do not need to be in the dependency array.
      const books = useAppStore.getState().books;

      // Try from store first
      let foundBook = books.find((b) => b.id === bookId) || null;

      if (!foundBook) {
        try {
          foundBook = await databaseService.getBookById(bookId);
        } catch (err) {
          console.warn('Failed to load book from database:', err);
        }
      }

      if (!foundBook) {
        setErrorMessage(`Book not found (id: ${bookId})`);
        setLoadState('error');
        return;
      }

      // Validate filePath early to prevent crashes
      if (!foundBook.filePath) {
        setErrorMessage(
          `Book has missing file path. The book data may be corrupted. Please re-import the book.`
        );
        setLoadState('error');
        return;
      }

      // Validate format field - try to detect from filePath if missing
      if (!foundBook.format) {
        const detectedFormat = detectFormat(foundBook.filePath, undefined);
        console.warn(
          `Book ${foundBook.id} has missing format, detected: ${detectedFormat} from filePath`
        );
        // Update the book with the detected format
        foundBook = { ...foundBook, format: detectedFormat as Book['format'] };
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
            const cwBook = await calibreWebService.fetchBook(calibreBookId);
            if (!cwBook) {
              throw new Error('Could not fetch book metadata from server');
            }
            const formats = calibreWebService.getAvailableFormats(cwBook);
            const preferredFormat =
              formats.find((f) => f === 'EPUB') || formats.find((f) => f === 'PDF') || formats[0];
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
            await databaseService.updateBook(foundBook.id, {
              downloaded: true,
              filePath: localPath,
            });
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

      // Check for unsupported formats (CHM)
      if (UNSUPPORTED_FORMATS.includes(fmt)) {
        if (fmt === 'chm') {
          setErrorMessage(chmService.getUnsupportedReason());
        } else {
          setErrorMessage(`Format "${fmt}" is not currently supported.`);
        }
        setLoadState('format-unsupported');
        return;
      }

      if (!SUPPORTED_FORMATS.includes(fmt)) {
        setErrorMessage(`Format "${fmt}" is not currently supported.`);
        setLoadState('format-unsupported');
        return;
      }

      const isText = TEXT_FORMATS.has(fmt);
      const needsConversion = fmt === 'docx' || fmt === 'odt';

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
          if (needsConversion) {
            const html = await convertDocumentToHtml(buffer, fmt);
            setTextContent(html);
            setEffectiveFormat('html');
          } else if (isText) {
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

          if (needsConversion) {
            const buf = await response.arrayBuffer();
            const html = await convertDocumentToHtml(buf, fmt);
            setTextContent(html);
            setEffectiveFormat('html');
          } else if (isText) {
            setTextContent(await response.text());
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
    if (sessionRecordedRef.current) return;
    sessionRecordedRef.current = true;
    const timeSpent = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    if (timeSpent > 5) {
      try {
        await databaseService.recordReadingSession(bookId, sessionPagesRef.current, timeSpent);
        // Also record individual session for timeline
        await databaseService.recordIndividualSession(
          bookId,
          sessionStartRef.current,
          Date.now(),
          sessionPagesRef.current,
          prevProgressRef.current,
          prevProgressRef.current
        );
      } catch {
        // Non-critical; ignore errors
      }
      // Track reading time for daily goals / streaks
      const minutesRead = timeSpent / 60;
      if (minutesRead > 0) {
        useReadingGoalsStore.getState().addReadingTime(minutesRead);
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

  const handleProgressChange = useCallback(
    (locationString: string, percentage: number) => {
      if (!book) return;
      updateProgress(book.id, Math.round(percentage), 100, locationString);
      sessionPagesRef.current += 1;

      // Detect book completion: transition from <95% to >=95%
      const normalizedPct = percentage / 100;
      if (
        normalizedPct >= 0.95 &&
        prevProgressRef.current < 0.95 &&
        !reviewPromptShownRef.current &&
        !(book.metadata?.rating)
      ) {
        reviewPromptShownRef.current = true;
        // Delay slightly so UI doesn't interrupt mid-turn
        setTimeout(() => setShowReviewModal(true), 1500);
      }
      prevProgressRef.current = normalizedPct;
    },
    [book, updateProgress]
  );

  const handleBookmark = useCallback(
    async (bookIdParam: string, location: string, textPreview?: string) => {
      try {
        await useAppStore
          .getState()
          .addBookmark(bookIdParam, location, undefined, undefined, textPreview);
        setToastMessage('Bookmark added');
      } catch {
        setToastMessage('Failed to add bookmark');
      }
    },
    []
  );

  const handleSubmitReview = useCallback(async () => {
    if (!book) return;
    try {
      if (reviewRating > 0) {
        await databaseService.updateBookMetadata(book.id, { rating: reviewRating });
      }
      if (reviewText.trim()) {
        await databaseService.updateBook(book.id, { review: reviewText.trim() } as any);
      }
      if (reviewRating > 0 || reviewText.trim()) {
        setToastMessage('Review saved!');
      }
    } catch {
      setToastMessage('Failed to save review');
    }
    setShowReviewModal(false);
  }, [book, reviewRating, reviewText]);

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
            <IonIcon
              icon={arrowBack}
              style={{ fontSize: '48px', color: 'var(--ion-color-danger)' }}
            />
            <p style={{ color: 'var(--ion-color-danger)', maxWidth: '300px' }}>{errorMessage}</p>
            <IonButton onClick={handleBack} fill="outline">
              Back to Library
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Loaded — render unified reader
  if (!book) return null;

  return (
    <>
      <UnifiedReaderContainer
        book={book}
        format={effectiveFormat as ReaderFormat}
        fileData={fileData || undefined}
        textContent={textContent || undefined}
        initialLocation={initialLocation}
        onBack={handleBack}
        onBookmark={handleBookmark}
        onProgressChange={handleProgressChange}
      />

      <IonToast
        isOpen={!!toastMessage}
        message={toastMessage}
        duration={2000}
        position="bottom"
        onDidDismiss={() => setToastMessage('')}
      />

      {/* Post-finish review prompt */}
      <IonModal
        isOpen={showReviewModal}
        onDidDismiss={() => setShowReviewModal(false)}
        breakpoints={[0, 0.55]}
        initialBreakpoint={0.55}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Rate This Book</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowReviewModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '16px' }}>
              You finished "{book.title}"!
            </p>
            <p style={{ margin: 0, color: 'var(--ion-color-medium)', fontSize: '14px' }}>
              How would you rate it?
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <StarRating rating={reviewRating} size="medium" onRate={(r) => setReviewRating(r)} />
          </div>
          <IonTextarea
            placeholder="Write a review (optional)..."
            value={reviewText}
            onIonInput={(e) => setReviewText(e.detail.value || '')}
            rows={4}
            style={{
              '--background': 'var(--ion-color-light)',
              '--padding-start': '12px',
              '--padding-end': '12px',
              borderRadius: '8px',
            }}
          />
          <IonButton
            expand="block"
            style={{ marginTop: '16px' }}
            onClick={handleSubmitReview}
          >
            {reviewRating > 0 || reviewText.trim() ? 'Save Review' : 'Skip'}
          </IonButton>
        </IonContent>
      </IonModal>
    </>
  );
};

export default Reader;
