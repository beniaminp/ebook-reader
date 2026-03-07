import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonButtons,
  IonMenuButton,
  IonList,
  IonItem,
  IonThumbnail,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
  IonFab,
  IonFabButton,
  IonActionSheet,
  IonAlert,
  IonSpinner,
  IonText,
  IonChip,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  gridOutline,
  listOutline,
  bookOutline,
  addOutline,
  trashOutline,
  informationCircleOutline,
  documentTextOutline,
  closeOutline,
  filterOutline,
  cloudDownloadOutline,
  checkmarkCircleOutline,
  libraryOutline,
  shareSocialOutline,
  imageOutline,
  layersOutline,
  checkboxOutline,
  squareOutline,
  sparklesOutline,
  settingsOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { databaseService } from '../../services/database';
import { metadataLookupService } from '../../services/metadataLookupService';
import { importBook as importBookService, filterSupportedFiles } from '../../services/bookImportService';
import { useSharingStore } from '../../stores/useSharingStore';
import type { Book, Collection } from '../../types/index';
import {
  useLibraryPrefsStore,
  DEFAULT_FILTERS,
  type SortOption,
} from '../../stores/useLibraryPrefsStore';
import { useSmartShelvesStore } from '../../stores/useSmartShelvesStore';
import { evaluateShelf } from '../../services/smartShelvesService';
import type { SmartShelf } from '../../services/smartShelvesService';
import BookDetailsModal from '../../components/library/BookDetailsModal';
import CoverSearchModal from '../../components/library/CoverSearchModal';
import BulkEditPanel from '../../components/library/BulkEditPanel';
import LibraryFilters from '../../components/library/LibraryFilters';
import ShelfManager, { AddToShelfModal } from '../../components/library/ShelfManager';
import ReadingStreakCard from '../../components/ReadingStreakCard';
import WelcomeBackCard from '../../components/WelcomeBackCard';
import OnboardingOverlay from '../../components/OnboardingOverlay';
import StarRating from '../../components/common/StarRating';
import './Library.css';

