/**
 * TranslationLanguages — manage downloaded MLKit translation models.
 * Shows all supported languages with download/delete controls.
 * Android only — on web, shows an informational message.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonSpinner,
  IonNote,
  IonToast,
  IonSearchbar,
} from '@ionic/react';
import {
  downloadOutline,
  trashOutline,
  checkmarkCircle,
  cloudDownloadOutline,
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import {
  getDownloadedModels,
  ensureModelDownloaded,
  deleteDownloadedModel,
} from '../../services/interlinearTranslationService';
import { SUPPORTED_LANGUAGES } from '../../services/translationService';
import './TranslationLanguages.css';

const TranslationLanguages: React.FC = () => {
  const [downloadedLangs, setDownloadedLangs] = useState<Set<string>>(new Set());
  const [loadingLangs, setLoadingLangs] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const isNative = Capacitor.isNativePlatform();

  const refreshModels = useCallback(async () => {
    if (!isNative) return;
    setIsRefreshing(true);
    try {
      const models = await getDownloadedModels();
      setDownloadedLangs(new Set(models));
    } catch (err) {
      console.error('[TranslationLanguages] Failed to get models:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isNative]);

  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  const handleDownload = useCallback(async (langCode: string, langName: string) => {
    setLoadingLangs((prev) => new Set(prev).add(langCode));
    try {
      await ensureModelDownloaded(langCode);
      setDownloadedLangs((prev) => new Set(prev).add(langCode));
      setToastMessage(`${langName} model downloaded`);
    } catch (err) {
      setToastMessage(`Failed to download ${langName}`);
      console.error('[TranslationLanguages] Download failed:', err);
    } finally {
      setLoadingLangs((prev) => {
        const next = new Set(prev);
        next.delete(langCode);
        return next;
      });
    }
  }, []);

  const handleDelete = useCallback(async (langCode: string, langName: string) => {
    setLoadingLangs((prev) => new Set(prev).add(langCode));
    try {
      await deleteDownloadedModel(langCode);
      setDownloadedLangs((prev) => {
        const next = new Set(prev);
        next.delete(langCode);
        return next;
      });
      setToastMessage(`${langName} model deleted`);
    } catch (err) {
      setToastMessage(`Failed to delete ${langName}`);
      console.error('[TranslationLanguages] Delete failed:', err);
    } finally {
      setLoadingLangs((prev) => {
        const next = new Set(prev);
        next.delete(langCode);
        return next;
      });
    }
  }, []);

  // Filter languages (exclude 'auto', only show target languages)
  const languages = SUPPORTED_LANGUAGES.filter(
    (l) => l.code !== 'auto' && l.target !== false
  );

  const filtered = searchText
    ? languages.filter((l) =>
        l.name.toLowerCase().includes(searchText.toLowerCase()) ||
        l.code.toLowerCase().includes(searchText.toLowerCase())
      )
    : languages;

  // Sort: downloaded first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    const aDown = downloadedLangs.has(a.code) ? 0 : 1;
    const bDown = downloadedLangs.has(b.code) ? 0 : 1;
    if (aDown !== bDown) return aDown - bDown;
    return a.name.localeCompare(b.name);
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Translation Languages</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {!isNative ? (
          <div className="tl-web-notice">
            <IonIcon icon={cloudDownloadOutline} className="tl-web-notice-icon" />
            <h3>Online Translation</h3>
            <p>
              On the web, translations are powered by online services and don't
              require downloading language models.
            </p>
            <p>
              Install the Android app to download languages for offline translation.
            </p>
          </div>
        ) : (
          <>
            <div className="tl-info">
              <p>
                Download language models for offline translation (~30 MB each).
                Downloaded languages are used for both interlinear translation and
                the translate popup.
              </p>
              <div className="tl-stats">
                <span className="tl-stats-count">
                  {isRefreshing ? (
                    <IonSpinner name="dots" />
                  ) : (
                    `${downloadedLangs.size} downloaded`
                  )}
                </span>
              </div>
            </div>

            <IonSearchbar
              value={searchText}
              onIonInput={(e) => setSearchText(e.detail.value || '')}
              placeholder="Search languages"
              debounce={200}
              className="tl-search"
            />

            <div className="tl-list">
              {sorted.map((lang) => {
                const isDownloaded = downloadedLangs.has(lang.code);
                const isLoading = loadingLangs.has(lang.code);

                return (
                  <IonItem key={lang.code} className="tl-item">
                    {isDownloaded && (
                      <IonIcon
                        icon={checkmarkCircle}
                        slot="start"
                        color="success"
                        className="tl-check"
                      />
                    )}
                    <IonLabel>
                      <h3>{lang.name}</h3>
                      <IonNote>{lang.code.toUpperCase()}</IonNote>
                    </IonLabel>

                    {isLoading ? (
                      <IonSpinner name="crescent" slot="end" />
                    ) : isDownloaded ? (
                      <IonButton
                        slot="end"
                        fill="outline"
                        color="danger"
                        size="small"
                        onClick={() => handleDelete(lang.code, lang.name)}
                        style={{ '--border-radius': '8px' }}
                      >
                        <IonIcon icon={trashOutline} slot="start" />
                        Delete
                      </IonButton>
                    ) : (
                      <IonButton
                        slot="end"
                        fill="outline"
                        size="small"
                        onClick={() => handleDownload(lang.code, lang.name)}
                        style={{ '--border-radius': '8px' }}
                      >
                        <IonIcon icon={downloadOutline} slot="start" />
                        Download
                      </IonButton>
                    )}
                  </IonItem>
                );
              })}
            </div>
          </>
        )}

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage}
          duration={2500}
          onDidDismiss={() => setToastMessage('')}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default TranslationLanguages;
