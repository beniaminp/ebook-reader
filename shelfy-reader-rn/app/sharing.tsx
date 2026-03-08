import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { Header } from '../src/components/common/Header';
import { useSharingStore } from '../src/stores/useSharingStore';

type TabId = 'community' | 'my-shared';

interface CommunityBook {
  id: string;
  title: string;
  author: string;
  format: string;
}

export default function SharingScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const mySharedBooks = useSharingStore((s) => s.mySharedBooks);
  const sharedBooks = useSharingStore((s) => s.sharedBooks);
  const loadMySharedBooks = useSharingStore((s) => s.loadMySharedBooks);
  const unshareBook = useSharingStore((s) => s.unshareBook);
  const startSharing = useSharingStore((s) => s.startSharing);

  const [activeTab, setActiveTab] = useState<TabId>('community');
  const [loading, setLoading] = useState(false);
  const [communityBooks] = useState<CommunityBook[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await loadMySharedBooks();
    } finally {
      setLoading(false);
    }
  }, [loadMySharedBooks]);

  const handleUnshare = useCallback(
    (doc: { localBookId: string; [key: string]: any }) => {
      Alert.alert(
        'Stop Sharing',
        'Are you sure you want to stop sharing this book?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unshare',
            style: 'destructive',
            onPress: async () => {
              try {
                await unshareBook(doc);
              } catch {
                Alert.alert('Error', 'Failed to unshare book.');
              }
            },
          },
        ]
      );
    },
    [unshareBook]
  );

  const handleDownload = useCallback((_book: CommunityBook) => {
    Alert.alert(
      'Not Available',
      'P2P sharing is not yet available in the React Native version. This feature requires WebTorrent which is only supported on the web.'
    );
  }, []);

  const handleShareBook = useCallback(() => {
    Alert.alert(
      'Not Available',
      'P2P sharing is not yet available in the React Native version. This feature requires WebTorrent which is only supported on the web.'
    );
  }, []);

  const renderCommunityItem = useCallback(
    ({ item }: { item: CommunityBook }) => (
      <View style={[styles.bookCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.formatBadge, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="book-outline" size={20} color={theme.primary} />
        </View>
        <View style={styles.bookInfo}>
          <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.bookAuthor, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.author}
          </Text>
          <Text style={[styles.bookFormat, { color: theme.textMuted }]}>
            {item.format.toUpperCase()}
          </Text>
        </View>
        <Pressable
          onPress={() => handleDownload(item)}
          style={[styles.iconButton, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="download-outline" size={18} color="#fff" />
        </Pressable>
      </View>
    ),
    [theme, handleDownload]
  );

  const renderMySharedItem = useCallback(
    ({ item }: { item: { localBookId: string; [key: string]: any } }) => (
      <View style={[styles.bookCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.formatBadge, { backgroundColor: theme.success + '18' }]}>
          <Ionicons name="share-outline" size={20} color={theme.success} />
        </View>
        <View style={styles.bookInfo}>
          <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title || item.localBookId}
          </Text>
          {item.author ? (
            <Text style={[styles.bookAuthor, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.author}
            </Text>
          ) : null}
          {item.format ? (
            <Text style={[styles.bookFormat, { color: theme.textMuted }]}>
              {String(item.format).toUpperCase()}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => handleUnshare(item)}
          style={[styles.iconButton, { backgroundColor: theme.error }]}
        >
          <Ionicons name="close-outline" size={18} color="#fff" />
        </Pressable>
      </View>
    ),
    [theme, handleUnshare]
  );

  const renderEmptyState = (tab: TabId) => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={tab === 'community' ? 'people-outline' : 'share-social-outline'}
        size={56}
        color={theme.textMuted}
      />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {tab === 'community' ? 'No Community Books' : 'No Shared Books'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        {tab === 'community'
          ? 'There are no books shared by the community yet. P2P sharing requires WebTorrent which is available on the web version.'
          : 'You are not sharing any books. P2P sharing is not yet available in the React Native version.'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Header title="Community Sharing" onBack={() => router.back()} />

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: theme.warning + '15', borderColor: theme.warning }]}>
        <Ionicons name="information-circle-outline" size={20} color={theme.warning} />
        <Text style={[styles.infoText, { color: theme.warning }]}>
          P2P sharing uses WebTorrent, which is only available on the web version.
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => setActiveTab('community')}
          style={[
            styles.tab,
            activeTab === 'community' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === 'community' ? theme.primary : theme.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'community' ? theme.primary : theme.textMuted },
            ]}
          >
            Community Books
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('my-shared')}
          style={[
            styles.tab,
            activeTab === 'my-shared' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
        >
          <Ionicons
            name="share-social-outline"
            size={18}
            color={activeTab === 'my-shared' ? theme.primary : theme.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'my-shared' ? theme.primary : theme.textMuted },
            ]}
          >
            My Shared Books
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
        </View>
      ) : activeTab === 'community' ? (
        <FlatList
          data={communityBooks}
          keyExtractor={(item) => item.id}
          renderItem={renderCommunityItem}
          contentContainerStyle={[
            styles.listContent,
            communityBooks.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmptyState('community')}
        />
      ) : (
        <FlatList
          data={mySharedBooks}
          keyExtractor={(item) => item.localBookId}
          renderItem={renderMySharedItem}
          contentContainerStyle={[
            styles.listContent,
            mySharedBooks.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmptyState('my-shared')}
        />
      )}

      {/* Share Book FAB */}
      <Pressable
        onPress={handleShareBook}
        style={[styles.fab, { backgroundColor: theme.primary }]}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Share a Book</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  formatBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
    marginRight: 8,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  bookAuthor: {
    fontSize: 13,
    marginTop: 2,
  },
  bookFormat: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6,
  },
});
