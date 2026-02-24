/**
 * VocabularyList - Component to display saved vocabulary words
 *
 * Shows:
 * - List of all saved words
 * - Word, part of speech, definition
 * - Example sentence (if available)
 * - Context (where the word was found)
 * - Delete button
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonToast,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonText,
  IonChip,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
  IonProgressBar,
} from '@ionic/react';
import {
  trashOutline,
  bookOutline,
  closeCircleOutline,
} from 'ionicons/icons';
import { dictionaryService } from '../../services/dictionaryService';
import type { VocabularyWord } from '../../types';

import './VocabularyList.css';

export const VocabularyList: React.FC = () => {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [filteredWords, setFilteredWords] = useState<VocabularyWord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Load vocabulary on mount
  useEffect(() => {
    loadVocabulary();
  }, []);

  // Filter words based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredWords(words);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredWords(
        words.filter(
          word =>
            word.word.toLowerCase().includes(query) ||
            word.definition.toLowerCase().includes(query) ||
            word.partOfSpeech.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, words]);

  const loadVocabulary = async () => {
    setLoading(true);
    try {
      const vocab = await dictionaryService.getAllVocabulary();
      setWords(vocab);
      setFilteredWords(vocab);
    } catch {
      setToastMessage('Failed to load vocabulary');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await loadVocabulary();
    event.detail.complete();
  };

  const handleDelete = async (word: string) => {
    try {
      await dictionaryService.removeFromVocabulary(word);
      setWords(prev => prev.filter(w => w.word !== word));
      setToastMessage(`Removed "${word}" from vocabulary`);
      setShowToast(true);
    } catch {
      setToastMessage('Failed to remove word');
      setShowToast(true);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all vocabulary words?')) {
      try {
        await dictionaryService.clearAllVocabulary();
        setWords([]);
        setFilteredWords([]);
        setToastMessage('Vocabulary cleared');
        setShowToast(true);
      } catch {
        setToastMessage('Failed to clear vocabulary');
        setShowToast(true);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const renderEmpty = () => (
    <div className="vocabulary-empty">
      <IonIcon icon={bookOutline} className="empty-icon" />
      <h2>No vocabulary words yet</h2>
      <p>Look up words in the reader and save them to build your vocabulary.</p>
    </div>
  );

  const renderWordCard = (vocabWord: VocabularyWord) => (
    <IonCard key={vocabWord.word} className="vocab-card">
      <IonCardHeader>
        <div className="vocab-header">
          <IonCardTitle className="vocab-word">{vocabWord.word}</IonCardTitle>
          <IonButton
            fill="clear"
            size="small"
            onClick={() => handleDelete(vocabWord.word)}
          >
            <IonIcon icon={trashOutline} />
          </IonButton>
        </div>
        <IonCardSubtitle>
          <IonChip outline={true}>
            <IonLabel>{vocabWord.partOfSpeech}</IonLabel>
          </IonChip>
          <span className="vocab-date">Added {formatDate(vocabWord.addedAt)}</span>
        </IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <p className="vocab-definition">{vocabWord.definition}</p>
        {vocabWord.example && (
          <p className="vocab-example">"{vocabWord.example}"</p>
        )}
        {vocabWord.context && (
          <IonText color="medium">
            <p className="vocab-context">{vocabWord.context}</p>
          </IonText>
        )}
      </IonCardContent>
    </IonCard>
  );

  return (
    <IonPage className="vocabulary-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Vocabulary</IonTitle>
          <IonButtons slot="end">
            {words.length > 0 && (
              <IonButton onClick={handleClearAll}>
                Clear All
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="vocabulary-content">
          {/* Search bar */}
          <div className="vocab-search-container">
            <IonSearchbar
              value={searchQuery}
              onIonInput={e => setSearchQuery(e.detail.value || '')}
              placeholder="Search vocabulary..."
              showCancelButton="focus"
            />
          </div>

          {/* Loading state */}
          {loading && <IonProgressBar type="indeterminate" />}

          {/* Empty state */}
          {!loading && filteredWords.length === 0 && words.length === 0 && renderEmpty()}

          {/* No search results */}
          {!loading && filteredWords.length === 0 && words.length > 0 && (
            <div className="vocabulary-empty">
              <IonIcon icon={closeCircleOutline} className="empty-icon" />
              <h2>No results found</h2>
              <p>Try a different search term</p>
            </div>
          )}

          {/* Vocabulary list */}
          {!loading && filteredWords.length > 0 && (
            <div className="vocab-list">
              {filteredWords.map(renderWordCard)}
            </div>
          )}

          {/* Stats footer */}
          {!loading && words.length > 0 && (
            <div className="vocab-stats">
              <IonText color="medium">
                <p>{words.length} word{words.length !== 1 ? 's' : ''} in vocabulary</p>
              </IonText>
            </div>
          )}
        </div>
      </IonContent>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        position="bottom"
      />
    </IonPage>
  );
};

export default VocabularyList;