const Library: React.FC = () => {
  const history = useHistory();
  const { books, setBooks, setCurrentBook, removeBook } = useAppStore();
  const { viewMode, setViewMode, sortBy, setSortBy, filters, setFilters } = useLibraryPrefsStore();
  const {
    shelves: smartShelves,
    activeShelfId: activeSmartShelfId,
    setActiveShelf: setActiveSmartShelf,
    addShelf: addSmartShelf,
    removeShelf: removeSmartShelf,
    updateShelf: updateSmartShelf,
  } = useSmartShelvesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [folderInputKey, setFolderInputKey] = useState(0);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<string>('danger');
  const { shareBook: shareBookP2P, isSharingBook } = useSharingStore();

  // Advanced filter state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allTags, setAllTags] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [bookTagMap, setBookTagMap] = useState<Record<string, string[]>>({});
  const [bookCollectionMap, setBookCollectionMap] = useState<Record<string, string[]>>({});

  // Shelves panel visibility
  const [showShelvesPanel, setShowShelvesPanel] = useState(false);
  const [showManageShelves, setShowManageShelves] = useState(false);

  // "Add to Shelf" state
  const [showShelfAssign, setShowShelfAssign] = useState(false);

  // Bulk select state
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());

  const toggleBulkSelect = (bookId: string) => {
    setSelectedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  };



  // Cover search state
  const [showCoverSearch, setShowCoverSearch] = useState(false);

  const handleSaveSmartShelf = useCallback((shelf: SmartShelf) => {
    const existing = smartShelves.find((s) => s.id === shelf.id);
    if (existing) {
      updateSmartShelf(shelf.id, shelf);
    } else {
      addSmartShelf(shelf);
    }
  }, [smartShelves, updateSmartShelf, addSmartShelf]);

  const handleDeleteSmartShelf = useCallback((shelfId: string) => {
    removeSmartShelf(shelfId);
  }, [removeSmartShelf]);

  const handleRateBook = useCallback(async (bookId: string, rating: number) => {
    try {
      await databaseService.updateBookMetadata(bookId, { rating });
      const updatedBooks = books.map((b) =>
        b.id === bookId ? { ...b, metadata: { ...b.metadata, rating } } : b
      );
      setBooks(updatedBooks);
    } catch (err) {
      console.error('Failed to rate book:', err);
    }
  }, [books, setBooks]);


  const activeFilterCount =
    (filters.format !== 'all' ? 1 : 0) +
    (filters.collectionId !== 'all' ? 1 : 0) +
    (filters.readStatus !== 'all' ? 1 : 0) +
    filters.tagIds.length;

  const toTime = (d: unknown): number => {
    if (d instanceof Date) return d.getTime();
    if (typeof d === 'number') return d;
    if (typeof d === 'string') return new Date(d).getTime() || 0;
    return 0;
  };

  const sortBooks = useCallback((booksToSort: Book[], option: SortOption): Book[] => {
    const sorted = [...booksToSort];
    switch (option) {
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'author':
        return sorted.sort((a, b) => a.author.localeCompare(b.author));
      case 'dateAdded':
        return sorted.sort((a, b) => toTime(b.dateAdded) - toTime(a.dateAdded));
      case 'lastRead':
        return sorted.sort((a, b) => toTime(b.lastRead) - toTime(a.lastRead));
      case 'rating':
        return sorted.sort((a, b) => (b.metadata?.rating ?? 0) - (a.metadata?.rating ?? 0));
      default:
        return sorted;
    }
  }, []);

  // Load books on mount
  useEffect(() => {
    loadBooks();
    loadFilterData();
  }, []);

  // Reload books when the Library tab becomes visible (Ionic keeps tabs mounted)
  useIonViewWillEnter(() => {
    loadBooks();
  });

  const loadFilterData = async () => {
    try {
      const [cols, tags] = await Promise.all([
        databaseService.getAllCollections(),
        databaseService.getTags(),
      ]);
      setCollections(cols);
      setAllTags(tags);
    } catch (err) {
      console.error('Error loading filter data:', err);
    }
  };

  // Compute filtered and sorted books directly — avoids the extra render cycle
  // that useEffect + setState would cause.
  const filteredBooks = useMemo(() => {
    // If a smart shelf is active, use its rules to filter books
    if (activeSmartShelfId) {
      const activeSmartShelf = smartShelves.find((s) => s.id === activeSmartShelfId);
      if (activeSmartShelf) {
        let result = evaluateShelf(activeSmartShelf, books);
        // Still apply search on top of smart shelf
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          result = result.filter(
            (book) =>
              book.title.toLowerCase().includes(query) ||
              book.author.toLowerCase().includes(query)
          );
        }
        return result;
      }
    }

    let result = [...books];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query)
      );
    }

    // Apply format filter
    if (filters.format !== 'all') {
      result = result.filter((book) => book.format === filters.format);
    }

    // Apply read status filter
    if (filters.readStatus !== 'all') {
      result = result.filter((book) => {
        if (filters.readStatus === 'dnf') return book.readStatus === 'dnf';
        const prog = book.progress ?? 0;
        if (book.readStatus === 'dnf') return false; // DNF books don't show in other status filters
        switch (filters.readStatus) {
          case 'unread':
            return prog === 0;
          case 'reading':
            return prog > 0 && prog < 1;
          case 'finished':
            return prog >= 1;
          default:
            return true;
        }
      });
    }

    // Apply collection filter
    if (filters.collectionId !== 'all') {
      const booksInCollection = bookCollectionMap[filters.collectionId] || [];
      result = result.filter((book) => booksInCollection.includes(book.id));
    }

    // Apply tag filter
    if (filters.tagIds.length > 0) {
      result = result.filter((book) => {
        const bookTags = bookTagMap[book.id] || [];
        return filters.tagIds.every((tagId) => bookTags.includes(tagId));
      });
    }

    // Apply sorting
    return sortBooks(result, sortBy);
  }, [books, searchQuery, sortBy, sortBooks, filters, bookTagMap, bookCollectionMap, activeSmartShelfId, smartShelves]);

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const loadedBooks = await databaseService.getAllBooks();
      setBooks(loadedBooks);

      // Build tag and collection maps for all books
      await loadBookMappings(loadedBooks);
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBookMappings = async (loadedBooks: Book[]) => {
    try {
      const tagMap: Record<string, string[]> = {};
      const colMap: Record<string, string[]> = {};

      // Load collections in parallel to build reverse map (collectionId -> bookIds)
      const cols = await databaseService.getAllCollections();
      const colResults = await Promise.all(
        cols.map((col) => databaseService.getBooksInCollection(col.id))
      );
      cols.forEach((col, i) => {
        colMap[col.id] = colResults[i].map((b) => b.id);
      });

      // Load tags for each book in parallel
      const tagResults = await Promise.allSettled(
        loadedBooks.map((book) => databaseService.getBookTags(book.id))
      );
      loadedBooks.forEach((book, i) => {
        const result = tagResults[i];
        if (result.status === 'fulfilled' && result.value.length > 0) {
          tagMap[book.id] = result.value.map((t: any) => t.id);
        }
      });

      setBookTagMap(tagMap);
      setBookCollectionMap(colMap);
    } catch (err) {
      console.error('Error loading book mappings:', err);
    }
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await loadBooks();
    await loadFilterData();
    event.detail.complete();
  };

  const handleBookClick = (book: Book) => {
    if (bulkSelectMode) {
      toggleBulkSelect(book.id);
      return;
    }
    if (!book.id) {
      console.error('Attempted to open book with missing id:', book);
      return;
    }
    setCurrentBook(book);
    history.push(`/reader/${book.id}`);
  };


  const handleBookLongPress = (book: Book, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedBook(book);
    setShowActionSheet(true);
  };

  // "Add to Shelf" handler
  const openShelfAssign = useCallback(
    async (_book: Book) => {
      setShowShelfAssign(true);
    },
    []
  );

  const handleCollectionsChanged = useCallback(async () => {
    await loadFilterData();
    await loadBookMappings(books);
  }, [books]);

  // ─── Cover search handlers ─────────────────────────
  const openCoverSearch = useCallback((book: Book) => {
    setSelectedBook(book);
    setShowCoverSearch(true);
  }, []);

  const handleCoverSelected = useCallback(async (bookId: string, coverDataUrl: string) => {
    try {
      await databaseService.updateBook(bookId, { coverPath: coverDataUrl });
      const updatedBooks = books.map((b) =>
        b.id === bookId ? { ...b, coverPath: coverDataUrl } : b
      );
      setBooks(updatedBooks);
    } catch (err) {
      console.error('Failed to save cover:', err);
    }
  }, [books, setBooks]);

  const [importingCount, setImportingCount] = useState(0);

  const importFiles = async (fileList: File[], resetKey: 'file' | 'folder') => {
    if (fileList.length === 0) return;
    setImportingCount(fileList.length);

    let imported = 0;
    const errors: string[] = [];

    const importOptions = { existingBooks: books, setBooks };

    for (const file of fileList) {
      try {
        await importBookService(file, importOptions);
        imported++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error importing file:', file.name, error);
        errors.push(`${file.name}: ${msg}`);
      }
    }

    setImportingCount(0);
    if (resetKey === 'file') {
      setFileInputKey((prev) => prev + 1);
    } else {
      setFolderInputKey((prev) => prev + 1);
    }
    await loadBooks();

    if (errors.length > 0 && imported === 0) {
      setToastColor('danger');
      setToastMessage(`Failed to import: ${errors.join('; ')}`);
    } else if (errors.length > 0) {
      setToastColor('warning');
      setToastMessage(`Imported ${imported} book${imported > 1 ? 's' : ''}, ${errors.length} failed`);
    } else if (imported > 0) {
      setToastColor('success');
      setToastMessage(`Imported ${imported} book${imported > 1 ? 's' : ''} successfully`);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await importFiles(Array.from(files), 'file');
  };

  const handleFolderImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Filter to only supported ebook formats
    const supportedFiles = filterSupportedFiles(Array.from(files));

    if (supportedFiles.length === 0) {
      setToastColor('warning');
      setToastMessage('No supported ebook files found in selected folder');
      setFolderInputKey((prev) => prev + 1);
      return;
    }

    await importFiles(supportedFiles, 'folder');
  };

  const handleDeleteBook = async () => {
    if (selectedBook) {
      try {
        await removeBook(selectedBook.id);
        await loadBooks();
      } catch (error) {
        console.error('Error deleting book:', error);
      }
    }
    setShowDeleteAlert(false);
    setShowActionSheet(false);
    setSelectedBook(null);
  };

  const getFormatColor = (format: string): string => {
    switch (format) {
      case 'epub':
        return 'success';
      case 'pdf':
        return 'warning';
      case 'mobi':
      case 'azw3':
        return 'tertiary';
      case 'cbz':
      case 'cbr':
        return 'secondary';
      default:
        return 'medium';
    }
  };

  const getProgressWidth = (book: Book): number => {
    if (book.totalPages > 0) {
      return (book.currentPage / book.totalPages) * 100;
    }
    return book.progress * 100;
  };


  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setActiveSmartShelf(null);
  }, [setActiveSmartShelf]);

  const renderDownloadBadge = (book: Book) => {
    if (book.source === 'calibre-web' && !book.downloaded) {
      return (
        <IonIcon
          icon={cloudDownloadOutline}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            color: 'white',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '50%',
            padding: '3px',
            fontSize: '16px',
          }}
          title="Not downloaded"
        />
      );
    }
    if (book.source === 'calibre-web' && book.downloaded) {
      return (
        <IonIcon
          icon={checkmarkCircleOutline}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            color: 'white',
            background: 'rgba(0,128,0,0.7)',
            borderRadius: '50%',
            padding: '3px',
            fontSize: '16px',
          }}
          title="Downloaded"
        />
      );
    }
    return null;
  };

  const renderGridView = () => (
    <IonGrid className="book-grid">
      <IonRow>
        {filteredBooks.map((book) => (
          <IonCol size="4" sizeMd="3" sizeLg="2" key={book.id}>
            <IonCard
              className="book-card"
              onClick={() => handleBookClick(book)}
              onContextMenu={(e) => handleBookLongPress(book, e)}
            >
              <div className="book-cover" style={{ position: 'relative' }}>
                {book.coverPath ? (
                  <img src={book.coverPath} alt={book.title} />
                ) : (
                  <div className="book-cover-placeholder">
                    <IonIcon icon={bookOutline} />
                    <p>{book.format.toUpperCase()}</p>
                  </div>
                )}
                {(book.progress > 0 || (book.furthestProgress != null && book.furthestProgress > 0)) && (
                  <div className="book-progress-overlay">
                    {book.furthestProgress != null && book.furthestProgress > book.progress && (
                      <div
                        className="book-progress-bar book-progress-furthest"
                        style={{ width: `${Math.min(100, Math.round(book.furthestProgress * 100))}%` }}
                      />
                    )}
                    <div
                      className="book-progress-bar"
                      style={{ width: `${getProgressWidth(book)}%` }}
                    />
                  </div>
                )}
                {renderDownloadBadge(book)}
                {bulkSelectMode && (
                  <IonIcon
                    icon={selectedBookIds.has(book.id) ? checkboxOutline : squareOutline}
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      fontSize: 22,
                      color: selectedBookIds.has(book.id) ? 'var(--ion-color-primary)' : 'rgba(255,255,255,0.7)',
                      background: 'rgba(0,0,0,0.4)',
                      borderRadius: 4,
                      padding: 2,
                      zIndex: 5,
                    }}
                  />
                )}
                {book.readStatus === 'dnf' && (
                  <IonBadge color="medium" className="book-dnf-badge">DNF</IonBadge>
                )}
                <IonChip
                  outline={true}
                  color={getFormatColor(book.format)}
                  className="book-format-chip"
                >
                  {book.format.toUpperCase()}
                </IonChip>
              </div>
              <IonCardHeader className="ion-no-padding">
                <IonCardTitle className="book-title">{book.title}</IonCardTitle>
                <IonCardSubtitle className="book-author">{book.author}</IonCardSubtitle>
                <StarRating rating={book.metadata?.rating ?? 0} size={12} onRate={(r) => handleRateBook(book.id, r)} />
              </IonCardHeader>
            </IonCard>
          </IonCol>
        ))}
      </IonRow>
    </IonGrid>
  );

  const renderListView = () => (
    <IonList className="book-list">
      {filteredBooks.map((book) => (
        <IonItem
          key={book.id}
          className="book-list-item"
          onClick={() => handleBookClick(book)}
          onContextMenu={(e) => handleBookLongPress(book, e)}
          detail={false}
        >
          <IonThumbnail slot="start" className="book-thumbnail" style={{ position: 'relative' }}>
            {book.coverPath ? (
              <img src={book.coverPath} alt={book.title} />
            ) : (
              <div className="book-thumbnail-placeholder">
                <IonIcon icon={bookOutline} />
              </div>
            )}
            {book.source === 'calibre-web' && !book.downloaded && (
              <IonIcon
                icon={cloudDownloadOutline}
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  fontSize: '14px',
                  color: 'var(--ion-color-primary)',
                }}
              />
            )}
          </IonThumbnail>
          <IonLabel>
            <h2>{book.title}</h2>
            <p>{book.author}</p>
            <StarRating rating={book.metadata?.rating ?? 0} size={13} onRate={(r) => handleRateBook(book.id, r)} />
            <div className="book-list-meta">
              <span className="book-list-format">{book.format.toUpperCase()}</span>
              {book.fileSize ? (
                <span style={{ fontSize: '11px', color: 'var(--ion-color-medium)', marginLeft: '6px' }}>
                  {book.fileSize < 1024 * 1024
                    ? `${(book.fileSize / 1024).toFixed(0)} KB`
                    : `${(book.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                </span>
              ) : null}
              {(book.progress > 0 || (book.furthestProgress != null && book.furthestProgress > 0)) && (
                <div className="book-progress-container">
                  <div className="book-progress-bar-small">
                    {book.furthestProgress != null && book.furthestProgress > book.progress && (
                      <div
                        className="book-progress-fill book-progress-furthest-small"
                        style={{ width: `${Math.min(100, Math.round(book.furthestProgress * 100))}%` }}
                      />
                    )}
                    <div
                      className="book-progress-fill"
                      style={{ width: `${getProgressWidth(book)}%` }}
                    />
                  </div>
                  <IonText color="medium" className="book-progress-text">
                    {Math.min(100, Math.round(book.progress * 100))}%
                  </IonText>
                </div>
              )}
            </div>
          </IonLabel>
        </IonItem>
      ))}
    </IonList>
  );

  // ─── Shelf View — 3D bookshelf ─────────────────────────
  const renderShelfView = () => {
    // Split books into rows of 3–4 per shelf
    const booksPerShelf = window.innerWidth >= 768 ? 5 : 3;
    const shelves: Book[][] = [];
    for (let i = 0; i < filteredBooks.length; i += booksPerShelf) {
      shelves.push(filteredBooks.slice(i, i + booksPerShelf));
    }

    return (
      <div className="bookshelf-container">
        {shelves.map((shelfBooks, shelfIndex) => (
          <div className="bookshelf-row" key={shelfIndex}>
            <div className="bookshelf-books">
              {shelfBooks.map((book) => (
                <div
                  className="bookshelf-book"
                  key={book.id}
                  onClick={() => handleBookClick(book)}
                  onContextMenu={(e) => handleBookLongPress(book, e)}
                >
                  <div className="bookshelf-book-spine">
                    {book.coverPath ? (
                      <img src={book.coverPath} alt={book.title} />
                    ) : (
                      <div className="bookshelf-book-placeholder">
                        <span className="bookshelf-book-placeholder-title">{book.title}</span>
                        <span className="bookshelf-book-placeholder-format">{book.format.toUpperCase()}</span>
                      </div>
                    )}
                    {(book.progress > 0 || (book.furthestProgress != null && book.furthestProgress > 0)) && (
                      <div className="bookshelf-progress">
                        {book.furthestProgress != null && book.furthestProgress > book.progress && (
                          <div
                            className="bookshelf-progress-fill bookshelf-progress-furthest"
                            style={{ width: `${Math.min(100, Math.round(book.furthestProgress * 100))}%` }}
                          />
                        )}
                        <div
                          className="bookshelf-progress-fill"
                          style={{ width: `${getProgressWidth(book)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="bookshelf-book-shadow" />
                  <p className="bookshelf-book-title">{book.title}</p>
                </div>
              ))}
            </div>
            <div className="bookshelf-plank">
              <div className="bookshelf-plank-front" />
              <div className="bookshelf-plank-top" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="empty-state">
      <IonIcon icon={bookOutline} className="empty-state-icon" />
      <h2>No books yet</h2>
      <p>Import your first ebook to get started</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <IonButton fill="solid" size="small" className="empty-state-action" onClick={() => document.getElementById('file-input')?.click()}>
          <IonIcon slot="start" icon={documentTextOutline} />
          Select Files
        </IonButton>
        <IonButton fill="outline" size="small" className="empty-state-action" onClick={() => document.getElementById('folder-input')?.click()}>
          <IonIcon slot="start" icon={libraryOutline} />
          Select Folder
        </IonButton>
      </div>
    </div>
  );

  const renderContinueReading = () => {
    const recentBooks = filteredBooks
      .filter((b) => b.progress > 0 && b.progress < 1)
      .sort((a, b) => {
        const aTime = a.lastRead instanceof Date ? a.lastRead.getTime() : 0;
        const bTime = b.lastRead instanceof Date ? b.lastRead.getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);

    if (recentBooks.length === 0) return null;

    return (
      <div className="continue-reading-section">
        <h3>Continue Reading</h3>
        <div className="continue-reading-scroll">
          {recentBooks.map((book) => (
            <div className="continue-reading-card" key={`continue-${book.id}`} onClick={() => handleBookClick(book)}>
              <div className="continue-reading-cover">
                {book.coverPath ? (
                  <img src={book.coverPath} alt={book.title} />
                ) : (
                  <div className="continue-reading-placeholder">
                    <IonIcon icon={bookOutline} />
                  </div>
                )}
                <div className="continue-reading-progress">
                  {Math.min(100, Math.round(book.progress * 100))}%
                </div>
              </div>
              <IonText className="continue-reading-title">
                <p>{book.title}</p>
              </IonText>
            </div>
          ))}
        </div>
      </div>
    );
  };


  const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim() !== '' || !!activeSmartShelfId;

  return (
    <IonPage className="library-page">
      <OnboardingOverlay />
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Library</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => {
              if (bulkSelectMode) {
                setBulkSelectMode(false);
                setSelectedBookIds(new Set());
              } else {
                setBulkSelectMode(true);
              }
            }}>
              <IonIcon icon={bulkSelectMode ? closeOutline : checkboxOutline} />
            </IonButton>
            <IonButton onClick={() => setShowFilterPanel(true)}>
              <IonIcon icon={filterOutline} />
              {activeFilterCount > 0 && (
                <IonBadge
                  color="primary"
                  style={{ position: 'absolute', top: 4, right: 4, fontSize: '10px' }}
                >
                  {activeFilterCount}
                </IonBadge>
              )}
            </IonButton>
            <IonButton onClick={() => {
              const modes: Array<'grid' | 'list' | 'shelf'> = ['grid', 'list', 'shelf'];
              const idx = modes.indexOf(viewMode);
              setViewMode(modes[(idx + 1) % modes.length]);
            }}>
              <IonIcon icon={viewMode === 'grid' ? listOutline : viewMode === 'list' ? layersOutline : gridOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Library</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="library-controls">
          <IonSearchbar
            value={searchQuery}
            onIonInput={(e) => setSearchQuery(e.detail.value || '')}
            placeholder="Search books..."
            animated
          />

          <div className="library-filters">
            <IonSelect
              value={sortBy}
              onIonChange={(e) => setSortBy(e.detail.value as SortOption)}
              label="Sort by"
              labelPlacement="start"
            >
              <IonSelectOption value="dateAdded">Date Added</IonSelectOption>
              <IonSelectOption value="title">Title</IonSelectOption>
              <IonSelectOption value="author">Author</IonSelectOption>
              <IonSelectOption value="lastRead">Last Read</IonSelectOption>
              <IonSelectOption value="rating">Rating</IonSelectOption>
            </IonSelect>
            <span className="library-book-count">
              {searchQuery.trim() || activeFilterCount > 0 || activeSmartShelfId
                ? `${filteredBooks.length} of ${books.length} book${books.length !== 1 ? 's' : ''}`
                : `${books.length} book${books.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="active-filters">
              {filters.format !== 'all' && (
                <IonChip
                  color="primary"
                  onClick={() => setFilters((p) => ({ ...p, format: 'all' }))}
                >
                  {filters.format.toUpperCase()}
                  <IonIcon icon={closeOutline} />
                </IonChip>
              )}
              {filters.readStatus !== 'all' && (
                <IonChip
                  color="primary"
                  onClick={() => setFilters((p) => ({ ...p, readStatus: 'all' }))}
                >
                  {filters.readStatus === 'unread'
                    ? 'Unread'
                    : filters.readStatus === 'reading'
                      ? 'In Progress'
                      : filters.readStatus === 'dnf'
                        ? 'DNF'
                        : 'Finished'}
                  <IonIcon icon={closeOutline} />
                </IonChip>
              )}
              {filters.collectionId !== 'all' && (
                <IonChip
                  color="primary"
                  onClick={() => setFilters((p) => ({ ...p, collectionId: 'all' }))}
                >
                  {collections.find((c) => c.id === filters.collectionId)?.name || 'Collection'}
                  <IonIcon icon={closeOutline} />
                </IonChip>
              )}
              {filters.tagIds.map((tagId) => (
                <IonChip key={tagId} color="primary" onClick={() => setFilters((prev) => ({ ...prev, tagIds: prev.tagIds.filter((id) => id !== tagId) }))}>
                  {allTags.find((t) => t.id === tagId)?.name || tagId}
                  <IonIcon icon={closeOutline} />
                </IonChip>
              ))}
              <IonChip color="medium" onClick={clearAllFilters}>
                Clear all
              </IonChip>
            </div>
          )}
        </div>

        {/* Shelves toggle button + active shelf indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px 4px' }}>
          <IonButton
            fill={showShelvesPanel ? 'solid' : 'outline'}
            size="small"
            onClick={() => setShowShelvesPanel((v) => !v)}
          >
            <IonIcon icon={libraryOutline} slot="start" />
            Shelves
            {(filters.collectionId !== 'all' || activeSmartShelfId) && (
              <IonBadge color="danger" style={{ marginLeft: 6, fontSize: '9px', minWidth: 8, height: 8, padding: 0, borderRadius: '50%' }} />
            )}
          </IonButton>
          {filters.collectionId !== 'all' && (
            <IonChip
              color="primary"
              onClick={() => setFilters((p) => ({ ...p, collectionId: 'all' }))}
              style={{ fontSize: '12px' }}
            >
              {collections.find((c) => c.id === filters.collectionId)?.name}
              <IonIcon icon={closeOutline} />
            </IonChip>
          )}
          {activeSmartShelfId && (
            <IonChip
              color="primary"
              onClick={() => setActiveSmartShelf(null)}
              style={{ fontSize: '12px' }}
            >
              {smartShelves.find((s) => s.id === activeSmartShelfId)?.name}
              <IonIcon icon={closeOutline} />
            </IonChip>
          )}
        </div>

        {/* Shelves panel (toggled) */}
        {showShelvesPanel && (
          <div className="shelves-panel" style={{ padding: '0 12px 8px' }}>
            {/* Collections */}
            {collections.length > 0 && (
              <div className="shelf-chips-bar" style={{ marginBottom: 4 }}>
                <IonChip
                  color={filters.collectionId === 'all' && !activeSmartShelfId ? 'primary' : undefined}
                  outline={filters.collectionId !== 'all' || !!activeSmartShelfId}
                  onClick={() => { setFilters((p) => ({ ...p, collectionId: 'all' })); setActiveSmartShelf(null); }}
                  style={{ fontSize: '12px' }}
                >
                  All
                </IonChip>
                {collections.map((shelf) => (
                  <IonChip
                    key={shelf.id}
                    color={filters.collectionId === shelf.id ? 'primary' : undefined}
                    outline={filters.collectionId !== shelf.id}
                    onClick={() => { setActiveSmartShelf(null); setFilters((p) => ({ ...p, collectionId: shelf.id })); }}
                    style={{ fontSize: '12px' }}
                  >
                    {shelf.name}
                    {filters.collectionId === shelf.id && bookCollectionMap[shelf.id] && (
                      <IonBadge color="light" style={{ marginLeft: 6, fontSize: '10px' }}>
                        {bookCollectionMap[shelf.id].length}
                      </IonBadge>
                    )}
                  </IonChip>
                ))}
              </div>
            )}
            {/* Smart Shelves */}
            <div className="shelf-chips-bar">
              <IonIcon
                icon={sparklesOutline}
                style={{ fontSize: '14px', color: 'var(--ion-color-medium)', marginRight: 2, flexShrink: 0 }}
              />
              {smartShelves.map((shelf) => (
                <IonChip
                  key={shelf.id}
                  color={activeSmartShelfId === shelf.id ? 'primary' : undefined}
                  outline={activeSmartShelfId !== shelf.id}
                  onClick={() => {
                    setFilters((p) => ({ ...p, collectionId: 'all' }));
                    setActiveSmartShelf(activeSmartShelfId === shelf.id ? null : shelf.id);
                  }}
                  style={{ fontSize: '12px' }}
                >
                  {shelf.name}
                  {activeSmartShelfId === shelf.id && (
                    <IonBadge color="light" style={{ marginLeft: 6, fontSize: '10px' }}>
                      {evaluateShelf(shelf, books).length}
                    </IonBadge>
                  )}
                </IonChip>
              ))}
            </div>
            {/* Manage button */}
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <IonButton
                fill="clear"
                size="small"
                onClick={() => setShowManageShelves(true)}
              >
                <IonIcon icon={settingsOutline} slot="start" />
                Manage Shelves
              </IonButton>
            </div>
          </div>
        )}

        {importingCount > 0 && (
          <div className="loading-state" style={{ paddingBottom: 0 }}>
            <IonSpinner name="crescent" />
            <p>
              Importing {importingCount} book{importingCount > 1 ? 's' : ''}...
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="book-grid">
            <IonGrid>
              <IonRow>
                {Array.from({ length: 9 }).map((_, i) => (
                  <IonCol size="4" key={`skeleton-${i}`}>
                    <div className="skeleton-book-card">
                      <div className="skeleton-book-cover skeleton" />
                      <div className="skeleton-book-title skeleton" />
                      <div className="skeleton-book-author skeleton" />
                    </div>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          </div>
        ) : (
          <>
            <ReadingStreakCard />
            <WelcomeBackCard books={books} />
            {renderContinueReading()}

            {filteredBooks.length === 0 ? (
              hasActiveFilters ? (
                <div className="empty-state">
                  <IonIcon icon={documentTextOutline} className="empty-state-icon" />
                  <h2>No results found</h2>
                  <p>Try adjusting your search or filters</p>
                  <IonButton fill="outline" onClick={clearAllFilters}>
                    Clear Filters
                  </IonButton>
                </div>
              ) : (
                renderEmptyState()
              )
            ) : (
              <div className="books-container">
                {viewMode === 'grid' ? renderGridView() : viewMode === 'list' ? renderListView() : renderShelfView()}
              </div>
            )}
          </>
        )}
      </IonContent>

      {/* Bulk select action bar + edit modal */}
      <BulkEditPanel
        isActive={bulkSelectMode}
        selectedCount={selectedBookIds.size}
        selectedBookIds={selectedBookIds}
        onSelectAll={() => setSelectedBookIds(new Set(filteredBooks.map(b => b.id)))}
        onCancel={() => { setBulkSelectMode(false); setSelectedBookIds(new Set()); }}
        onEditComplete={() => { setBulkSelectMode(false); setSelectedBookIds(new Set()); loadBooks(); }}
        onToast={(message, color) => { setToastColor(color); setToastMessage(message); }}
      />

      {!bulkSelectMode && (
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowImportSheet(true)}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      )}

      <IonActionSheet
        isOpen={showImportSheet}
        onDidDismiss={() => setShowImportSheet(false)}
        header="Import Books"
        buttons={[
          {
            text: 'Select Files',
            icon: documentTextOutline,
            handler: () => {
              document.getElementById('file-input')?.click();
            },
          },
          {
            text: 'Select Folder',
            icon: libraryOutline,
            handler: () => {
              document.getElementById('folder-input')?.click();
            },
          },
          {
            text: 'Cancel',
            role: 'cancel',
          },
        ]}
      />

      <input
        id="file-input"
        type="file"
        key={fileInputKey}
        accept=".epub,.pdf,.mobi,.azw,.azw3,.fb2,.cbz,.cbr,.txt,.html,.htm,.md,.docx,.odt"
        style={{ display: 'none' }}
        onChange={handleFileImport}
        multiple
      />
      <input
        id="folder-input"
        type="file"
        key={folderInputKey}
        style={{ display: 'none' }}
        onChange={handleFolderImport}
        ref={(el) => {
          if (el) {
            el.setAttribute('webkitdirectory', '');
            el.setAttribute('directory', '');
          }
        }}
        multiple
      />

      <LibraryFilters
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filters={filters}
        onFiltersChange={setFilters}
        collections={collections}
        allTags={allTags}
        onClearAll={clearAllFilters}
      />

      <IonActionSheet
        isOpen={showActionSheet}
        onDidDismiss={() => setShowActionSheet(false)}
        header={selectedBook?.title}
        buttons={[
          {
            text: 'Book Details',
            icon: informationCircleOutline,
            handler: () => {
              setShowBookDetails(true);
            },
          },
          {
            text: 'Download Cover',
            icon: imageOutline,
            handler: () => {
              if (selectedBook) openCoverSearch(selectedBook);
            },
          },
          {
            text: 'Fetch Metadata',
            icon: cloudDownloadOutline,
            handler: () => {
              if (selectedBook) {
                metadataLookupService
                  .fetchBookMetadata(selectedBook.title, selectedBook.author)
                  .then(async (meta) => {
                    if (meta) {
                      await databaseService.updateBookMetadata(selectedBook.id, meta);
                      await loadBooks();
                      setToastColor('success');
                      setToastMessage('Metadata updated successfully');
                    } else {
                      setToastColor('warning');
                      setToastMessage('No metadata found online');
                    }
                  })
                  .catch(() => {
                    setToastColor('danger');
                    setToastMessage('Failed to fetch metadata');
                  });
              }
            },
          },
          {
            text: 'Add to Shelf',
            icon: libraryOutline,
            handler: () => {
              if (selectedBook) openShelfAssign(selectedBook);
            },
          },
          {
            text: 'Share to Community',
            icon: shareSocialOutline,
            handler: () => {
              if (selectedBook && !isSharingBook) {
                shareBookP2P({
                  id: selectedBook.id,
                  title: selectedBook.title,
                  author: selectedBook.author,
                  format: selectedBook.format,
                }).then(() => {
                  setToastColor('success');
                  setToastMessage(`"${selectedBook.title}" shared to community`);
                }).catch(() => {
                  setToastColor('danger');
                  setToastMessage('Failed to share book');
                });
              }
            },
          },
          {
            text: selectedBook?.readStatus === 'dnf' ? 'Remove DNF Status' : 'Mark as DNF',
            icon: closeOutline,
            handler: () => {
              if (selectedBook) {
                const newStatus = selectedBook.readStatus === 'dnf' ? 'unread' : 'dnf';
                databaseService.updateBook(selectedBook.id, { readStatus: newStatus } as any).then(() => {
                  loadBooks();
                  setToastColor('success');
                  setToastMessage(newStatus === 'dnf' ? `"${selectedBook.title}" marked as DNF` : `DNF status removed from "${selectedBook.title}"`);
                });
              }
            },
          },
          {
            text: 'Delete',
            role: 'destructive',
            icon: trashOutline,
            handler: () => {
              setShowDeleteAlert(true);
            },
          },
          {
            text: 'Cancel',
            role: 'cancel',
            icon: closeOutline,
          },
        ]}
      />

      <BookDetailsModal
        book={selectedBook}
        isOpen={showBookDetails}
        onClose={() => setShowBookDetails(false)}
        onOpenBook={handleBookClick}
        onRateBook={handleRateBook}
        onSeriesSaved={loadBooks}
        onToast={(message, color) => { setToastColor(color); setToastMessage(message); }}
      />

      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => setShowDeleteAlert(false)}
        header="Delete Book"
        message={`Are you sure you want to delete "${selectedBook?.title}"? This action cannot be undone.`}
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Delete',
            role: 'destructive',
            handler: handleDeleteBook,
          },
        ]}
      />

      <IonToast
        isOpen={!!toastMessage}
        message={toastMessage}
        duration={2000}
        color={toastColor}
        position="top"
        onDidDismiss={() => setToastMessage('')}
      />
      <div aria-live="polite" className="sr-only" role="status">
        {toastMessage}
      </div>

      {/* Add to Shelf Modal */}
      <AddToShelfModal
        isOpen={showShelfAssign}
        onClose={() => setShowShelfAssign(false)}
        collections={collections}
        book={selectedBook}
        bookCollectionMap={bookCollectionMap}
        onBookCollectionMapChange={setBookCollectionMap}
        onCreateShelf={() => setShowManageShelves(true)}
      />

      {/* Cover Search Modal */}
      <CoverSearchModal
        isOpen={showCoverSearch}
        onClose={() => setShowCoverSearch(false)}
        book={selectedBook}
        onCoverSelected={handleCoverSelected}
        onToast={(message, color) => { setToastColor(color); setToastMessage(message); }}
      />

      {/* Shelf Manager (Manage Shelves + Create/Edit + Delete + Smart Shelf Editor) */}
      <ShelfManager
        isOpen={showManageShelves}
        onClose={() => setShowManageShelves(false)}
        collections={collections}
        smartShelves={smartShelves}
        books={books}
        bookCollectionMap={bookCollectionMap}
        onCollectionsChanged={handleCollectionsChanged}
        onSaveSmartShelf={handleSaveSmartShelf}
        onDeleteSmartShelf={handleDeleteSmartShelf}
        currentCollectionId={filters.collectionId}
        onFilterCollectionChange={(id) => setFilters((p) => ({ ...p, collectionId: id }))}
      />
    </IonPage>
  );
};

export default Library;
