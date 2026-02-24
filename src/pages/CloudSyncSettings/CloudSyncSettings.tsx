/**
 * Cloud Sync Settings Page
 * Configure and manage cloud synchronization (Dropbox, WebDAV)
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonSpinner,
  IonAlert,
  IonToast,
  IonToggle,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonModal,
  IonButtons,
  IonBackButton,
  IonProgressBar,
  IonChip,
  IonText,
} from '@ionic/react';
import {
  cloudUploadOutline,
  cloudDownloadOutline,
  checkmarkCircle,
  alertCircle,
  refreshOutline,
  trashOutline,
  logoDropbox,
  cloudOutline,
  wifiOutline,
} from 'ionicons/icons';
import { useCloudSyncStore } from '../../stores/cloudSyncStore';
import { useAppStore } from '../../stores/useAppStore';
import { databaseService } from '../../services/database';
import type { CloudProviderType, ConflictResolution } from '../../types/cloudSync';
import './CloudSyncSettings.css';

const CloudSyncSettings: React.FC = () => {
  const {
    isConnected,
    accountEmail,
    accountName,
    quotaUsed,
    quotaTotal,
    autoSync,
    syncInterval,
    syncOnWifiOnly,
    conflictResolution,
    syncStatus,
    lastSyncTime,
    lastSyncResult,
    syncProgress,
    cloudBooks,
    error,
    initialize,
    connect,
    disconnect,
    syncData,
    listCloudBooks,
    deleteCloudBook,
    setAutoSync,
    setSyncInterval,
    setSyncOnWifiOnly,
    setConflictResolution,
    clearError,
  } = useCloudSyncStore();

  const { books } = useAppStore();

  // UI state
  const [selectedProvider, setSelectedProvider] = useState<CloudProviderType>('dropbox');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSyncResult, setShowSyncResult] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Form state
  const [dropboxToken, setDropboxToken] = useState('');
  const [webdavUrl, setWebdavUrl] = useState('');
  const [webdavUsername, setWebdavUsername] = useState('');
  const [webdavPassword, setWebdavPassword] = useState('');

  useEffect(() => {
    initialize();
  }, []);

  // Format bytes
  const formatBytes = (bytes: number | null): string => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  // Handle connect
  const handleConnect = async () => {
    setIsConnecting(true);
    clearError();

    let credentials;
    if (selectedProvider === 'dropbox') {
      if (!dropboxToken.trim()) {
        setIsConnecting(false);
        return;
      }
      credentials = {
        type: selectedProvider,
        accessToken: dropboxToken.trim(),
      };
    } else {
      if (!webdavUrl.trim() || !webdavUsername.trim() || !webdavPassword.trim()) {
        setIsConnecting(false);
        return;
      }
      credentials = {
        type: selectedProvider,
        url: webdavUrl.trim(),
        username: webdavUsername.trim(),
        password: webdavPassword.trim(),
      };
    }

    const success = await connect(selectedProvider, credentials);
    setIsConnecting(false);

    if (success) {
      setShowAuthModal(false);
      setDropboxToken('');
      setWebdavUrl('');
      setWebdavUsername('');
      setWebdavPassword('');
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    await disconnect();
  };

  // Handle manual sync
  const handleSync = async () => {
    try {
      // Get all bookmarks, highlights, and progress from database
      const allBookmarks: any[] = [];
      const allHighlights: any[] = [];
      const allProgress: any[] = [];

      for (const book of books) {
        const bookmarks = await databaseService.getBookmarks(book.id);
        allBookmarks.push(...bookmarks);

        const highlights = await databaseService.getHighlights(book.id);
        allHighlights.push(...highlights);

        const progress = await databaseService.getReadingProgress(book.id);
        if (progress) {
          allProgress.push(progress);
        }
      }

      const result = await syncData(allBookmarks, allHighlights, allProgress);
      setShowSyncResult(true);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  // Handle delete cloud book
  const handleDeleteBook = async (path: string) => {
    await deleteCloudBook(path);
    await listCloudBooks();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Cloud Sync</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="cloud-sync-settings">
        {/* Connection Status Card */}
        {!isConnected ? (
          <IonCard className="connect-card">
            <IonCardHeader>
              <IonCardTitle>Connect to Cloud Storage</IonCardTitle>
              <IonCardSubtitle>
                Sync your reading progress, bookmarks, and highlights across devices
              </IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              <IonSegment
                value={selectedProvider}
                onIonChange={(e) => setSelectedProvider(e.detail.value as CloudProviderType)}
                mode="md"
              >
                <IonSegmentButton value="dropbox">
                  <IonIcon icon={logoDropbox} />
                  <IonLabel>Dropbox</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="webdav">
                  <IonIcon icon={cloudOutline} />
                  <IonLabel>WebDAV</IonLabel>
                </IonSegmentButton>
              </IonSegment>

              <div className="provider-description">
                {selectedProvider === 'dropbox' ? (
                  <IonNote>
                    Connect to your Dropbox account to sync your reading data.
                    You'll need a Dropbox access token.
                  </IonNote>
                ) : (
                  <IonNote>
                    Connect to any WebDAV-compatible cloud storage (Nextcloud,
                    ownCloud, etc.) to sync your reading data.
                  </IonNote>
                )}
              </div>

              <IonButton
                expand="block"
                onClick={() => setShowAuthModal(true)}
              >
                <IonIcon icon={selectedProvider === 'dropbox' ? logoDropbox : cloudOutline} slot="start" />
                Connect to {selectedProvider === 'dropbox' ? 'Dropbox' : 'WebDAV'}
              </IonButton>
            </IonCardContent>
          </IonCard>
        ) : (
          <IonCard className="status-card connected">
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={checkmarkCircle} color="success" />
                Connected to {selectedProvider === 'dropbox' ? 'Dropbox' : 'WebDAV'}
              </IonCardTitle>
              {accountName && <IonCardSubtitle>{accountName}</IonCardSubtitle>}
              {accountEmail && <IonCardSubtitle>{accountEmail}</IonCardSubtitle>}
            </IonCardHeader>
            <IonCardContent>
              <div className="sync-info">
                <div className="info-row">
                  <span className="label">Last synced:</span>
                  <span className="value">{formatDate(lastSyncTime)}</span>
                </div>
                {(quotaUsed !== null || quotaTotal !== null) && (
                  <div className="info-row">
                    <span className="label">Storage used:</span>
                    <span className="value">
                      {formatBytes(quotaUsed)} / {formatBytes(quotaTotal)}
                    </span>
                  </div>
                )}
              </div>

              <div className="action-buttons">
                <IonButton
                  expand="block"
                  onClick={handleSync}
                  disabled={syncStatus === 'syncing'}
                >
                  {syncStatus === 'syncing' ? (
                    <>
                      <IonSpinner name="crescent" slot="start" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <IonIcon icon={refreshOutline} slot="start" />
                      Sync Now
                    </>
                  )}
                </IonButton>

                <IonButton
                  expand="block"
                  fill="outline"
                  color="danger"
                  onClick={handleDisconnect}
                >
                  <IonIcon icon={trashOutline} slot="start" />
                  Disconnect
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Sync Progress */}
        {syncStatus === 'syncing' && syncProgress && (
          <IonCard className="progress-card">
            <IonCardHeader>
              <IonCardTitle>
                <IonSpinner name="crescent" />
                Syncing...
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonProgressBar value={syncProgress.progress / 100} />
              <div className="progress-details">
                <p>{syncProgress.currentOperation && formatOperation(syncProgress.currentOperation)}</p>
                {syncProgress.currentFile && (
                  <IonNote className="file-name">{syncProgress.currentFile}</IonNote>
                )}
                <IonText>
                  {syncProgress.itemsCompleted} / {syncProgress.itemsTotal} items
                </IonText>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Sync Settings */}
        {isConnected && (
          <IonList>
            <IonListHeader>
              <IonLabel>Sync Settings</IonLabel>
            </IonListHeader>

            <IonItem>
              <IonLabel>
                <h3>Auto Sync</h3>
                <p>Automatically sync your reading data</p>
              </IonLabel>
              <IonToggle
                checked={autoSync}
                onIonChange={(e) => setAutoSync(e.detail.checked)}
              />
            </IonItem>

            {autoSync && (
              <IonItem>
                <IonLabel>Sync Interval</IonLabel>
                <IonSelect
                  value={syncInterval}
                  onIonChange={(e) => setSyncInterval(e.detail.value as number)}
                >
                  <IonSelectOption value={15}>15 minutes</IonSelectOption>
                  <IonSelectOption value={30}>30 minutes</IonSelectOption>
                  <IonSelectOption value={60}>1 hour</IonSelectOption>
                  <IonSelectOption value={120}>2 hours</IonSelectOption>
                  <IonSelectOption value={240}>4 hours</IonSelectOption>
                </IonSelect>
              </IonItem>
            )}

            <IonItem>
              <IonLabel>
                <h3>WiFi Only</h3>
                <p>Only sync when connected to WiFi</p>
              </IonLabel>
              <IonToggle
                checked={syncOnWifiOnly}
                onIonChange={(e) => setSyncOnWifiOnly(e.detail.checked)}
              />
            </IonItem>

            <IonItem>
              <IonLabel>Conflict Resolution</IonLabel>
              <IonSelect
                value={conflictResolution}
                onIonChange={(e) => setConflictResolution(e.detail.value as ConflictResolution)}
              >
                <IonSelectOption value="last-write-wins">Last Write Wins</IonSelectOption>
                <IonSelectOption value="client-wins">Device Wins</IonSelectOption>
                <IonSelectOption value="server-wins">Cloud Wins</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonList>
        )}

        {/* Cloud Books */}
        {isConnected && cloudBooks.length > 0 && (
          <IonList>
            <IonListHeader>
              <IonLabel>Cloud Books ({cloudBooks.length})</IonLabel>
            </IonListHeader>

            {cloudBooks.map((book) => (
              <IonItem key={book.id} className="cloud-book-item">
                <IonLabel>
                  <h3>{book.name}</h3>
                  <p>
                    {book.format.toUpperCase()} · {formatBytes(book.size)}
                  </p>
                </IonLabel>
                <IonButton
                  fill="clear"
                  color="danger"
                  onClick={() => handleDeleteBook(book.path)}
                >
                  <IonIcon icon={trashOutline} />
                </IonButton>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Info Card */}
        <IonCard className="info-card">
          <IonCardHeader>
            <IonCardTitle>About Cloud Sync</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>
              Cloud sync keeps your reading progress, bookmarks, and highlights synchronized across all your devices.
            </p>
            <p>
              <strong>What gets synced:</strong>
            </p>
            <ul>
              <li>Reading progress (current page, percentage)</li>
              <li>Bookmarks with their locations</li>
              <li>Highlights with colors and notes</li>
            </ul>
            <IonNote>
              <IonIcon icon={wifiOutline} />
              For best results, sync over a WiFi connection to avoid data charges.
            </IonNote>
          </IonCardContent>
        </IonCard>
      </IonContent>

      {/* Authentication Modal */}
      <IonModal isOpen={showAuthModal} onDidDismiss={() => setShowAuthModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>
              Connect to {selectedProvider === 'dropbox' ? 'Dropbox' : 'WebDAV'}
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowAuthModal(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            {selectedProvider === 'dropbox' ? (
              <>
                <IonItem>
                  <IonLabel position="stacked">Access Token</IonLabel>
                  <IonInput
                    type="password"
                    value={dropboxToken}
                    placeholder="Enter your Dropbox access token"
                    onIonInput={(e) => setDropboxToken(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem lines="none">
                  <IonNote className="auth-help-text">
                    To get an access token, go to the Dropbox App Console, create an app, and generate an access token.
                    The app needs "Files" permissions.
                  </IonNote>
                </IonItem>
              </>
            ) : (
              <>
                <IonItem>
                  <IonLabel position="stacked">Server URL</IonLabel>
                  <IonInput
                    value={webdavUrl}
                    placeholder="https://cloud.example.com/remote.php/webdav"
                    onIonInput={(e) => setWebdavUrl(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Username</IonLabel>
                  <IonInput
                    value={webdavUsername}
                    placeholder="Your username"
                    onIonInput={(e) => setWebdavUsername(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Password</IonLabel>
                  <IonInput
                    type="password"
                    value={webdavPassword}
                    placeholder="Your password or app password"
                    onIonInput={(e) => setWebdavPassword(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem lines="none">
                  <IonNote className="auth-help-text">
                    Enter your WebDAV server URL and credentials. For Nextcloud, use the format:
                    https://your-domain.com/remote.php/webdav/
                  </IonNote>
                </IonItem>
              </>
            )}
          </IonList>

          <div className="modal-actions">
            <IonButton
              expand="block"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <IonSpinner name="crescent" slot="start" />
                  Connecting...
                </>
              ) : (
                <>
                  <IonIcon icon={selectedProvider === 'dropbox' ? logoDropbox : cloudOutline} slot="start" />
                  Connect
                </>
              )}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      {/* Sync Result Alert */}
      <IonAlert
        isOpen={showSyncResult}
        onDidDismiss={() => setShowSyncResult(false)}
        header={lastSyncResult?.success ? 'Sync Complete' : 'Sync Failed'}
        message={getSyncResultMessage(lastSyncResult)}
        buttons={[
          {
            text: 'OK',
            handler: () => {
              setShowSyncResult(false);
            },
          },
        ]}
      />

      {/* Error Toast */}
      <IonToast
        isOpen={!!error}
        onDidDismiss={clearError}
        message={error || ''}
        duration={3000}
        color="danger"
      />
    </IonPage>
  );
};

// Helper functions
function formatOperation(operation: string): string {
  switch (operation) {
    case 'uploading':
      return 'Uploading your data to cloud...';
    case 'downloading':
      return 'Downloading data from cloud...';
    case 'merging':
      return 'Merging changes...';
    case 'uploading-book':
      return 'Uploading book...';
    case 'downloading-book':
      return 'Downloading book...';
    default:
      return operation;
  }
}

function getSyncResultMessage(result: any): string {
  if (!result) return '';

  if (result.success) {
    const parts = [];
    if (result.bookmarksAdded || result.bookmarksUpdated) {
      parts.push(
        `${result.bookmarksAdded + result.bookmarksUpdated} bookmarks synced`
      );
    }
    if (result.highlightsAdded || result.highlightsUpdated) {
      parts.push(
        `${result.highlightsAdded + result.highlightsUpdated} highlights synced`
      );
    }
    if (result.progressUpdated) {
      parts.push(`${result.progressUpdated} reading progress updates`);
    }
    return parts.join(', ') || 'Sync completed successfully';
  }

  return result.errors?.join(', ') || 'Sync failed';
}

export default CloudSyncSettings;
