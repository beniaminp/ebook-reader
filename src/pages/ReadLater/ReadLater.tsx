import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonButtons,
  IonIcon,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonToast,
  IonBackButton,
  IonAlert,
  IonBadge,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import {
  addOutline,
  newspaperOutline,
  bookOutline,
  trashOutline,
  refreshOutline,
  saveOutline,
  checkmarkOutline,
  globeOutline,
} from 'ionicons/icons';
import { useRssStore } from '../../stores/useRssStore';
import { articleToHtml } from '../../services/rssService';
import type { RssArticle } from '../../services/rssService';
import { databaseService } from '../../services/database';
import { webFileStorage } from '../../services/webFileStorage';
import { useAppStore } from '../../stores/useAppStore';
import type { Book } from '../../types/index';

type TabType = 'articles' | 'feeds';

const ReadLater: React.FC = () => {
  const {
    feeds,
    articles,
    isLoading,
    error,
    loadFromStorage,
    addFeed,
    removeFeed,
    refreshAllFeeds,
    markArticleRead,
    markArticleSaved,
    removeArticle,
  } = useRssStore();

  const [activeTab, setActiveTab] = useState<TabType>('articles');
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleAddFeed = async () => {
    if (!feedUrl.trim()) return;
    await addFeed(feedUrl.trim());
    setFeedUrl('');
    setShowAddFeed(false);
    if (!error) {
      setToastMessage('Feed added successfully');
    }
  };

  const handleSaveToLibrary = async (article: RssArticle) => {
    setSavingId(article.id);
    try {
      const html = articleToHtml(article);
      const bookId = crypto.randomUUID();
      const fileName = `${article.title.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 50)}.html`;
      const filePath = `indexeddb://${bookId}/${fileName}`;

      const encoder = new TextEncoder();
      const arrayBuffer = encoder.encode(html).buffer;
      await webFileStorage.storeFile(filePath, arrayBuffer);

      const newBook: Book = {
        id: bookId,
        title: article.title,
        author: article.author || 'RSS Article',
        filePath,
        format: 'html',
        totalPages: 0,
        currentPage: 0,
        progress: 0,
        lastRead: new Date(),
        dateAdded: new Date(),
        source: 'local',
        downloaded: true,
      };

      await databaseService.addBook(newBook);
      markArticleSaved(article.id);
      markArticleRead(article.id);
      useAppStore.getState().loadBooks();
      setToastMessage('Article saved to library');
    } catch (err) {
      setToastMessage(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await refreshAllFeeds();
    event.detail.complete();
  };

  const unreadCount = articles.filter((a) => !a.read).length;

  const getFeedTitle = (feedId: string) => {
    if (feedId === '__saved__') return 'Saved';
    return feeds.find((f) => f.id === feedId)?.title || 'Unknown Feed';
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Read Later {unreadCount > 0 && `(${unreadCount})`}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowAddFeed(true)}>
              <IonIcon icon={addOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            value={activeTab}
            onIonChange={(e) => setActiveTab(e.detail.value as TabType)}
          >
            <IonSegmentButton value="articles">
              <IonLabel>Articles</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="feeds">
              <IonLabel>Feeds ({feeds.length})</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <IonSpinner name="crescent" />
          </div>
        )}

        {activeTab === 'articles' && (
          <>
            {articles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <IonIcon
                  icon={newspaperOutline}
                  style={{ fontSize: '48px', color: 'var(--ion-color-medium)' }}
                />
                <p style={{ color: 'var(--ion-color-medium)' }}>No articles yet</p>
                <IonNote>Add an RSS feed or save a URL to get started</IonNote>
              </div>
            ) : (
              <IonList>
                {articles.map((article) => (
                  <IonItemSliding key={article.id}>
                    <IonItem
                      style={{ opacity: article.read ? 0.6 : 1 }}
                      button
                      onClick={() => {
                        markArticleRead(article.id);
                        if (article.url) window.open(article.url, '_blank');
                      }}
                    >
                      <IonIcon
                        icon={article.savedToLibrary ? bookOutline : globeOutline}
                        slot="start"
                        color={article.savedToLibrary ? 'success' : 'medium'}
                      />
                      <IonLabel>
                        <h3 style={{ fontWeight: article.read ? 'normal' : 'bold' }}>
                          {article.title}
                        </h3>
                        <p>
                          {getFeedTitle(article.feedId)}
                          {article.publishDate && (
                            <> &middot; {new Date(article.publishDate).toLocaleDateString()}</>
                          )}
                        </p>
                        {article.summary && (
                          <IonNote
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {article.summary.replace(/<[^>]*>/g, '').slice(0, 150)}
                          </IonNote>
                        )}
                      </IonLabel>
                      {!article.savedToLibrary && (
                        <IonButton
                          slot="end"
                          fill="clear"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveToLibrary(article);
                          }}
                          disabled={savingId === article.id}
                        >
                          {savingId === article.id ? (
                            <IonSpinner name="crescent" />
                          ) : (
                            <IonIcon icon={saveOutline} />
                          )}
                        </IonButton>
                      )}
                      {article.savedToLibrary && (
                        <IonBadge slot="end" color="success" style={{ fontSize: '10px' }}>
                          <IonIcon icon={checkmarkOutline} style={{ fontSize: '12px' }} />
                        </IonBadge>
                      )}
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption
                        color="danger"
                        onClick={() => removeArticle(article.id)}
                      >
                        <IonIcon icon={trashOutline} slot="icon-only" />
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                ))}
              </IonList>
            )}
          </>
        )}

        {activeTab === 'feeds' && (
          <>
            {feeds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <IonIcon
                  icon={newspaperOutline}
                  style={{ fontSize: '48px', color: 'var(--ion-color-medium)' }}
                />
                <p style={{ color: 'var(--ion-color-medium)' }}>No feeds added</p>
                <IonButton fill="outline" onClick={() => setShowAddFeed(true)}>
                  <IonIcon icon={addOutline} slot="start" />
                  Add RSS Feed
                </IonButton>
              </div>
            ) : (
              <IonList>
                {feeds.map((feed) => {
                  const feedArticleCount = articles.filter(
                    (a) => a.feedId === feed.id
                  ).length;
                  const unread = articles.filter(
                    (a) => a.feedId === feed.id && !a.read
                  ).length;
                  return (
                    <IonItemSliding key={feed.id}>
                      <IonItem>
                        <IonIcon icon={newspaperOutline} slot="start" color="warning" />
                        <IonLabel>
                          <h3>{feed.title}</h3>
                          <p>{feed.url}</p>
                          <IonNote>
                            {feedArticleCount} articles
                            {unread > 0 && ` (${unread} unread)`}
                            {feed.lastFetched && (
                              <> &middot; Last updated:{' '}
                              {new Date(feed.lastFetched).toLocaleDateString()}</>
                            )}
                          </IonNote>
                        </IonLabel>
                      </IonItem>
                      <IonItemOptions side="end">
                        <IonItemOption
                          color="danger"
                          onClick={() => {
                            removeFeed(feed.id);
                            setToastMessage('Feed removed');
                          }}
                        >
                          <IonIcon icon={trashOutline} slot="icon-only" />
                        </IonItemOption>
                      </IonItemOptions>
                    </IonItemSliding>
                  );
                })}
              </IonList>
            )}
          </>
        )}
      </IonContent>

      <IonAlert
        isOpen={showAddFeed}
        onDidDismiss={() => setShowAddFeed(false)}
        header="Add RSS Feed"
        inputs={[
          {
            name: 'url',
            type: 'url',
            placeholder: 'https://example.com/feed.xml',
            value: feedUrl,
          },
        ]}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Add',
            handler: (data) => {
              setFeedUrl(data.url);
              addFeed(data.url).then(() => {
                if (!useRssStore.getState().error) {
                  setToastMessage('Feed added successfully');
                }
              });
            },
          },
        ]}
      />

      <IonToast
        isOpen={!!toastMessage}
        onDidDismiss={() => setToastMessage('')}
        message={toastMessage}
        duration={2000}
      />

      {error && (
        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          color="danger"
        />
      )}
    </IonPage>
  );
};

export default ReadLater;
