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
  IonBackButton,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
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

  // Load data on mount
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

      // Load books for each collection
      const colBookMap: Record<string, Book[]> = {};
      await Promise.all(
        cols.map(async (col) => {
          colBookMap[col.id] = await databaseService.getBooksInCollection(col.id);
        })
      );
      setCollectionBookMap(colBookMap);

      // Load tags for each book
      const tagMap: Record<string, string[]> = {};
      await Promise.all(
        tgs.map(async (tag) => {
          // For each tag, find which books have it by checking each book
          // We'll build a reverse map: tagId -> bookIds
          tagMap[tag.id] = [];
        })
      );

      // Build book->tags mapping by checking each book's tags
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

  const series = useMemo(() => {
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

  // Count books that have series metadata
  const seriesBookCount = useMemo(() => {
    return books.filter((b) => b.series || b.metadata?.series).length;
  }, [books]);

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
                Series{seriesBookCount > 0 ? ` (${series.length})` : ''}
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
        <div className="browse-section">
          <button
            className="browse-chip browse-chip--highlight"
            onClick={() => history.push('/search-books')}
          >
            <IonIcon icon={searchOutline} style={{ marginRight: 6 }} />
            Search Books Online
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

        {/* Authors */}
        <div className="browse-section">
          <div className="browse-section-header">
            <div className="browse-section-icon browse-section-icon--blue">
              <IonIcon icon={personOutline} />
            </div>
            <span className="browse-section-title">Authors</span>
          </div>
          {authors.length > 0 ? (
            <div className="browse-chips">
              {authors.map(([author, count]) => (
                <button
                  key={author}
                  className="browse-chip"
                  onClick={() => setActiveFilter({ kind: 'author', value: author })}
                >
                  {author}
                  <span className="browse-chip-count">{count}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="browse-empty-hint">No books in library</p>
          )}
        </div>

        {/* Formats */}
        <div className="browse-section">
          <div className="browse-section-header">
            <div className="browse-section-icon browse-section-icon--purple">
              <IonIcon icon={documentOutline} />
            </div>
            <span className="browse-section-title">Formats</span>
          </div>
          {formats.length > 0 ? (
            <div className="browse-chips">
              {formats.map(([fmt, count]) => (
                <button
                  key={fmt}
                  className="browse-chip"
                  onClick={() => setActiveFilter({ kind: 'format', value: fmt })}
                >
                  {fmt}
                  <span className="browse-chip-count">{count}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="browse-empty-hint">No books in library</p>
          )}
        </div>

        {/* Series */}
        {series.length > 0 && (
          <div className="browse-section">
            <div className="browse-section-header">
              <div className="browse-section-icon browse-section-icon--green">
                <IonIcon icon={libraryOutline} />
              </div>
              <span className="browse-section-title">Series</span>
            </div>
            <div className="browse-chips">
              {series.map(([name, count]) => (
                <button
                  key={name}
                  className="browse-chip"
                  onClick={() => setActiveFilter({ kind: 'series', value: name })}
                >
                  {name}
                  <span className="browse-chip-count">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collections */}
        <div className="browse-section">
          <div className="browse-section-header">
            <div className="browse-section-icon browse-section-icon--teal">
              <IonIcon icon={libraryOutline} />
            </div>
            <span className="browse-section-title">Collections</span>
          </div>
          {collectionsWithCounts.length > 0 ? (
            <div className="browse-chips">
              {collectionsWithCounts.map((col) => (
                <button
                  key={col.id}
                  className="browse-chip"
                  onClick={() =>
                    setActiveFilter({
                      kind: 'collection',
                      value: col.name,
                      collectionId: col.id,
                    })
                  }
                >
                  {col.name}
                  <span className="browse-chip-count">{col.count}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="browse-empty-hint">No collections yet</p>
          )}
        </div>

        {/* Tags */}
        <div className="browse-section">
          <div className="browse-section-header">
            <div className="browse-section-icon browse-section-icon--pink">
              <IonIcon icon={pricetagOutline} />
            </div>
            <span className="browse-section-title">Tags</span>
          </div>
          {tagsWithCounts.length > 0 ? (
            <div className="browse-chips">
              {tagsWithCounts.map((tag) => (
                <button
                  key={tag.id}
                  className="browse-chip"
                  onClick={() =>
                    setActiveFilter({
                      kind: 'tag',
                      value: tag.name,
                      tagId: tag.id,
                    })
                  }
                >
                  {tag.name}
                  <span className="browse-chip-count">{tag.count}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="browse-empty-hint">No tags yet</p>
          )}
        </div>

        {/* Languages */}
        {languages.length > 0 && (
          <div className="browse-section">
            <div className="browse-section-header">
              <div className="browse-section-icon browse-section-icon--indigo">
                <IonIcon icon={languageOutline} />
              </div>
              <span className="browse-section-title">Languages</span>
            </div>
            <div className="browse-chips">
              {languages.map(([lang, count]) => (
                <button
                  key={lang}
                  className="browse-chip"
                  onClick={() => setActiveFilter({ kind: 'language', value: lang })}
                >
                  {lang}
                  <span className="browse-chip-count">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reading Status */}
        {readingStatuses.length > 0 && (
          <div className="browse-section">
            <div className="browse-section-header">
              <div className="browse-section-icon browse-section-icon--red">
                <IonIcon icon={checkmarkDoneOutline} />
              </div>
              <span className="browse-section-title">Reading Status</span>
            </div>
            <div className="browse-chips">
              {readingStatuses.map((status) => (
                <button
                  key={status.label}
                  className="browse-chip"
                  onClick={() =>
                    setActiveFilter({ kind: 'status', value: status.label })
                  }
                >
                  {status.label}
                  <span className="browse-chip-count">{status.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div style={{ height: 24 }} />
        </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Browse;
