import React, { useState, useCallback } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSearchbar,
  IonSpinner,
} from '@ionic/react';
import { closeOutline, searchOutline, imageOutline } from 'ionicons/icons';
import type { Book } from '../../types/index';

export interface CoverSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  onCoverSelected: (bookId: string, coverDataUrl: string) => void;
  onToast: (message: string, color: string) => void;
}

const CoverSearchModal: React.FC<CoverSearchModalProps> = ({
  isOpen,
  onClose,
  book,
  onCoverSelected,
  onToast,
}) => {
  const [coverSearchQuery, setCoverSearchQuery] = useState('');
  const [coverResults, setCoverResults] = useState<Array<{ url: string; source: string; title?: string }>>([]);
  const [isCoverSearching, setIsCoverSearching] = useState(false);
  const [isSavingCover, setIsSavingCover] = useState(false);

  // Auto-populate search query when opening
  React.useEffect(() => {
    if (book && isOpen) {
      const q = `${book.title} ${book.author !== 'Unknown' ? book.author : ''}`.trim();
      setCoverSearchQuery(q);
      setCoverResults([]);
      // Auto-search on open
      setTimeout(() => searchCovers(q), 300);
    }
  }, [book, isOpen]);

  const searchCovers = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setIsCoverSearching(true);
    setCoverResults([]);

    const results: Array<{ url: string; source: string; title?: string }> = [];

    // Search Google Books API
    try {
      const googleRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12`
      );
      const googleData = await googleRes.json();
      if (googleData.items) {
        for (const item of googleData.items) {
          const imageLinks = item.volumeInfo?.imageLinks;
          if (imageLinks) {
            const url = imageLinks.thumbnail || imageLinks.smallThumbnail;
            if (url) {
              const hiRes = url
                .replace('zoom=1', 'zoom=3')
                .replace('&edge=curl', '')
                .replace('http://', 'https://');
              results.push({
                url: hiRes,
                source: 'Google Books',
                title: item.volumeInfo?.title,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Google Books cover search failed:', err);
    }

    // Search Open Library API
    try {
      const olRes = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,cover_i`
      );
      const olData = await olRes.json();
      if (olData.docs) {
        for (const doc of olData.docs) {
          if (doc.cover_i) {
            results.push({
              url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
              source: 'Open Library',
              title: doc.title,
            });
          }
        }
      }
    } catch (err) {
      console.error('Open Library cover search failed:', err);
    }

    setCoverResults(results);
    setIsCoverSearching(false);
  }, []);

  const selectCover = useCallback(async (coverUrl: string) => {
    if (!book || isSavingCover) return;
    setIsSavingCover(true);

    try {
      // Fetch the image and convert to data URL for persistence
      const response = await fetch(coverUrl);
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      onCoverSelected(book.id, dataUrl);
      onClose();
      onToast('Cover updated successfully', 'success');
    } catch (err) {
      console.error('Failed to save cover:', err);
      onToast('Failed to download cover image', 'danger');
    } finally {
      setIsSavingCover(false);
    }
  }, [book, isSavingCover, onCoverSelected, onClose, onToast]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Download Cover</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={coverSearchQuery}
            onIonInput={(e) => setCoverSearchQuery(e.detail.value ?? '')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') searchCovers(coverSearchQuery);
            }}
            placeholder="Search by title or author..."
          />
          <IonButtons slot="end">
            <IonButton
              onClick={() => searchCovers(coverSearchQuery)}
              disabled={isCoverSearching || !coverSearchQuery.trim()}
            >
              <IonIcon icon={searchOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {isCoverSearching && (
          <div className="cover-search-loading">
            <IonSpinner name="crescent" />
            <p>Searching for covers...</p>
          </div>
        )}

        {!isCoverSearching && coverResults.length === 0 && coverSearchQuery && (
          <div className="cover-search-empty">
            <IonIcon icon={imageOutline} />
            <p>Press search to find covers</p>
          </div>
        )}

        {isSavingCover && (
          <div className="cover-search-loading">
            <IonSpinner name="crescent" />
            <p>Saving cover...</p>
          </div>
        )}

        {coverResults.length > 0 && !isSavingCover && (
          <div className="cover-search-grid">
            {coverResults.map((cover, index) => (
              <div
                key={`${cover.source}-${index}`}
                className="cover-search-item"
                onClick={() => selectCover(cover.url)}
              >
                <img
                  src={cover.url}
                  alt={cover.title || 'Book cover'}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="cover-search-item-info">
                  {cover.title && <span className="cover-search-item-title">{cover.title}</span>}
                  <span className="cover-search-item-source">{cover.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};

export default CoverSearchModal;
