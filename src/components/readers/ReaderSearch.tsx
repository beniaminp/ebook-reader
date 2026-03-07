/**
 * ReaderSearch — search modal for the unified reader.
 *
 * Extracted from UnifiedReaderContainer to reduce its size.
 */

import React, { useState, useCallback } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSearchbar,
  IonSpinner,
  IonItem,
  IonLabel,
  IonIcon,
} from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import type { ReaderEngineRef, SearchResult } from '../../types/reader';

export interface ReaderSearchProps {
  isOpen: boolean;
  onClose: () => void;
  engineRef: React.RefObject<ReaderEngineRef | null>;
}

export const ReaderSearch: React.FC<ReaderSearchProps> = ({
  isOpen,
  onClose,
  engineRef,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !engineRef.current) return;
    setSearching(true);
    try {
      const results = await engineRef.current.search(searchQuery);
      setSearchResults(results);
      setCurrentSearchIndex(0);
      if (results.length > 0) {
        engineRef.current.goToLocation(results[0].location);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, engineRef]);

  const goToSearchResult = useCallback(
    (idx: number) => {
      if (searchResults.length === 0 || !engineRef.current) return;
      setCurrentSearchIndex(idx);
      engineRef.current.goToLocation(searchResults[idx].location);
    },
    [searchResults, engineRef]
  );

  const goToNextSearchResult = useCallback(() => {
    goToSearchResult((currentSearchIndex + 1) % searchResults.length);
  }, [goToSearchResult, currentSearchIndex, searchResults.length]);

  const goToPrevSearchResult = useCallback(() => {
    goToSearchResult((currentSearchIndex - 1 + searchResults.length) % searchResults.length);
  }, [goToSearchResult, currentSearchIndex, searchResults.length]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Search</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '16px' }}>
          <IonSearchbar
            value={searchQuery}
            onIonInput={(e) => setSearchQuery(e.detail.value || '')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder="Search in book..."
            showCancelButton="focus"
          />
          <IonButton expand="block" onClick={handleSearch} style={{ marginTop: '8px' }}>
            Search
          </IonButton>

          {searching && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <IonSpinner />
              <p>Searching...</p>
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  marginTop: '16px',
                  borderBottom: '1px solid var(--ion-color-light-shade)',
                }}
              >
                <span>
                  {currentSearchIndex + 1} of {searchResults.length} results
                </span>
                <div>
                  <IonButton size="small" fill="clear" onClick={goToPrevSearchResult}>
                    <IonIcon icon={chevronBack} />
                  </IonButton>
                  <IonButton size="small" fill="clear" onClick={goToNextSearchResult}>
                    <IonIcon icon={chevronForward} />
                  </IonButton>
                </div>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {searchResults.map((result, idx) => (
                  <IonItem
                    key={`${result.location}-${idx}`}
                    button
                    onClick={() => {
                      goToSearchResult(idx);
                      onClose();
                    }}
                    style={{
                      background:
                        idx === currentSearchIndex ? 'var(--ion-color-light-tint)' : undefined,
                    }}
                  >
                    <IonLabel>
                      {result.label && (
                        <h3 style={{ fontSize: '13px', fontWeight: 600 }}>{result.label}</h3>
                      )}
                      <p style={{ fontSize: '12px' }}>{result.excerpt}</p>
                    </IonLabel>
                  </IonItem>
                ))}
              </div>
            </>
          )}

          {!searching && searchQuery && searchResults.length === 0 && (
            <p
              style={{ textAlign: 'center', color: 'var(--ion-color-medium)', marginTop: '20px' }}
            >
              No results found for &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default ReaderSearch;
