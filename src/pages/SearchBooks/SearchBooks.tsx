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
  '.txt', '.html', '.htm', '.md', '.docx', '.odt',
];

const EBOOK_EXT_SET = new Set([
  'epub', 'pdf', 'mobi', 'azw3', 'fb2', 'cbz', 'cbr',
  'txt', 'html', 'htm', 'md', 'docx', 'odt',
]);

function cleanTorrentName(name: string): string {
  let clean = name;
  // Remove file extensions
  clean = clean.replace(/\.(epub|pdf|mobi|azw3|fb2|cbz|cbr|txt|html|htm|md|docx|odt|zip|rar)$/i, '');
  // Remove common torrent tags like [group], (year), etc.
  clean = clean.replace(/[\[\(].*?[\]\)]/g, '').trim();
  // Replace underscores and dots with spaces
  clean = clean.replace(/[_.]/g, ' ');
  // Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  // Remove trailing hyphens
  clean = clean.replace(/[\-]+$/, '').trim();
  return clean || name;
}

function getFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.substring(dot + 1).toLowerCase() : '';
}

/**
 * Process a downloaded file: if it's an ebook, return it directly.
 * If it's a zip/rar archive, extract it and find ebook files inside.
 * Falls back to format detection from torrent name.
 */
async function processDownloadedFile(
  data: ArrayBuffer,
  fileName: string,
  torrentName: string,
): Promise<{ data: ArrayBuffer; fileName: string; format: string }[]> {
  const ext = getFileExtension(fileName);

  // Direct ebook file
  if (EBOOK_EXT_SET.has(ext)) {
    return [{ data, fileName, format: ext }];
  }

  // ZIP archive — extract and find ebooks
  if (ext === 'zip') {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(data);
      const results: { data: ArrayBuffer; fileName: string; format: string }[] = [];

      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const fileExt = getFileExtension(path);
        if (EBOOK_EXT_SET.has(fileExt)) {
          const fileData = await entry.async('arraybuffer');
          const baseName = path.split('/').pop() || path;
          results.push({ data: fileData, fileName: baseName, format: fileExt });
        }
      }

      if (results.length > 0) {
        // Return the largest ebook file
        results.sort((a, b) => b.data.byteLength - a.data.byteLength);
        return [results[0]];
      }
    } catch (err) {
      console.error('ZIP extraction failed:', err);
    }
  }

  // RAR archive — extract and find ebooks
  if (ext === 'rar') {
    try {
      const { createExtractorFromData } = await import('unrar.js');
      const uint8Array = new Uint8Array(data);
      const extractor = createExtractorFromData(uint8Array);
      const extracted = extractor.extract();

      if (extracted.files) {
        const results: { data: ArrayBuffer; fileName: string; format: string }[] = [];
        for (const file of extracted.files) {
          if (!file.fileHeader?.name) continue;
          const fileExt = getFileExtension(file.fileHeader.name);
          if (EBOOK_EXT_SET.has(fileExt) && file.extraction) {
            const buffer = file.extraction.buffer.slice(
              file.extraction.byteOffset,
              file.extraction.byteOffset + file.extraction.byteLength
            ) as ArrayBuffer;
            const baseName = file.fileHeader.name.split('/').pop() || file.fileHeader.name;
            results.push({ data: buffer, fileName: baseName, format: fileExt });
          }
        }
        if (results.length > 0) {
          results.sort((a, b) => b.data.byteLength - a.data.byteLength);
          return [results[0]];
        }
      }
    } catch (err) {
      console.error('RAR extraction failed:', err);
    }
  }

  // Fallback: try to detect format from the torrent name itself
  const detectedFormat = detectFormat(torrentName);
  if (detectedFormat) {
    return [{ data, fileName, format: detectedFormat }];
  }

  // Last resort: try to detect from the file name even without matching extension
  const detectedFromFile = detectFormat(fileName);
  if (detectedFromFile) {
    return [{ data, fileName, format: detectedFromFile }];
  }

  return [];
}

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

      // Process the downloaded file (handles archives, finds ebooks)
      const books = await processDownloadedFile(data, fileName, result.name);

      if (books.length === 0) {
        setToastColor('warning');
        setToastMessage('No ebook file found in torrent');
        return;
      }

      const book = books[0]; // Take the best (largest) ebook

      // Store in IndexedDB and add to library
      const bookId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      await webFileStorage.storeFile(bookId, book.data);
      const filePath = `indexeddb://${bookId}/${book.fileName}`;

      // Clean up torrent name for a better title
      const title = cleanTorrentName(result.name);

      const bookData: Omit<Book, 'dateAdded'> = {
        id: bookId,
        title,
        author: 'Unknown',
        filePath,
        format: book.format as Book['format'],
        totalPages: 0,
        currentPage: 0,
        progress: 0,
        lastRead: new Date(),
        source: 'local',
        downloaded: true,
      };

      await addBook(bookData);
      setToastColor('success');
      setToastMessage(`"${title}" added to library!`);
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
          duration={2000}
          color={toastColor}
          onDidDismiss={() => setToastMessage('')}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default SearchBooks;
