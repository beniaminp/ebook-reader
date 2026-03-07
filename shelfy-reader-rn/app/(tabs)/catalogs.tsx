import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/theme/ThemeContext';

interface OPDSFeed {
  id: string;
  title: string;
  url: string;
}

const CUSTOM_FEEDS_KEY = 'custom_opds_feeds';

const DEFAULT_FEEDS: OPDSFeed[] = [
  {
    id: 'gutenberg',
    title: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/ebooks.opds/',
  },
  {
    id: 'standard',
    title: 'Standard Ebooks',
    url: 'https://standardebooks.org/opds',
  },
  {
    id: 'feedbooks',
    title: 'Feedbooks Public Domain',
    url: 'https://catalog.feedbooks.com/publicdomain/browse/top.atom',
  },
];

export default function CatalogsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [customFeeds, setCustomFeeds] = useState<OPDSFeed[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Load custom feeds on mount and when screen is focused
  const loadCustomFeeds = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_FEEDS_KEY);
      if (stored) {
        setCustomFeeds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomFeeds();
    }, [loadCustomFeeds])
  );

  const saveCustomFeeds = async (feeds: OPDSFeed[]) => {
    setCustomFeeds(feeds);
    await AsyncStorage.setItem(CUSTOM_FEEDS_KEY, JSON.stringify(feeds));
  };

  const addFeed = async () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      Alert.alert('Error', 'Please enter both title and URL');
      return;
    }
    const newFeed: OPDSFeed = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      url: newUrl.trim(),
    };
    await saveCustomFeeds([...customFeeds, newFeed]);
    setNewTitle('');
    setNewUrl('');
    setShowAddForm(false);
  };

  const deleteFeed = (feedId: string, feedTitle: string) => {
    Alert.alert(
      'Remove Feed',
      `Remove "${feedTitle}" from your catalogs?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = customFeeds.filter((f) => f.id !== feedId);
            await saveCustomFeeds(updated);
          },
        },
      ]
    );
  };

  const navigateToFeed = (url: string, title: string) => {
    router.push({
      pathname: '/opds-browser',
      params: { url, title },
    });
  };

  const allFeeds = [...DEFAULT_FEEDS, ...customFeeds];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Catalogs</Text>
        <Pressable onPress={() => setShowAddForm(!showAddForm)} style={{ padding: 8 }}>
          <Ionicons name={showAddForm ? 'close' : 'add'} size={24} color={theme.primary} />
        </Pressable>
      </View>

      {showAddForm && (
        <View style={[styles.addForm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Feed name"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <TextInput
            value={newUrl}
            onChangeText={setNewUrl}
            placeholder="OPDS URL"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            keyboardType="url"
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <Pressable
            onPress={addFeed}
            style={[styles.addButton, { backgroundColor: theme.primary }]}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Add Feed</Text>
          </Pressable>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Default feeds section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          DEFAULT CATALOGS
        </Text>
        {DEFAULT_FEEDS.map((feed) => (
          <Pressable
            key={feed.id}
            onPress={() => navigateToFeed(feed.url, feed.title)}
            style={[styles.feedCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={[styles.feedIcon, { backgroundColor: theme.surface }]}>
              <Ionicons name="globe" size={24} color={theme.primary} />
            </View>
            <View style={styles.feedInfo}>
              <Text style={[styles.feedTitle, { color: theme.text }]}>{feed.title}</Text>
              <Text numberOfLines={1} style={[styles.feedUrl, { color: theme.textMuted }]}>
                {feed.url}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </Pressable>
        ))}

        {/* Custom feeds section */}
        {customFeeds.length > 0 && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.textSecondary, marginTop: 16 },
              ]}
            >
              CUSTOM CATALOGS
            </Text>
            {customFeeds.map((feed) => (
              <Pressable
                key={feed.id}
                onPress={() => navigateToFeed(feed.url, feed.title)}
                style={[
                  styles.feedCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={[styles.feedIcon, { backgroundColor: theme.surface }]}>
                  <Ionicons name="bookmarks" size={24} color={theme.accent} />
                </View>
                <View style={styles.feedInfo}>
                  <Text style={[styles.feedTitle, { color: theme.text }]}>
                    {feed.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.feedUrl, { color: theme.textMuted }]}
                  >
                    {feed.url}
                  </Text>
                </View>
                <Pressable
                  onPress={() => deleteFeed(feed.id, feed.title)}
                  hitSlop={8}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.error} />
                </Pressable>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 28, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  addForm: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: 15,
  },
  addButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  feedIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedInfo: { flex: 1, marginLeft: 12 },
  feedTitle: { fontSize: 16, fontWeight: '600' },
  feedUrl: { fontSize: 12, marginTop: 2 },
  deleteButton: {
    padding: 8,
  },
});
