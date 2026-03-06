/**
 * TranslationPanel - Bottom sheet for translating selected text.
 * Compact design: shows source text, language pair, and translation result.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  IonModal,
  IonButton,
  IonIcon,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  IonToast,
} from '@ionic/react';
import {
  close,
  swapHorizontal,
  copyOutline,
  volumeHighOutline,
  refresh,
} from 'ionicons/icons';
import {
  useTranslationStore,
  getLanguageName,
  getTargetLanguages,
} from '../../stores/useTranslationStore';
import { translationService, type TranslationError } from '../../services/translationService';
import type { TranslationLanguageCode } from '../../types';
import './TranslationPanel.css';

export interface TranslationPanelProps {
  bookId: string;
  location?: string;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  bookId,
  location,
}) => {
  const {
    isTranslationPanelOpen,
    currentSelection,
    currentTranslation,
    detectedLanguage,
    targetLanguage,
    saveHistory,
    isLoading,
    error,
    setTargetLanguage,
    closeTranslationPanel,
    setCurrentTranslation,
    clearCurrentTranslation,
    setLoading,
    setError,
    addToHistory,
  } = useTranslationStore();

  const [sourceLanguage, setSourceLanguage] = useState<TranslationLanguageCode>('auto');
  const [currentTargetLanguage, setCurrentTargetLanguage] =
    useState<TranslationLanguageCode>(targetLanguage);
  const [showCopyToast, setShowCopyToast] = useState(false);

  useEffect(() => {
    setCurrentTargetLanguage(targetLanguage);
  }, [targetLanguage]);

  const handleTranslate = useCallback(async () => {
    if (!currentSelection || currentSelection.trim().length === 0) return;

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
        setError('Rate limit exceeded. Try again shortly.');
      } else {
        setError(translationError.message || 'Translation failed.');
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

  // Auto-translate when opened or languages change
  useEffect(() => {
    if (currentSelection && isTranslationPanelOpen) {
      handleTranslate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSelection, sourceLanguage, currentTargetLanguage, isTranslationPanelOpen]);

  const handleSwapLanguages = useCallback(() => {
    if (sourceLanguage === 'auto' && detectedLanguage) {
      setSourceLanguage(currentTargetLanguage);
      setCurrentTargetLanguage(detectedLanguage as TranslationLanguageCode);
      setTargetLanguage(detectedLanguage as TranslationLanguageCode);
    } else if (sourceLanguage !== 'auto') {
      const prevSource = sourceLanguage;
      setSourceLanguage(currentTargetLanguage);
      setCurrentTargetLanguage(prevSource);
      setTargetLanguage(prevSource);
    }
  }, [sourceLanguage, currentTargetLanguage, detectedLanguage, setTargetLanguage]);

  const handleCopy = useCallback(async () => {
    if (!currentTranslation) return;
    try {
      await navigator.clipboard.writeText(currentTranslation);
      setShowCopyToast(true);
    } catch {
      // Fallback for Android WebView
      const textarea = document.createElement('textarea');
      textarea.value = currentTranslation;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setShowCopyToast(true);
    }
  }, [currentTranslation]);

  const handleSpeak = useCallback(() => {
    if (!currentTranslation) return;
    const utterance = new SpeechSynthesisUtterance(currentTranslation);
    utterance.lang = currentTargetLanguage;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }, [currentTranslation, currentTargetLanguage]);

  const sourceLangLabel = sourceLanguage === 'auto'
    ? (detectedLanguage ? getLanguageName(detectedLanguage) : 'Detect')
    : getLanguageName(sourceLanguage);

  const targetLanguages = getTargetLanguages();

  return (
    <>
      <IonModal
        isOpen={isTranslationPanelOpen}
        onDidDismiss={closeTranslationPanel}
        breakpoints={[0, 0.45, 0.7]}
        initialBreakpoint={0.45}
        backdropDismiss
        className="translation-modal"
      >
        <div className="tp-container">
          {/* Header bar */}
          <div className="tp-header">
            <div className="tp-lang-bar">
              <IonSelect
                value={sourceLanguage}
                onIonChange={(e) => setSourceLanguage(e.detail.value)}
                interface="popover"
                className="tp-lang-select"
              >
                <IonSelectOption value="auto">
                  Auto{detectedLanguage ? ` (${getLanguageName(detectedLanguage)})` : ''}
                </IonSelectOption>
                {targetLanguages.map((lang) => (
                  <IonSelectOption key={lang.code} value={lang.code}>
                    {lang.name}
                  </IonSelectOption>
                ))}
              </IonSelect>

              <button
                className="tp-swap-btn"
                onClick={handleSwapLanguages}
                disabled={sourceLanguage === 'auto' && !detectedLanguage}
              >
                <IonIcon icon={swapHorizontal} />
              </button>

              <IonSelect
                value={currentTargetLanguage}
                onIonChange={(e) => {
                  const lang = e.detail.value as TranslationLanguageCode;
                  setCurrentTargetLanguage(lang);
                  setTargetLanguage(lang);
                }}
                interface="popover"
                className="tp-lang-select"
              >
                {targetLanguages.map((lang) => (
                  <IonSelectOption key={lang.code} value={lang.code}>
                    {lang.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>

            <button className="tp-close-btn" onClick={closeTranslationPanel}>
              <IonIcon icon={close} />
            </button>
          </div>

          {/* Source text */}
          {currentSelection && (
            <div className="tp-source">
              <span className="tp-label">{sourceLangLabel}</span>
              <p className="tp-source-text">{currentSelection}</p>
            </div>
          )}

          {/* Divider */}
          <div className="tp-divider" />

          {/* Translation result */}
          <div className="tp-result">
            <span className="tp-label">{getLanguageName(currentTargetLanguage)}</span>
            {isLoading ? (
              <div className="tp-loading">
                <IonSpinner name="dots" />
              </div>
            ) : error ? (
              <div className="tp-error">
                <p>{error}</p>
                <button className="tp-retry-btn" onClick={handleTranslate}>
                  <IonIcon icon={refresh} />
                  Retry
                </button>
              </div>
            ) : currentTranslation ? (
              <p className="tp-translated-text">{currentTranslation}</p>
            ) : null}
          </div>

          {/* Action bar */}
          {currentTranslation && !isLoading && (
            <div className="tp-actions">
              <button className="tp-action-btn" onClick={handleCopy}>
                <IonIcon icon={copyOutline} />
                <span>Copy</span>
              </button>
              <button className="tp-action-btn" onClick={handleSpeak}>
                <IonIcon icon={volumeHighOutline} />
                <span>Listen</span>
              </button>
            </div>
          )}
        </div>
      </IonModal>

      <IonToast
        isOpen={showCopyToast}
        onDidDismiss={() => setShowCopyToast(false)}
        message="Copied to clipboard"
        duration={1500}
        position="bottom"
      />
    </>
  );
};

export default TranslationPanel;
