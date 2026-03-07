import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';

interface OPDSFeed {
  id: string;
  title: string;
  url: string;
}

const DEFAULT_FEEDS: OPDSFeed[] = [
  {
    id: 'gutenberg',
    title: 'Project Gutenberg',
    url: 'https://m.gutenberg.org/ebooks.opds/',
  },
  {
    id: 'standard',
    title: 'Standard Ebooks',
    url: 'https://standardebooks.org/feeds/opds',
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
  const [feeds, setFeeds] = useState<OPDSFeed[]>(DEFAULT_FEEDS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const addFeed = () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      Alert.alert('Error', 'Please enter both title and URL');
      return;
    }
    setFeeds([
      ...feeds,
      { id: Date.now().toString(), title: newTitle.trim(), url: newUrl.trim() },
    ]);
    setNewTitle('');
    setNewUrl('');
    setShowAddForm(false);
  };

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
        {feeds.map((feed) => (
          <Pressable
            key={feed.id}
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
  content: { padding: 16 },
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
});
