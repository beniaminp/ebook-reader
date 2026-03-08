import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../src/components/common/Header';
import { useTheme } from '../src/theme/ThemeContext';
import { useRssStore } from '../src/stores/useRssStore';
import type { RssArticle, RssFeed } from '../src/services/rssService';

type TabType = 'articles' | 'feeds';

export default function ReadLaterScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const feeds = useRssStore((s) => s.feeds);
  const articles = useRssStore((s) => s.articles);
  const isLoading = useRssStore((s) => s.isLoading);
  const error = useRssStore((s) => s.error);
  const loadFromStorage = useRssStore((s) => s.loadFromStorage);
  const addFeed = useRssStore((s) => s.addFeed);
  const removeFeed = useRssStore((s) => s.removeFeed);
  const refreshAllFeeds = useRssStore((s) => s.refreshAllFeeds);
  const markArticleRead = useRssStore((s) => s.markArticleRead);
  const removeArticle = useRssStore((s) => s.removeArticle);

  const [activeTab, setActiveTab] = useState<TabType>('articles');
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const handleAddFeed = useCallback(async () => {
    const url = feedUrl.trim();
    if (!url) return;
    await addFeed(url);
    setFeedUrl('');
    setShowAddFeed(false);
  }, [feedUrl, addFeed]);

  const handleRemoveArticle = useCallback(
    (article: RssArticle) => {
      Alert.alert('Remove Article', `Remove "${article.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeArticle(article.id),
        },
      ]);
    },
    [removeArticle]
  );

  const handleRemoveFeed = useCallback(
    (feed: RssFeed) => {
      Alert.alert(
        'Remove Feed',
        `Remove "${feed.title}" and all its articles?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeFeed(feed.id),
          },
        ]
      );
    },
    [removeFeed]
  );

  const handleOpenArticle = useCallback(
    (article: RssArticle) => {
      markArticleRead(article.id);
      if (article.url) {
        Linking.openURL(article.url).catch(() => {
          Alert.alert('Error', 'Could not open URL');
        });
      }
    },
    [markArticleRead]
  );

  const handleRefresh = useCallback(async () => {
    await refreshAllFeeds();
  }, [refreshAllFeeds]);

  const unreadCount = articles.filter((a) => !a.read).length;

  const getFeedTitle = useCallback(
    (feedId: string) => {
      if (feedId === '__saved__') return 'Saved';
      return feeds.find((f) => f.id === feedId)?.title || 'Unknown Feed';
    },
    [feeds]
  );

  const renderArticleItem = useCallback(
    ({ item }: { item: RssArticle }) => (
      <Pressable
        style={[
          styles.articleItem,
          { backgroundColor: theme.surface, opacity: item.read ? 0.6 : 1 },
        ]}
        onPress={() => handleOpenArticle(item)}
        onLongPress={() => handleRemoveArticle(item)}
      >
        <View style={styles.articleIconContainer}>
          <Ionicons
            name={item.savedToLibrary ? 'book' : 'globe-outline'}
            size={22}
            color={item.savedToLibrary ? theme.success : theme.textMuted}
          />
        </View>
        <View style={styles.articleContent}>
          <Text
            style={[
              styles.articleTitle,
              { color: theme.text, fontWeight: item.read ? '400' : '600' },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text style={[styles.articleMeta, { color: theme.textSecondary }]} numberOfLines={1}>
            {getFeedTitle(item.feedId)}
            {item.published && ` \u00B7 ${new Date(item.published).toLocaleDateString()}`}
          </Text>
          {item.content ? (
            <Text style={[styles.articleSummary, { color: theme.textMuted }]} numberOfLines={2}>
              {item.content.replace(/<[^>]*>/g, '').slice(0, 150)}
            </Text>
          ) : null}
        </View>
        {item.savedToLibrary && (
          <View style={[styles.savedBadge, { backgroundColor: theme.success + '20' }]}>
            <Ionicons name="checkmark" size={14} color={theme.success} />
          </View>
        )}
      </Pressable>
    ),
    [theme, getFeedTitle, handleOpenArticle, handleRemoveArticle]
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: RssFeed }) => {
      const feedArticleCount = articles.filter((a) => a.feedId === item.id).length;
      const feedUnread = articles.filter((a) => a.feedId === item.id && !a.read).length;

      return (
        <Pressable
          style={[styles.feedItem, { backgroundColor: theme.surface }]}
          onLongPress={() => handleRemoveFeed(item)}
        >
          <Ionicons name="newspaper-outline" size={24} color={theme.warning} />
          <View style={styles.feedContent}>
            <Text style={[styles.feedTitle, { color: theme.text }]}>{item.title}</Text>
            <Text style={[styles.feedUrl, { color: theme.textMuted }]} numberOfLines={1}>
              {item.url}
            </Text>
            <Text style={[styles.feedStats, { color: theme.textSecondary }]}>
              {feedArticleCount} articles
              {feedUnread > 0 && ` (${feedUnread} unread)`}
              {item.lastFetched &&
                ` \u00B7 Updated ${new Date(item.lastFetched).toLocaleDateString()}`}
            </Text>
          </View>
          <Pressable
            style={styles.deleteFeedBtn}
            onPress={() => handleRemoveFeed(item)}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={18} color={theme.error} />
          </Pressable>
        </Pressable>
      );
    },
    [theme, articles, handleRemoveFeed]
  );

  const renderEmptyArticles = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="newspaper-outline" size={56} color={theme.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>No articles yet</Text>
      <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
        Add an RSS feed to get started
      </Text>
    </View>
  );

  const renderEmptyFeeds = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="newspaper-outline" size={56} color={theme.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>No feeds added</Text>
      <Pressable
        style={[styles.addFeedBtn, { borderColor: theme.primary }]}
        onPress={() => setShowAddFeed(true)}
      >
        <Ionicons name="add" size={18} color={theme.primary} />
        <Text style={[styles.addFeedBtnText, { color: theme.primary }]}>Add RSS Feed</Text>
      </Pressable>
    </View>
  );

  const headerRight = (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      <Pressable onPress={handleRefresh} style={{ padding: 8 }} disabled={isLoading}>
        <Ionicons name="refresh-outline" size={22} color={theme.text} />
      </Pressable>
      <Pressable onPress={() => setShowAddFeed(true)} style={{ padding: 8 }}>
        <Ionicons name="add" size={24} color={theme.text} />
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Header
        title={`Read Later${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        onBack={() => router.back()}
        rightElement={headerRight}
      />

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'articles' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('articles')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'articles' ? theme.primary : theme.textMuted },
            ]}
          >
            Articles
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'feeds' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('feeds')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'feeds' ? theme.primary : theme.textMuted },
            ]}
          >
            Feeds ({feeds.length})
          </Text>
        </Pressable>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      )}

      {activeTab === 'articles' ? (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticleItem}
          ListEmptyComponent={renderEmptyArticles}
          contentContainerStyle={articles.length === 0 ? { flex: 1 } : styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
          )}
        />
      ) : (
        <FlatList
          data={feeds}
          keyExtractor={(item) => item.id}
          renderItem={renderFeedItem}
          ListEmptyComponent={renderEmptyFeeds}
          contentContainerStyle={feeds.length === 0 ? { flex: 1 } : styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
          )}
        />
      )}

      {/* Add Feed Modal */}
      <Modal visible={showAddFeed} transparent animationType="fade" onRequestClose={() => setShowAddFeed(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddFeed(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add RSS Feed</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
              value={feedUrl}
              onChangeText={setFeedUrl}
              placeholder="https://example.com/feed.xml"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => {
                  setFeedUrl('');
                  setShowAddFeed(false);
                }}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddFeed}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Loading
  loadingContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },

  // List
  listContent: {
    paddingBottom: 32,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },

  // Article item
  articleItem: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  articleIconContainer: {
    marginTop: 2,
  },
  articleContent: {
    flex: 1,
    gap: 4,
  },
  articleTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  articleMeta: {
    fontSize: 12,
  },
  articleSummary: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  savedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  // Feed item
  feedItem: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  feedContent: {
    flex: 1,
    gap: 2,
  },
  feedTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  feedUrl: {
    fontSize: 12,
  },
  feedStats: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteFeedBtn: {
    padding: 8,
  },

  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  addFeedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  addFeedBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalInput: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
