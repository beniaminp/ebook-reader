/**
 * Calibre-Web Settings Page
 * Configure Calibre-Web server connections
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
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import {
  cloudUploadOutline,
  cloudDownloadOutline,
  checkmarkCircle,
  alertCircle,
  trashOutline,
  addOutline,
  refreshOutline,
  bookOutline,
  imageOutline,
} from 'ionicons/icons';
import { calibreWebService, CalibreWebService } from '../services/calibreWebService';
import {
  CalibreWebServerConfig,
  CalibreWebConnectionTest,
  DownloadProgress,
} from '../types/calibreWeb';
import './CalibreWebSettings.css';

interface ServerFormData {
  name: string;
  serverUrl: string;
  username: string;
  password: string;
}

const CalibreWebSettings: React.FC = () => {
  const [servers, setServers] = useState<CalibreWebServerConfig[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [showAddServer, setShowAddServer] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState<DownloadProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ServerFormData>({
    name: '',
    serverUrl: '',
    username: '',
    password: '',
  });

  // Sync options
  const [syncMetadata, setSyncMetadata] = useState(true);
  const [syncCovers, setSyncCovers] = useState(true);
  const [syncBooks, setSyncBooks] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  // Load sync preferences from the active server config
  useEffect(() => {
    if (activeServerId) {
      const server = servers.find(s => s.id === activeServerId);
      if (server) {
        setSyncMetadata(server.syncMetadata ?? true);
        setSyncCovers(server.syncCovers ?? true);
        setSyncBooks(server.syncBooks ?? false);
      }
    }
  }, [activeServerId, servers]);

  const loadServers = async () => {
    const loadedServers = await calibreWebService.loadServers();
    setServers(loadedServers);
    const currentServer = calibreWebService.getCurrentServer();
    setActiveServerId(currentServer?.id || null);
  };

  const handleTestConnection = async () => {
    if (!formData.serverUrl || !formData.username || !formData.password) {
      setAlertMessage('Please fill in all fields');
      setShowAlert(true);
      return;
    }

    setTestingConnection(true);

    const result: CalibreWebConnectionTest = await calibreWebService.testConnection(
      formData.serverUrl,
      formData.username,
      formData.password
    );

    setTestingConnection(false);

    if (result.success) {
      setSyncResult({
        success: true,
        message: `Connected successfully! ${result.bookCount !== undefined ? `Found ${result.bookCount} books.` : ''} Response time: ${result.responseTime}ms`,
      });
    } else {
      setSyncResult({
        success: false,
        message: `Connection failed: ${result.error}`,
      });
    }
  };

  const handleAddServer = async () => {
    const success = await calibreWebService.login(
      formData.serverUrl,
      formData.username,
      formData.password
    );

    if (success) {
      await loadServers();
      setShowAddServer(false);
      setFormData({ name: '', serverUrl: '', username: '', password: '' });
      setSyncResult(null);
    } else {
      setAlertMessage('Failed to connect. Please check your credentials.');
      setShowAlert(true);
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    await calibreWebService.deleteServer(serverId);
    await loadServers();
  };

  const handleSetActiveServer = async (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (server) {
      const success = await calibreWebService.login(
        server.serverUrl,
        server.username,
        server.password || ''
      );
      if (success) {
        setActiveServerId(serverId);
      }
    }
  };

  const saveSyncPreferences = async (metadata: boolean, covers: boolean, books: boolean) => {
    if (!activeServerId) return;
    const loadedServers = await calibreWebService.loadServers();
    const idx = loadedServers.findIndex(s => s.id === activeServerId);
    if (idx !== -1) {
      loadedServers[idx].syncMetadata = metadata;
      loadedServers[idx].syncCovers = covers;
      loadedServers[idx].syncBooks = books;
      loadedServers[idx].updatedAt = Date.now();
      await calibreWebService.saveServers(loadedServers);
      setServers(loadedServers);
    }
  };

  const handleSync = async () => {
    const currentServer = calibreWebService.getCurrentServer();
    if (!currentServer) {
      setAlertMessage('Please connect to a server first');
      setShowAlert(true);
      return;
    }

    // Persist sync preferences before syncing
    await saveSyncPreferences(syncMetadata, syncCovers, syncBooks);

    setIsSyncing(true);
    setShowSyncModal(false);

    const result = await calibreWebService.syncBooks(
      {
        syncMetadata: syncMetadata,
        downloadCovers: syncCovers,
        downloadBooks: syncBooks,
        maxConcurrentDownloads: 3,
        retryFailedDownloads: false,
      },
      (progress) => {
        setSyncProgress(progress);
      }
    );

    setIsSyncing(false);
    setSyncProgress(null);

    setSyncResult({
      success: result.success,
      message: result.success
        ? `Synced ${result.booksSynced} books, downloaded ${result.coversDownloaded} covers${result.booksDownloaded > 0 ? ` and ${result.booksDownloaded} books` : ''}.`
        : `Sync failed: ${result.errors.join(', ')}`,
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Calibre-Web</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="calibre-web-settings">
        {/* Current Server Status */}
        {activeServerId && (
          <IonCard className="status-card">
            <IonCardHeader>
              <IonCardTitle>Connected</IonCardTitle>
              <IonCardSubtitle>
                {servers.find(s => s.id === activeServerId)?.name || 'Calibre-Web Server'}
              </IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              <IonButton
                expand="block"
                fill="outline"
                onClick={() => setShowSyncModal(true)}
              >
                <IonIcon icon={refreshOutline} slot="start" />
                Sync Library
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {/* Add Server Button */}
        <IonCard className="add-server-card">
          <IonCardContent>
            <IonButton
              expand="block"
              onClick={() => setShowAddServer(true)}
            >
              <IonIcon icon={addOutline} slot="start" />
              Add Calibre-Web Server
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* Server List */}
        {servers.length > 0 && (
          <IonList>
            <IonListHeader>
              <IonLabel>Saved Servers</IonLabel>
            </IonListHeader>
            {servers.map((server) => (
              <IonItem key={server.id} className="server-item">
                <IonLabel>
                  <h2>{server.name}</h2>
                  <p>{server.username}@{server.serverUrl}</p>
                </IonLabel>
                <div className="server-actions">
                  {server.id !== activeServerId && (
                    <IonButton
                      fill="clear"
                      onClick={() => handleSetActiveServer(server.id)}
                    >
                      Connect
                    </IonButton>
                  )}
                  {server.id === activeServerId && (
                    <IonIcon icon={checkmarkCircle} color="success" />
                  )}
                  <IonButton
                    fill="clear"
                    color="danger"
                    onClick={() => handleDeleteServer(server.id)}
                  >
                    <IonIcon icon={trashOutline} />
                  </IonButton>
                </div>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Info Card */}
        <IonCard className="info-card">
          <IonCardHeader>
            <IonCardTitle>About Calibre-Web</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>
              Calibre-Web is a web app for browsing, reading and downloading eBooks stored in a Calibre database.
            </p>
            <p>
              Connect to your Calibre-Web server to sync your eBook library and download books for offline reading.
            </p>
            <IonNote>
              Books are downloaded on-demand when you open them, unless you enable "Download all books" in sync options.
            </IonNote>
          </IonCardContent>
        </IonCard>
      </IonContent>

      {/* Add Server Modal */}
      <IonModal isOpen={showAddServer} onDidDismiss={() => setShowAddServer(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Add Calibre-Web Server</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowAddServer(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Server Name</IonLabel>
              <IonInput
                value={formData.name}
                placeholder="My Calibre Library"
                onIonInput={(e) => setFormData({ ...formData, name: e.detail.value || '' })}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Server URL</IonLabel>
              <IonInput
                value={formData.serverUrl}
                placeholder="https://calibre.example.com"
                onIonInput={(e) => setFormData({ ...formData, serverUrl: e.detail.value || '' })}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Username</IonLabel>
              <IonInput
                value={formData.username}
                placeholder="Your username"
                onIonInput={(e) => setFormData({ ...formData, username: e.detail.value || '' })}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Password</IonLabel>
              <IonInput
                type="password"
                value={formData.password}
                placeholder="Your password"
                onIonInput={(e) => setFormData({ ...formData, password: e.detail.value || '' })}
              />
            </IonItem>
          </IonList>

          {syncResult && (
            <IonCard className={syncResult.success ? 'success-card' : 'error-card'}>
              <IonCardContent>
                <div className="result-content">
                  <IonIcon
                    icon={syncResult.success ? checkmarkCircle : alertCircle}
                    color={syncResult.success ? 'success' : 'danger'}
                  />
                  <p>{syncResult.message}</p>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          <div className="modal-actions">
            <IonButton
              expand="block"
              fill="outline"
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              {testingConnection ? <IonSpinner name="crescent" /> : 'Test Connection'}
            </IonButton>
            <IonButton
              expand="block"
              onClick={handleAddServer}
              disabled={!syncResult?.success}
            >
              Add Server
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      {/* Sync Options Modal */}
      <IonModal isOpen={showSyncModal} onDidDismiss={() => setShowSyncModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Sync Library</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowSyncModal(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            <IonItem>
              <IonLabel>Sync Metadata</IonLabel>
              <IonToggle
                checked={syncMetadata}
                onIonChange={(e) => {
                  const val = e.detail.checked;
                  setSyncMetadata(val);
                  saveSyncPreferences(val, syncCovers, syncBooks);
                }}
              />
            </IonItem>
            <IonItem>
              <IonLabel>Download Cover Images</IonLabel>
              <IonToggle
                checked={syncCovers}
                onIonChange={(e) => {
                  const val = e.detail.checked;
                  setSyncCovers(val);
                  saveSyncPreferences(syncMetadata, val, syncBooks);
                }}
              />
            </IonItem>
            <IonItem>
              <IonLabel>
                <h3>Download All Books (Offline Mode)</h3>
                <p>Enable this to download all books for offline reading</p>
              </IonLabel>
              <IonToggle
                checked={syncBooks}
                onIonChange={(e) => {
                  const val = e.detail.checked;
                  setSyncBooks(val);
                  saveSyncPreferences(syncMetadata, syncCovers, val);
                }}
              />
            </IonItem>
          </IonList>

          {syncProgress && (
            <IonCard>
              <IonCardContent>
                <h3>{syncProgress.bookTitle}</h3>
                <p>{syncProgress.status}</p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${syncProgress.progress}%` }}
                  />
                </div>
                <p className="progress-text">
                  {Math.round(syncProgress.bytesDownloaded / 1024)} KB / {Math.round(syncProgress.totalBytes / 1024)} KB
                </p>
              </IonCardContent>
            </IonCard>
          )}

          <div className="modal-actions">
            <IonButton
              expand="block"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <IonSpinner name="crescent" slot="start" />
                  Syncing...
                </>
              ) : (
                <>
                  <IonIcon icon={cloudDownloadOutline} slot="start" />
                  Start Sync
                </>
              )}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      {/* Alerts */}
      <IonAlert
        isOpen={showAlert}
        onDidDismiss={() => setShowAlert(false)}
        header="Alert"
        message={alertMessage}
        buttons={['OK']}
      />

      <IonToast
        isOpen={!!syncResult}
        onDidDismiss={() => setSyncResult(null)}
        message={syncResult?.message || ''}
        duration={3000}
        color={syncResult?.success ? 'success' : 'danger'}
      />
    </IonPage>
  );
};

export default CalibreWebSettings;
