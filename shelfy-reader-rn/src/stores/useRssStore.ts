/**
 * RSS / Read-It-Later Store
 *
 * Manages RSS feeds and saved articles.
 *
 * React Native version: uses AsyncStorage instead of localStorage.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RssFeed, RssArticle } from '../services/rssService';
import { fetchFeed } from '../services/rssService';

const FEEDS_KEY = 'rss_feeds';
const ARTICLES_KEY = 'rss_articles';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface RssState {
  feeds: RssFeed[];
  articles: RssArticle[];
  isLoading: boolean;
  error: string | null;
  loadFromStorage: () => Promise<void>;
  addFeed: (url: string) => Promise<void>;
  removeFeed: (feedId: string) => Promise<void>;
  refreshFeed: (feedId: string) => Promise<void>;
  refreshAllFeeds: () => Promise<void>;
  markArticleRead: (articleId: string) => Promise<void>;
  markArticleSaved: (articleId: string) => Promise<void>;
  removeArticle: (articleId: string) => Promise<void>;
  saveArticleUrl: (url: string, title?: string) => Promise<void>;
}

async function saveFeeds(feeds: RssFeed[]) {
  await AsyncStorage.setItem(FEEDS_KEY, JSON.stringify(feeds));
}

async function saveArticles(articles: RssArticle[]) {
  await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
}

export const useRssStore = create<RssState>((set, get) => ({
  feeds: [],
  articles: [],
  isLoading: false,
  error: null,

  loadFromStorage: async () => {
    try {
      const feedsJson = await AsyncStorage.getItem(FEEDS_KEY);
      const articlesJson = await AsyncStorage.getItem(ARTICLES_KEY);
      const feeds = feedsJson ? JSON.parse(feedsJson) : [];
      const articles = articlesJson ? JSON.parse(articlesJson) : [];
      set({ feeds, articles });
    } catch {
      set({ feeds: [], articles: [] });
    }
  },

  addFeed: async (url: string) => {
    set({ isLoading: true, error: null });
    try {
      const parsed = await fetchFeed(url);
      const feedId = generateUUID();
      const newFeed: RssFeed = {
        id: feedId,
        url,
        title: parsed.title,
        description: parsed.description,
        lastFetched: new Date().toISOString(),
      };

      const newArticles: RssArticle[] = parsed.articles.map((a) => ({
        ...a,
        id: generateUUID(),
        feedId,
        read: false,
        savedToLibrary: false,
      }));

      const feeds = [...get().feeds, newFeed];
      const articles = [...newArticles, ...get().articles];
      await saveFeeds(feeds);
      await saveArticles(articles);
      set({ feeds, articles, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to add feed',
      });
    }
  },

  removeFeed: async (feedId: string) => {
    const feeds = get().feeds.filter((f) => f.id !== feedId);
    const articles = get().articles.filter((a) => a.feedId !== feedId);
    await saveFeeds(feeds);
    await saveArticles(articles);
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
          id: generateUUID(),
          feedId,
          read: false,
          savedToLibrary: false,
        }));

      const updatedFeed = { ...feed, lastFetched: new Date().toISOString() };
      const feeds = get().feeds.map((f) => (f.id === feedId ? updatedFeed : f));
      const articles = [...newArticles, ...get().articles];
      await saveFeeds(feeds);
      await saveArticles(articles);
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

  markArticleRead: async (articleId: string) => {
    const articles = get().articles.map((a) =>
      a.id === articleId ? { ...a, read: true } : a
    );
    await saveArticles(articles);
    set({ articles });
  },

  markArticleSaved: async (articleId: string) => {
    const articles = get().articles.map((a) =>
      a.id === articleId ? { ...a, savedToLibrary: true } : a
    );
    await saveArticles(articles);
    set({ articles });
  },

  removeArticle: async (articleId: string) => {
    const articles = get().articles.filter((a) => a.id !== articleId);
    await saveArticles(articles);
    set({ articles });
  },

  saveArticleUrl: async (url: string, title?: string) => {
    const article: RssArticle = {
      id: generateUUID(),
      feedId: '__saved__',
      title: title || url,
      url,
      content: '',
      read: false,
      savedToLibrary: false,
    };
    const articles = [article, ...get().articles];
    await saveArticles(articles);
    set({ articles });
  },
}));
