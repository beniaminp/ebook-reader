import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { useRssStore } from '../src/stores/useRssStore';
import type { RssFeed, RssArticle } from '../src/services/rssService';

type TabId = 'feeds' | 'articles' | 'saved';

export default function RssScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Store state
  const feeds = useRssStore((s) => s.feeds);
  const articles = useRssStore((s) => s.articles);
  const isLoading = useRssStore((s) => s.isLoading);
  const error = useRssStore((s) => s.error);
  const loadFromStorage = useRssStore((s) => s.loadFromStorage);
  const addFeed = useRssStore((s) => s.addFeed);
  const removeFeed = useRssStore((s) => s.removeFeed);
  const refreshFeed = useRssStore((s) => s.refreshFeed);
  const refreshAllFeeds = useRssStore((s) => s.refreshAllFeeds);
  const markArticleRead = useRssStore((s) => s.markArticleRead);
  const markArticleSaved = useRssStore((s) => s.markArticleSaved);
  const removeArticle = useRssStore((s) => s.removeArticle);
  const saveArticleUrl = useRssStore((s) => s.saveArticleUrl);

  // Local state
  const [activeTab, setActiveTab] = useState<TabId>('feeds');
  const [feedUrl, setFeedUrl] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showSaveArticle, setShowSaveArticle] = useState(false);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleAddFeed = useCallback(async () => {
    if (!feedUrl.trim()) {
      Alert.alert('Error', 'Please enter a feed URL');
      return;
    }
    await addFeed(feedUrl.trim());
    setFeedUrl('');
    setShowAddFeed(false);
  }, [feedUrl, addFeed]);

  const handleSaveArticleUrl = useCallback(async () => {
    if (!articleUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }
    await saveArticleUrl(articleUrl.trim());
    setArticleUrl('');
    setShowSaveArticle(false);
  }, [articleUrl, saveArticleUrl]);

  const handleRemoveFeed = useCallback(
    (feed: RssFeed) => {
      Alert.alert('Remove Feed', `Remove "${feed.title || feed.url}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFeed(feed.id),
        },
      ]);
    },
    [removeFeed]
  );

  const handleArticlePress = useCallback(
    (article: RssArticle) => {
      markArticleRead(article.id);
      if (article.url) {
        Linking.openURL(article.url);
      }
    },
    [markArticleRead]
  );

  const handleArticleLongPress = useCallback(
    (article: RssArticle) => {
      Alert.alert(article.title, undefined, [
        {
          text: 'Open in Browser',
          onPress: () => {
            if (article.url) Linking.openURL(article.url);
          },
        },
        {
          text: article.savedToLibrary ? 'Already Saved' : 'Save for Later',
          onPress: () => {
            if (!article.savedToLibrary) markArticleSaved(article.id);
          },
        },
        {
          text: article.read ? 'Already Read' : 'Mark as Read',
          onPress: () => {
            if (!article.read) markArticleRead(article.id);
          },
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeArticle(article.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [markArticleRead, markArticleSaved, removeArticle]
  );

  // Filter articles based on tab & selected feed
  const displayedArticles = articles.filter((a) => {
    if (activeTab === 'saved') return a.savedToLibrary;
    if (selectedFeedId) return a.feedId === selectedFeedId;
    return true;
  });

  const unreadCount = articles.filter((a) => !a.read).length;
  const savedCount = articles.filter((a) => a.savedToLibrary).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>RSS / Read Later</Text>
        <Pressable
          onPress={() => refreshAllFeeds()}
          disabled={isLoading}
          style={{ padding: 8 }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons name="refresh" size={22} color={theme.primary} />
          )}
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: theme.border }]}>
        {(
          [
            { id: 'feeds' as TabId, label: 'Feeds', count: feeds.length },
            { id: 'articles' as TabId, label: 'Articles', count: unreadCount },
            { id: 'saved' as TabId, label: 'Saved', count: savedCount },
          ] as const
        ).map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              setActiveTab(tab.id);
              setSelectedFeedId(null);
            }}
            style={[
              styles.tab,
              activeTab === tab.id && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.id ? theme.primary : theme.textMuted },
              ]}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <Text style={styles.badgeText}>{tab.count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Error Banner */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: theme.error + '18', borderColor: theme.error }]}>
          <Ionicons name="alert-circle" size={18} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => refreshAllFeeds()}
            tintColor={theme.primary}
          />
        }
      >
        {/* ─── Feeds Tab ───────────────────────────── */}
        {activeTab === 'feeds' && (
          <>
            {/* Add Feed Form */}
            {showAddFeed ? (
              <View style={[styles.addForm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.addFormTitle, { color: theme.text }]}>Add RSS Feed</Text>
                <TextInput
                  value={feedUrl}
                  onChangeText={setFeedUrl}
                  placeholder="https://example.com/feed.xml"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
                <View style={styles.addFormButtons}>
                  <Pressable
                    onPress={() => { setShowAddFeed(false); setFeedUrl(''); }}
                    style={[styles.formButton, { borderColor: theme.border }]}
                  >
                    <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAddFeed}
                    disabled={isLoading}
                    style={[styles.formButton, { backgroundColor: theme.primary }]}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Add Feed</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowAddFeed(true)}
                style={[styles.addButton, { borderColor: theme.primary }]}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                <Text style={{ color: theme.primary, fontWeight: '600', marginLeft: 8 }}>
                  Add RSS Feed
                </Text>
              </Pressable>
            )}

            {/* Feed List */}
            {feeds.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={48} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No feeds yet</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  Add an RSS feed to start reading articles
                </Text>
              </View>
            ) : (
              feeds.map((feed) => {
                const feedArticleCount = articles.filter((a) => a.feedId === feed.id).length;
                const feedUnreadCount = articles.filter(
                  (a) => a.feedId === feed.id && !a.read
                ).length;
                return (
                  <Pressable
                    key={feed.id}
                    onPress={() => {
                      setSelectedFeedId(feed.id);
                      setActiveTab('articles');
                    }}
                    onLongPress={() => handleRemoveFeed(feed)}
                    style={[styles.feedCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <View style={[styles.feedIcon, { backgroundColor: theme.primary + '18' }]}>
                      <Ionicons name="newspaper" size={22} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.feedTitle, { color: theme.text }]} numberOfLines={1}>
                        {feed.title || feed.url}
                      </Text>
                      {feed.description ? (
                        <Text style={[styles.feedDescription, { color: theme.textMuted }]} numberOfLines={2}>
                          {feed.description}
                        </Text>
                      ) : null}
                      <View style={styles.feedMeta}>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                          {feedArticleCount} articles
                        </Text>
                        {feedUnreadCount > 0 && (
                          <View style={[styles.badge, { backgroundColor: theme.primary, marginLeft: 8 }]}>
                            <Text style={styles.badgeText}>{feedUnreadCount} new</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => refreshFeed(feed.id)}
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="refresh" size={18} color={theme.textMuted} />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </>
        )}

        {/* ─── Articles Tab ────────────────────────── */}
        {activeTab === 'articles' && (
          <>
            {/* Selected feed header */}
            {selectedFeedId && (
              <View style={[styles.selectedFeedHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: '600', flex: 1 }}>
                  {feeds.find((f) => f.id === selectedFeedId)?.title || 'Feed'}
                </Text>
                <Pressable onPress={() => setSelectedFeedId(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={18} color={theme.textMuted} />
                </Pressable>
              </View>
            )}

            {displayedArticles.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No articles</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  {feeds.length === 0
                    ? 'Add a feed to see articles here'
                    : 'Refresh your feeds to fetch new articles'}
                </Text>
              </View>
            ) : (
              displayedArticles.map((article) => (
                <Pressable
                  key={article.id}
                  onPress={() => handleArticlePress(article)}
                  onLongPress={() => handleArticleLongPress(article)}
                  style={[
                    styles.articleCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: article.read ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.articleTitle,
                        { color: theme.text, fontWeight: article.read ? '400' : '600' },
                      ]}
                      numberOfLines={2}
                    >
                      {article.title}
                    </Text>
                    {article.author ? (
                      <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                        {article.author}
                      </Text>
                    ) : null}
                    {article.content ? (
                      <Text
                        style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}
                        numberOfLines={2}
                      >
                        {article.content.replace(/<[^>]*>/g, '').substring(0, 120)}
                      </Text>
                    ) : null}
                    <View style={styles.articleMeta}>
                      {article.read && (
                        <View style={styles.articleMetaTag}>
                          <Ionicons name="checkmark" size={12} color={theme.success} />
                          <Text style={{ color: theme.success, fontSize: 11, marginLeft: 2 }}>Read</Text>
                        </View>
                      )}
                      {article.savedToLibrary && (
                        <View style={styles.articleMetaTag}>
                          <Ionicons name="bookmark" size={12} color={theme.warning} />
                          <Text style={{ color: theme.warning, fontSize: 11, marginLeft: 2 }}>Saved</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="open-outline" size={16} color={theme.textMuted} style={{ marginLeft: 8 }} />
                </Pressable>
              ))
            )}
          </>
        )}

        {/* ─── Saved Tab ──────────────────────────── */}
        {activeTab === 'saved' && (
          <>
            {/* Save URL form */}
            {showSaveArticle ? (
              <View style={[styles.addForm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.addFormTitle, { color: theme.text }]}>Save URL for Later</Text>
                <TextInput
                  value={articleUrl}
                  onChangeText={setArticleUrl}
                  placeholder="https://example.com/article"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
                <View style={styles.addFormButtons}>
                  <Pressable
                    onPress={() => { setShowSaveArticle(false); setArticleUrl(''); }}
                    style={[styles.formButton, { borderColor: theme.border }]}
                  >
                    <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveArticleUrl}
                    style={[styles.formButton, { backgroundColor: theme.primary }]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowSaveArticle(true)}
                style={[styles.addButton, { borderColor: theme.primary }]}
              >
                <Ionicons name="bookmark-outline" size={20} color={theme.primary} />
                <Text style={{ color: theme.primary, fontWeight: '600', marginLeft: 8 }}>
                  Save URL for Later
                </Text>
              </Pressable>
            )}

            {displayedArticles.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bookmark-outline" size={48} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>Nothing saved</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  Long-press an article to save it for later
                </Text>
              </View>
            ) : (
              displayedArticles.map((article) => (
                <Pressable
                  key={article.id}
                  onPress={() => handleArticlePress(article)}
                  onLongPress={() => handleArticleLongPress(article)}
                  style={[styles.articleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.articleTitle, { color: theme.text }]} numberOfLines={2}>
                      {article.title}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                      {article.url}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color={theme.textMuted} style={{ marginLeft: 8 }} />
                </Pressable>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  addForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  addFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  addFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  formButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  feedIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  feedDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  feedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  selectedFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  articleTitle: {
    fontSize: 15,
  },
  articleMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  articleMetaTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
