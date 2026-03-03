import React, { useState, useMemo, useCallback } from 'react';
import {
  IonIcon,
  IonChip,
  IonButton,
  IonButtons,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonFooter,
  IonBadge,
} from '@ionic/react';
import {
  bookOutline,
  arrowBack,
  libraryOutline,
  checkmarkCircleOutline,
  createOutline,
  closeOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import type { Book } from '../types/index';
import { databaseService } from '../services/database';
import { useAppStore } from '../stores/useAppStore';
import './SeriesView.css';

/** Represents a group of books in a series */
export interface SeriesGroup {
  name: string;
  books: Book[];
  totalBooks: number;
  readBooks: number;
  coverPath?: string; // Cover of the first book in the series
  averageProgress: number;
}

interface SeriesViewProps {
  books: Book[];
}

const SeriesView: React.FC<SeriesViewProps> = ({ books }) => {
  const history = useHistory();
  const setBooks = useAppStore((s) => s.setBooks);

  const [selectedSeries, setSelectedSeries] = useState<SeriesGroup | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editSeriesName, setEditSeriesName] = useState('');
  const [editSeriesIndex, setEditSeriesIndex] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // Group books by series
  const seriesGroups = useMemo((): SeriesGroup[] => {
    const map = new Map<string, Book[]>();

    books.forEach((book) => {
      const seriesName = book.series || book.metadata?.series;
      if (seriesName) {
        const existing = map.get(seriesName) || [];
        existing.push(book);
        map.set(seriesName, existing);
      }
    });

    return Array.from(map.entries())
      .map(([name, seriesBooks]) => {
        // Sort books by series index
        const sorted = [...seriesBooks].sort((a, b) => {
          const aIndex = a.seriesIndex ?? a.metadata?.seriesIndex ?? Infinity;
          const bIndex = b.seriesIndex ?? b.metadata?.seriesIndex ?? Infinity;
          return aIndex - bIndex;
        });

        const readBooks = sorted.filter((b) => b.progress >= 0.95).length;
        const totalProgress = sorted.reduce((sum, b) => sum + (b.progress || 0), 0);

        return {
          name,
          books: sorted,
          totalBooks: sorted.length,
          readBooks,
          coverPath: sorted[0]?.coverPath,
          averageProgress: sorted.length > 0 ? totalProgress / sorted.length : 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [books]);

  // Books not in any series
  const standaloneBooks = useMemo(() => {
    return books.filter((b) => !b.series && !b.metadata?.series);
  }, [books]);

  const handleBookClick = useCallback(
    (book: Book) => {
      history.push(`/reader/${book.id}`);
    },
    [history]
  );

  const handleSeriesClick = useCallback((group: SeriesGroup) => {
    setSelectedSeries(group);
  }, []);

  const openEditModal = useCallback((book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBook(book);
    setEditSeriesName(book.series || book.metadata?.series || '');
    setEditSeriesIndex(
      String(book.seriesIndex ?? book.metadata?.seriesIndex ?? '')
    );
    setShowEditModal(true);
  }, []);

  const handleSaveSeriesEdit = useCallback(async () => {
    if (!editingBook) return;

    const updates: Partial<Book> = {
      series: editSeriesName.trim() || undefined,
      seriesIndex: editSeriesIndex ? parseFloat(editSeriesIndex) : undefined,
    };

    await databaseService.updateBook(editingBook.id, updates);

    // Also update metadata
    await databaseService.updateBookMetadata(editingBook.id, {
      series: editSeriesName.trim() || undefined,
      seriesIndex: editSeriesIndex ? parseFloat(editSeriesIndex) : undefined,
    });

    // Reload books to reflect changes
    const allBooks = await databaseService.getAllBooks();
    setBooks(allBooks);

    setShowEditModal(false);
    setEditingBook(null);

    // If we're viewing a series and the name changed, close the series view
    if (selectedSeries && editSeriesName.trim() !== selectedSeries.name) {
      setSelectedSeries(null);
    }
  }, [editingBook, editSeriesName, editSeriesIndex, selectedSeries, setBooks]);

  const getProgressWidth = (book: Book) => {
    if (book.progress > 1) return book.progress;
    return Math.round(book.progress * 100);
  };

  // Series detail view
  if (selectedSeries) {
    return (
      <div className="series-detail-view">
        <div className="series-detail-header">
          <button
            className="series-back-button"
            onClick={() => setSelectedSeries(null)}
          >
            <IonIcon icon={arrowBack} />
          </button>
          <div className="series-detail-info">
            <h2 className="series-detail-title">{selectedSeries.name}</h2>
            <p className="series-detail-subtitle">
              {selectedSeries.readBooks} of {selectedSeries.totalBooks} read
            </p>
          </div>
        </div>

        {/* Series progress bar */}
        <div className="series-detail-progress">
          <div className="series-detail-progress-bar">
            <div
              className="series-detail-progress-fill"
              style={{
                width: `${(selectedSeries.readBooks / selectedSeries.totalBooks) * 100}%`,
              }}
            />
          </div>
          <span className="series-detail-progress-text">
            {Math.round(
              (selectedSeries.readBooks / selectedSeries.totalBooks) * 100
            )}
            % complete
          </span>
        </div>

        {/* Books list */}
        <div className="series-books-list">
          {selectedSeries.books.map((book) => {
            const seriesIdx =
              book.seriesIndex ?? book.metadata?.seriesIndex;
            return (
              <div
                key={book.id}
                className="series-book-item"
                onClick={() => handleBookClick(book)}
              >
                <div className="series-book-index">
                  {seriesIdx != null ? `#${seriesIdx}` : '--'}
                </div>
                <div className="series-book-cover">
                  {book.coverPath ? (
                    <img src={book.coverPath} alt={book.title} />
                  ) : (
                    <div className="series-book-cover-placeholder">
                      <IonIcon icon={bookOutline} />
                    </div>
                  )}
                </div>
                <div className="series-book-info">
                  <h3 className="series-book-title">{book.title}</h3>
                  <p className="series-book-author">{book.author}</p>
                  <div className="series-book-progress-row">
                    {book.progress >= 0.95 ? (
                      <IonBadge color="success" className="series-book-badge">
                        <IonIcon icon={checkmarkCircleOutline} />
                        Read
                      </IonBadge>
                    ) : book.progress > 0 ? (
                      <div className="series-book-progress">
                        <div className="series-book-progress-bar">
                          <div
                            className="series-book-progress-fill"
                            style={{ width: `${getProgressWidth(book)}%` }}
                          />
                        </div>
                        <span className="series-book-progress-text">
                          {Math.round(book.progress * 100)}%
                        </span>
                      </div>
                    ) : (
                      <IonBadge color="medium" className="series-book-badge">
                        Not started
                      </IonBadge>
                    )}
                  </div>
                </div>
                <button
                  className="series-book-edit-btn"
                  onClick={(e) => openEditModal(book, e)}
                >
                  <IonIcon icon={createOutline} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Edit Series Modal */}
        <IonModal
          isOpen={showEditModal}
          onDidDismiss={() => setShowEditModal(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Edit Series Info</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditModal(false)}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {editingBook && (
              <>
                <p
                  style={{
                    color: 'var(--ion-color-medium)',
                    marginBottom: '16px',
                  }}
                >
                  Editing: {editingBook.title}
                </p>
                <IonList>
                  <IonItem>
                    <IonLabel position="stacked">Series Name</IonLabel>
                    <IonInput
                      value={editSeriesName}
                      onIonInput={(e) =>
                        setEditSeriesName(e.detail.value || '')
                      }
                      placeholder="e.g. Harry Potter"
                      clearInput
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">
                      Position in Series
                    </IonLabel>
                    <IonInput
                      type="number"
                      value={editSeriesIndex}
                      onIonInput={(e) =>
                        setEditSeriesIndex(e.detail.value || '')
                      }
                      placeholder="e.g. 1, 2, 3"
                      clearInput
                    />
                  </IonItem>
                </IonList>
              </>
            )}
          </IonContent>
          <IonFooter>
            <IonToolbar>
              <IonButton
                expand="block"
                onClick={handleSaveSeriesEdit}
                style={{ margin: '8px' }}
              >
                Save Changes
              </IonButton>
            </IonToolbar>
          </IonFooter>
        </IonModal>
      </div>
    );
  }

  // Series grid overview
  if (seriesGroups.length === 0) {
    return (
      <div className="series-empty-state">
        <IonIcon icon={libraryOutline} className="series-empty-icon" />
        <h2>No Series Found</h2>
        <p>
          Books with series metadata will appear here. You can add series info
          by long-pressing a book in the library and selecting "Book Details".
        </p>
      </div>
    );
  }

  return (
    <div className="series-view">
      <div className="series-grid">
        {seriesGroups.map((group) => (
          <div
            key={group.name}
            className="series-card"
            onClick={() => handleSeriesClick(group)}
          >
            <div className="series-card-covers">
              {/* Stack up to 3 covers */}
              {group.books.slice(0, 3).map((book, i) => (
                <div
                  key={book.id}
                  className={`series-card-cover series-card-cover-${i}`}
                  style={{ zIndex: 3 - i }}
                >
                  {book.coverPath ? (
                    <img src={book.coverPath} alt={book.title} />
                  ) : (
                    <div className="series-card-cover-placeholder">
                      <IonIcon icon={bookOutline} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="series-card-info">
              <h3 className="series-card-title">{group.name}</h3>
              <p className="series-card-count">
                {group.totalBooks} book{group.totalBooks !== 1 ? 's' : ''}
              </p>
              <div className="series-card-progress">
                <div className="series-card-progress-bar">
                  <div
                    className="series-card-progress-fill"
                    style={{
                      width: `${(group.readBooks / group.totalBooks) * 100}%`,
                    }}
                  />
                </div>
                <span className="series-card-progress-text">
                  {group.readBooks}/{group.totalBooks}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {standaloneBooks.length > 0 && (
        <div className="series-standalone-hint">
          <p>
            {standaloneBooks.length} book{standaloneBooks.length !== 1 ? 's' : ''}{' '}
            not in any series
          </p>
        </div>
      )}
    </div>
  );
};

export default SeriesView;
