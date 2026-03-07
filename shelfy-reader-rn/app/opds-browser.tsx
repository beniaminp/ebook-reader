import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { Header } from '../src/components/common/Header';
import {
  fetchOpdsFeed,
  type OpdsFeed,
  type OpdsBook,
  type OpdsNavEntry,
} from '../src/services/opdsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENTLY_VISITED_KEY = 'opds_recently_visited';

interface RecentVisit {
  url: string;
  title: string;
  visitedAt: number;
}

async function addRecentVisit(url: string, title: string) {
  try {
    const stored = await AsyncStorage.getItem(RECENTLY_VISITED_KEY);
    let visits: RecentVisit[] = stored ? JSON.parse(stored) : [];
    // Remove duplicates
    visits = visits.filter((v) => v.url !== url);
    // Add to front
    visits.unshift({ url, title, visitedAt: Date.now() });
    // Keep max 10
    visits = visits.slice(0, 10);
    await AsyncStorage.setItem(RECENTLY_VISITED_KEY, JSON.stringify(visits));
  } catch {
    // ignore storage errors
  }
}

export default function OpdsBrowserScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string; title: string }>();
  const feedUrl = params.url ?? '';
  const feedTitle = params.title ?? 'OPDS Feed';

  const [feed, setFeed] = useState<OpdsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    if (!feedUrl) {
      setError('No URL provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchOpdsFeed(feedUrl);
      setFeed(result);
      // Track this visit
      await addRecentVisit(feedUrl, feedTitle);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [feedUrl, feedTitle]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleEntryPress = (entry: OpdsBook | OpdsNavEntry) => {
    if (entry.isAcquisition) {
      // Book entry - show download options
      const book = entry as OpdsBook;
      if (book.downloadLinks.length === 0) {
        Alert.alert('No Downloads', 'No downloadable formats found for this book.');
        return;
      }
      if (book.downloadLinks.length === 1) {
        handleDownload(book.downloadLinks[0].href, book.title);
        return;
      }
      // Multiple formats - let user choose
      const options = book.downloadLinks.map((dl) => ({
        text: `${dl.format.toUpperCase()}${dl.title ? ` - ${dl.title}` : ''}`,
        onPress: () => handleDownload(dl.href, book.title),
      }));
      Alert.alert('Download Format', `Choose a format for "${book.title}"`, [
        ...options,
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      // Navigation entry - go deeper
      const navLink = entry.links.find(
        (l) =>
          l.type.includes('atom+xml') ||
          l.type.includes('opds') ||
          l.rel === 'subsection' ||
          l.rel === 'http://opds-spec.org/sort/popular' ||
          l.rel === 'http://opds-spec.org/sort/new' ||
          l.rel === 'alternate' ||
          (!l.rel && l.href)
      );
      if (navLink) {
        router.push({
          pathname: '/opds-browser',
          params: { url: navLink.href, title: entry.title },
        });
      }
    }
  };

  const handleDownload = async (href: string, title: string) => {
    try {
      await Linking.openURL(href);
    } catch {
      Alert.alert('Error', `Could not open download link for "${title}".`);
    }
  };

  const handleNextPage = () => {
    if (feed?.nextPageUrl) {
      router.push({
        pathname: '/opds-browser',
        params: { url: feed.nextPageUrl, title: feedTitle },
      });
    }
  };

  const renderEntry = ({ item }: { item: OpdsBook | OpdsNavEntry }) => {
    const isBook = item.isAcquisition;
    const summary = item.summary || item.content || '';
    const truncatedSummary =
      summary.length > 150 ? summary.substring(0, 150) + '...' : summary;

    return (
      <Pressable
        onPress={() => handleEntryPress(item)}
        style={[
          styles.entryCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        {item.thumbnailUrl || item.coverUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl || item.coverUrl }}
            style={styles.entryImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.entryImagePlaceholder,
              { backgroundColor: theme.surface },
            ]}
          >
            <Ionicons
              name={isBook ? 'book' : 'folder-open'}
              size={24}
              color={theme.textMuted}
            />
          </View>
        )}
        <View style={styles.entryContent}>
          <Text
            style={[styles.entryTitle, { color: theme.text }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.author ? (
            <Text
              style={[styles.entryAuthor, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {item.author}
            </Text>
          ) : null}
          {truncatedSummary ? (
            <Text
              style={[styles.entrySummary, { color: theme.textMuted }]}
              numberOfLines={3}
            >
              {truncatedSummary}
            </Text>
          ) : null}
          {isBook ? (
            <View style={styles.formatRow}>
              {(item as OpdsBook).downloadLinks.map((dl, i) => (
                <View
                  key={i}
                  style={[
                    styles.formatBadge,
                    { backgroundColor: theme.primary + '20' },
                  ]}
                >
                  <Text
                    style={[styles.formatText, { color: theme.primary }]}
                  >
                    {dl.format.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <Ionicons
          name={isBook ? 'download-outline' : 'chevron-forward'}
          size={20}
          color={isBook ? theme.primary : theme.textMuted}
        />
      </Pressable>
    );
  };

  const renderFooter = () => {
    if (!feed?.nextPageUrl) return null;
    return (
      <Pressable
        onPress={handleNextPage}
        style={[
          styles.nextPageButton,
          { backgroundColor: theme.primary },
        ]}
      >
        <Text style={styles.nextPageText}>Load Next Page</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title={feed?.title || feedTitle}
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading feed...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
          <Pressable
            onPress={loadFeed}
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : feed && feed.entries.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No entries found in this feed
          </Text>
        </View>
      ) : (
        <FlatList
          data={feed?.entries ?? []}
          renderItem={renderEntry}
          keyExtractor={(item, index) => item.id || index.toString()}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
  },
  listContent: {
    padding: 16,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  entryImage: {
    width: 56,
    height: 80,
    borderRadius: 6,
  },
  entryImagePlaceholder: {
    width: 56,
    height: 80,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  entryAuthor: {
    fontSize: 13,
    marginTop: 2,
  },
  entrySummary: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  formatRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  formatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formatText: {
    fontSize: 11,
    fontWeight: '600',
  },
  nextPageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  nextPageText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
