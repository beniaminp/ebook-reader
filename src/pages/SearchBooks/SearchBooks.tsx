import React, { useState, useRef, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonChip,
  IonSpinner,
  IonToast,
  IonButtons,
  IonBackButton,
  IonText,
} from '@ionic/react';
import {
  cloudDownloadOutline,
  searchOutline,
  arrowUpOutline,
  arrowDownOutline,
  documentOutline,
  warningOutline,
} from 'ionicons/icons';
import {
  searchBooks,
  buildMagnetLink,
  formatFileSize,
  detectFormat,
  type SearchResult,
} from '../../services/bookSearchService';
import { torrentService, type TorrentStats } from '../../services/torrentService';
import { webFileStorage } from '../../services/webFileStorage';
import { useAppStore } from '../../stores/useAppStore';
import type { Book } from '../../types/index';
import './SearchBooks.css';

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

const EBOOK_EXTENSIONS = [
  '.epub', '.pdf', '.mobi', '.azw3', '.fb2', '.cbz', '.cbr',
  '.txt', '.html', '.htm', '.md', '.docx', '.odt', '.chm',
];

const SearchBooks: React.FC = () => {
  const addBook = useAppStore((s) => s.addBook);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadStats, setDownloadStats] = useState<TorrentStats | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<string>('success');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSupported = torrentService.isSupported();

  const handleSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchBooks(query.trim());
        setResults(data);
        setHasSearched(true);
      } catch (err) {
        console.error('Search failed:', err);
        setToastColor('danger');
        setToastMessage('Search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleDownload = async (result: SearchResult) => {
    if (downloadingId) return;
    setDownloadingId(result.id);
    setDownloadStats(null);

    try {
      const magnet = buildMagnetLink(result.infoHash, result.name);
      const { data, fileName } = await torrentService.download(magnet, (stats) => {
        setDownloadStats(stats);
      });

      // Find the ebook file from the torrent
      const ext = EBOOK_EXTENSIONS.find((e) => fileName.toLowerCase().endsWith(e));
      const format = ext ? ext.slice(1) : detectFormat(result.name);

      if (!format) {
        setToastColor('warning');
        setToastMessage('No ebook file found in torrent');
        return;
      }

      // Store in IndexedDB and add to library
      const bookId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      await webFileStorage.storeFile(bookId, data);
      const filePath = `indexeddb://${bookId}/${fileName}`;

      const bookData: Omit<Book, 'dateAdded'> = {
        id: bookId,
        title: result.name,
        author: 'Unknown',
        filePath,
        format: format as Book['format'],
        totalPages: 0,
        currentPage: 0,
        progress: 0,
        lastRead: new Date(),
        source: 'local',
        downloaded: true,
      };

      await addBook(bookData);
      setToastColor('success');
      setToastMessage(`Downloaded "${result.name}" successfully!`);
    } catch (err) {
      console.error('Download failed:', err);
      setToastColor('danger');
      setToastMessage(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloadingId(null);
      setDownloadStats(null);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/browse" />
          </IonButtons>
          <IonTitle>Search Books</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            debounce={0}
            onIonInput={(e) => handleSearch(e.detail.value ?? '')}
            placeholder="Search for ebooks..."
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {!isSupported && (
          <div className="search-web-only-banner">
            <IonIcon icon={warningOutline} /> Torrent downloads are only available in the web version.
          </div>
        )}

        {isSearching ? (
          <div className="search-empty">
            <IonSpinner name="crescent" />
            <IonText>
              <p>Searching...</p>
            </IonText>
          </div>
        ) : !hasSearched ? (
          <div className="search-empty">
            <IonIcon icon={searchOutline} />
            <IonText>
              <h3>Search for ebooks</h3>
              <p>Type a book name to search for available torrents.</p>
            </IonText>
          </div>
        ) : results.length === 0 ? (
          <div className="search-empty">
            <IonIcon icon={searchOutline} />
            <IonText>
              <h3>No results found</h3>
              <p>Try a different search term.</p>
            </IonText>
          </div>
        ) : (
          <IonList className="search-books-list">
            {results.map((result) => (
              <IonItem key={result.id} className="search-book-item">
                <IonLabel>
                  <h2>{result.name}</h2>
                  <div className="search-book-meta">
                    {detectFormat(result.name) && (
                      <IonChip outline>
                        {detectFormat(result.name)!.toUpperCase()}
                      </IonChip>
                    )}
                    <span className="search-book-size">
                      {formatFileSize(result.size)}
                    </span>
                    <span className="search-book-seeders">
                      <IonIcon icon={arrowUpOutline} /> {result.seeders}
                    </span>
                    <span className="search-book-leechers">
                      <IonIcon icon={arrowDownOutline} /> {result.leechers}
                    </span>
                    {result.numFiles > 1 && (
                      <span className="search-book-files">
                        <IonIcon icon={documentOutline} /> {result.numFiles} files
                      </span>
                    )}
                    <span className="search-book-date">
                      {formatDate(result.added)}
                    </span>
                  </div>
                  {downloadingId === result.id && (
                    <div className="search-download-progress">
                      <div className="search-download-progress-bar">
                        <div
                          className="search-download-progress-fill"
                          style={{ width: `${(downloadStats?.progress ?? 0) * 100}%` }}
                        />
                      </div>
                      {downloadStats && (
                        <div className="search-download-stats-row">
                          <span className="search-download-stat">
                            {formatSpeed(downloadStats.downloadSpeed)}
                          </span>
                          <span className="search-download-stat">
                            {downloadStats.numPeers} peer{downloadStats.numPeers !== 1 ? 's' : ''}
                          </span>
                          <span className="search-download-stat">
                            {formatFileSize(downloadStats.downloaded)} / {formatFileSize(downloadStats.totalSize)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </IonLabel>
                <IonButton
                  slot="end"
                  fill="outline"
                  disabled={!!downloadingId || !isSupported}
                  onClick={() => handleDownload(result)}
                >
                  {downloadingId === result.id ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    <IonIcon icon={cloudDownloadOutline} />
                  )}
                </IonButton>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage}
          duration={3000}
          color={toastColor}
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default SearchBooks;
