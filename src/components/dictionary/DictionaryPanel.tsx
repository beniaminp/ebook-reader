/**
 * DictionaryPanel - Modal component for displaying word definitions
 *
 * Shows:
 * - Word with pronunciation
 * - Part of speech
 * - Definitions with examples
 * - Synonyms and antonyms
 * - Save to vocabulary button
 * - Audio pronunciation (if available)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSpinner,
  IonText,
  IonIcon,
  IonToast,
  IonChip,
  IonItem,
  IonLabel,
  IonAccordion,
  IonAccordionGroup,
} from '@ionic/react';
import {
  closeOutline,
  volumeHighOutline,
  bookmarkOutline,
  bookmark,
  refreshOutline,
  bookOutline,
} from 'ionicons/icons';
import { dictionaryService } from '../../services/dictionaryService';
import type { DefinitionResult, Meaning, Definition as DefType } from '../../types';

import './DictionaryPanel.css';

export interface DictionaryPanelProps {
  isOpen: boolean;
  onDismiss: () => void;
  word: string;
  bookId?: string;
}

export const DictionaryPanel: React.FC<DictionaryPanelProps> = ({
  isOpen,
  onDismiss,
  word,
  bookId,
}) => {
  const [result, setResult] = useState<DefinitionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInVocab, setIsInVocab] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  // Fetch definition when word changes
  useEffect(() => {
    if (isOpen && word) {
      fetchDefinition(word);
      checkVocabularyStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, word]);

  const fetchDefinition = async (wordToLookup: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const definitionResult = await dictionaryService.lookup(wordToLookup);
      setResult(definitionResult);

      if (!definitionResult.found) {
        setError(`No definition found for "${wordToLookup}"`);
      }
    } catch {
      setError('Failed to fetch definition');
    } finally {
      setLoading(false);
    }
  };

  const checkVocabularyStatus = async () => {
    const inVocab = await dictionaryService.isInVocabulary(word);
    setIsInVocab(inVocab);
  };

  const handleRetry = () => {
    if (word) {
      fetchDefinition(word);
    }
  };

  const handlePlayAudio = useCallback(
    async (audioUrl: string) => {
      if (playingAudio) return; // Already playing

      setPlayingAudio(audioUrl);
      try {
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingAudio(null);
        audio.onerror = () => {
          setToastMessage('Could not play audio');
          setShowToast(true);
          setPlayingAudio(null);
        };
        await audio.play();
      } catch {
        setToastMessage('Could not play audio');
        setShowToast(true);
        setPlayingAudio(null);
      }
    },
    [playingAudio]
  );

  const handleSaveToVocabulary = async () => {
    if (!result || !result.meanings.length) return;

    setSaving(true);

    try {
      if (isInVocab) {
        await dictionaryService.removeFromVocabulary(word);
        setIsInVocab(false);
        setToastMessage('Removed from vocabulary');
      } else {
        // Get the first definition from the first meaning
        const firstMeaning = result.meanings[0];
        const firstDefinition = firstMeaning.definitions[0];

        await dictionaryService.saveToVocabulary({
          word: result.word,
          definition: firstDefinition.definition,
          partOfSpeech: firstMeaning.partOfSpeech,
          example: firstDefinition.example,
          addedAt: Date.now(),
          context: bookId ? `From book ${bookId}` : undefined,
        });
        setIsInVocab(true);
        setToastMessage('Saved to vocabulary');
      }
      setShowToast(true);
    } catch (err) {
      setToastMessage('Failed to save word');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  const renderPhonetic = () => {
    if (!result?.phonetic && !result?.phonetics?.length) return null;

    const phoneticText = result?.phonetic || result?.phonetics?.[0]?.text;
    const audioUrl = result?.phonetics?.find((p) => p.audio)?.audio;

    return (
      <div className="dict-phonetic">
        {phoneticText && <span className="phonetic-text">/{phoneticText}/</span>}
        {audioUrl && (
          <IonButton
            fill="clear"
            size="small"
            onClick={() => handlePlayAudio(audioUrl)}
            disabled={!!playingAudio}
          >
            <IonIcon
              icon={volumeHighOutline}
              slot="icon-only"
              className={playingAudio ? 'audio-playing' : ''}
            />
          </IonButton>
        )}
      </div>
    );
  };

  const renderDefinition = (def: DefType, index: number) => (
    <div key={index} className="dict-definition">
      <div className="def-number">{index + 1}.</div>
      <div className="def-content">
        <p className="def-text">{def.definition}</p>
        {def.example && <p className="def-example">"{def.example}"</p>}
        {def.synonyms && def.synonyms.length > 0 && (
          <div className="def-synonyms">
            <IonText color="medium">
              <span className="synonyms-label">Synonyms: </span>
            </IonText>
            {def.synonyms.slice(0, 5).map((syn, idx) => (
              <IonChip key={idx} onClick={() => fetchDefinition(syn)} outline={true}>
                <IonLabel>{syn}</IonLabel>
              </IonChip>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderMeaning = (meaning: Meaning, index: number) => (
    <IonAccordion key={index} value={`meaning-${index}`}>
      <IonItem slot="header" className="meaning-header">
        <IonLabel>
          <h2 className="part-of-speech">{meaning.partOfSpeech}</h2>
          <p>
            {meaning.definitions.length} definition{meaning.definitions.length !== 1 ? 's' : ''}
          </p>
        </IonLabel>
      </IonItem>
      <div className="meaning-content" slot="content">
        {meaning.synonyms && meaning.synonyms.length > 0 && (
          <div className="meaning-synonyms">
            <IonText color="medium">
              <span className="synonyms-label">Synonyms: </span>
            </IonText>
            {meaning.synonyms.slice(0, 8).map((syn, idx) => (
              <IonChip key={idx} onClick={() => fetchDefinition(syn)} outline={true}>
                <IonLabel>{syn}</IonLabel>
              </IonChip>
            ))}
          </div>
        )}
        <div className="definitions-list">
          {meaning.definitions.map((def, defIdx) => renderDefinition(def, defIdx))}
        </div>
      </div>
    </IonAccordion>
  );

  return (
    <>
      <IonModal
        isOpen={isOpen}
        onDidDismiss={onDismiss}
        initialBreakpoint={0.75}
        breakpoints={[0, 0.5, 0.75, 1]}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Dictionary</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onDismiss}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className="dict-content">
            {/* Header with word and actions */}
            <div className="dict-header">
              <div className="dict-word-section">
                <h1 className="dict-word">{result?.word || word}</h1>
                {renderPhonetic()}
              </div>

              {result?.found && (
                <IonButton
                  fill={isInVocab ? 'solid' : 'outline'}
                  onClick={handleSaveToVocabulary}
                  disabled={saving}
                >
                  <IonIcon slot="start" icon={isInVocab ? bookmark : bookmarkOutline} />
                  {isInVocab ? 'Saved' : 'Save'}
                </IonButton>
              )}
            </div>

            {/* Loading state */}
            {loading && (
              <div className="dict-loading">
                <IonSpinner name="crescent" />
                <IonText color="medium">
                  <p>Looking up word...</p>
                </IonText>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="dict-error">
                <IonIcon icon={bookOutline} className="error-icon" />
                <IonText color="medium">
                  <p>{error}</p>
                </IonText>
                <IonButton fill="clear" onClick={handleRetry}>
                  <IonIcon slot="start" icon={refreshOutline} />
                  Retry
                </IonButton>
              </div>
            )}

            {/* Definitions */}
            {result?.found && !loading && (
              <div className="dict-results">
                {result.origin && (
                  <div className="dict-origin">
                    <IonText color="medium">
                      <p>{result.origin}</p>
                    </IonText>
                  </div>
                )}

                {result.meanings.length > 0 && (
                  <IonAccordionGroup>
                    {result.meanings.map((meaning, idx) => renderMeaning(meaning, idx))}
                  </IonAccordionGroup>
                )}

                {result.cachedAt && (
                  <div className="dict-cache-info">
                    <IonText color="medium">
                      <p className="cache-hint">
                        {error?.includes('offline')
                          ? 'Showing cached result (offline mode)'
                          : 'Cached for offline use'}
                      </p>
                    </IonText>
                  </div>
                )}
              </div>
            )}
          </div>
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        position="bottom"
      />
    </>
  );
};

export default DictionaryPanel;
