import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonHeader,
  IonTitle,
  IonToast,
  IonSpinner,
} from '@ionic/react';
import { arrowBack, documentTextOutline } from 'ionicons/icons';
import { PdfReader } from '../components/readers/PdfReader';
import { useAppStore } from '../stores/useAppStore';

/**
 * PdfReaderPage - Demo page showing PDF reader usage
 *
 * This page demonstrates how to use the PdfReader component
 * with file loading and state management integration.
 */
const PdfReaderPage: React.FC = () => {
  const { currentBook, setCurrentBook, updateProgress } = useAppStore();

  const [pdfData, setPdfData] = useState<ArrayBuffer | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load PDF data when a book is set
  useEffect(() => {
    if (currentBook && currentBook.format === 'pdf') {
      loadPdfFile(currentBook.filePath);
    }
  }, [currentBook]);

  const loadPdfFile = async (filePath: string) => {
    setLoading(true);
    setError(null);

    try {
      if (filePath.startsWith('http')) {
        // Load from URL
        const response = await fetch(filePath);
        const arrayBuffer = await response.arrayBuffer();
        setPdfData(arrayBuffer);
      } else if (filePath.startsWith('data:')) {
        // Base64 data URL
        setPdfData(filePath);
      } else {
        // For local files - would use Capacitor Filesystem plugin
        // This is a placeholder implementation
        const response = await fetch(filePath);
        const arrayBuffer = await response.arrayBuffer();
        setPdfData(arrayBuffer);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to load PDF file');
      setLoading(false);
    }
  };

  const handlePageChange = (pageNumber: number, totalPages: number) => {
    if (currentBook) {
      updateProgress(currentBook.id, pageNumber, totalPages, pageNumber.toString());
    }
  };

  const handleBookmarkToggle = async (pageNumber: number) => {
    if (currentBook) {
      const { addBookmark, hasBookmark } = useAppStore.getState();

      if (hasBookmark(currentBook.id, pageNumber)) {
        // Would need bookmark ID to remove - for now just add
        // removeBookmark would require the bookmark ID
      } else {
        await addBookmark(currentBook.id, pageNumber.toString(), pageNumber);
      }
    }
  };

  const handleClose = () => {
    setPdfData(null);
    setCurrentBook(null);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>PDF Reader</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '100px' }}>
            <IonSpinner name="crescent" />
            <p>Loading PDF...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!pdfData || !currentBook) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>PDF Reader</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            marginTop: '60px',
            textAlign: 'center',
          }}>
            <IonIcon
              icon={documentTextOutline}
              style={{ fontSize: '80px', color: 'var(--ion-color-medium)' }}
            />
            <h2>No PDF Loaded</h2>
            <p style={{ color: 'var(--ion-color-medium)' }}>
              Select a PDF from your library to start reading
            </p>

            <div style={{ marginTop: '40px', maxWidth: '400px', textAlign: 'left' }}>
              <h3>Features</h3>
              <ul style={{ lineHeight: '1.8' }}>
                <li><strong>Page Navigation:</strong> Next/Previous, jump to page</li>
                <li><strong>Zoom Controls:</strong> Fit width, fit page, custom zoom</li>
                <li><strong>Text Search:</strong> Search across entire document</li>
                <li><strong>Rotation:</strong> Rotate pages for better viewing</li>
                <li><strong>Theme Support:</strong> Invert colors for dark mode</li>
                <li><strong>Progress Tracking:</strong> Saves reading position</li>
                <li><strong>Bookmarks:</strong> Bookmark any page</li>
              </ul>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <>
      <PdfReader
        book={currentBook}
        pdfData={pdfData}
        onPageChange={handlePageChange}
        onBookmarkToggle={handleBookmarkToggle}
        onClose={handleClose}
      />

      <IonToast
        isOpen={!!error}
        message={error || ''}
        duration={5000}
        color="danger"
        onDidDismiss={() => setError(null)}
      />
    </>
  );
};

export default PdfReaderPage;
