import React, { useEffect, useState } from 'react';
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
  IonRefresher,
  IonRefresherContent,
  IonButtons,
  IonBackButton,
  IonText,
  RefresherEventDetail,
} from '@ionic/react';
import {
  cloudDownloadOutline,
  peopleOutline,
  timeOutline,
} from 'ionicons/icons';
import { useSharingStore } from '../../stores/useSharingStore';
import type { SharedBookDoc } from '../../services/sharingService';
import './CommunityBooks.css';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimeAgo(ts: { seconds: number }): string {
  const now = Date.now() / 1000;
  const diff = now - ts.seconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

const CommunityBooks: React.FC = () => {
  const {
    communityBooks,
    isDownloading,
    downloadProgress,
    downloadStats,
    error,
    loadCommunityBooks,
    downloadSharedBook,
  } = useSharingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadCommunityBooks()
      .catch((err) => console.error('Failed to load community books:', err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [loadCommunityBooks]);

  const filteredBooks = communityBooks.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownload = async (doc: SharedBookDoc) => {
    setDownloadingId(doc.id ?? null);
    try {
      await downloadSharedBook(doc);
      setToastMessage(`Downloaded "${doc.title}" successfully`);
    } catch {
      setToastMessage('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await loadCommunityBooks();
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Community Books</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchQuery}
            onIonInput={(e) => setSearchQuery(e.detail.value ?? '')}
            placeholder="Search shared books..."
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {isLoading ? (
          <div className="community-empty">
            <IonSpinner name="crescent" />
            <IonText>
              <p>Loading community books...</p>
            </IonText>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="community-empty">
            <IonIcon icon={peopleOutline} />
            <IonText>
              <h3>No shared books yet</h3>
              <p>Books shared by the community will appear here.</p>
            </IonText>
          </div>
        ) : (
          <IonList className="community-books-list">
            {filteredBooks.map((book) => (
              <IonItem key={book.id} className="community-book-item">
                <IonLabel>
                  <h2>{book.title}</h2>
                  <p>{book.author}</p>
                  <div className="community-book-meta">
                    <IonChip outline>
                      {book.format.toUpperCase()}
                    </IonChip>
                    <span className="community-book-size">
                      {formatFileSize(book.fileSize)}
                    </span>
                    {book.sharedAt && (
                      <span className="community-book-time">
                        <IonIcon icon={timeOutline} /> {formatTimeAgo(book.sharedAt as unknown as { seconds: number })}
                      </span>
                    )}
                  </div>
                  {isDownloading && downloadingId === book.id && (
                    <div className="download-stats">
                      <div className="download-progress-bar">
                        <div
                          className="download-progress-fill"
                          style={{ width: `${downloadProgress * 100}%` }}
                        />
                      </div>
                      {downloadStats && (
                        <div className="download-stats-row">
                          <span className="download-stat">
                            {formatSpeed(downloadStats.downloadSpeed)}
                          </span>
                          <span className="download-stat">
                            {downloadStats.numPeers} peer{downloadStats.numPeers !== 1 ? 's' : ''}
                          </span>
                          <span className="download-stat">
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
                  disabled={isDownloading}
                  onClick={() => handleDownload(book)}
                >
                  {isDownloading && downloadingId === book.id ? (
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
          onDidDismiss={() => setToastMessage('')}
        />
        <IonToast
          isOpen={!!error}
          message={error ?? ''}
          duration={3000}
          color="danger"
          onDidDismiss={() => useSharingStore.setState({ error: null })}
        />
      </IonContent>
    </IonPage>
  );
};

export default CommunityBooks;
