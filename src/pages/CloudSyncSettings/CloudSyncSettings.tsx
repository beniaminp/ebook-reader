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
  IonActionSheet,
  IonLoading,
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
  saveOutline,
  timeOutline,
  downloadOutline,
} from 'ionicons/icons';
import { useCloudSyncStore } from '../../stores/cloudSyncStore';
import { useAppStore } from '../../stores/useAppStore';
import { databaseService } from '../../services/database';
import { backupService } from '../../services/backupService';
import type { CloudProviderType, ConflictResolution } from '../../types/cloudSync';
import type { BackupInfo, BackupResult, RestoreResult } from '../../services/backupService';
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
    setError,
    clearError,
  } = useCloudSyncStore();

  const { books } = useAppStore();

  // UI state
  const [selectedProvider, setSelectedProvider] = useState<CloudProviderType>('dropbox');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSyncResult, setShowSyncResult] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Backup UI state
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [showBackupActionSheet, setShowBackupActionSheet] = useState(false);
  const [showBackupResult, setShowBackupResult] = useState(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);

  // Form state
  const [dropboxToken, setDropboxToken] = useState('');
  const [webdavUrl, setWebdavUrl] = useState('');
  const [webdavUsername, setWebdavUsername] = useState('');
  const [webdavPassword, setWebdavPassword] = useState('');

  useEffect(() => {
    initialize();
    loadBackups();
  }, []);

  // Load backups when connected
  useEffect(() => {
    if (isConnected) {
      loadBackups();
    }
  }, [isConnected, selectedProvider]);

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

  // Load available backups
  const loadBackups = async () => {
    if (!isConnected) return;

    setIsLoadingBackups(true);
    try {
      const backupList = await backupService.listBackups(selectedProvider);
      setBackups(backupList);
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  // Handle create backup
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    clearError();

    try {
      const result = await backupService.fullBackup(selectedProvider);
      setBackupResult(result);
      setShowBackupResult(true);

      if (result.success) {
        await loadBackups();
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      setError(error instanceof Error ? error.message : 'Backup failed');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Handle restore backup
  const handleRestoreBackup = async (backup: BackupInfo) => {
    setSelectedBackup(backup);
    setShowBackupActionSheet(true);
  };

  // Confirm restore backup
  const confirmRestoreBackup = async (mergeStrategy?: 'merge' | 'replace') => {
    if (!selectedBackup) return;

    setIsRestoringBackup(true);
    setShowBackupActionSheet(false);
    clearError();

    try {
      const result = await backupService.restoreBackup(selectedProvider, selectedBackup.path, {
        overwrite: mergeStrategy === 'replace',
        mergeStrategy: mergeStrategy || 'merge',
        restoreThemes: true,
      });
      setRestoreResult(result);
      setShowBackupResult(true);

      // Refresh app data
      if (result.success) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Backup restoration failed:', error);
      setError(error instanceof Error ? error.message : 'Restore failed');
    } finally {
      setIsRestoringBackup(false);
      setSelectedBackup(null);
    }
  };

  // Handle delete backup
  const handleDeleteBackup = async (backup: BackupInfo) => {
    const success = await backupService.deleteBackup(selectedProvider, backup.path);
    if (success) {
      await loadBackups();
    }
  };

  // Get backup size as formatted string
  const formatBackupSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Get backup date as formatted string
  const formatBackupDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
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
                    Connect to your Dropbox account to sync your reading data. You'll need a Dropbox
                    access token.
                  </IonNote>
                ) : (
                  <IonNote>
                    Connect to any WebDAV-compatible cloud storage (Nextcloud, ownCloud, etc.) to
                    sync your reading data.
                  </IonNote>
                )}
              </div>

              <IonButton expand="block" onClick={() => setShowAuthModal(true)}>
                <IonIcon
                  icon={selectedProvider === 'dropbox' ? logoDropbox : cloudOutline}
                  slot="start"
                />
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
                <IonButton expand="block" onClick={handleSync} disabled={syncStatus === 'syncing'}>
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

                <IonButton expand="block" fill="outline" color="danger" onClick={handleDisconnect}>
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
                <p>
                  {syncProgress.currentOperation && formatOperation(syncProgress.currentOperation)}
                </p>
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
              <IonToggle checked={autoSync} onIonChange={(e) => setAutoSync(e.detail.checked)} />
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
                <IonButton fill="clear" color="danger" onClick={() => handleDeleteBook(book.path)}>
                  <IonIcon icon={trashOutline} />
                </IonButton>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Backup & Restore Section */}
        {isConnected && (
          <IonCard className="backup-card">
            <IonCardHeader>
              <IonCardTitle>Backup & Restore</IonCardTitle>
              <IonCardSubtitle>
                Create full backups or restore from previous backups
              </IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              <IonButton expand="block" onClick={handleCreateBackup} disabled={isCreatingBackup}>
                {isCreatingBackup ? (
                  <>
                    <IonSpinner name="crescent" slot="start" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <IonIcon icon={saveOutline} slot="start" />
                    Create Backup
                  </>
                )}
              </IonButton>

              {isLoadingBackups && (
                <div className="loading-backups">
                  <IonSpinner name="crescent" />
                  <IonText>Loading backups...</IonText>
                </div>
              )}

              {!isLoadingBackups && backups.length > 0 && (
                <IonList className="backups-list">
                  <IonListHeader>
                    <IonLabel>Available Backups ({backups.length})</IonLabel>
                  </IonListHeader>

                  {backups.map((backup) => (
                    <IonItem key={backup.path} className="backup-item">
                      <IonLabel>
                        <h3>{formatBackupDate(backup.timestamp)}</h3>
                        <p>
                          <IonIcon icon={timeOutline} />
                          {formatBackupSize(backup.size)}
                        </p>
                      </IonLabel>
                      <IonButton fill="clear" onClick={() => handleRestoreBackup(backup)}>
                        <IonIcon icon={downloadOutline} />
                      </IonButton>
                      <IonButton
                        fill="clear"
                        color="danger"
                        onClick={() => handleDeleteBackup(backup)}
                      >
                        <IonIcon icon={trashOutline} />
                      </IonButton>
                    </IonItem>
                  ))}
                </IonList>
              )}

              {!isLoadingBackups && backups.length === 0 && (
                <IonNote>No backups found. Create a backup to save your current data.</IonNote>
              )}
            </IonCardContent>
          </IonCard>
        )}

        {/* Info Card */}
        <IonCard className="info-card">
          <IonCardHeader>
            <IonCardTitle>About Cloud Sync</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>
              Cloud sync keeps your reading progress, bookmarks, and highlights synchronized across
              all your devices.
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
            <IonTitle>Connect to {selectedProvider === 'dropbox' ? 'Dropbox' : 'WebDAV'}</IonTitle>
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
                    To get an access token, go to the Dropbox App Console, create an app, and
                    generate an access token. The app needs "Files" permissions.
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
            <IonButton expand="block" onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <IonSpinner name="crescent" slot="start" />
                  Connecting...
                </>
              ) : (
                <>
                  <IonIcon
                    icon={selectedProvider === 'dropbox' ? logoDropbox : cloudOutline}
                    slot="start"
                  />
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

      {/* Backup Restore Action Sheet */}
      <IonActionSheet
        isOpen={showBackupActionSheet}
        onDidDismiss={() => setShowBackupActionSheet(false)}
        header="Restore Backup"
        buttons={[
          {
            text: 'Merge with existing data',
            handler: () => confirmRestoreBackup('merge'),
          },
          {
            text: 'Replace all data',
            handler: () => confirmRestoreBackup('replace'),
          },
          {
            text: 'Cancel',
            role: 'cancel',
          },
        ]}
      />

      {/* Backup Result Alert */}
      <IonAlert
        isOpen={showBackupResult}
        onDidDismiss={() => {
          setShowBackupResult(false);
          setBackupResult(null);
          setRestoreResult(null);
        }}
        header={
          backupResult?.success
            ? 'Backup Complete'
            : restoreResult?.success
              ? 'Restore Complete'
              : 'Operation Failed'
        }
        message={getBackupResultMessage(backupResult, restoreResult)}
        buttons={[
          {
            text: 'OK',
            handler: () => {
              setShowBackupResult(false);
              setBackupResult(null);
              setRestoreResult(null);
            },
          },
        ]}
      />

      {/* Loading overlay for restore */}
      <IonLoading isOpen={isRestoringBackup} message="Restoring backup..." duration={0} />
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
      parts.push(`${result.bookmarksAdded + result.bookmarksUpdated} bookmarks synced`);
    }
    if (result.highlightsAdded || result.highlightsUpdated) {
      parts.push(`${result.highlightsAdded + result.highlightsUpdated} highlights synced`);
    }
    if (result.progressUpdated) {
      parts.push(`${result.progressUpdated} reading progress updates`);
    }
    return parts.join(', ') || 'Sync completed successfully';
  }

  return result.errors?.join(', ') || 'Sync failed';
}

