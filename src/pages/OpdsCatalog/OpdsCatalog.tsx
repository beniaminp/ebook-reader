/**
 * OPDS Catalog Browser
 * Browse OPDS feeds, search catalogs, download books
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonSearchbar,
  IonSpinner,
  IonAlert,
  IonToast,
  IonInput,
  IonModal,
  IonBadge,
  IonChip,
  IonText,
  IonActionSheet,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
} from '@ionic/react';
import {
  addOutline,
  arrowBack,
  bookOutline,
  cloudDownloadOutline,
  globeOutline,
  lockClosedOutline,
  searchOutline,
  trashOutline,
  chevronForwardOutline,
  homeOutline,
  refreshOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import {
  opdsService,
  fetchOpdsFeed,
  searchOpdsCatalog,
  type OpdsCatalog,
  type OpdsFeed,
  type OpdsBook,
  type OpdsNavEntry,
  type OpdsDownloadLink,
} from '../../services/opdsService';
import type { Book } from '../../types/index';
import './OpdsCatalog.css';

// ============================================================================
// TYPES
// ============================================================================

type ViewState = 'catalog-list' | 'feed-browser';

interface BreadcrumbItem {
  title: string;
  url: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getFormatBadgeColor(format: string): string {
  switch (format) {
    case 'epub': return 'success';
    case 'pdf': return 'warning';
    case 'mobi': return 'tertiary';
    case 'fb2': return 'secondary';
    default: return 'medium';
  }
}

function formatToBookFormat(format: string): Book['format'] {
  switch (format) {
    case 'epub': return 'epub';
    case 'pdf': return 'pdf';
    case 'mobi': return 'mobi';
    case 'fb2': return 'fb2';
    default: return 'txt';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

const OpdsCatalogPage: React.FC = () => {
  const history = useHistory();
  const { addBook } = useAppStore();

  // View state
  const [viewState, setViewState] = useState<ViewState>('catalog-list');

  // Catalog list state
  const [catalogs, setCatalogs] = useState<OpdsCatalog[]>([]);
  const [showAddCatalog, setShowAddCatalog] = useState(false);
  const [newCatalogName, setNewCatalogName] = useState('');
  const [newCatalogUrl, setNewCatalogUrl] = useState('');
  const [newCatalogDescription, setNewCatalogDescription] = useState('');
  const [newCatalogUsername, setNewCatalogUsername] = useState('');
  const [newCatalogPassword, setNewCatalogPassword] = useState('');
  const [catalogToDelete, setCatalogToDelete] = useState<OpdsCatalog | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Feed browser state
  const [currentFeed, setCurrentFeed] = useState<OpdsFeed | null>(null);
  const [currentFeedUrl, setCurrentFeedUrl] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Download state
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<OpdsBook | null>(null);
  const [showFormatSheet, setShowFormatSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const activeCatalogRef = useRef<OpdsCatalog | null>(null);

  // Load catalogs on mount
  useEffect(() => {
    setCatalogs(opdsService.loadSavedCatalogs());
  }, []);

  // Abort pending requests on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ============================================================================
  // FEED LOADING
  // ============================================================================

  const loadFeed = useCallback(async (url: string, title: string, pushBreadcrumb = true) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setFeedLoading(true);
    setFeedError(null);
    setCurrentFeedUrl(url);
    setViewState('feed-browser');
    setShowSearchBar(false);
    setSearchQuery('');

    if (pushBreadcrumb) {
      setBreadcrumbs(prev => [...prev, { title, url }]);
    }

    try {
      const feed = await fetchOpdsFeed(url, {
        signal: abortRef.current.signal,
        username: activeCatalogRef.current?.username,
        password: activeCatalogRef.current?.password,
      });
      setCurrentFeed(feed);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setFeedError(err.message || 'Failed to load catalog');
      }
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const handleCatalogSelect = useCallback((catalog: OpdsCatalog) => {
    activeCatalogRef.current = catalog;
    setBreadcrumbs([{ title: catalog.name, url: catalog.url }]);
    loadFeed(catalog.url, catalog.name, false);
  }, [loadFeed]);

  const handleEntryNav = useCallback((entry: OpdsNavEntry) => {
    const navLink = entry.links.find(
      l =>
        l.type === 'application/atom+xml;profile=opds-catalog' ||
        l.type === 'application/atom+xml;type=feed' ||
        l.type === 'application/atom+xml'
    );
    if (navLink) {
      loadFeed(navLink.href, entry.title);
    }
  }, [loadFeed]);

  const handleBreadcrumbNav = useCallback((index: number) => {
    const crumb = breadcrumbs[index];
    if (!crumb) return;
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    loadFeed(crumb.url, crumb.title, false);
  }, [breadcrumbs, loadFeed]);

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    if (currentFeedUrl) {
      await loadFeed(currentFeedUrl, breadcrumbs[breadcrumbs.length - 1]?.title || '', false);
    }
    event.detail.complete();
  };

  // ============================================================================
  // SEARCH
  // ============================================================================

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !currentFeed?.searchUrl) return;

    setIsSearching(true);
    try {
      const feed = await searchOpdsCatalog(currentFeed.searchUrl, searchQuery, {
        username: activeCatalogRef.current?.username,
        password: activeCatalogRef.current?.password,
      });
      setCurrentFeed(feed);
    } catch (err: any) {
      setFeedError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, currentFeed?.searchUrl]);

  // ============================================================================
  // DOWNLOAD
  // ============================================================================

  const handleDownloadBook = useCallback(async (entry: OpdsBook, link: OpdsDownloadLink) => {
    if (downloadingBookId === entry.id) return;

    setDownloadingBookId(entry.id);
    try {
      const downloadHeaders: Record<string, string> = {};
      if (activeCatalogRef.current?.username && activeCatalogRef.current?.password) {
        const credentials = btoa(`${activeCatalogRef.current.username}:${activeCatalogRef.current.password}`);
        downloadHeaders['Authorization'] = `Basic ${credentials}`;
      }
      const response = await fetch(link.href, { headers: downloadHeaders });
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const format = formatToBookFormat(link.format);

      const newBook: Book = {
        id: crypto.randomUUID(),
        title: entry.title,
        author: entry.author || 'Unknown',
        filePath: objectUrl,
        coverPath: entry.thumbnailUrl || entry.coverUrl,
        format,
        totalPages: 100,
        currentPage: 0,
        progress: 0,
        lastRead: new Date(),
        dateAdded: new Date(),
        source: 'opds',
        sourceUrl: link.href,
        downloaded: true,
        metadata: {
          description: entry.summary || entry.content,
        },
      };

      await addBook(newBook);

      setToastMessage(`"${entry.title}" added to library`);
      setShowToast(true);
    } catch (err: any) {
      setToastMessage(`Download failed: ${err.message}`);
      setShowToast(true);
    } finally {
      setDownloadingBookId(null);
      setShowFormatSheet(false);
      setSelectedEntry(null);
    }
  }, [downloadingBookId, addBook]);

  const handleBookEntryClick = useCallback((entry: OpdsBook) => {
    if (entry.downloadLinks.length === 1) {
      handleDownloadBook(entry, entry.downloadLinks[0]);
    } else {
      setSelectedEntry(entry);
      setShowFormatSheet(true);
    }
  }, [handleDownloadBook]);

  // ============================================================================
  // CATALOG MANAGEMENT
  // ============================================================================

  const handleAddCatalog = useCallback(() => {
    if (!newCatalogName.trim() || !newCatalogUrl.trim()) return;

    opdsService.addCatalog({
      name: newCatalogName.trim(),
      url: newCatalogUrl.trim(),
      description: newCatalogDescription.trim() || undefined,
      username: newCatalogUsername.trim() || undefined,
      password: newCatalogPassword.trim() || undefined,
    });

    setCatalogs(opdsService.loadSavedCatalogs());
    setNewCatalogName('');
    setNewCatalogUrl('');
    setNewCatalogDescription('');
    setNewCatalogUsername('');
    setNewCatalogPassword('');
    setShowAddCatalog(false);
  }, [newCatalogName, newCatalogUrl, newCatalogDescription, newCatalogUsername, newCatalogPassword]);

  const handleDeleteCatalog = useCallback(() => {
    if (!catalogToDelete) return;
    opdsService.removeCatalog(catalogToDelete.id);
    setCatalogs(opdsService.loadSavedCatalogs());
    setCatalogToDelete(null);
  }, [catalogToDelete]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const renderCoverImage = (entry: OpdsBook | OpdsNavEntry) => {
    const imgSrc = entry.thumbnailUrl || entry.coverUrl;
    if (imgSrc) {
      return (
        <IonThumbnail slot="start" className="opds-thumbnail">
          <img src={imgSrc} alt={entry.title} loading="lazy" />
        </IonThumbnail>
      );
    }
    return (
      <IonThumbnail slot="start" className="opds-thumbnail opds-thumbnail--placeholder">
        <IonIcon icon={bookOutline} />
      </IonThumbnail>
    );
  };

  const renderFeedEntry = (entry: OpdsBook | OpdsNavEntry) => {
    if (entry.isAcquisition) {
      const book = entry as OpdsBook;
      return (
        <IonItem
          key={entry.id}
          button
          onClick={() => handleBookEntryClick(book)}
          className="opds-entry opds-entry--book"
        >
          {renderCoverImage(entry)}
          <IonLabel>
            <h2>{entry.title}</h2>
            {entry.author && <p className="opds-author">{entry.author}</p>}
            {entry.summary && (
              <p className="opds-summary">{entry.summary.slice(0, 120)}...</p>
            )}
            <div className="opds-formats">
              {book.downloadLinks.map((link, i) => (
                <IonChip
                  key={i}
                  color={getFormatBadgeColor(link.format)}
                  outline
                  className="opds-format-chip"
                >
                  {link.format.toUpperCase()}
                </IonChip>
              ))}
            </div>
          </IonLabel>
          {downloadingBookId === entry.id ? (
            <IonSpinner slot="end" name="crescent" />
          ) : (
            <IonIcon icon={cloudDownloadOutline} slot="end" color="primary" />
          )}
        </IonItem>
      );
    }

    // Navigation entry
    return (
      <IonItem
        key={entry.id}
        button
        onClick={() => handleEntryNav(entry as OpdsNavEntry)}
        className="opds-entry opds-entry--nav"
      >
        {renderCoverImage(entry)}
        <IonLabel>
          <h2>{entry.title}</h2>
          {entry.summary && <p>{entry.summary.slice(0, 100)}</p>}
        </IonLabel>
        <IonIcon icon={chevronForwardOutline} slot="end" />
      </IonItem>
    );
  };

  const renderCatalogList = () => (
    <IonContent>
      <IonList>
        {catalogs.map(catalog => (
          <IonItem
            key={catalog.id}
            button
            onClick={() => handleCatalogSelect(catalog)}
            className="opds-catalog-item"
          >
            <IonIcon icon={globeOutline} slot="start" color="primary" />
            <IonLabel>
              <h2>
                {catalog.name}
                {catalog.username && (
                  <IonIcon icon={lockClosedOutline} style={{ fontSize: '14px', marginLeft: '6px', verticalAlign: 'middle' }} />
                )}
              </h2>
              {catalog.description && <p>{catalog.description}</p>}
              <p className="opds-catalog-url">{catalog.url}</p>
            </IonLabel>
            <IonButton
              fill="clear"
              size="small"
              slot="end"
              onClick={(e) => {
                e.stopPropagation();
                setCatalogToDelete(catalog);
                setShowDeleteAlert(true);
              }}
              aria-label="Delete catalog"
            >
              <IonIcon icon={trashOutline} color="danger" />
            </IonButton>
          </IonItem>
        ))}
      </IonList>

      {catalogs.length === 0 && (
        <div className="opds-empty-state">
          <IonIcon icon={globeOutline} />
          <h3>No Catalogs</h3>
          <p>Add an OPDS catalog to start browsing books</p>
        </div>
      )}
    </IonContent>
  );

  const renderFeedBrowser = () => (
    <IonContent>
      <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
        <IonRefresherContent />
      </IonRefresher>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="opds-breadcrumbs">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              <IonButton
                fill="clear"
                size="small"
                onClick={() => handleBreadcrumbNav(i)}
                className="opds-breadcrumb-btn"
              >
                {crumb.title}
              </IonButton>
              {i < breadcrumbs.length - 1 && (
                <IonIcon icon={chevronForwardOutline} className="opds-breadcrumb-sep" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Search bar */}
      {showSearchBar && currentFeed?.searchUrl && (
        <div className="opds-search-container">
          <IonSearchbar
            value={searchQuery}
            onIonInput={e => setSearchQuery(e.detail.value || '')}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search catalog..."
            showCancelButton="focus"
            onIonCancel={() => {
              setShowSearchBar(false);
              setSearchQuery('');
            }}
          />
        </div>
      )}

      {feedLoading || isSearching ? (
        <div className="opds-loading">
          <IonSpinner name="crescent" />
          <p>{isSearching ? 'Searching...' : 'Loading catalog...'}</p>
        </div>
      ) : feedError ? (
        <div className="opds-error">
          <IonText color="danger">
            <p>{feedError}</p>
          </IonText>
          <IonButton
            fill="clear"
            onClick={() => loadFeed(currentFeedUrl, breadcrumbs[breadcrumbs.length - 1]?.title || '', false)}
          >
            <IonIcon icon={refreshOutline} slot="start" />
            Retry
          </IonButton>
        </div>
      ) : currentFeed ? (
        <>
          {currentFeed.totalResults !== undefined && (
            <div className="opds-result-count">
              <IonText color="medium">
                <small>{currentFeed.totalResults} results</small>
              </IonText>
            </div>
          )}

          <IonList>
            {currentFeed.entries.map(renderFeedEntry)}
          </IonList>

          {/* Pagination */}
          <div className="opds-pagination">
            {currentFeed.prevPageUrl && (
              <IonButton
                fill="outline"
                onClick={() => loadFeed(currentFeed.prevPageUrl!, 'Previous', false)}
              >
                Previous
              </IonButton>
            )}
            {currentFeed.nextPageUrl && (
              <IonButton
                fill="outline"
                onClick={() => loadFeed(currentFeed.nextPageUrl!, 'Next', false)}
              >
                Next
              </IonButton>
            )}
          </div>

          {currentFeed.entries.length === 0 && (
            <div className="opds-empty-state">
              <IonIcon icon={bookOutline} />
              <h3>No entries found</h3>
              <p>This catalog appears to be empty</p>
            </div>
          )}
        </>
      ) : null}
    </IonContent>
  );

  return (
    <IonPage className="opds-catalog-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            {viewState === 'feed-browser' ? (
              <IonButton
                onClick={() => setViewState('catalog-list')}
                aria-label="Back to catalog list"
              >
                <IonIcon icon={arrowBack} />
              </IonButton>
            ) : (
              <IonButton onClick={() => history.goBack()} aria-label="Back">
                <IonIcon icon={arrowBack} />
              </IonButton>
            )}
          </IonButtons>

          <IonTitle>
            {viewState === 'catalog-list'
              ? 'OPDS Catalogs'
              : currentFeed?.title || breadcrumbs[breadcrumbs.length - 1]?.title || 'Catalog'}
          </IonTitle>

          <IonButtons slot="end">
            {viewState === 'feed-browser' && currentFeed?.searchUrl && (
              <IonButton
                onClick={() => setShowSearchBar(!showSearchBar)}
                aria-label="Search catalog"
              >
                <IonIcon icon={searchOutline} />
              </IonButton>
            )}
            {viewState === 'feed-browser' && breadcrumbs.length > 0 && (
              <IonButton
                onClick={() => handleCatalogSelect(
                  catalogs.find(c => c.url === breadcrumbs[0].url) ||
                  { id: '', name: breadcrumbs[0].title, url: breadcrumbs[0].url }
                )}
                aria-label="Go to catalog root"
              >
                <IonIcon icon={homeOutline} />
              </IonButton>
            )}
            {viewState === 'catalog-list' && (
              <IonButton onClick={() => setShowAddCatalog(true)} aria-label="Add catalog">
                <IonIcon icon={addOutline} />
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      {viewState === 'catalog-list' ? renderCatalogList() : renderFeedBrowser()}

      {/* Add Catalog Modal */}
      <IonModal isOpen={showAddCatalog} onDidDismiss={() => setShowAddCatalog(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Add OPDS Catalog</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowAddCatalog(false)}>Cancel</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Catalog Name *</IonLabel>
            <IonInput
              value={newCatalogName}
              onIonInput={e => setNewCatalogName(e.detail.value || '')}
              placeholder="e.g. My Calibre Library"
              clearInput
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">OPDS URL *</IonLabel>
            <IonInput
              value={newCatalogUrl}
              onIonInput={e => setNewCatalogUrl(e.detail.value || '')}
              placeholder="https://example.com/opds"
              type="url"
              clearInput
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Description</IonLabel>
            <IonInput
              value={newCatalogDescription}
              onIonInput={e => setNewCatalogDescription(e.detail.value || '')}
              placeholder="Optional description"
              clearInput
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Username</IonLabel>
            <IonInput
              value={newCatalogUsername}
              onIonInput={e => setNewCatalogUsername(e.detail.value || '')}
              placeholder="Optional — for authenticated feeds"
              clearInput
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Password</IonLabel>
            <IonInput
              value={newCatalogPassword}
              onIonInput={e => setNewCatalogPassword(e.detail.value || '')}
              placeholder="Optional — for authenticated feeds"
              type="password"
              clearInput
            />
          </IonItem>
          <div className="ion-padding">
            <IonButton
              expand="block"
              onClick={handleAddCatalog}
              disabled={!newCatalogName.trim() || !newCatalogUrl.trim()}
            >
              Add Catalog
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      {/* Delete Catalog Alert */}
      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => {
          setShowDeleteAlert(false);
          setCatalogToDelete(null);
        }}
        header="Remove Catalog"
        message={`Remove "${catalogToDelete?.name}" from your catalog list?`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Remove',
            role: 'destructive',
            handler: handleDeleteCatalog,
          },
        ]}
      />

      {/* Format Selection Action Sheet */}
      <IonActionSheet
        isOpen={showFormatSheet}
        onDidDismiss={() => {
          setShowFormatSheet(false);
          setSelectedEntry(null);
        }}
        header={selectedEntry ? `Download "${selectedEntry.title}"` : 'Choose Format'}
        buttons={[
          ...(selectedEntry?.downloadLinks || []).map(link => ({
            text: `${link.format.toUpperCase()} - ${link.type.split('/')[1] || link.type}`,
            handler: () => {
              if (selectedEntry) handleDownloadBook(selectedEntry, link);
            },
          })),
          { text: 'Cancel', role: 'cancel' },
        ]}
      />

      {/* Toast notifications */}
      <IonToast
        isOpen={showToast}
        message={toastMessage}
        duration={3000}
        onDidDismiss={() => setShowToast(false)}
        position="bottom"
      />
    </IonPage>
  );
};

export default OpdsCatalogPage;
