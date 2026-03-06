import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonChip,
  IonButtons,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonModal,
  IonSearchbar,
} from '@ionic/react';
import {
  personOutline,
  documentOutline,
  bookOutline,
  libraryOutline,
  pricetagOutline,
  languageOutline,
  checkmarkDoneOutline,
  timeOutline,
  arrowBack,
  searchOutline,
  chevronForwardOutline,
  folderOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { databaseService } from '../../services/database';
import type { Book, Collection } from '../../types/index';
import SeriesView from '../../components/SeriesView';
import './Browse.css';

type FilterType =
  | { kind: 'author'; value: string }
  | { kind: 'format'; value: string }
  | { kind: 'series'; value: string }
  | { kind: 'collection'; value: string; collectionId: string }
  | { kind: 'tag'; value: string; tagId: string }
  | { kind: 'language'; value: string }
  | { kind: 'status'; value: string };

interface TagItem {
  id: string;
  name: string;
  color?: string;
}

interface CategoryItem {
  label: string;
  count: number;
  id?: string; // for collections/tags
}

type CategoryKind = 'author' | 'format' | 'series' | 'collection' | 'tag' | 'language' | 'status';

interface CategoryConfig {
  kind: CategoryKind;
  title: string;
  icon: string;
  colorClass: string;
}

const CATEGORIES: CategoryConfig[] = [
  { kind: 'author', title: 'Authors', icon: personOutline, colorClass: 'browse-section-icon--blue' },
  { kind: 'format', title: 'Formats', icon: documentOutline, colorClass: 'browse-section-icon--purple' },
  { kind: 'series', title: 'Series', icon: libraryOutline, colorClass: 'browse-section-icon--green' },
  { kind: 'collection', title: 'Collections', icon: folderOutline, colorClass: 'browse-section-icon--teal' },
  { kind: 'tag', title: 'Tags', icon: pricetagOutline, colorClass: 'browse-section-icon--pink' },
  { kind: 'language', title: 'Languages', icon: languageOutline, colorClass: 'browse-section-icon--indigo' },
  { kind: 'status', title: 'Reading Status', icon: checkmarkDoneOutline, colorClass: 'browse-section-icon--red' },
];

type BrowseTab = 'categories' | 'series';

const Browse: React.FC = () => {
  const history = useHistory();
  const books = useAppStore((s) => s.books);
  const loadBooks = useAppStore((s) => s.loadBooks);

  const [browseTab, setBrowseTab] = useState<BrowseTab>('categories');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionBookMap, setCollectionBookMap] = useState<Record<string, Book[]>>({});
  const [tags, setTags] = useState<TagItem[]>([]);
  const [bookTagMap, setBookTagMap] = useState<Record<string, string[]>>({});
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
  const [openCategory, setOpenCategory] = useState<CategoryKind | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  useEffect(() => {
    loadBooks();
    loadCollectionsAndTags();
  }, [loadBooks]);

  const loadCollectionsAndTags = useCallback(async () => {
    try {
      const [cols, tgs] = await Promise.all([
        databaseService.getAllCollections(),
        databaseService.getTags(),
      ]);
      setCollections(cols);
      setTags(tgs);

      const colBookMap: Record<string, Book[]> = {};
      await Promise.all(
        cols.map(async (col) => {
          colBookMap[col.id] = await databaseService.getBooksInCollection(col.id);
        })
      );
      setCollectionBookMap(colBookMap);

      const bkTagMap: Record<string, string[]> = {};
      const allBooks = useAppStore.getState().books;
      await Promise.all(
        allBooks.map(async (book) => {
          const bookTags = await databaseService.getBookTags(book.id);
          if (bookTags.length > 0) {
            bkTagMap[book.id] = bookTags.map((t: TagItem) => t.id);
          }
        })
      );
      setBookTagMap(bkTagMap);
    } catch (err) {
      console.error('Failed to load browse data:', err);
    }
  }, []);

  // Derived data
  const authors = useMemo(() => {
    const map = new Map<string, number>();
    books.forEach((b) => {
      const author = b.author || 'Unknown';
      map.set(author, (map.get(author) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [books]);

  const formats = useMemo(() => {
    const map = new Map<string, number>();
    books.forEach((b) => {
      const fmt = b.format?.toUpperCase() || 'UNKNOWN';
      map.set(fmt, (map.get(fmt) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [books]);

  const seriesData = useMemo(() => {
    const map = new Map<string, number>();
    books.forEach((b) => {
      const s = b.metadata?.series;
      if (s) {
        map.set(s, (map.get(s) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [books]);

  const languages = useMemo(() => {
    const map = new Map<string, number>();
    books.forEach((b) => {
      const lang = b.metadata?.language;
      if (lang) {
        map.set(lang, (map.get(lang) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [books]);

  const readingStatuses = useMemo(() => {
    let unread = 0;
    let inProgress = 0;
    let finished = 0;
    books.forEach((b) => {
      if (b.progress >= 0.95) finished++;
      else if (b.progress > 0) inProgress++;
      else unread++;
    });
    return [
      { label: 'Unread', count: unread },
      { label: 'In Progress', count: inProgress },
      { label: 'Finished', count: finished },
    ].filter((s) => s.count > 0);
  }, [books]);

  const recentlyAdded = useMemo(() => {
    return [...books]
      .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
      .slice(0, 10);
  }, [books]);

  const collectionsWithCounts = useMemo(() => {
    return collections.map((c) => ({
      ...c,
      count: collectionBookMap[c.id]?.length || 0,
    }));
  }, [collections, collectionBookMap]);

  const tagsWithCounts = useMemo(() => {
    return tags.map((t) => {
      let count = 0;
      Object.values(bookTagMap).forEach((tagIds) => {
        if (tagIds.includes(t.id)) count++;
      });
      return { ...t, count };
    });
  }, [tags, bookTagMap]);

  const seriesBookCount = useMemo(() => {
    return books.filter((b) => b.series || b.metadata?.series).length;
  }, [books]);

  // Get items for a given category
  const getCategoryItems = useCallback((kind: CategoryKind): CategoryItem[] => {
    switch (kind) {
      case 'author':
        return authors.map(([label, count]) => ({ label, count }));
      case 'format':
        return formats.map(([label, count]) => ({ label, count }));
      case 'series':
        return seriesData.map(([label, count]) => ({ label, count }));
      case 'collection':
        return collectionsWithCounts.map((c) => ({ label: c.name, count: c.count, id: c.id }));
      case 'tag':
        return tagsWithCounts.map((t) => ({ label: t.name, count: t.count, id: t.id }));
      case 'language':
        return languages.map(([label, count]) => ({ label, count }));
      case 'status':
        return readingStatuses.map((s) => ({ label: s.label, count: s.count }));
      default:
        return [];
    }
  }, [authors, formats, seriesData, collectionsWithCounts, tagsWithCounts, languages, readingStatuses]);

  // Get total item count for a category
  const getCategoryCount = useCallback((kind: CategoryKind): number => {
    return getCategoryItems(kind).length;
  }, [getCategoryItems]);

  // Handle selecting an item from the modal
  const handleItemSelect = useCallback((kind: CategoryKind, item: CategoryItem) => {
    setOpenCategory(null);
    setModalSearch('');
    switch (kind) {
      case 'author':
        setActiveFilter({ kind: 'author', value: item.label });
        break;
      case 'format':
        setActiveFilter({ kind: 'format', value: item.label });
        break;
      case 'series':
        setActiveFilter({ kind: 'series', value: item.label });
        break;
      case 'collection':
        setActiveFilter({ kind: 'collection', value: item.label, collectionId: item.id! });
        break;
      case 'tag':
        setActiveFilter({ kind: 'tag', value: item.label, tagId: item.id! });
        break;
      case 'language':
        setActiveFilter({ kind: 'language', value: item.label });
        break;
      case 'status':
        setActiveFilter({ kind: 'status', value: item.label });
        break;
    }
  }, []);

  // Filter books based on active filter
  const filteredBooks = useMemo(() => {
    if (!activeFilter) return [];
    switch (activeFilter.kind) {
      case 'author':
        return books.filter((b) => (b.author || 'Unknown') === activeFilter.value);
      case 'format':
        return books.filter((b) => b.format?.toUpperCase() === activeFilter.value);
      case 'series':
        return books.filter((b) => b.metadata?.series === activeFilter.value);
      case 'collection':
        return collectionBookMap[activeFilter.collectionId] || [];
      case 'tag': {
        const tagId = activeFilter.tagId;
        return books.filter((b) => bookTagMap[b.id]?.includes(tagId));
      }
      case 'language':
        return books.filter((b) => b.metadata?.language === activeFilter.value);
      case 'status':
        if (activeFilter.value === 'Finished')
          return books.filter((b) => b.progress >= 0.95);
        if (activeFilter.value === 'In Progress')
          return books.filter((b) => b.progress > 0 && b.progress < 0.95);
        return books.filter((b) => b.progress === 0);
      default:
        return [];
    }
  }, [activeFilter, books, collectionBookMap, bookTagMap]);

  const handleBookClick = (book: Book) => {
    history.push(`/reader/${book.id}`);
  };

  const getProgressWidth = (book: Book) => {
    if (book.progress > 1) return book.progress;
    return Math.round(book.progress * 100);
  };

  // Items for the currently open modal, filtered by search
  const modalItems = useMemo(() => {
    if (!openCategory) return [];
    const items = getCategoryItems(openCategory);
    if (!modalSearch.trim()) return items;
    const query = modalSearch.toLowerCase().trim();
    return items.filter((item) => item.label.toLowerCase().includes(query));
  }, [openCategory, getCategoryItems, modalSearch]);

  const openCategoryConfig = openCategory
    ? CATEGORIES.find((c) => c.kind === openCategory)
    : null;

  // Filtered view
  if (activeFilter) {
    return (
      <IonPage className="browse-page">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => setActiveFilter(null)}>
                <IonIcon icon={arrowBack} slot="icon-only" />
              </IonButton>
            </IonButtons>
            <IonTitle>{activeFilter.value}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <p className="browse-filtered-count">
            {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}
          </p>
          <IonGrid className="browse-filtered-grid">
            <IonRow>
              {filteredBooks.map((book) => (
                <IonCol size="4" sizeMd="3" sizeLg="2" key={book.id}>
                  <IonCard
                    className="book-card"
                    onClick={() => handleBookClick(book)}
                  >
                    <div className="book-cover">
                      {book.coverPath ? (
                        <img src={book.coverPath} alt={book.title} />
                      ) : (
                        <div className="book-cover-placeholder">
                          <IonIcon icon={bookOutline} />
                          <p>{book.format?.toUpperCase()}</p>
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
                      <IonChip
                        outline={true}
                        className="book-format-chip"
                      >
                        {book.format?.toUpperCase()}
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
        </IonContent>
      </IonPage>
    );
  }

  // Main browse view
  return (
    <IonPage className="browse-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Browse</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            value={browseTab}
            onIonChange={(e) =>
              setBrowseTab(e.detail.value as BrowseTab)
            }
          >
            <IonSegmentButton value="categories">
              <IonLabel>Categories</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="series">
              <IonLabel>
                Series{seriesBookCount > 0 ? ` (${seriesData.length})` : ''}
              </IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {browseTab === 'series' ? (
          <SeriesView books={books} />
        ) : (
        <>
        {/* Search Books Online */}
        <div className="browse-search-row">
          <button
            className="browse-search-button"
            onClick={() => history.push('/search-books')}
          >
            <IonIcon icon={searchOutline} />
            <span>Search Books Online</span>
          </button>
        </div>

        {/* Recently Added */}
        {recentlyAdded.length > 0 && (
          <div className="browse-recent-section">
            <div className="browse-recent-header">
              <div className="browse-recent-icon">
                <IonIcon icon={timeOutline} />
              </div>
              <span className="browse-recent-title">Recently Added</span>
            </div>
            <div className="browse-recent-scroll">
              {recentlyAdded.map((book) => (
                <div
                  key={book.id}
                  className="browse-recent-item"
                  onClick={() => handleBookClick(book)}
                >
                  <div className="browse-recent-cover">
                    {book.coverPath ? (
                      <img src={book.coverPath} alt={book.title} />
                    ) : (
                      <div className="browse-recent-cover-placeholder">
                        <IonIcon icon={bookOutline} />
                      </div>
                    )}
                  </div>
                  <div className="browse-recent-item-title">{book.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category List */}
        <div className="browse-category-list">
          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.kind);
            return (
              <button
                key={cat.kind}
                className="browse-category-row"
                onClick={() => {
                  setOpenCategory(cat.kind);
                  setModalSearch('');
                }}
              >
                <div className={`browse-category-icon ${cat.colorClass}`}>
                  <IonIcon icon={cat.icon} />
                </div>
                <div className="browse-category-info">
                  <span className="browse-category-name">{cat.title}</span>
                  <span className="browse-category-count">
                    {count} {count === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <IonIcon icon={chevronForwardOutline} className="browse-category-chevron" />
              </button>
            );
          })}
        </div>

        <div style={{ height: 24 }} />
        </>
        )}
      </IonContent>

      {/* Category Items Modal */}
      <IonModal
        isOpen={openCategory !== null}
        onDidDismiss={() => {
          setOpenCategory(null);
          setModalSearch('');
        }}
        initialBreakpoint={0.65}
        breakpoints={[0, 0.65, 0.95]}
        className="browse-category-modal"
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>{openCategoryConfig?.title ?? ''}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => { setOpenCategory(null); setModalSearch(''); }}>
                Done
              </IonButton>
            </IonButtons>
          </IonToolbar>
          {modalItems.length > 5 && (
            <IonToolbar>
              <IonSearchbar
                value={modalSearch}
                onIonInput={(e) => setModalSearch(e.detail.value || '')}
                placeholder={`Search ${openCategoryConfig?.title?.toLowerCase() ?? ''}...`}
                debounce={150}
                className="browse-modal-searchbar"
              />
            </IonToolbar>
          )}
        </IonHeader>
        <IonContent>
          <div className="browse-modal-list">
            {modalItems.length === 0 ? (
              <div className="browse-modal-empty">
                {modalSearch.trim()
                  ? `No results for "${modalSearch}"`
                  : `No ${openCategoryConfig?.title?.toLowerCase() ?? 'items'} yet`}
              </div>
            ) : (
              modalItems.map((item) => (
                <button
                  key={item.id ?? item.label}
                  className="browse-modal-item"
                  onClick={() => handleItemSelect(openCategory!, item)}
                >
                  <span className="browse-modal-item-label">{item.label}</span>
                  <span className="browse-modal-item-count">
                    {item.count} {item.count === 1 ? 'book' : 'books'}
                  </span>
                </button>
              ))
            )}
          </div>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default Browse;
