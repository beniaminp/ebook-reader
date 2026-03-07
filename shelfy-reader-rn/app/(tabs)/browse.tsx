import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/theme/ThemeContext';

const RECENTLY_VISITED_KEY = 'opds_recently_visited';

interface RecentVisit {
  url: string;
  title: string;
  visitedAt: number;
}

const FEATURED_SOURCES = [
  {
    id: 'gutenberg',
    title: 'Project Gutenberg',
    description: 'Over 70,000 free eBooks',
    icon: 'book' as const,
    url: 'https://www.gutenberg.org/ebooks.opds/',
  },
  {
    id: 'standard',
    title: 'Standard Ebooks',
    description: 'Beautifully formatted public domain ebooks',
    icon: 'star' as const,
    url: 'https://standardebooks.org/opds',
  },
  {
    id: 'feedbooks',
    title: 'Feedbooks',
    description: 'Public domain books in EPUB format',
    icon: 'globe' as const,
    url: 'https://catalog.feedbooks.com/publicdomain/browse/top.atom',
  },
  {
    id: 'manybooks',
    title: 'ManyBooks',
    description: 'Free eBooks for your reading pleasure',
    icon: 'library' as const,
    url: 'https://manybooks.net/opds/index.php',
  },
];

export default function BrowseScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [customUrl, setCustomUrl] = useState('');
  const [loadingRecent, setLoadingRecent] = useState(true);

  const loadRecentVisits = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENTLY_VISITED_KEY);
      if (stored) {
        setRecentVisits(JSON.parse(stored));
      }
    } catch {
      // ignore
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  // Reload recent visits each time the tab is focused
  useFocusEffect(
    useCallback(() => {
      loadRecentVisits();
    }, [loadRecentVisits])
  );

  const navigateToSource = (url: string, title: string) => {
    router.push({
      pathname: '/opds-browser',
      params: { url, title },
    });
  };

  const handleCustomUrl = () => {
    const url = customUrl.trim();
    if (!url) return;
    // Auto-add protocol if missing
    const finalUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;
    setCustomUrl('');
    navigateToSource(finalUrl, 'Custom Feed');
  };

  const clearRecentVisits = async () => {
    await AsyncStorage.removeItem(RECENTLY_VISITED_KEY);
    setRecentVisits([]);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Browse</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Custom URL input */}
        <View
          style={[
            styles.customUrlContainer,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Ionicons name="link" size={18} color={theme.textMuted} />
          <TextInput
            value={customUrl}
            onChangeText={setCustomUrl}
            placeholder="Enter OPDS feed URL..."
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleCustomUrl}
            style={[styles.customUrlInput, { color: theme.text }]}
          />
          <Pressable
            onPress={handleCustomUrl}
            style={[
              styles.goButton,
              { backgroundColor: customUrl.trim() ? theme.primary : theme.border },
            ]}
          >
            <Ionicons
              name="arrow-forward"
              size={16}
              color={customUrl.trim() ? '#fff' : theme.textMuted}
            />
          </Pressable>
        </View>

        {/* Featured sources */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          FEATURED SOURCES
        </Text>
        {FEATURED_SOURCES.map((source) => (
          <Pressable
            key={source.id}
            onPress={() => navigateToSource(source.url, source.title)}
            style={[styles.sourceCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={[styles.sourceIcon, { backgroundColor: theme.surface }]}>
              <Ionicons name={source.icon} size={24} color={theme.primary} />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={[styles.sourceTitle, { color: theme.text }]}>
                {source.title}
              </Text>
              <Text style={[styles.sourceDesc, { color: theme.textSecondary }]}>
                {source.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </Pressable>
        ))}

        {/* Recently visited */}
        {loadingRecent ? (
          <ActivityIndicator
            size="small"
            color={theme.primary}
            style={{ marginTop: 20 }}
          />
        ) : recentVisits.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                RECENTLY VISITED
              </Text>
              <Pressable onPress={clearRecentVisits} style={{ padding: 4 }}>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>Clear</Text>
              </Pressable>
            </View>
            {recentVisits.map((visit, index) => (
              <Pressable
                key={`${visit.url}-${index}`}
                onPress={() => navigateToSource(visit.url, visit.title)}
                style={[
                  styles.recentCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={[styles.recentIcon, { backgroundColor: theme.surface }]}>
                  <Ionicons name="time" size={20} color={theme.primary} />
                </View>
                <View style={styles.recentInfo}>
                  <Text
                    style={[styles.recentTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {visit.title}
                  </Text>
                  <Text
                    style={[styles.recentUrl, { color: theme.textMuted }]}
                    numberOfLines={1}
                  >
                    {visit.url}
                  </Text>
                </View>
                <Text style={[styles.recentTime, { color: theme.textMuted }]}>
                  {formatTimeAgo(visit.visitedAt)}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  customUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingLeft: 12,
    marginBottom: 20,
    height: 44,
  },
  customUrlInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    height: 44,
  },
  goButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 0,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sourceDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentInfo: {
    flex: 1,
    marginLeft: 10,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentUrl: {
    fontSize: 11,
    marginTop: 1,
  },
  recentTime: {
    fontSize: 11,
    marginLeft: 8,
  },
});
