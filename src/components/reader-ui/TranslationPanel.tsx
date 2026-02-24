/**
 * TranslationPanel - Modal for translating selected text
 * Shows source/target language selection, translation result, and options
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonToggle,
  IonTextarea,
  IonChip,
  IonToast,
} from '@ionic/react';
import {
  close,
  language,
  swapHorizontal,
  copyOutline,
  bookmarkOutline,
  arrowForward,
  refresh,
  checkmark,
} from 'ionicons/icons';
import { useTranslationStore, getLanguageName, getTargetLanguages } from '../../stores/useTranslationStore';
import { translationService, type TranslationError } from '../../services/translationService';
import type { TranslationResult, TranslationLanguageCode } from '../../types';
import './TranslationPanel.css';

export interface TranslationPanelProps {
  bookId: string;
  location?: string; // CFI or page number for history tracking
  onReplaceText?: (originalText: string, translatedText: string) => void; // For editable docs
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  bookId,
  location,
  onReplaceText,
}) => {
  const {
    isTranslationPanelOpen,
    currentSelection,
    currentTranslation,
    detectedLanguage,
    targetLanguage,
    autoDetectSource,
    saveHistory,
    isLoading,
    error,
    setTargetLanguage,
    setAutoDetectSource,
    setSaveHistory,
    closeTranslationPanel,
    setCurrentTranslation,
    clearCurrentTranslation,
    setLoading,
    setError,
    addToHistory,
  } = useTranslationStore();

  // Local state
  const [sourceLanguage, setSourceLanguage] = useState<TranslationLanguageCode>('auto');
  const [currentTargetLanguage, setCurrentTargetLanguage] = useState<TranslationLanguageCode>(targetLanguage);
  const [swappedLanguages, setSwappedLanguages] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(true);

  // Sync target language with store
  useEffect(() => {
    setCurrentTargetLanguage(targetLanguage);
  }, [targetLanguage]);

  // Auto-translate when selection changes
  useEffect(() => {
    if (autoTranslate && currentSelection && isTranslationPanelOpen) {
      handleTranslate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSelection, sourceLanguage, currentTargetLanguage, isTranslationPanelOpen]);

  const handleTranslate = useCallback(async () => {
    if (!currentSelection || currentSelection.trim().length === 0) {
      setError('Please select some text to translate');
      return;
    }

    clearCurrentTranslation();
    setLoading(true);
    setError(null);

    try {
      const result = await translationService.translate(
        currentSelection,
        sourceLanguage,
        currentTargetLanguage
      );

      setCurrentTranslation(result.translatedText, result.sourceLang);

      // Save to history if enabled
      if (saveHistory) {
        addToHistory({
          bookId,
          sourceText: currentSelection,
          translatedText: result.translatedText,
          sourceLang: result.sourceLang,
          targetLang: result.targetLang,
          location,
        });
      }
    } catch (err) {
      const translationError = err as TranslationError;
      if (translationError.isRateLimit) {
        setError('Rate limit exceeded. Please try again later.');
      } else if (translationError.isUnsupported) {
        setError('This language pair is not supported.');
      } else {
        setError(translationError.message || 'Translation failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [
    currentSelection,
    sourceLanguage,
    currentTargetLanguage,
    bookId,
    location,
    saveHistory,
    clearCurrentTranslation,
    setLoading,
    setError,
    setCurrentTranslation,
    addToHistory,
  ]);

  const handleSwapLanguages = useCallback(() => {
    if (sourceLanguage === 'auto' || !detectedLanguage) {
      setError('Cannot swap with auto-detect. Wait for detection to complete.');
      return;
    }

    setSourceLanguage(currentTargetLanguage);
    setCurrentTargetLanguage(sourceLanguage as TranslationLanguageCode);
    setSwappedLanguages(!swappedLanguages);
  }, [sourceLanguage, currentTargetLanguage, detectedLanguage, swappedLanguages, setError]);

  const handleCopyTranslation = useCallback(async () => {
    if (!currentTranslation) return;

    try {
      await navigator.clipboard.writeText(currentTranslation);
      setShowCopyToast(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [currentTranslation]);

  const handleSaveToNotes = useCallback(() => {
    if (!currentTranslation || !currentSelection) return;

    // This would integrate with the annotations service
    // For now, just show a toast
    setShowSaveToast(true);
  }, [currentTranslation, currentSelection]);

  const handleReplaceText = useCallback(() => {
    if (!onReplaceText || !currentSelection || !currentTranslation) return;

    onReplaceText(currentSelection, currentTranslation);
    closeTranslationPanel();
  }, [onReplaceText, currentSelection, currentTranslation, closeTranslationPanel]);

  const handleSourceLanguageChange = (e: CustomEvent) => {
    setSourceLanguage(e.detail.value as TranslationLanguageCode);
    setSwappedLanguages(false);
  };

  const handleTargetLanguageChange = (e: CustomEvent) => {
    const newLang = e.detail.value as TranslationLanguageCode;
    setCurrentTargetLanguage(newLang);
    setTargetLanguage(newLang);
    setSwappedLanguages(false);
  };

  const getSourceLanguageName = (): string => {
    if (sourceLanguage === 'auto') {
      return detectedLanguage ? getLanguageName(detectedLanguage) + ' (Detected)' : 'Auto Detect';
    }
    return getLanguageName(sourceLanguage);
  };

  const targetLanguages = getTargetLanguages();

  return (
    <>
      <IonModal
        isOpen={isTranslationPanelOpen}
        onDidDismiss={closeTranslationPanel}
        breakpoints={[0, 0.5, 0.75, 1]}
        initialBreakpoint={0.75}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Translate</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={closeTranslationPanel}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className="translation-panel-content">
            {/* Language Selection */}
            <IonCard className="language-selector-card">
              <IonCardContent>
                <div className="language-row">
                  <div className="language-select">
                    <IonLabel position="stacked" className="language-label">
                      From
                    </IonLabel>
                    <IonSelect
                      value={sourceLanguage}
                      onIonChange={handleSourceLanguageChange}
                      placeholder="Auto Detect"
                    >
                      <IonSelectOption value="auto">Auto Detect</IonSelectOption>
                      {targetLanguages.map((lang) => (
                        <IonSelectOption key={lang.code} value={lang.code}>
                          {lang.name}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                    {detectedLanguage && sourceLanguage === 'auto' && (
                      <IonChip className="detected-lang-chip" outline={true}>
                        <IonIcon icon={checkmark} />
                        <IonLabel>{getLanguageName(detectedLanguage)}</IonLabel>
                      </IonChip>
                    )}
                  </div>

                  <IonButton
                    fill="clear"
                    onClick={handleSwapLanguages}
                    disabled={sourceLanguage === 'auto' || !detectedLanguage}
                    className="swap-button"
                  >
                    <IonIcon icon={swapHorizontal} />
                  </IonButton>

                  <div className="language-select">
                    <IonLabel position="stacked" className="language-label">
                      To
                    </IonLabel>
                    <IonSelect
                      value={currentTargetLanguage}
                      onIonChange={handleTargetLanguageChange}
                    >
                      {targetLanguages.map((lang) => (
                        <IonSelectOption key={lang.code} value={lang.code}>
                          {lang.name}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>

            {/* Original Text */}
            {currentSelection && (
              <IonCard className="text-card">
                <IonCardHeader>
                  <IonCardSubtitle className="text-card-subtitle">
                    {getSourceLanguageName()}
                  </IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText className="original-text">
                    <p>{currentSelection}</p>
                  </IonText>
                </IonCardContent>
              </IonCard>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="translation-loading">
                <IonSpinner name="crescent" />
                <p>Translating...</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <IonCard className="error-card">
                <IonCardContent>
                  <IonText color="danger">
                    <p>{error}</p>
                  </IonText>
                  <IonButton
                    expand="block"
                    fill="outline"
                    onClick={handleTranslate}
                    className="retry-button"
                  >
                    <IonIcon icon={refresh} slot="start" />
                    Retry
                  </IonButton>
                </IonCardContent>
              </IonCard>
            )}

            {/* Translation Result */}
            {currentTranslation && !isLoading && (
              <IonCard className="translation-result-card">
                <IonCardHeader>
                  <IonCardSubtitle className="text-card-subtitle">
                    {getLanguageName(currentTargetLanguage)}
                  </IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText className="translated-text">
                    <p>{currentTranslation}</p>
                  </IonText>

                  {/* Action Buttons */}
                  <div className="translation-actions">
                    <IonButton
                      size="small"
                      fill="outline"
                      onClick={handleCopyTranslation}
                    >
                      <IonIcon icon={copyOutline} slot="start" />
                      Copy
                    </IonButton>

                    <IonButton
                      size="small"
                      fill="outline"
                      onClick={handleSaveToNotes}
                    >
                      <IonIcon icon={bookmarkOutline} slot="start" />
                      Save
                    </IonButton>

                    {onReplaceText && (
                      <IonButton
                        size="small"
                        fill="outline"
                        onClick={handleReplaceText}
                      >
                        <IonIcon icon={arrowForward} slot="start" />
                        Replace
                      </IonButton>
                    )}
                  </div>
                </IonCardContent>
              </IonCard>
            )}

            {/* Settings */}
            <IonList className="translation-settings-list">
              <IonItem>
                <IonLabel>Auto-translate on selection</IonLabel>
                <IonToggle
                  checked={autoTranslate}
                  onIonChange={(e) => setAutoTranslate(e.detail.checked)}
                />
              </IonItem>

              <IonItem>
                <IonLabel>Save translation history</IonLabel>
                <IonToggle
                  checked={saveHistory}
                  onIonChange={(e) => setSaveHistory(e.detail.checked)}
                />
              </IonItem>
            </IonList>
          </div>
        </IonContent>
      </IonModal>

      {/* Toast Notifications */}
      <IonToast
        isOpen={showCopyToast}
        onDidDismiss={() => setShowCopyToast(false)}
        message="Translation copied to clipboard"
        duration={2000}
        position="bottom"
        icon={checkmark}
      />

      <IonToast
        isOpen={showSaveToast}
        onDidDismiss={() => setShowSaveToast(false)}
        message="Translation saved to notes"
        duration={2000}
        position="bottom"
        icon={bookmarkOutline}
      />
    </>
  );
};

export default TranslationPanel;
