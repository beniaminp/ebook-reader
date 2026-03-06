/**
 * RSS / Read-It-Later Store
 *
 * Manages RSS feeds and saved articles using localStorage for persistence.
 */

import { create } from 'zustand';
import type { RssFeed, RssArticle } from '../services/rssService';
import { fetchFeed } from '../services/rssService';

const FEEDS_KEY = 'rss_feeds';
const ARTICLES_KEY = 'rss_articles';

interface RssState {
  feeds: RssFeed[];
  articles: RssArticle[];
  isLoading: boolean;
  error: string | null;
  loadFromStorage: () => void;
  addFeed: (url: string) => Promise<void>;
  removeFeed: (feedId: string) => void;
  refreshFeed: (feedId: string) => Promise<void>;
  refreshAllFeeds: () => Promise<void>;
  markArticleRead: (articleId: string) => void;
  markArticleSaved: (articleId: string) => void;
  removeArticle: (articleId: string) => void;
  saveArticleUrl: (url: string, title?: string) => void;
}

function saveFeeds(feeds: RssFeed[]) {
  localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds));
}

function saveArticles(articles: RssArticle[]) {
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
}

export const useRssStore = create<RssState>((set, get) => ({
  feeds: [],
  articles: [],
  isLoading: false,
  error: null,

  loadFromStorage: () => {
    try {
      const feeds = JSON.parse(localStorage.getItem(FEEDS_KEY) || '[]');
      const articles = JSON.parse(localStorage.getItem(ARTICLES_KEY) || '[]');
      set({ feeds, articles });
    } catch {
      set({ feeds: [], articles: [] });
    }
  },

  addFeed: async (url: string) => {
    set({ isLoading: true, error: null });
    try {
      const parsed = await fetchFeed(url);
      const feedId = crypto.randomUUID();
      const newFeed: RssFeed = {
        id: feedId,
        url,
        title: parsed.title,
        description: parsed.description,
        lastFetched: new Date().toISOString(),
      };

      const newArticles: RssArticle[] = parsed.articles.map((a) => ({
        ...a,
        id: crypto.randomUUID(),
        feedId,
        read: false,
        savedToLibrary: false,
      }));

      const feeds = [...get().feeds, newFeed];
      const articles = [...newArticles, ...get().articles];
      saveFeeds(feeds);
      saveArticles(articles);
      set({ feeds, articles, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to add feed',
      });
    }
  },

  removeFeed: (feedId: string) => {
    const feeds = get().feeds.filter((f) => f.id !== feedId);
    const articles = get().articles.filter((a) => a.feedId !== feedId);
    saveFeeds(feeds);
    saveArticles(articles);
    set({ feeds, articles });
  },

  refreshFeed: async (feedId: string) => {
    const feed = get().feeds.find((f) => f.id === feedId);
    if (!feed) return;

    set({ isLoading: true, error: null });
    try {
      const parsed = await fetchFeed(feed.url);
      const existingUrls = new Set(
        get().articles.filter((a) => a.feedId === feedId).map((a) => a.url)
      );

      const newArticles: RssArticle[] = parsed.articles
        .filter((a) => !existingUrls.has(a.url))
        .map((a) => ({
          ...a,
          id: crypto.randomUUID(),
          feedId,
          read: false,
          savedToLibrary: false,
        }));

      const updatedFeed = { ...feed, lastFetched: new Date().toISOString() };
      const feeds = get().feeds.map((f) => (f.id === feedId ? updatedFeed : f));
      const articles = [...newArticles, ...get().articles];
      saveFeeds(feeds);
      saveArticles(articles);
      set({ feeds, articles, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to refresh feed',
      });
    }
  },

  refreshAllFeeds: async () => {
    const { feeds } = get();
    set({ isLoading: true, error: null });
    for (const feed of feeds) {
      try {
        await get().refreshFeed(feed.id);
      } catch {
        // Continue with other feeds
      }
    }
    set({ isLoading: false });
  },

  markArticleRead: (articleId: string) => {
    const articles = get().articles.map((a) =>
      a.id === articleId ? { ...a, read: true } : a
    );
    saveArticles(articles);
    set({ articles });
  },

  markArticleSaved: (articleId: string) => {
    const articles = get().articles.map((a) =>
      a.id === articleId ? { ...a, savedToLibrary: true } : a
    );
    saveArticles(articles);
    set({ articles });
  },

  removeArticle: (articleId: string) => {
    const articles = get().articles.filter((a) => a.id !== articleId);
    saveArticles(articles);
    set({ articles });
  },

  saveArticleUrl: (url: string, title?: string) => {
    const article: RssArticle = {
      id: crypto.randomUUID(),
      feedId: '__saved__',
      title: title || url,
      url,
      content: '',
      read: false,
      savedToLibrary: false,
    };
    const articles = [article, ...get().articles];
    saveArticles(articles);
    set({ articles });
  },
}));
