/**
 * Hardcover Settings Page
 * Configure Hardcover API token and manage sync.
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
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSpinner,
  IonToast,
  IonToggle,
  IonNote,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import {
  checkmarkCircle,
  alertCircle,
  logOutOutline,
  syncOutline,
  eyeOutline,
  eyeOffOutline,
  warningOutline,
  personOutline,
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { useHardcoverStore } from '../../stores/hardcoverStore';
import type { HardcoverSyncResult } from '../../types/hardcover';
import './HardcoverSettings.css';

const HardcoverSettings: React.FC = () => {
  const {
    isConnected,
    username,
    lastSyncAt,
    autoSync,
    isSyncing,
    syncError,
    pendingQueueCount,
    connect,
    disconnect,
    fullSync,
    setAutoSync,
    initialize,
  } = useHardcoverStore();

  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [syncResult, setSyncResult] = useState<HardcoverSyncResult | null>(null);
  const isWeb = !Capacitor.isNativePlatform();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleTestConnection = async () => {
    if (!token.trim()) {
      setToastMessage('Please enter your Hardcover API token');
      return;
    }
    setIsTesting(true);
    try {
      const name = await connect(token.trim());
      setToastMessage(`Connected as ${name}`);
      setToken('');
    } catch (err) {
      setToastMessage(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncResult(null);
    const result = await fullSync();
    setSyncResult(result);
  };

  const handleDisconnect = async () => {
    await disconnect();
    setSyncResult(null);
    setToastMessage('Disconnected from Hardcover');
  };

  return (
    <IonPage className="hardcover-settings">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Hardcover</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {isWeb && (
          <IonCard className="web-banner">
            <IonCardContent>
              <IonIcon icon={warningOutline} color="warning" style={{ fontSize: 24, flexShrink: 0 }} />
              <div>
                <strong>Hardcover sync requires the Android app</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                  The web version cannot connect to Hardcover due to CORS restrictions.
                </p>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {isConnected ? (
          <>
            <IonCard className="status-card">
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={checkmarkCircle} color="success" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Connected
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p><IonIcon icon={personOutline} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {username}</p>
                {lastSyncAt && (
                  <p style={{ fontSize: 13, color: 'var(--ion-color-medium)' }}>
                    Last sync: {new Date(lastSyncAt).toLocaleString()}
                  </p>
                )}
              </IonCardContent>
            </IonCard>

            <IonList>
              <IonItem>
                <IonLabel>
                  <h3>Auto Sync</h3>
                  <IonNote>Sync when app starts and comes online</IonNote>
                </IonLabel>
                <IonToggle
                  checked={autoSync}
                  onIonChange={(e) => setAutoSync(e.detail.checked)}
                />
              </IonItem>

              <IonItem>
                <IonLabel>
                  <h3>
                    Sync Now
                    {pendingQueueCount > 0 && (
                      <span className="queue-badge">{pendingQueueCount}</span>
                    )}
                  </h3>
                  <IonNote>Pull ratings, reviews, and push status changes</IonNote>
                </IonLabel>
                <IonButton
                  slot="end"
                  fill="outline"
                  size="small"
                  onClick={handleSync}
                  disabled={isSyncing}
                  style={{ '--border-radius': '8px' }}
                >
                  {isSyncing ? <IonSpinner name="crescent" /> : (
                    <>
                      <IonIcon icon={syncOutline} slot="start" />
                      Sync
                    </>
                  )}
                </IonButton>
              </IonItem>
            </IonList>

            {syncResult && (
              <div className={`sync-result ${syncResult.errors.length === 0 ? 'sync-result--success' : 'sync-result--error'}`}>
                <p>Matched: {syncResult.matched} books</p>
                <p>Pulled: {syncResult.pulled} updates from Hardcover</p>
                <p>Pushed: {syncResult.pushed} updates to Hardcover</p>
                {syncResult.errors.length > 0 && (
                  <p>Errors: {syncResult.errors.join(', ')}</p>
                )}
              </div>
            )}

            {syncError && !syncResult && (
              <div className="sync-result sync-result--error">
                <IonIcon icon={alertCircle} color="danger" /> {syncError}
              </div>
            )}

            <div style={{ padding: 16 }}>
              <IonButton
                expand="block"
                fill="outline"
                color="danger"
                onClick={handleDisconnect}
              >
                <IonIcon icon={logOutOutline} slot="start" />
                Disconnect
              </IonButton>
            </div>
          </>
        ) : (
          <>
            <IonCard className="info-card">
              <IonCardHeader>
                <IonCardTitle>Connect to Hardcover</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p>
                  Hardcover is a modern book tracking platform. Connect your account to sync
                  reading status, ratings, reviews, and discover community ratings.
                </p>
                <p style={{ marginTop: 8 }}>
                  Get your API token from <strong>hardcover.app/account/api</strong>
                </p>
              </IonCardContent>
            </IonCard>

            <IonList>
              <IonItem>
                <IonLabel position="stacked">API Token</IonLabel>
                <IonInput
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onIonInput={(e) => setToken(e.detail.value || '')}
                  placeholder="Enter your Hardcover API token"
                  disabled={isWeb}
                />
                <IonButton
                  slot="end"
                  fill="clear"
                  size="small"
                  onClick={() => setShowToken(!showToken)}
                >
                  <IonIcon icon={showToken ? eyeOffOutline : eyeOutline} />
                </IonButton>
              </IonItem>
            </IonList>

            <div style={{ padding: 16 }}>
              <IonButton
                expand="block"
                onClick={handleTestConnection}
                disabled={isTesting || !token.trim() || isWeb}
              >
                {isTesting ? <IonSpinner name="crescent" /> : 'Connect'}
              </IonButton>
            </div>
          </>
        )}

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

export default HardcoverSettings;
