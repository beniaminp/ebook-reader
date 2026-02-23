/**
 * Markdown Reader Component
 *
 * Converts Markdown to HTML using `marked`, sanitizes with DOMPurify,
 * then renders like HtmlReader with theme integration and search.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonFooter,
  IonIcon,
  IonProgressBar,
  IonSpinner,
  IonModal,
  IonSearchbar,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { arrowBack, searchOutline, settingsOutline, chevronBack, chevronForward } from 'ionicons/icons';
import { ReaderContainer } from '../reader-ui/ReaderContainer';
import { ReadingSettingsPanel } from '../reader-ui/ReadingSettingsPanel';
import { useThemeStore } from '../../stores/useThemeStore';

interface MarkdownReaderProps {
  book: {
    id: string;
    title: string;
    author?: string;
  };
  markdownContent: string;
  onClose?: () => void;
  onProgressChange?: (progress: number) => void;
}

interface SearchResult {
  index: number;
  context: string;
}

export const MarkdownReader: React.FC<MarkdownReaderProps> = ({
  book,
  markdownContent,
  onClose,
  onProgressChange,
}) => {
  const contentRef = useRef<HTMLIonContentElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [safeHtml, setSafeHtml] = useState('');
  const [plainText, setPlainText] = useState('');
  const [progress, setProgress] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { getCurrentTheme } = useThemeStore();
  const currentTheme = getCurrentTheme();

  useEffect(() => {
    if (!markdownContent) return;

    const convert = async () => {
      // Convert markdown to HTML
      const rawHtml = await marked(markdownContent, { async: true });

      // Sanitize HTML
      const clean = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
          'a', 'img', 'figure', 'figcaption',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'div', 'span', 'hr', 'sub', 'sup',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
      });

      setSafeHtml(clean);

      // Extract plain text for search
      const tmp = document.createElement('div');
      tmp.innerHTML = clean;
      setPlainText(tmp.textContent || tmp.innerText || '');
      setLoading(false);
    };

    convert();
  }, [markdownContent]);

  const handleScroll = useCallback(
    (e: CustomEvent) => {
      const scrollEl = e.target as HTMLElement;
      const scrollTop = scrollEl.scrollTop;
      const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
      if (scrollHeight > 0) {
        const pct = Math.round((scrollTop / scrollHeight) * 100);
        setProgress(pct);
        onProgressChange?.(pct);
      }
    },
    [onProgressChange]
  );

  const performSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const text = plainText.toLowerCase();
    const results: SearchResult[] = [];
    let idx = 0;

    while ((idx = text.indexOf(query, idx)) !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(plainText.length, idx + query.length + 40);
      results.push({
        index: idx,
        context:
          (start > 0 ? '…' : '') +
          plainText.slice(start, end) +
          (end < plainText.length ? '…' : ''),
      });
      idx += query.length;
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [searchQuery, plainText]);

  const scrollToSearchResult = useCallback(
    (resultIndex: number) => {
      if (searchResults.length === 0 || !innerRef.current) return;

      const charIndex = searchResults[resultIndex].index;
      const totalChars = plainText.length;
      const ratio = charIndex / totalChars;

      contentRef.current?.scrollToPoint(0, ratio * (innerRef.current.scrollHeight || 0), 300);
    },
    [searchResults, plainText]
  );

  const goToNextSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const next = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(next);
    scrollToSearchResult(next);
  }, [searchResults, currentSearchIndex, scrollToSearchResult]);

  const goToPrevSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const prev = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prev);
    scrollToSearchResult(prev);
  }, [searchResults, currentSearchIndex, scrollToSearchResult]);

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '100px' }}>
            <IonSpinner name="crescent" />
            <p>Loading Markdown...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>
              <IonIcon icon={arrowBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>{book.title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setSearchOpen(true)}>
              <IonIcon icon={searchOutline} />
            </IonButton>
            <IonButton onClick={() => setSettingsOpen(true)}>
              <IonIcon icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonProgressBar value={progress / 100} />
      </IonHeader>

      <IonContent
        ref={contentRef}
        scrollEvents
        onIonScroll={handleScroll}
        style={{ '--background': currentTheme.backgroundColor } as React.CSSProperties}
      >
        <ReaderContainer>
          <div
            ref={innerRef}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
            className="markdown-content"
            style={{ wordBreak: 'break-word' }}
          />
        </ReaderContainer>
      </IonContent>

      <IonFooter>
        <IonToolbar style={{ '--min-height': '32px' }}>
          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--ion-color-medium)' }}>
            {progress}% read
          </div>
        </IonToolbar>
      </IonFooter>

      {/* Search modal */}
      <IonModal isOpen={searchOpen} onDidDismiss={() => setSearchOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Search in Document</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setSearchOpen(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ padding: '16px' }}>
            <IonSearchbar
              value={searchQuery}
              onIonInput={(e) => setSearchQuery(e.detail.value || '')}
              onKeyPress={(e) => {
                if (e.key === 'Enter') performSearch();
              }}
              placeholder="Search text..."
              showCancelButton="focus"
            />
            <IonButton expand="block" onClick={performSearch} style={{ marginTop: '8px' }}>
              Search
            </IonButton>

            {searchResults.length > 0 && (
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
                      key={idx}
                      button
                      onClick={() => {
                        setCurrentSearchIndex(idx);
                        scrollToSearchResult(idx);
                        setSearchOpen(false);
                      }}
                      style={{
                        background:
                          idx === currentSearchIndex
                            ? 'var(--ion-color-light-tint)'
                            : undefined,
                      }}
                    >
                      <IonLabel>
                        <p style={{ fontSize: '13px' }}>{result.context}</p>
                      </IonLabel>
                    </IonItem>
                  ))}
                </div>
              </>
            )}

            {searchQuery && searchResults.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)', marginTop: '20px' }}>
                No results found for "{searchQuery}"
              </p>
            )}
          </div>
        </IonContent>
      </IonModal>

      {/* Settings modal */}
      <IonModal
        isOpen={settingsOpen}
        onDidDismiss={() => setSettingsOpen(false)}
        breakpoints={[0, 0.5, 0.85]}
        initialBreakpoint={0.5}
      >
        <ReadingSettingsPanel onDismiss={() => setSettingsOpen(false)} />
      </IonModal>
    </IonPage>
  );
};

export default MarkdownReader;
