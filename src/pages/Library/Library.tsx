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
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { databaseService } from '../../services/database';
import { webFileStorage } from '../../services/webFileStorage';
import { fb2Service } from '../../services/fb2Service';
import { chmService } from '../../services/chmService';
import type { Book, Collection } from '../../types/index';
import { useLibraryPrefsStore, DEFAULT_FILTERS, type SortOption, type ReadStatus } from '../../stores/useLibraryPrefsStore';
import './Library.css';

const Library: React.FC = () => {
  const history = useHistory();
  const { books, setBooks, setCurrentBook } = useAppStore();
  const { viewMode, setViewMode, sortBy, setSortBy, filters, setFilters } = useLibraryPrefsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<string>('danger');

  // Advanced filter state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allTags, setAllTags] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [bookTagMap, setBookTagMap] = useState<Record<string, string[]>>({});
  const [bookCollectionMap, setBookCollectionMap] = useState<Record<string, string[]>>({});

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

  const activeFilterCount = (
    (filters.format !== 'all' ? 1 : 0) +
    (filters.collectionId !== 'all' ? 1 : 0) +
    (filters.readStatus !== 'all' ? 1 : 0) +
    filters.tagIds.length
  );

  const sortBooks = (booksToSort: Book[], option: SortOption): Book[] => {
    const sorted = [...booksToSort];
    switch (option) {
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'author':
        return sorted.sort((a, b) => a.author.localeCompare(b.author));
      case 'dateAdded':
        return sorted.sort((a, b) => {
          const aTime = a.dateAdded instanceof Date ? a.dateAdded.getTime() : 0;
          const bTime = b.dateAdded instanceof Date ? b.dateAdded.getTime() : 0;
          return bTime - aTime;
        });
      case 'lastRead':
        return sorted.sort((a, b) => {
          const aTime = a.lastRead instanceof Date ? a.lastRead.getTime() : 0;
          const bTime = b.lastRead instanceof Date ? b.lastRead.getTime() : 0;
          return bTime - aTime;
        });
      default:
        return sorted;
    }
  };

  // Load books on mount
  useEffect(() => {
    loadBooks();
    loadFilterData();
  }, []);

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
    let result = [...books];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        book =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query)
      );
    }

    // Apply format filter
    if (filters.format !== 'all') {
      result = result.filter(book => book.format === filters.format);
    }

    // Apply read status filter
    if (filters.readStatus !== 'all') {
      result = result.filter(book => {
        const prog = book.progress ?? 0;
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
      result = result.filter(book => booksInCollection.includes(book.id));
    }

    // Apply tag filter
    if (filters.tagIds.length > 0) {
      result = result.filter(book => {
        const bookTags = bookTagMap[book.id] || [];
        return filters.tagIds.every(tagId => bookTags.includes(tagId));
      });
    }

    // Apply sorting
    return sortBooks(result, sortBy);
  }, [books, searchQuery, sortBy, filters, bookTagMap, bookCollectionMap]);

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      await databaseService.initDatabase();
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

      // Load collections to build reverse map (collectionId -> bookIds)
      const cols = await databaseService.getAllCollections();
      for (const col of cols) {
        const booksInCol = await databaseService.getBooksInCollection(col.id);
        colMap[col.id] = booksInCol.map(b => b.id);
      }

      // Load tags for each book (limit to web platform gracefully)
      for (const book of loadedBooks) {
        try {
          const tags = await databaseService.getBookTags(book.id);
          if (tags.length > 0) {
            tagMap[book.id] = tags.map((t: any) => t.id);
          }
        } catch {
          // Non-critical
        }
      }

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
  }, [shelfName, shelfDescription, editingShelf, collections.length]);

  const handleDeleteShelf = useCallback(async () => {
    if (!shelfToDelete) return;
    await databaseService.deleteCollection(shelfToDelete.id);
    if (filters.collectionId === shelfToDelete.id) {
      setFilters(prev => ({ ...prev, collectionId: 'all' }));
    }
    setShelfToDelete(null);
    await loadFilterData();
    await loadBookMappings(books);
  }, [shelfToDelete, filters.collectionId, setFilters, books]);

  const handleShelfLongPress = useCallback((shelf: Collection, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openShelfModal(shelf);
  }, [openShelfModal]);

  // "Add to Shelf" handlers
  const openShelfAssign = useCallback(async (book: Book) => {
    // Find which shelves this book belongs to
    const ids: string[] = [];
    for (const [colId, bookIds] of Object.entries(bookCollectionMap)) {
      if (bookIds.includes(book.id)) ids.push(colId);
    }
    setBookShelfIds(ids);
    setShowShelfAssign(true);
  }, [bookCollectionMap]);

  const toggleBookShelf = useCallback(async (collectionId: string) => {
    if (!selectedBook) return;
    const isIn = bookShelfIds.includes(collectionId);
    if (isIn) {
      await databaseService.removeBookFromCollection(selectedBook.id, collectionId);
      setBookShelfIds(prev => prev.filter(id => id !== collectionId));
    } else {
      await databaseService.addBookToCollection(selectedBook.id, collectionId);
      setBookShelfIds(prev => [...prev, collectionId]);
    }
    // Update collection map
    setBookCollectionMap(prev => {
      const updated = { ...prev };
      const list = updated[collectionId] ? [...updated[collectionId]] : [];
      if (isIn) {
        updated[collectionId] = list.filter(id => id !== selectedBook.id);
      } else {
        updated[collectionId] = [...list, selectedBook.id];
      }
      return updated;
    });
  }, [selectedBook, bookShelfIds]);

  const [importingCount, setImportingCount] = useState(0);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
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
    // Reset input to allow importing the same file again
    setFileInputKey(prev => prev + 1);
    await loadBooks();

    if (errors.length > 0) {
      setToastColor('danger');
      setToastMessage(`Failed to import: ${errors.join('; ')}`);
    } else if (imported > 0) {
      setToastColor('success');
      setToastMessage(`Imported ${imported} book${imported > 1 ? 's' : ''} successfully`);
    }
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
      const { makeBook } = await import('foliate-js/view.js');
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
      const title = typeof rawTitle === 'string'
        ? rawTitle
        : rawTitle && typeof rawTitle === 'object'
          ? Object.values(rawTitle)[0] ?? ''
          : '';

      // Extract author — may be a string, object, or array
      const rawAuthor = book.metadata?.author;
      let author = '';
      if (typeof rawAuthor === 'string') {
        author = rawAuthor;
      } else if (Array.isArray(rawAuthor)) {
        author = rawAuthor
          .map((a: any) => typeof a === 'string' ? a : typeof a?.name === 'string' ? a.name : Object.values(a?.name ?? {})[0] ?? '')
          .filter(Boolean)
          .join(', ');
      } else if (rawAuthor && typeof rawAuthor === 'object' && 'name' in rawAuthor) {
        const name = (rawAuthor as any).name;
        author = typeof name === 'string' ? name : Object.values(name ?? {})[0] as string ?? '';
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
    } else if (fileName.endsWith('.fb2')) {
      format = 'fb2';
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
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
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
      }
    } catch (err) {
      console.error('Metadata extraction failed, using filename:', err);
    }

    const newBook: Book = {
      id: bookId,
      title,
      author,
      filePath,
      coverPath,
      format,
      totalPages: 100,
      currentPage: 0,
      progress: 0,
      lastRead: new Date(),
      dateAdded: new Date(),
      source: 'local',
      downloaded: true,
    };

    await databaseService.addBook(newBook);
  };

  const handleDeleteBook = async () => {
    if (selectedBook) {
      try {
        await databaseService.deleteBook(selectedBook.id);
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
        return 'tertiary';
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
    setFilters(prev => {
      const isActive = prev.tagIds.includes(tagId);
      return {
        ...prev,
        tagIds: isActive ? prev.tagIds.filter(id => id !== tagId) : [...prev.tagIds, tagId],
      };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

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
        {filteredBooks.map(book => (
          <IonCol size="6" sizeMd="4" sizeLg="3" key={book.id}>
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
                    <IonText color="medium">
                      <p>{book.format.toUpperCase()}</p>
                    </IonText>
                  </div>
                )}
                {book.progress > 0 && (
                  <div className="book-progress-overlay">
                    <div
                      className="book-progress-bar"
                      style={{ width: `${getProgressWidth(book)}%` }}
                    />
                  </div>
                )}
                {renderDownloadBadge(book)}
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
              </IonCardHeader>
            </IonCard>
          </IonCol>
        ))}
      </IonRow>
    </IonGrid>
  );

  const renderListView = () => (
    <IonList className="book-list">
      {filteredBooks.map(book => (
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
            {book.progress > 0 && (
              <div className="book-progress-container">
                <div className="book-progress-bar-small">
                  <div
                    className="book-progress-fill"
                    style={{ width: `${getProgressWidth(book)}%` }}
                  />
                </div>
                <IonText color="medium" className="book-progress-text">
                  {Math.round(book.progress * 100)}%
                </IonText>
              </div>
            )}
          </IonLabel>
          <IonChip
            outline={true}
            color={getFormatColor(book.format)}
            slot="end"
          >
            {book.format.toUpperCase()}
          </IonChip>
        </IonItem>
      ))}
    </IonList>
  );

  const renderEmptyState = () => (
    <div className="empty-state">
      <IonIcon icon={bookOutline} className="empty-state-icon" />
      <h2>No books yet</h2>
      <p>Import your first ebook to get started</p>
      <IonButton fill="clear" onClick={() => document.getElementById('file-input')?.click()}>
        <IonIcon slot="icon-only" icon={addOutline} />
      </IonButton>
    </div>
  );

  const renderContinueReading = () => {
    const recentBooks = filteredBooks
      .filter(b => b.progress > 0 && b.progress < 1)
      .sort((a, b) => {
        const aTime = a.lastRead instanceof Date ? a.lastRead.getTime() : 0;
        const bTime = b.lastRead instanceof Date ? b.lastRead.getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 3);

    if (recentBooks.length === 0) return null;

    return (
      <div className="continue-reading-section">
        <h3>Continue Reading</h3>
        <IonRow>
          {recentBooks.map(book => (
            <IonCol size="4" key={`continue-${book.id}`}>
              <div
                className="continue-reading-card"
                onClick={() => handleBookClick(book)}
              >
                <div className="continue-reading-cover">
                  {book.coverPath ? (
                    <img src={book.coverPath} alt={book.title} />
                  ) : (
                    <div className="continue-reading-placeholder">
                      <IonIcon icon={bookOutline} />
                    </div>
                  )}
                  <div className="continue-reading-progress">
                    {Math.round(book.progress * 100)}%
                  </div>
                </div>
                <IonText className="continue-reading-title">
                  <p>{book.title}</p>
                </IonText>
              </div>
            </IonCol>
          ))}
        </IonRow>
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
              onIonChange={e => setFilters(prev => ({ ...prev, format: e.detail.value }))}
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
              onIonChange={e => setFilters(prev => ({ ...prev, readStatus: e.detail.value as ReadStatus }))}
              slot="end"
            >
              <IonSelectOption value="all">All</IonSelectOption>
              <IonSelectOption value="unread">Unread</IonSelectOption>
              <IonSelectOption value="reading">In Progress</IonSelectOption>
              <IonSelectOption value="finished">Finished</IonSelectOption>
            </IonSelect>
          </IonItem>

          {collections.length > 0 && (
            <IonItem>
              <IonLabel>Collection</IonLabel>
              <IonSelect
                value={filters.collectionId}
                onIonChange={e => setFilters(prev => ({ ...prev, collectionId: e.detail.value }))}
                slot="end"
              >
                <IonSelectOption value="all">All Collections</IonSelectOption>
                {collections.map(col => (
                  <IonSelectOption key={col.id} value={col.id}>{col.name}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          )}
        </IonList>

        {allTags.length > 0 && (
          <div style={{ padding: '8px 16px' }}>
            <IonLabel style={{ fontSize: '14px', color: 'var(--ion-color-medium)', display: 'block', marginBottom: '8px' }}>
              Tags
            </IonLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {allTags.map(tag => (
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

  const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim() !== '';

  return (
    <IonPage className="library-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Library</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowFilterPanel(true)}>
              <IonIcon icon={filterOutline} />
              {activeFilterCount > 0 && (
                <IonBadge color="primary" style={{ position: 'absolute', top: 4, right: 4, fontSize: '10px' }}>
                  {activeFilterCount}
                </IonBadge>
              )}
            </IonButton>
            <IonButton onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              <IonIcon icon={viewMode === 'grid' ? listOutline : gridOutline} />
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
            onIonInput={e => setSearchQuery(e.detail.value || '')}
            placeholder="Search books..."
            animated
          />

          <div className="library-filters">
            <IonSelect
              value={sortBy}
              onIonChange={e => setSortBy(e.detail.value as SortOption)}
              label="Sort by"
              labelPlacement="start"
            >
              <IonSelectOption value="dateAdded">Date Added</IonSelectOption>
              <IonSelectOption value="title">Title</IonSelectOption>
              <IonSelectOption value="author">Author</IonSelectOption>
              <IonSelectOption value="lastRead">Last Read</IonSelectOption>
            </IonSelect>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="active-filters">
              {filters.format !== 'all' && (
                <IonChip color="primary" onClick={() => setFilters(p => ({ ...p, format: 'all' }))}>
                  {filters.format.toUpperCase()}
                  <IonIcon icon={closeOutline} />
                </IonChip>
              )}
              {filters.readStatus !== 'all' && (
                <IonChip color="primary" onClick={() => setFilters(p => ({ ...p, readStatus: 'all' }))}>
                  {filters.readStatus === 'unread' ? 'Unread' : filters.readStatus === 'reading' ? 'In Progress' : 'Finished'}
                  <IonIcon icon={closeOutline} />
                </IonChip>
              )}
              {filters.collectionId !== 'all' && (
                <IonChip color="primary" onClick={() => setFilters(p => ({ ...p, collectionId: 'all' }))}>
                  {collections.find(c => c.id === filters.collectionId)?.name || 'Collection'}
                  <IonIcon icon={closeOutline} />
                </IonChip>
              )}
              {filters.tagIds.map(tagId => (
                <IonChip key={tagId} color="primary" onClick={() => toggleTagFilter(tagId)}>
                  {allTags.find(t => t.id === tagId)?.name || tagId}
                  <IonIcon icon={closeOutline} />
                </IonChip>
              ))}
              <IonChip color="medium" onClick={clearAllFilters}>
                Clear all
              </IonChip>
            </div>
          )}
        </div>

        {/* Shelf chips bar */}
        {collections.length > 0 && (
          <div className="shelf-chips-bar">
            <IonChip
              color={filters.collectionId === 'all' ? 'primary' : undefined}
              outline={filters.collectionId !== 'all'}
              onClick={() => setFilters(p => ({ ...p, collectionId: 'all' }))}
            >
              All
            </IonChip>
            {collections.map(shelf => (
              <IonChip
                key={shelf.id}
                color={filters.collectionId === shelf.id ? 'primary' : undefined}
                outline={filters.collectionId !== shelf.id}
                onClick={() => setFilters(p => ({ ...p, collectionId: shelf.id }))}
                onContextMenu={(e) => handleShelfLongPress(shelf, e)}
              >
                {shelf.name}
                {filters.collectionId === shelf.id && bookCollectionMap[shelf.id] && (
                  <IonBadge color="light" style={{ marginLeft: 6, fontSize: '10px' }}>
                    {bookCollectionMap[shelf.id].length}
                  </IonBadge>
                )}
              </IonChip>
            ))}
            <IonChip outline onClick={() => openShelfModal()}>
              <IonIcon icon={addOutline} />
            </IonChip>
          </div>
        )}

        {importingCount > 0 && (
          <div className="loading-state" style={{ paddingBottom: 0 }}>
            <IonSpinner name="crescent" />
            <p>Importing {importingCount} book{importingCount > 1 ? 's' : ''}...</p>
          </div>
        )}

        {isLoading ? (
          <div className="loading-state">
            <IonSpinner name="crescent" />
            <p>Loading library...</p>
          </div>
        ) : (
          <>
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
                {viewMode === 'grid' ? renderGridView() : renderListView()}
              </div>
            )}
          </>
        )}
      </IonContent>

      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={() => document.getElementById('file-input')?.click()}>
          <IonIcon icon={addOutline} />
        </IonFabButton>
      </IonFab>

      <input
        id="file-input"
        type="file"
        key={fileInputKey}
        accept=".epub,.pdf,.mobi,.fb2,.cbz,.txt,.html,.htm,.md,.docx,.odt"
        style={{ display: 'none' }}
        onChange={handleFileImport}
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
              setShowBookDetails(true);
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

      <IonModal
        isOpen={showBookDetails}
        onDidDismiss={() => setShowBookDetails(false)}
      >
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
                <p style={{ margin: '0', color: 'var(--ion-color-medium)' }}>{selectedBook.author}</p>
              </div>

              {/* Description */}
              {selectedBook.metadata?.description && (
                <div>
                  <h3 style={{ margin: '0 0 4px 0' }}>Description</h3>
                  <p style={{ margin: '0', color: 'var(--ion-color-medium)', fontSize: '14px', lineHeight: '1.5' }}>
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
                    <p>{Math.round(selectedBook.progress * 100)}%</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>Date Added</h3>
                    <p>{selectedBook.dateAdded instanceof Date ? selectedBook.dateAdded.toLocaleDateString() : 'Unknown'}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>Last Read</h3>
                    <p>{selectedBook.lastRead instanceof Date ? selectedBook.lastRead.toLocaleDateString() : 'Never'}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>Source</h3>
                    <p>{selectedBook.source || 'local'}</p>
                  </IonLabel>
                </IonItem>
              </IonList>
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
        duration={4000}
        color={toastColor}
        position="bottom"
        onDidDismiss={() => setToastMessage('')}
      />

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
              onIonInput={e => setShelfName(e.detail.value || '')}
              placeholder="e.g. Sci-Fi, Work, Summer Reading"
              clearInput
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Description</IonLabel>
            <IonInput
              value={shelfDescription}
              onIonInput={e => setShelfDescription(e.detail.value || '')}
              placeholder="Optional description"
              clearInput
            />
          </IonItem>
          <div className="ion-padding">
            <IonButton
              expand="block"
              onClick={handleSaveShelf}
              disabled={!shelfName.trim()}
            >
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
            {collections.map(shelf => (
              <IonItem key={shelf.id} button onClick={() => toggleBookShelf(shelf.id)}>
                <IonCheckbox
                  slot="start"
                  checked={bookShelfIds.includes(shelf.id)}
                  onIonChange={() => toggleBookShelf(shelf.id)}
                />
                <IonLabel>{shelf.name}</IonLabel>
              </IonItem>
            ))}
          </IonList>
          {collections.length === 0 && (
            <div className="ion-padding ion-text-center">
              <p>No shelves yet</p>
              <IonButton fill="outline" onClick={() => {
                setShowShelfAssign(false);
                openShelfModal();
              }}>
                Create a Shelf
              </IonButton>
            </div>
          )}
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default Library;
