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
  IonChip,
  IonToast,
  IonAlert,
  IonButtons,
  IonBackButton,
  IonText,
} from '@ionic/react';
import {
  shareSocialOutline,
  trashOutline,
} from 'ionicons/icons';
import { useSharingStore } from '../../stores/useSharingStore';
import { torrentService, TorrentStats } from '../../services/torrentService';
import type { SharedBookDoc } from '../../services/sharingService';
import './MySharedBooks.css';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

const MySharedBooks: React.FC = () => {
  const { mySharedBooks, loadMySharedBooks, unshareBook } = useSharingStore();
  const [toastMessage, setToastMessage] = useState('');
  const [bookToUnshare, setBookToUnshare] = useState<SharedBookDoc | null>(null);
  const [seedingStatus, setSeedingStatus] = useState<Record<string, boolean>>({});
  const [seedingStats, setSeedingStats] = useState<Record<string, TorrentStats | null>>({});

  useEffect(() => {
    loadMySharedBooks();
  }, [loadMySharedBooks]);

  useEffect(() => {
    const poll = () => {
      const stats: Record<string, TorrentStats | null> = {};
      const status: Record<string, boolean> = {};
      for (const book of mySharedBooks) {
        const s = torrentService.getSeedingStats(book.magnetURI);
        stats[book.magnetURI] = s;
        status[book.magnetURI] = !!s;
      }
      setSeedingStats(stats);
      setSeedingStatus(status);
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [mySharedBooks]);

  const seedingCount = Object.values(seedingStatus).filter(Boolean).length;

  const handleUnshare = async (doc: SharedBookDoc) => {
    await unshareBook(doc);
    setToastMessage(`Stopped sharing "${doc.title}"`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>My Shared Books</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {seedingCount > 0 && (
          <div className="seeding-banner">
            <span className="seeding-dot active" />
            Seeding {seedingCount} book{seedingCount !== 1 ? 's' : ''}. Keep app open to share.
          </div>
        )}

        {mySharedBooks.length === 0 ? (
          <div className="shared-empty">
            <IonIcon icon={shareSocialOutline} />
            <IonText>
              <h3>No shared books</h3>
              <p>Share books from your Library to make them available to the community.</p>
            </IonText>
          </div>
        ) : (
          <IonList className="my-shared-books-list">
            {mySharedBooks.map((book) => {
              const seeding = seedingStatus[book.magnetURI] ?? false;
              return (
                <IonItem key={book.id}>
                  <span
                    className={`seeding-dot ${seeding ? 'active' : 'inactive'}`}
                    slot="start"
                  />
                  <IonLabel>
                    <h2>{book.title}</h2>
                    <p>{book.author}</p>
                    <div className="shared-book-meta">
                      <IonChip outline>
                        {book.format.toUpperCase()}
                      </IonChip>
                      <span style={{ fontSize: '0.8em', color: 'var(--ion-color-medium)' }}>
                        {formatFileSize(book.fileSize)}
                      </span>
                    </div>
                    {seeding && seedingStats[book.magnetURI] && (
                      <div className="seeding-stats-row">
                        <span className="seeding-stat">
                          &#x2191; {formatSpeed(seedingStats[book.magnetURI]!.uploadSpeed)}
                        </span>
                        <span className="seeding-stat">
                          {seedingStats[book.magnetURI]!.numPeers} peer{seedingStats[book.magnetURI]!.numPeers !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </IonLabel>
                  <IonButton
                    slot="end"
                    fill="clear"
                    color="danger"
                    onClick={() => setBookToUnshare(book)}
                  >
                    <IonIcon icon={trashOutline} />
                  </IonButton>
                </IonItem>
              );
            })}
          </IonList>
        )}

        <IonAlert
          isOpen={!!bookToUnshare}
          header="Stop Sharing"
          message={`Stop sharing "${bookToUnshare?.title}"? It will no longer be available to the community.`}
          buttons={[
            { text: 'Cancel', role: 'cancel', handler: () => setBookToUnshare(null) },
            {
              text: 'Unshare',
              role: 'destructive',
              handler: () => {
                if (bookToUnshare) handleUnshare(bookToUnshare);
                setBookToUnshare(null);
              },
            },
          ]}
          onDidDismiss={() => setBookToUnshare(null)}
        />

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage}
          duration={3000}
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default MySharedBooks;