function getBackupResultMessage(
  backupResult: BackupResult | null,
  restoreResult: RestoreResult | null
): string {
  if (backupResult) {
    if (backupResult.success) {
      return `Backup created successfully!\n\nFilename: ${backupResult.filename}\nSize: ${backupResult.size ? `${(backupResult.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}`;
    }
    return backupResult.error || 'Backup failed';
  }

  if (restoreResult) {
    if (restoreResult.success) {
      const parts = [];
      if (restoreResult.booksAdded) parts.push(`${restoreResult.booksAdded} books added`);
      if (restoreResult.booksUpdated) parts.push(`${restoreResult.booksUpdated} books updated`);
      if (restoreResult.bookmarksAdded)
        parts.push(`${restoreResult.bookmarksAdded} bookmarks restored`);
      if (restoreResult.highlightsAdded)
        parts.push(`${restoreResult.highlightsAdded} highlights restored`);
      if (restoreResult.settingsRestored)
        parts.push(`${restoreResult.settingsRestored} settings restored`);
      if (restoreResult.themesRestored) parts.push('Theme settings restored');

      let message = parts.join(', ') || 'Restore completed';
      if (restoreResult.errors.length > 0) {
        message += `\n\nSome items had errors:\n${restoreResult.errors.slice(0, 3).join('\n')}`;
        if (restoreResult.errors.length > 3) {
          message += `\n...and ${restoreResult.errors.length - 3} more`;
        }
      }
      return message;
    }
    return restoreResult.errors?.join(', ') || 'Restore failed';
  }

  return '';
}

export default CloudSyncSettings;
