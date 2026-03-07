import React, { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSpinner,
} from '@ionic/react';
import { closeOutline, bookOutline } from 'ionicons/icons';
import StarRating from '../common/StarRating';
import { databaseService } from '../../services/database';
import { metadataLookupService } from '../../services/metadataLookupService';
import type { Book } from '../../types/index';

export interface BookDetailsModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenBook: (book: Book) => void;
  onRateBook: (bookId: string, rating: number) => void;
  onSeriesSaved: () => void;
  onToast: (message: string, color: string) => void;
}

const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  book,
  isOpen,
  onClose,
  onOpenBook,
  onRateBook,
  onSeriesSaved,
  onToast,
}) => {
  // Series editing state
  const [detailSeriesName, setDetailSeriesName] = useState('');
  const [detailSeriesIndex, setDetailSeriesIndex] = useState('');
  const [seriesSaving, setSeriesSaving] = useState(false);

  // Similar books state
  const [similarBooks, setSimilarBooks] = useState<Array<{ title: string; author: string; coverUrl?: string }>>([]);
  const [isFindingSimilar, setIsFindingSimilar] = useState(false);

  // Sync series fields when book changes
  React.useEffect(() => {
    if (book && isOpen) {
      setDetailSeriesName(book.series || book.metadata?.series || '');
      setDetailSeriesIndex(
        String(book.seriesIndex ?? book.metadata?.seriesIndex ?? '')
      );
      setSimilarBooks([]);
      setIsFindingSimilar(false);
    }
  }, [book, isOpen]);

  const handleSaveSeries = async () => {
    if (!book) return;
    setSeriesSaving(true);
    try {
      const seriesVal = detailSeriesName.trim() || undefined;
      const indexVal = detailSeriesIndex ? parseFloat(detailSeriesIndex) : undefined;
      await databaseService.updateBook(book.id, {
        series: seriesVal,
        seriesIndex: indexVal,
      } as any);
      await databaseService.updateBookMetadata(book.id, {
        series: seriesVal,
        seriesIndex: indexVal,
      });
      onSeriesSaved();
      onToast('Series info updated', 'success');
    } catch (err) {
      console.error('Failed to save series info:', err);
      onToast('Failed to update series info', 'danger');
    } finally {
      setSeriesSaving(false);
    }
  };

  const handleFindSimilar = async () => {
    if (!book) return;
    setIsFindingSimilar(true);
    setSimilarBooks([]);
    try {
      const subjects = book.subgenres?.length
        ? book.subgenres
        : book.genre
          ? [book.genre]
          : book.metadata?.genres || [];
      const results = await metadataLookupService.fetchSimilarBooks(
        subjects.length > 0 ? subjects : [book.author]
      );
      setSimilarBooks(results);
    } catch {
      onToast('Failed to find similar books', 'danger');
    } finally {
      setIsFindingSimilar(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Book Details</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {book && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Cover image */}
            {book.coverPath && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <img
                  src={book.coverPath}
                  alt={book.title}
                  style={{ maxWidth: '200px', maxHeight: '300px', objectFit: 'contain' }}
                />
              </div>
            )}

            {/* Title and Author */}
            <div>
              <h2 style={{ margin: '0 0 8px 0' }}>{book.title}</h2>
              <p style={{ margin: '0', color: 'var(--ion-color-medium)' }}>
                {book.author}
              </p>
              <div style={{ marginTop: '8px' }}>
                <StarRating rating={book.metadata?.rating ?? 0} size={22} onRate={(r) => onRateBook(book.id, r)} />
              </div>
            </div>

            {/* User Review */}
            {book.review && (
              <div>
                <h3 style={{ margin: '0 0 4px 0' }}>Your Review</h3>
                <p
                  style={{
                    margin: '0',
                    color: 'var(--ion-color-medium)',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    fontStyle: 'italic',
                  }}
                >
                  "{book.review}"
                </p>
              </div>
            )}

            {/* Description */}
            {book.metadata?.description && (
              <div>
                <h3 style={{ margin: '0 0 4px 0' }}>Description</h3>
                <p
                  style={{
                    margin: '0',
                    color: 'var(--ion-color-medium)',
                    fontSize: '14px',
                    lineHeight: '1.5',
                  }}
                >
                  {book.metadata.description}
                </p>
              </div>
            )}

            {/* Details */}
            <IonList>
              <IonItem>
                <IonLabel>
                  <h3>Format</h3>
                  <p>{book.format?.toUpperCase()}</p>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h3>Pages</h3>
                  <p>{book.totalPages || 'Unknown'}</p>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h3>Progress</h3>
                  <p>{Math.min(100, Math.round(book.progress * 100))}%</p>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h3>Date Added</h3>
                  <p>
                    {book.dateAdded instanceof Date
                      ? book.dateAdded.toLocaleDateString()
                      : 'Unknown'}
                  </p>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h3>Last Read</h3>
                  <p>
                    {book.lastRead instanceof Date
                      ? book.lastRead.toLocaleDateString()
                      : 'Never'}
                  </p>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h3>Source</h3>
                  <p>{book.source || 'local'}</p>
                </IonLabel>
              </IonItem>
            </IonList>

            {/* Series editing */}
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Series</h3>
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">Series Name</IonLabel>
                  <IonInput
                    value={detailSeriesName}
                    onIonInput={(e) => setDetailSeriesName(e.detail.value || '')}
                    placeholder="e.g. Harry Potter"
                    clearInput
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Position in Series</IonLabel>
                  <IonInput
                    type="number"
                    value={detailSeriesIndex}
                    onIonInput={(e) => setDetailSeriesIndex(e.detail.value || '')}
                    placeholder="e.g. 1, 2, 3"
                    clearInput
                  />
                </IonItem>
              </IonList>
              <IonButton
                expand="block"
                fill="outline"
                size="small"
                disabled={seriesSaving}
                style={{ margin: '8px 0' }}
                onClick={handleSaveSeries}
              >
                {seriesSaving ? 'Saving...' : 'Save Series Info'}
              </IonButton>
            </div>

            {/* Similar Books */}
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Similar Books</h3>
              <IonButton
                expand="block"
                fill="outline"
                size="small"
                disabled={isFindingSimilar}
                onClick={handleFindSimilar}
              >
                {isFindingSimilar ? <IonSpinner name="dots" /> : 'Find Similar Books'}
              </IonButton>
              {similarBooks.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '8px 0', scrollbarWidth: 'none' }}>
                  {similarBooks.map((sb, i) => (
                    <div key={i} style={{ flex: '0 0 80px', textAlign: 'center' }}>
                      {sb.coverUrl ? (
                        <img
                          src={sb.coverUrl}
                          alt={sb.title}
                          style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 4 }}
                        />
                      ) : (
                        <div style={{
                          width: 80, height: 120, borderRadius: 4,
                          background: 'var(--ion-color-light)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <IonIcon icon={bookOutline} style={{ fontSize: 24 }} />
                        </div>
                      )}
                      <p style={{ fontSize: 11, margin: '4px 0 0', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {sb.title}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--ion-color-medium)', margin: 0 }}>
                        {sb.author}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {similarBooks.length === 0 && !isFindingSimilar && (
                <p style={{ fontSize: 13, color: 'var(--ion-color-medium)', margin: '8px 0 0' }}>
                  Tap to discover books similar to this one
                </p>
              )}
            </div>
          </div>
        )}
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButton
            expand="block"
            onClick={() => {
              if (book) {
                onClose();
                onOpenBook(book);
              }
            }}
          >
            Open Book
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  );
};

export default BookDetailsModal;
