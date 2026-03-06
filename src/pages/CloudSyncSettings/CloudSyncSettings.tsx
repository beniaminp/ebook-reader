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
  IonIcon,
  IonSpinner,
  IonAlert,
  IonToast,
  IonToggle,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonButtons,
  IonBackButton,
  IonProgressBar,
  IonText,
  IonActionSheet,
  IonLoading,
} from '@ionic/react';
import {
  cloudUploadOutline,
  checkmarkCircle,
  refreshOutline,
  trashOutline,
  logoDropbox,
  cloudOutline,
  saveOutline,
  timeOutline,
  downloadOutline,
  logOutOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  personOutline,
  serverOutline,
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
    error,
    initialize,
    connect,
    disconnect,
    syncData,
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

  useEffect(() => {
    if (isConnected) {
      loadBackups();
    }
  }, [isConnected, selectedProvider]);

  const formatBytes = (bytes: number | null): string => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

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
      setDropboxToken('');
      setWebdavUrl('');
      setWebdavUsername('');
      setWebdavPassword('');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleSync = async () => {
    try {
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

      await syncData(allBookmarks, allHighlights, allProgress);
      setShowSyncResult(true);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

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

  const handleRestoreBackup = async (backup: BackupInfo) => {
    setSelectedBackup(backup);
    setShowBackupActionSheet(true);
  };

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

  const handleDeleteBackup = async (backup: BackupInfo) => {
    const success = await backupService.deleteBackup(selectedProvider, backup.path);
    if (success) {
      await loadBackups();
    }
  };

  const formatBackupSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatBackupDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <IonPage className="cloud-sync-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Cloud Sync</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Connection Section */}
        <fieldset className="settings-section settings-fieldset">
          <legend>Connection</legend>
          <div className="settings-section-header">
            <div className="settings-section-icon settings-section-icon--green">
              <IonIcon icon={cloudOutline} />
            </div>
            <span className="settings-section-title" aria-hidden="true">Connection</span>
          </div>

          {!isConnected ? (
            <>
              <div className="provider-tiles">
                <button
                  className={`provider-tile${selectedProvider === 'dropbox' ? ' provider-tile--selected' : ''}`}
                  onClick={() => setSelectedProvider('dropbox')}
                  type="button"
                >
                  <IonIcon icon={logoDropbox} />
                  <span>Dropbox</span>
                </button>
                <button
                  className={`provider-tile${selectedProvider === 'webdav' ? ' provider-tile--selected' : ''}`}
                  onClick={() => setSelectedProvider('webdav')}
                  type="button"
                >
                  <IonIcon icon={serverOutline} />
                  <span>WebDAV</span>
                </button>
              </div>

              <IonList className="credential-fields">
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
                      <IonNote className="credential-help">
                        Go to the Dropbox App Console, create an app, and generate an access token
                        with "Files" permissions.
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
                      <IonNote className="credential-help">
                        For Nextcloud, use: https://your-domain.com/remote.php/webdav/
                      </IonNote>
                    </IonItem>
                  </>
                )}
              </IonList>

              <div className="section-action">
                <IonButton expand="block" onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? (
                    <>
                      <IonSpinner name="crescent" slot="start" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </IonButton>
              </div>
            </>
          ) : (
            <>
              <IonItem>
                <IonIcon icon={checkmarkCircle} slot="start" color="success" />
                <IonLabel>
                  <h3>Connected to {selectedProvider === 'dropbox' ? 'Dropbox' : 'WebDAV'}</h3>
                  <IonNote>
                    {[accountName, accountEmail].filter(Boolean).join(' \u00B7 ') || 'Connected'}
                  </IonNote>
                </IonLabel>
              </IonItem>

              <IonItem>
                <IonIcon icon={timeOutline} slot="start" color="medium" />
                <IonLabel>
                  <h3>Last Synced</h3>
                  <IonNote>{formatDate(lastSyncTime)}</IonNote>
                </IonLabel>
              </IonItem>

              {(quotaUsed !== null || quotaTotal !== null) && (
                <IonItem>
                  <IonIcon icon={cloudUploadOutline} slot="start" color="medium" />
                  <IonLabel>
                    <h3>Storage</h3>
                    <IonNote>
                      {formatBytes(quotaUsed)} / {formatBytes(quotaTotal)}
                    </IonNote>
                  </IonLabel>
                </IonItem>
              )}

              {syncStatus === 'syncing' && syncProgress && (
                <div className="sync-progress-inline">
                  <IonProgressBar value={syncProgress.progress / 100} />
                  <IonNote>
                    {syncProgress.currentOperation && formatOperation(syncProgress.currentOperation)}
                    {' '}{syncProgress.itemsCompleted} / {syncProgress.itemsTotal} items
                  </IonNote>
                </div>
              )}

              <IonItem>
                <IonLabel>
                  <div className="connection-actions">
                    <IonButton
                      fill="outline"
                      size="small"
                      onClick={handleSync}
                      disabled={syncStatus === 'syncing'}
                      style={{ '--border-radius': '8px' } as any}
                    >
                      {syncStatus === 'syncing' ? (
                        <IonSpinner name="crescent" />
                      ) : (
                        <>
                          <IonIcon icon={refreshOutline} slot="start" />
                          Sync Now
                        </>
                      )}
                    </IonButton>
                    <IonButton
                      fill="outline"
                      size="small"
                      color="danger"
                      onClick={handleDisconnect}
                      style={{ '--border-radius': '8px' } as any}
                    >
                      <IonIcon icon={logOutOutline} slot="start" />
                      Disconnect
                    </IonButton>
                  </div>
                </IonLabel>
              </IonItem>
            </>
          )}
        </fieldset>

        {/* Sync Settings Section */}
        {isConnected && (
          <fieldset className="settings-section settings-fieldset">
            <legend>Sync Settings</legend>
            <div className="settings-section-header">
              <div className="settings-section-icon settings-section-icon--blue">
                <IonIcon icon={settingsOutline} />
              </div>
              <span className="settings-section-title" aria-hidden="true">Sync Settings</span>
            </div>

            <IonItem>
              <IonLabel>
                <h3>Auto Sync</h3>
                <IonNote>Automatically sync your reading data</IonNote>
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
                <IonNote>Only sync when connected to WiFi</IonNote>
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
          </fieldset>
        )}

        {/* Backup & Restore Section */}
        {isConnected && (
          <fieldset className="settings-section settings-fieldset">
            <legend>Backup & Restore</legend>
            <div className="settings-section-header">
              <div className="settings-section-icon settings-section-icon--indigo">
                <IonIcon icon={shieldCheckmarkOutline} />
              </div>
              <span className="settings-section-title" aria-hidden="true">Backup & Restore</span>
            </div>

            <IonItem>
              <IonIcon icon={saveOutline} slot="start" color="primary" />
              <IonLabel>
                <h3>Create Backup</h3>
                <IonNote>Save all data to cloud storage</IonNote>
              </IonLabel>
              <IonButton
                slot="end"
                fill="outline"
                size="small"
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                style={{ '--border-radius': '8px' } as any}
              >
                {isCreatingBackup ? <IonSpinner name="crescent" /> : 'Backup'}
              </IonButton>
            </IonItem>

            {isLoadingBackups && (
              <div className="loading-backups">
                <IonSpinner name="crescent" />
                <IonNote>Loading backups...</IonNote>
              </div>
            )}

            {!isLoadingBackups && backups.length > 0 && (
              <>
                {backups.map((backup) => (
                  <IonItem key={backup.path}>
                    <IonIcon icon={timeOutline} slot="start" color="medium" />
                    <IonLabel>
                      <h3>{formatBackupDate(backup.timestamp)}</h3>
                      <IonNote>{formatBackupSize(backup.size)}</IonNote>
                    </IonLabel>
                    <IonButton
                      fill="clear"
                      size="small"
                      onClick={() => handleRestoreBackup(backup)}
                    >
                      <IonIcon icon={downloadOutline} />
                    </IonButton>
                    <IonButton
                      fill="clear"
                      size="small"
                      color="danger"
                      onClick={() => handleDeleteBackup(backup)}
                    >
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </IonItem>
                ))}
              </>
            )}

            {!isLoadingBackups && backups.length === 0 && (
              <IonItem lines="none">
                <IonNote>No backups yet. Create one to save your current data.</IonNote>
              </IonItem>
            )}
          </fieldset>
        )}
      </IonContent>

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
