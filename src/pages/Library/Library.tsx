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
  IonModal,
  IonFooter,
  IonToast,
  IonInput,
  IonCheckbox,
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
  searchOutline,
  layersOutline,
  star,
  starOutline,
  checkboxOutline,
  squareOutline,
  createOutline,
  flashOutline,
  sparklesOutline,
  settingsOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { databaseService } from '../../services/database';
import { webFileStorage } from '../../services/webFileStorage';
import { metadataLookupService } from '../../services/metadataLookupService';
import { fb2Service } from '../../services/fb2Service';
import { chmService } from '../../services/chmService';
import { comicService } from '../../services/comicService';
import { docxService } from '../../services/docxService';
import { odtService } from '../../services/odtService';
import { useSharingStore } from '../../stores/useSharingStore';
import type { Book, Collection } from '../../types/index';
import {
  useLibraryPrefsStore,
  DEFAULT_FILTERS,
  type SortOption,
  type ReadStatus,
} from '../../stores/useLibraryPrefsStore';
import { useSmartShelvesStore } from '../../stores/useSmartShelvesStore';
import { evaluateShelf } from '../../services/smartShelvesService';
import type { SmartShelf } from '../../services/smartShelvesService';
import SmartShelfEditor from '../../components/SmartShelfEditor';
import ReadingStreakCard from '../../components/ReadingStreakCard';
import WelcomeBackCard from '../../components/WelcomeBackCard';
import OnboardingOverlay from '../../components/OnboardingOverlay';
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

  // Shelf management state
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Collection | null>(null);
  const [shelfName, setShelfName] = useState('');
  const [shelfDescription, setShelfDescription] = useState('');
  const [showDeleteShelfAlert, setShowDeleteShelfAlert] = useState(false);
  const [shelfToDelete, setShelfToDelete] = useState<Collection | null>(null);

  // "Add to Shelf" state
  const [showShelfAssign, setShowShelfAssign] = useState(false);
  const [bookShelfIds, setBookShelfIds] = useState<string[]>([]);

  // Bulk select state
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [showBulkEditSheet, setShowBulkEditSheet] = useState(false);
  const [bulkGenre, setBulkGenre] = useState('');
  const [bulkRating, setBulkRating] = useState(0);
  const [bulkSeries, setBulkSeries] = useState('');
  const [bulkLanguage, setBulkLanguage] = useState('');
  const [bulkReadStatus, setBulkReadStatus] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const toggleBulkSelect = (bookId: string) => {
    setSelectedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  };

  const handleBulkEdit = async () => {
    if (selectedBookIds.size === 0) return;
    setIsBulkSaving(true);
    try {
      for (const bookId of selectedBookIds) {
        const updates: any = {};
        const metaUpdates: any = {};
        if (bulkGenre.trim()) {
          updates.genre = bulkGenre.trim();
          metaUpdates.genre = bulkGenre.trim();
        }
        if (bulkRating > 0) {
          metaUpdates.rating = bulkRating;
        }
        if (bulkSeries.trim()) {
          updates.series = bulkSeries.trim();
          metaUpdates.series = bulkSeries.trim();
        }
        if (bulkLanguage.trim()) {
          metaUpdates.language = bulkLanguage.trim();
        }
        if (bulkReadStatus) {
          updates.readStatus = bulkReadStatus;
        }
        if (Object.keys(updates).length > 0) {
          await databaseService.updateBook(bookId, updates);
        }
        if (Object.keys(metaUpdates).length > 0) {
          await databaseService.updateBookMetadata(bookId, metaUpdates);
        }
      }
      await loadBooks();
      setToastColor('success');
      setToastMessage(`Updated ${selectedBookIds.size} book${selectedBookIds.size > 1 ? 's' : ''}`);
      setShowBulkEditSheet(false);
      setBulkSelectMode(false);
      setSelectedBookIds(new Set());
      setBulkGenre('');
      setBulkRating(0);
      setBulkSeries('');
      setBulkLanguage('');
      setBulkReadStatus('');
    } catch (err) {
      console.error('Bulk edit failed:', err);
      setToastColor('danger');
      setToastMessage('Failed to update books');
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Series editing state (in Book Details modal)
  const [detailSeriesName, setDetailSeriesName] = useState('');
  const [detailSeriesIndex, setDetailSeriesIndex] = useState('');
  const [seriesSaving, setSeriesSaving] = useState(false);

  // Similar books state
  const [similarBooks, setSimilarBooks] = useState<Array<{ title: string; author: string; coverUrl?: string }>>([]);
  const [isFindingSimilar, setIsFindingSimilar] = useState(false);

  // Cover search state
  const [showCoverSearch, setShowCoverSearch] = useState(false);
  const [coverSearchQuery, setCoverSearchQuery] = useState('');
  const [coverResults, setCoverResults] = useState<Array<{ url: string; source: string; title?: string }>>([]);
  const [isCoverSearching, setIsCoverSearching] = useState(false);
  const [isSavingCover, setIsSavingCover] = useState(false);

  // Smart shelf editor state
  const [showSmartShelfEditor, setShowSmartShelfEditor] = useState(false);
  const [editingSmartShelf, setEditingSmartShelf] = useState<SmartShelf | null>(null);

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

  const handleRateBook = useCallback(async (bookId: string, rating: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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

  const renderStarRating = (book: Book, size: number = 14) => {
    const rating = book.metadata?.rating ?? 0;
    return (
      <div
        className="star-rating"
        style={{ display: 'flex', gap: '1px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {[1, 2, 3, 4, 5].map((s) => (
          <IonIcon
            key={s}
            icon={s <= rating ? star : starOutline}
            style={{
              fontSize: `${size}px`,
              color: s <= rating ? '#f5a623' : 'var(--ion-color-medium)',
              cursor: 'pointer',
            }}
            onClick={(e) => handleRateBook(book.id, s === rating ? 0 : s, e)}
          />
        ))}
      </div>
    );
  };

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

  // ─── Shelf management handlers ─────────────────────────

  const openShelfModal = useCallback((shelf?: Collection) => {
    if (shelf) {
      setEditingShelf(shelf);
      setShelfName(shelf.name);
      setShelfDescription(shelf.description || '');
    } else {
      setEditingShelf(null);
      setShelfName('');
      setShelfDescription('');
    }
    setShowShelfModal(true);
  }, []);

  const handleSaveShelf = useCallback(async () => {
    if (!shelfName.trim()) return;
    try {
      if (editingShelf) {
        await databaseService.updateCollection(editingShelf.id, {
          name: shelfName.trim(),
          description: shelfDescription.trim() || undefined,
        });
      } else {
        await databaseService.createCollection({
          name: shelfName.trim(),
          description: shelfDescription.trim() || undefined,
          sortOrder: collections.length,
        });
      }
      setShowShelfModal(false);
      setEditingShelf(null);
      setShelfName('');
      setShelfDescription('');
      await loadFilterData();
    } catch (err) {
      console.error('Failed to save shelf:', err);
    }
  }, [shelfName, shelfDescription, editingShelf, collections.length]);

  const handleDeleteShelf = useCallback(async () => {
    if (!shelfToDelete) return;
    try {
      await databaseService.deleteCollection(shelfToDelete.id);
      if (filters.collectionId === shelfToDelete.id) {
        setFilters((prev) => ({ ...prev, collectionId: 'all' }));
      }
      setShelfToDelete(null);
      await loadFilterData();
      await loadBookMappings(books);
    } catch (err) {
      console.error('Failed to delete shelf:', err);
    }
  }, [shelfToDelete, filters.collectionId, setFilters, books]);

  const handleShelfLongPress = useCallback(
    (shelf: Collection, e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openShelfModal(shelf);
    },
    [openShelfModal]
  );

  // "Add to Shelf" handlers
  const openShelfAssign = useCallback(
    async (book: Book) => {
      // Find which shelves this book belongs to
      const ids: string[] = [];
      for (const [colId, bookIds] of Object.entries(bookCollectionMap)) {
        if (bookIds.includes(book.id)) ids.push(colId);
      }
      setBookShelfIds(ids);
      setShowShelfAssign(true);
    },
    [bookCollectionMap]
  );

  const toggleBookShelf = useCallback(
    async (collectionId: string) => {
      if (!selectedBook) return;
      const isIn = bookShelfIds.includes(collectionId);
      if (isIn) {
        await databaseService.removeBookFromCollection(selectedBook.id, collectionId);
        setBookShelfIds((prev) => prev.filter((id) => id !== collectionId));
      } else {
        await databaseService.addBookToCollection(selectedBook.id, collectionId);
        setBookShelfIds((prev) => [...prev, collectionId]);
      }
      // Update collection map
      setBookCollectionMap((prev) => {
        const updated = { ...prev };
        const list = updated[collectionId] ? [...updated[collectionId]] : [];
        if (isIn) {
          updated[collectionId] = list.filter((id) => id !== selectedBook.id);
        } else {
          updated[collectionId] = [...list, selectedBook.id];
        }
        return updated;
      });
    },
    [selectedBook, bookShelfIds]
  );

  // ─── Cover search handlers ─────────────────────────
  const openCoverSearch = useCallback((book: Book) => {
    setSelectedBook(book);
    const q = `${book.title} ${book.author !== 'Unknown' ? book.author : ''}`.trim();
    setCoverSearchQuery(q);
    setCoverResults([]);
    setShowCoverSearch(true);
    // Auto-search on open
    setTimeout(() => searchCovers(q), 300);
  }, []);

  const searchCovers = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setIsCoverSearching(true);
    setCoverResults([]);

    const results: Array<{ url: string; source: string; title?: string }> = [];

    // Search Google Books API
    try {
      const googleRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12`
      );
      const googleData = await googleRes.json();
      if (googleData.items) {
        for (const item of googleData.items) {
          const imageLinks = item.volumeInfo?.imageLinks;
          if (imageLinks) {
            // Prefer larger images
            const url = imageLinks.thumbnail || imageLinks.smallThumbnail;
            if (url) {
              // Get higher resolution by removing zoom parameter
              const hiRes = url
                .replace('zoom=1', 'zoom=3')
                .replace('&edge=curl', '')
                .replace('http://', 'https://');
              results.push({
                url: hiRes,
                source: 'Google Books',
                title: item.volumeInfo?.title,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Google Books cover search failed:', err);
    }

    // Search Open Library API
    try {
      const olRes = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,cover_i`
      );
      const olData = await olRes.json();
      if (olData.docs) {
        for (const doc of olData.docs) {
          if (doc.cover_i) {
            results.push({
              url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
              source: 'Open Library',
              title: doc.title,
            });
          }
        }
      }
    } catch (err) {
      console.error('Open Library cover search failed:', err);
    }

    setCoverResults(results);
    setIsCoverSearching(false);
  }, []);

  const selectCover = useCallback(async (coverUrl: string) => {
    if (!selectedBook || isSavingCover) return;
    setIsSavingCover(true);

    try {
      // Fetch the image and convert to data URL for persistence
      const response = await fetch(coverUrl);
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Update in database
      await databaseService.updateBook(selectedBook.id, { coverPath: dataUrl });

      // Update in store
      const updatedBooks = books.map((b) =>
        b.id === selectedBook.id ? { ...b, coverPath: dataUrl } : b
      );
      setBooks(updatedBooks);

      setShowCoverSearch(false);
      setToastColor('success');
      setToastMessage('Cover updated successfully');
    } catch (err) {
      console.error('Failed to save cover:', err);
      setToastColor('danger');
      setToastMessage('Failed to download cover image');
    } finally {
      setIsSavingCover(false);
    }
  }, [selectedBook, isSavingCover, books, setBooks]);

  const [importingCount, setImportingCount] = useState(0);

  const SUPPORTED_EXTENSIONS = new Set([
    '.epub', '.pdf', '.mobi', '.azw', '.azw3', '.fb2',
    '.cbz', '.cbr', '.txt', '.html', '.htm', '.md', '.docx', '.odt',
  ]);

  const importFiles = async (fileList: File[], resetKey: 'file' | 'folder') => {
    if (fileList.length === 0) return;
    setImportingCount(fileList.length);

    let imported = 0;
    const errors: string[] = [];

    for (const file of fileList) {
      try {
        await importBook(file);
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
    const supportedFiles = Array.from(files).filter((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return SUPPORTED_EXTENSIONS.has(ext);
    });

    if (supportedFiles.length === 0) {
      setToastColor('warning');
      setToastMessage('No supported ebook files found in selected folder');
      setFolderInputKey((prev) => prev + 1);
      return;
    }

    await importFiles(supportedFiles, 'folder');
  };

  /** Race a promise against a timeout. Returns null if the timeout fires first. */
  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> => {
    return Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  };

  const extractEpubMetadata = async (
    arrayBuffer: ArrayBuffer,
    fileName: string
  ): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
    try {
      const { makeBook } = await import('../../libs/foliate-js/view');
      // Use File instead of Blob - File has a name property that foliate-js needs
      const file = new File([arrayBuffer], fileName, { type: 'application/epub+zip' });

      let book;
      try {
        book = await withTimeout(makeBook(file), 8000);
      } catch (err) {
        // foliate-js internal errors (e.g., 'endsWith' on undefined) - fall back gracefully
        console.warn('foliate-js makeBook failed, using fallback metadata:', err);
        return null;
      }
      if (!book) return null;

      // Extract title — may be a string or a language map
      const rawTitle = book.metadata?.title;
      const title =
        typeof rawTitle === 'string'
          ? rawTitle
          : rawTitle && typeof rawTitle === 'object'
            ? (Object.values(rawTitle)[0] ?? '')
            : '';

      // Extract author — may be a string, object, or array
      const rawAuthor = book.metadata?.author;
      let author = '';
      if (typeof rawAuthor === 'string') {
        author = rawAuthor;
      } else if (Array.isArray(rawAuthor)) {
        author = rawAuthor
          .map((a: any) =>
            typeof a === 'string'
              ? a
              : typeof a?.name === 'string'
                ? a.name
                : (Object.values(a?.name ?? {})[0] ?? '')
          )
          .filter(Boolean)
          .join(', ');
      } else if (rawAuthor && typeof rawAuthor === 'object' && 'name' in rawAuthor) {
        const name = (rawAuthor as any).name;
        author = typeof name === 'string' ? name : ((Object.values(name ?? {})[0] as string) ?? '');
      }

      let coverDataUrl: string | undefined;
      try {
        if (book.getCover) {
          const coverBlob = await withTimeout(book.getCover(), 5000);
          if (coverBlob) {
            // Convert to data: URI so it persists across page reloads
            // (blob: URLs are ephemeral and die on reload)
            coverDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(coverBlob as Blob);
            });
          }
        }
      } catch {
        // Cover extraction is optional
      }

      if (book.destroy) book.destroy();

      return {
        title: title || '',
        author: author || 'Unknown',
        coverDataUrl,
      };
    } catch (err) {
      console.error('EPUB metadata extraction failed:', err);
      return null;
    }
  };

  const extractPdfMetadata = async (
    arrayBuffer: ArrayBuffer
  ): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const metadata = await pdf.getMetadata();
      const info = metadata.info as any;

      // Render first page as cover thumbnail
      let coverDataUrl: string | undefined;
      try {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
          coverDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        }
      } catch {
        // Cover extraction is optional
      }

      return {
        title: info?.Title || '',
        author: info?.Author || 'Unknown',
        coverDataUrl,
      };
    } catch (err) {
      console.error('PDF metadata extraction failed:', err);
      return null;
    }
  };

  const extractFb2Metadata = async (
    arrayBuffer: ArrayBuffer
  ): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
    try {
      const decoder = new TextDecoder();
      const xmlContent = decoder.decode(arrayBuffer);

      // Validate that it's FB2
      if (!fb2Service.isValidFb2(xmlContent)) {
        return null;
      }

      const metadata = fb2Service.extractFb2Metadata(xmlContent);
      const coverBase64 = fb2Service.extractCover(xmlContent);

      return {
        title: metadata.title || '',
        author: metadata.author || 'Unknown',
        coverDataUrl: coverBase64,
      };
    } catch (err) {
      console.error('FB2 metadata extraction failed:', err);
      return null;
    }
  };

  const extractOdtMetadata = async (
    arrayBuffer: ArrayBuffer
  ): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
    try {
      const metadata = await odtService.extractOdtMetadata(arrayBuffer);

      return {
        title: metadata.title || '',
        author: metadata.author || 'Unknown',
      };
    } catch (err) {
      console.error('ODT metadata extraction failed:', err);
      return null;
    }
  };

  const extractDocxMetadata = async (
    arrayBuffer: ArrayBuffer
  ): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
    try {
      const metadata = await docxService.extractDocxMetadata(arrayBuffer);

      return {
        title: metadata.title || '',
        author: metadata.author || 'Unknown',
      };
    } catch (err) {
      console.error('DOCX metadata extraction failed:', err);
      return null;
    }
  };

  const extractMobiMetadata = async (
    arrayBuffer: ArrayBuffer,
    fileName: string
  ): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
    try {
      const { makeBook } = await import('../../libs/foliate-js/view');
      // MOBI/AZW3 files use the MIME type application/x-mobipocket-ebook
      const file = new File([arrayBuffer], fileName, { type: 'application/x-mobipocket-ebook' });

      let book;
      try {
        book = await withTimeout(makeBook(file), 8000);
      } catch (err) {
        console.warn('foliate-js makeBook failed for MOBI/AZW3, using fallback metadata:', err);
        return null;
      }
      if (!book) return null;

      // Extract title — may be a string or a language map
      const rawTitle = book.metadata?.title;
      const title =
        typeof rawTitle === 'string'
          ? rawTitle
          : rawTitle && typeof rawTitle === 'object'
            ? (Object.values(rawTitle)[0] ?? '')
            : '';

      // Extract author — may be a string, object, or array
      const rawAuthor = book.metadata?.author;
      let author = '';
      if (typeof rawAuthor === 'string') {
        author = rawAuthor;
      } else if (Array.isArray(rawAuthor)) {
        author = rawAuthor
          .map((a: any) =>
            typeof a === 'string'
              ? a
              : typeof a?.name === 'string'
                ? a.name
                : (Object.values(a?.name ?? {})[0] ?? '')
          )
          .filter(Boolean)
          .join(', ');
      } else if (rawAuthor && typeof rawAuthor === 'object' && 'name' in rawAuthor) {
        const name = (rawAuthor as any).name;
        author = typeof name === 'string' ? name : ((Object.values(name ?? {})[0] as string) ?? '');
      }

      let coverDataUrl: string | undefined;
      try {
        if (book.getCover) {
          const coverBlob = await withTimeout(book.getCover(), 5000);
          if (coverBlob) {
            coverDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(coverBlob as Blob);
            });
          }
        }
      } catch {
        // Cover extraction is optional
      }

      if (book.destroy) book.destroy();

      return {
        title: title || '',
        author: author || 'Unknown',
        coverDataUrl,
      };
    } catch (err) {
      console.error('MOBI/AZW3 metadata extraction failed:', err);
      return null;
    }
  };

  const extractComicMetadata = async (
    arrayBuffer: ArrayBuffer,
    format: 'cbz' | 'cbr'
  ): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
    try {
      // Extract cover from comic archive
      const coverDataUrl = await comicService.extractComicCover(arrayBuffer, format);
      const pageCount = await comicService.getComicPageCount(arrayBuffer, format);

      return {
        title: '', // Comic archives typically don't have metadata, use filename
        author: 'Unknown',
        coverDataUrl: coverDataUrl || undefined,
      };
    } catch (err) {
      console.error('Comic metadata extraction failed:', err);
      return null;
    }
  };

  const computeFileHash = async (buffer: ArrayBuffer): Promise<string> => {
    const slice = buffer.slice(0, 8192); // First 8KB
    const hashBuffer = await crypto.subtle.digest('SHA-256', slice);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const checkForDuplicate = (title: string, author: string, fileHash?: string): Book | undefined => {
    return books.find(b => {
      // Check by file hash
      if (fileHash && b.fileHash && b.fileHash === fileHash) return true;
      // Check by title+author (case insensitive)
      if (
        b.title.toLowerCase() === title.toLowerCase() &&
        b.author.toLowerCase() === author.toLowerCase() &&
        author.toLowerCase() !== 'unknown'
      ) return true;
      return false;
    });
  };

  const importBook = async (file: File): Promise<void> => {
    // Validate File object to prevent crashes
    if (!file || !file.name) {
      throw new Error('Invalid file: file name is required');
    }

    const fileName = file.name.toLowerCase();
    let format: Book['format'] = 'txt';

    if (fileName.endsWith('.epub')) {
      format = 'epub';
    } else if (fileName.endsWith('.pdf')) {
      format = 'pdf';
    } else if (fileName.endsWith('.mobi')) {
      format = 'mobi';
    } else if (fileName.endsWith('.azw') || fileName.endsWith('.azw3')) {
      format = 'azw3';
    } else if (fileName.endsWith('.fb2')) {
      format = 'fb2';
    } else if (fileName.endsWith('.cbz')) {
      format = 'cbz';
    } else if (fileName.endsWith('.cbr')) {
      format = 'cbr';
    } else if (fileName.endsWith('.chm')) {
      throw new Error(chmService.getUnsupportedReason());
    } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      format = 'html';
    } else if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
      format = 'md';
    } else if (fileName.endsWith('.docx')) {
      format = 'docx';
    } else if (fileName.endsWith('.odt')) {
      format = 'odt';
    }

    // Generate UUID with fallback for browsers that don't support crypto.randomUUID()
    const generateUUID = (): string => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      // Fallback: generate a UUID v4
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
    const bookId = generateUUID();

    // Read the file into an ArrayBuffer first — this is the critical step
    const arrayBuffer = await file.arrayBuffer();

    // Store the file data in IndexedDB (web) so it persists across navigations/reloads
    await webFileStorage.storeFile(bookId, arrayBuffer);
    const filePath = `indexeddb://${bookId}/${file.name}`;

    // Extract metadata (best-effort, with timeout — don't block import on failure)
    let title = file.name.replace(/\.[^/.]+$/, '');
    let author = 'Unknown';
    let coverPath: string | undefined;

    try {
      if (format === 'epub') {
        const meta = await extractEpubMetadata(arrayBuffer, file.name);
        if (meta) {
          title = meta.title || title;
          author = meta.author || author;
          coverPath = meta.coverDataUrl;
        }
      } else if (format === 'pdf') {
        const meta = await extractPdfMetadata(arrayBuffer);
        if (meta) {
          title = meta.title || title;
          author = meta.author || author;
          coverPath = meta.coverDataUrl;
        }
      } else if (format === 'fb2') {
        const meta = await extractFb2Metadata(arrayBuffer);
        if (meta) {
          title = meta.title || title;
          author = meta.author || author;
          coverPath = meta.coverDataUrl;
        }
      } else if (format === 'cbz' || format === 'cbr') {
        const meta = await extractComicMetadata(arrayBuffer, format);
        if (meta) {
          author = meta.author || author;
          coverPath = meta.coverDataUrl;
        }
      } else if (format === 'mobi' || format === 'azw3') {
        const meta = await extractMobiMetadata(arrayBuffer, file.name);
        if (meta) {
          title = meta.title || title;
          author = meta.author || author;
          coverPath = meta.coverDataUrl;
        }
      } else if (format === 'docx') {
        const meta = await extractDocxMetadata(arrayBuffer);
        if (meta) {
          title = meta.title || title;
          author = meta.author || author;
        }
      } else if (format === 'odt') {
        const meta = await extractOdtMetadata(arrayBuffer);
        if (meta) {
          title = meta.title || title;
          author = meta.author || author;
        }
      }
    } catch (err) {
      console.error('Metadata extraction failed, using filename:', err);
    }

    // Compute file hash for duplicate detection
    let fileHash: string | undefined;
    try {
      fileHash = await computeFileHash(arrayBuffer);
    } catch { /* hash is optional */ }

    // Check for duplicates
    const existingDuplicate = checkForDuplicate(title, author, fileHash);
    if (existingDuplicate) {
      const shouldContinue = window.confirm(
        `"${file.name}" appears to match "${existingDuplicate.title}" by ${existingDuplicate.author} already in your library.\n\nImport anyway?`
      );
      if (!shouldContinue) {
        await webFileStorage.deleteFile(bookId);
        return;
      }
    }

    const newBook: Book = {
      id: bookId,
      title,
      author,
      filePath,
      coverPath,
      format,
      fileHash,
      totalPages: 0,
      currentPage: 0,
      progress: 0,
      lastRead: new Date(),
      dateAdded: new Date(),
      source: 'local',
      downloaded: true,
    };

    await databaseService.addBook(newBook);

    // Immediately update the store so the book appears in the library without waiting for full reload
    const currentBooks = useAppStore.getState().books;
    setBooks([newBook, ...currentBooks]);

    // Fetch metadata from online APIs and update both DB and store
    metadataLookupService.fetchBookMetadata(title, author).then(async (meta) => {
      if (meta) {
        await databaseService.updateBookMetadata(bookId, meta);
        // Auto-fetch cover if book has none and metadata has a cover URL
        let fetchedCoverPath: string | undefined;
        if (!newBook.coverPath && meta.coverUrl) {
          try {
            const resp = await fetch(meta.coverUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              fetchedCoverPath = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              await databaseService.updateBook(bookId, { coverPath: fetchedCoverPath });
            }
          } catch {
            // Cover fetch is optional
          }
        }
        // Update the book in the store with genre/metadata
        const updatedBooks = useAppStore.getState().books.map((b) =>
          b.id === bookId
            ? {
                ...b,
                ...(fetchedCoverPath ? { coverPath: fetchedCoverPath } : {}),
                genre: meta.genre,
                subgenres: meta.subgenres,
                metadata: { ...b.metadata, ...meta },
              }
            : b
        );
        setBooks(updatedBooks);
      }
    });
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

  const toggleTagFilter = useCallback((tagId: string) => {
    setFilters((prev) => {
      const isActive = prev.tagIds.includes(tagId);
      return {
        ...prev,
        tagIds: isActive ? prev.tagIds.filter((id) => id !== tagId) : [...prev.tagIds, tagId],
      };
    });
  }, []);

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
                {renderStarRating(book, 12)}
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
            {renderStarRating(book, 13)}
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

  const renderFilterPanel = () => (
    <IonModal
      isOpen={showFilterPanel}
      onDidDismiss={() => setShowFilterPanel(false)}
      breakpoints={[0, 0.6, 0.9]}
      initialBreakpoint={0.6}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Filter Books</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowFilterPanel(false)}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonItem>
            <IonLabel>Format</IonLabel>
            <IonSelect
              value={filters.format}
              onIonChange={(e) => setFilters((prev) => ({ ...prev, format: e.detail.value }))}
              slot="end"
            >
              <IonSelectOption value="all">All</IonSelectOption>
              <IonSelectOption value="epub">EPUB</IonSelectOption>
              <IonSelectOption value="pdf">PDF</IonSelectOption>
              <IonSelectOption value="mobi">MOBI</IonSelectOption>
              <IonSelectOption value="txt">TXT</IonSelectOption>
              <IonSelectOption value="fb2">FB2</IonSelectOption>
              <IonSelectOption value="docx">DOCX</IonSelectOption>
              <IonSelectOption value="odt">ODT</IonSelectOption>
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonLabel>Read Status</IonLabel>
            <IonSelect
              value={filters.readStatus}
              onIonChange={(e) =>
                setFilters((prev) => ({ ...prev, readStatus: e.detail.value as ReadStatus }))
              }
              slot="end"
            >
              <IonSelectOption value="all">All</IonSelectOption>
              <IonSelectOption value="unread">Unread</IonSelectOption>
              <IonSelectOption value="reading">In Progress</IonSelectOption>
              <IonSelectOption value="finished">Finished</IonSelectOption>
              <IonSelectOption value="dnf">Did Not Finish</IonSelectOption>
            </IonSelect>
          </IonItem>

          {collections.length > 0 && (
            <IonItem>
              <IonLabel>Collection</IonLabel>
              <IonSelect
                value={filters.collectionId}
                onIonChange={(e) =>
                  setFilters((prev) => ({ ...prev, collectionId: e.detail.value }))
                }
                slot="end"
              >
                <IonSelectOption value="all">All Collections</IonSelectOption>
                {collections.map((col) => (
                  <IonSelectOption key={col.id} value={col.id}>
                    {col.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          )}
        </IonList>

        {allTags.length > 0 && (
          <div style={{ padding: '8px 16px' }}>
            <IonLabel
              style={{
                fontSize: '14px',
                color: 'var(--ion-color-medium)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Tags
            </IonLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {allTags.map((tag) => (
                <IonChip
                  key={tag.id}
                  outline={!filters.tagIds.includes(tag.id)}
                  color={filters.tagIds.includes(tag.id) ? 'primary' : undefined}
                  onClick={() => toggleTagFilter(tag.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {tag.name}
                </IonChip>
              ))}
            </div>
          </div>
        )}
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButton
            expand="block"
            fill="outline"
            color="medium"
            onClick={clearAllFilters}
            style={{ margin: '8px' }}
          >
            Clear All Filters
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  );

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
                <IonChip key={tagId} color="primary" onClick={() => toggleTagFilter(tagId)}>
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

      {/* Bulk select action bar */}
      {bulkSelectMode && selectedBookIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--ion-toolbar-background, var(--ion-color-primary))',
            color: '#fff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10000,
            boxShadow: '0 -2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {selectedBookIds.size} selected
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <IonButton
              fill="solid"
              color="light"
              size="small"
              onClick={() => {
                setBulkGenre('');
                setBulkRating(0);
                setBulkSeries('');
                setBulkLanguage('');
                setBulkReadStatus('');
                setShowBulkEditSheet(true);
              }}
            >
              <IonIcon icon={createOutline} slot="start" />
              Edit
            </IonButton>
            <IonButton
              fill="outline"
              color="light"
              size="small"
              onClick={() => {
                setSelectedBookIds(new Set(filteredBooks.map(b => b.id)));
              }}
            >
              Select All
            </IonButton>
          </div>
        </div>
      )}

      {/* Bulk Metadata Edit Modal */}
      <IonModal
        isOpen={showBulkEditSheet}
        onDidDismiss={() => setShowBulkEditSheet(false)}
        breakpoints={[0, 0.65]}
        initialBreakpoint={0.65}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Bulk Edit ({selectedBookIds.size} books)</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowBulkEditSheet(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p style={{ fontSize: 13, color: 'var(--ion-color-medium)', margin: '0 0 12px' }}>
            Only filled fields will be applied. Leave blank to skip.
          </p>
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Genre</IonLabel>
              <IonInput
                value={bulkGenre}
                onIonInput={(e) => setBulkGenre(e.detail.value || '')}
                placeholder="e.g. Fiction, Science"
                clearInput
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Series</IonLabel>
              <IonInput
                value={bulkSeries}
                onIonInput={(e) => setBulkSeries(e.detail.value || '')}
                placeholder="e.g. Harry Potter"
                clearInput
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Language</IonLabel>
              <IonInput
                value={bulkLanguage}
                onIonInput={(e) => setBulkLanguage(e.detail.value || '')}
                placeholder="e.g. en, fr, de"
                clearInput
              />
            </IonItem>
            <IonItem>
              <IonLabel>Read Status</IonLabel>
              <IonSelect
                value={bulkReadStatus}
                onIonChange={(e) => setBulkReadStatus(e.detail.value)}
                placeholder="No change"
              >
                <IonSelectOption value="">No change</IonSelectOption>
                <IonSelectOption value="unread">Unread</IonSelectOption>
                <IonSelectOption value="reading">Reading</IonSelectOption>
                <IonSelectOption value="finished">Finished</IonSelectOption>
                <IonSelectOption value="dnf">DNF</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel>Rating</IonLabel>
              <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <IonIcon
                    key={s}
                    icon={s <= bulkRating ? star : starOutline}
                    style={{
                      fontSize: 24,
                      color: s <= bulkRating ? '#f5a623' : 'var(--ion-color-medium)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setBulkRating(s === bulkRating ? 0 : s)}
                  />
                ))}
              </div>
            </IonItem>
          </IonList>
          <IonButton
            expand="block"
            style={{ marginTop: 16 }}
            onClick={handleBulkEdit}
            disabled={isBulkSaving}
          >
            {isBulkSaving ? <IonSpinner name="dots" /> : `Apply to ${selectedBookIds.size} Books`}
          </IonButton>
        </IonContent>
      </IonModal>

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

      {renderFilterPanel()}

      <IonActionSheet
        isOpen={showActionSheet}
        onDidDismiss={() => setShowActionSheet(false)}
        header={selectedBook?.title}
        buttons={[
          {
            text: 'Book Details',
            icon: informationCircleOutline,
            handler: () => {
              if (selectedBook) {
                setDetailSeriesName(selectedBook.series || selectedBook.metadata?.series || '');
                setDetailSeriesIndex(
                  String(selectedBook.seriesIndex ?? selectedBook.metadata?.seriesIndex ?? '')
                );
              }
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

      <IonModal isOpen={showBookDetails} onDidDismiss={() => setShowBookDetails(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Book Details</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowBookDetails(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedBook && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Cover image */}
              {selectedBook.coverPath && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <img
                    src={selectedBook.coverPath}
                    alt={selectedBook.title}
                    style={{ maxWidth: '200px', maxHeight: '300px', objectFit: 'contain' }}
                  />
                </div>
              )}

              {/* Title and Author */}
              <div>
                <h2 style={{ margin: '0 0 8px 0' }}>{selectedBook.title}</h2>
                <p style={{ margin: '0', color: 'var(--ion-color-medium)' }}>
                  {selectedBook.author}
                </p>
                <div style={{ marginTop: '8px' }}>
                  {renderStarRating(selectedBook, 22)}
                </div>
              </div>

              {/* User Review */}
              {selectedBook.review && (
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
                    "{selectedBook.review}"
                  </p>
                </div>
              )}

              {/* Description */}
              {selectedBook.metadata?.description && (
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
                    {selectedBook.metadata.description}
                  </p>
                </div>
              )}

              {/* Details */}
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h3>Format</h3>
                    <p>{selectedBook.format?.toUpperCase()}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>Pages</h3>
                    <p>{selectedBook.totalPages || 'Unknown'}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>Progress</h3>
                    <p>{Math.min(100, Math.round(selectedBook.progress * 100))}%</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>Date Added</h3>
                    <p>
                      {selectedBook.dateAdded instanceof Date
                        ? selectedBook.dateAdded.toLocaleDateString()
                        : 'Unknown'}
                    </p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>Last Read</h3>
                    <p>
                      {selectedBook.lastRead instanceof Date
                        ? selectedBook.lastRead.toLocaleDateString()
                        : 'Never'}
                    </p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>Source</h3>
                    <p>{selectedBook.source || 'local'}</p>
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
                  onClick={async () => {
                    if (!selectedBook) return;
                    setSeriesSaving(true);
                    try {
                      const seriesVal = detailSeriesName.trim() || undefined;
                      const indexVal = detailSeriesIndex ? parseFloat(detailSeriesIndex) : undefined;
                      await databaseService.updateBook(selectedBook.id, {
                        series: seriesVal,
                        seriesIndex: indexVal,
                      } as any);
                      await databaseService.updateBookMetadata(selectedBook.id, {
                        series: seriesVal,
                        seriesIndex: indexVal,
                      });
                      // Reload books
                      const loadedBooks = await databaseService.getAllBooks();
                      setBooks(loadedBooks);
                      setToastColor('success');
                      setToastMessage('Series info updated');
                    } catch (err) {
                      console.error('Failed to save series info:', err);
                      setToastColor('danger');
                      setToastMessage('Failed to update series info');
                    } finally {
                      setSeriesSaving(false);
                    }
                  }}
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
                  onClick={async () => {
                    if (!selectedBook) return;
                    setIsFindingSimilar(true);
                    setSimilarBooks([]);
                    try {
                      const subjects = selectedBook.subgenres?.length
                        ? selectedBook.subgenres
                        : selectedBook.genre
                          ? [selectedBook.genre]
                          : selectedBook.metadata?.genres || [];
                      const results = await metadataLookupService.fetchSimilarBooks(
                        subjects.length > 0 ? subjects : [selectedBook.author]
                      );
                      setSimilarBooks(results);
                    } catch {
                      setToastColor('danger');
                      setToastMessage('Failed to find similar books');
                    } finally {
                      setIsFindingSimilar(false);
                    }
                  }}
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
                if (selectedBook) {
                  setShowBookDetails(false);
                  handleBookClick(selectedBook);
                }
              }}
            >
              Open Book
            </IonButton>
          </IonToolbar>
        </IonFooter>
      </IonModal>

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

      {/* Create/Edit Shelf Modal */}
      <IonModal isOpen={showShelfModal} onDidDismiss={() => setShowShelfModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{editingShelf ? 'Edit Shelf' : 'New Shelf'}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowShelfModal(false)}>Cancel</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Shelf Name *</IonLabel>
            <IonInput
              value={shelfName}
              onIonInput={(e) => setShelfName(e.detail.value || '')}
              placeholder="e.g. Sci-Fi, Work, Summer Reading"
              clearInput
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Description</IonLabel>
            <IonInput
              value={shelfDescription}
              onIonInput={(e) => setShelfDescription(e.detail.value || '')}
              placeholder="Optional description"
              clearInput
            />
          </IonItem>
          <div className="ion-padding">
            <IonButton expand="block" onClick={handleSaveShelf} disabled={!shelfName.trim()}>
              {editingShelf ? 'Save Changes' : 'Create Shelf'}
            </IonButton>
            {editingShelf && (
              <IonButton
                expand="block"
                fill="outline"
                color="danger"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setShelfToDelete(editingShelf);
                  setShowDeleteShelfAlert(true);
                  setShowShelfModal(false);
                }}
              >
                <IonIcon icon={trashOutline} slot="start" />
                Delete Shelf
              </IonButton>
            )}
          </div>
        </IonContent>
      </IonModal>

      {/* Delete Shelf Alert */}
      <IonAlert
        isOpen={showDeleteShelfAlert}
        onDidDismiss={() => {
          setShowDeleteShelfAlert(false);
          setShelfToDelete(null);
        }}
        header="Delete Shelf"
        message={`Delete "${shelfToDelete?.name}"? Books in this shelf will not be deleted.`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Delete',
            role: 'destructive',
            handler: handleDeleteShelf,
          },
        ]}
      />

      {/* Add to Shelf Modal */}
      <IonModal
        isOpen={showShelfAssign}
        onDidDismiss={() => setShowShelfAssign(false)}
        breakpoints={[0, 0.5, 0.85]}
        initialBreakpoint={0.5}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Add to Shelf</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowShelfAssign(false)}>Done</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            {collections.map((shelf) => (
              <IonItem key={shelf.id} button onClick={() => toggleBookShelf(shelf.id)}>
                <IonCheckbox
                  slot="start"
                  checked={bookShelfIds.includes(shelf.id)}
                />
                <IonLabel>{shelf.name}</IonLabel>
              </IonItem>
            ))}
          </IonList>
          {collections.length === 0 && (
            <div className="ion-padding ion-text-center">
              <p>No shelves yet</p>
              <IonButton
                fill="outline"
                onClick={() => {
                  setShowShelfAssign(false);
                  openShelfModal();
                }}
              >
                Create a Shelf
              </IonButton>
            </div>
          )}
        </IonContent>
      </IonModal>

      {/* Cover Search Modal */}
      <IonModal isOpen={showCoverSearch} onDidDismiss={() => setShowCoverSearch(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Download Cover</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowCoverSearch(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
          <IonToolbar>
            <IonSearchbar
              value={coverSearchQuery}
              onIonInput={(e) => setCoverSearchQuery(e.detail.value ?? '')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') searchCovers(coverSearchQuery);
              }}
              placeholder="Search by title or author..."
            />
            <IonButtons slot="end">
              <IonButton
                onClick={() => searchCovers(coverSearchQuery)}
                disabled={isCoverSearching || !coverSearchQuery.trim()}
              >
                <IonIcon icon={searchOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {isCoverSearching && (
            <div className="cover-search-loading">
              <IonSpinner name="crescent" />
              <p>Searching for covers...</p>
            </div>
          )}

          {!isCoverSearching && coverResults.length === 0 && coverSearchQuery && (
            <div className="cover-search-empty">
              <IonIcon icon={imageOutline} />
              <p>Press search to find covers</p>
            </div>
          )}

          {isSavingCover && (
            <div className="cover-search-loading">
              <IonSpinner name="crescent" />
              <p>Saving cover...</p>
            </div>
          )}

          {coverResults.length > 0 && !isSavingCover && (
            <div className="cover-search-grid">
              {coverResults.map((cover, index) => (
                <div
                  key={`${cover.source}-${index}`}
                  className="cover-search-item"
                  onClick={() => selectCover(cover.url)}
                >
                  <img
                    src={cover.url}
                    alt={cover.title || 'Book cover'}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="cover-search-item-info">
                    {cover.title && <span className="cover-search-item-title">{cover.title}</span>}
                    <span className="cover-search-item-source">{cover.source}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </IonContent>
      </IonModal>

      {/* Smart Shelf Editor Modal */}
      <SmartShelfEditor
        isOpen={showSmartShelfEditor}
        shelf={editingSmartShelf}
        onSave={handleSaveSmartShelf}
        onDelete={handleDeleteSmartShelf}
        onDismiss={() => {
          setShowSmartShelfEditor(false);
          setEditingSmartShelf(null);
        }}
      />

      {/* Manage Shelves Modal */}
      <IonModal isOpen={showManageShelves} onDidDismiss={() => setShowManageShelves(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Manage Shelves</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowManageShelves(false)}>Done</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {/* Collections section */}
          <div style={{ padding: '16px 16px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Collections</h2>
              <IonButton
                fill="clear"
                size="small"
                onClick={() => { setShowManageShelves(false); openShelfModal(); }}
              >
                <IonIcon icon={addOutline} slot="start" />
                Add
              </IonButton>
            </div>
          </div>
          <IonList>
            {collections.length === 0 && (
              <IonItem>
                <IonLabel color="medium">No collections yet</IonLabel>
              </IonItem>
            )}
            {collections.map((shelf) => (
              <IonItem key={shelf.id}>
                <IonLabel>
                  <h3>{shelf.name}</h3>
                  {shelf.description && <p>{shelf.description}</p>}
                  <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                    {bookCollectionMap[shelf.id]?.length || 0} book{(bookCollectionMap[shelf.id]?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </IonLabel>
                <IonButton
                  fill="clear"
                  slot="end"
                  onClick={() => { setShowManageShelves(false); openShelfModal(shelf); }}
                >
                  <IonIcon icon={createOutline} />
                </IonButton>
                <IonButton
                  fill="clear"
                  color="danger"
                  slot="end"
                  onClick={() => {
                    setShelfToDelete(shelf);
                    setShowDeleteShelfAlert(true);
                    setShowManageShelves(false);
                  }}
                >
                  <IonIcon icon={trashOutline} />
                </IonButton>
              </IonItem>
            ))}
          </IonList>

          {/* Smart Shelves section */}
          <div style={{ padding: '16px 16px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                <IonIcon icon={sparklesOutline} style={{ marginRight: 6, verticalAlign: 'middle', fontSize: '16px' }} />
                Smart Shelves
              </h2>
              <IonButton
                fill="clear"
                size="small"
                onClick={() => { setShowManageShelves(false); setEditingSmartShelf(null); setShowSmartShelfEditor(true); }}
              >
                <IonIcon icon={addOutline} slot="start" />
                Add
              </IonButton>
            </div>
          </div>
          <IonList>
            {smartShelves.length === 0 && (
              <IonItem>
                <IonLabel color="medium">No smart shelves yet</IonLabel>
              </IonItem>
            )}
            {smartShelves.map((shelf) => (
              <IonItem key={shelf.id}>
                <IonLabel>
                  <h3>{shelf.name}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                    {shelf.rules.length} rule{shelf.rules.length !== 1 ? 's' : ''}
                    {' · '}
                    {evaluateShelf(shelf, books).length} book{evaluateShelf(shelf, books).length !== 1 ? 's' : ''}
                    {shelf.isDefault && ' · Default'}
                  </p>
                </IonLabel>
                <IonButton
                  fill="clear"
                  slot="end"
                  onClick={() => { setShowManageShelves(false); setEditingSmartShelf(shelf); setShowSmartShelfEditor(true); }}
                >
                  <IonIcon icon={createOutline} />
                </IonButton>
                {!shelf.isDefault && (
                  <IonButton
                    fill="clear"
                    color="danger"
                    slot="end"
                    onClick={() => { removeSmartShelf(shelf.id); }}
                  >
                    <IonIcon icon={trashOutline} />
                  </IonButton>
                )}
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default Library;
