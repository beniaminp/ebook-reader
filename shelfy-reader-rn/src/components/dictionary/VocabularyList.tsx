import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import Toast from 'react-native-toast-message';
import type { VocabularyWord } from '../../types';

interface VocabularyListProps {
  loadVocabulary: () => Promise<VocabularyWord[]>;
  removeWord: (word: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export function VocabularyList({
  loadVocabulary,
  removeWord,
  clearAll,
}: VocabularyListProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [filteredWords, setFilteredWords] = useState<VocabularyWord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load vocabulary on mount
  useEffect(() => {
    doLoad();
  }, []);

  // Filter words based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredWords(words);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredWords(
        words.filter(
          (word) =>
            word.word.toLowerCase().includes(query) ||
            word.definition.toLowerCase().includes(query) ||
            word.partOfSpeech.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, words]);

  const doLoad = useCallback(async () => {
    setLoading(true);
    try {
      const vocab = await loadVocabulary();
      setWords(vocab);
      setFilteredWords(vocab);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Failed to load vocabulary',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  }, [loadVocabulary]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const vocab = await loadVocabulary();
      setWords(vocab);
    } catch {
      // Silently fail
    } finally {
      setRefreshing(false);
    }
  }, [loadVocabulary]);

  const handleDelete = useCallback(
    async (word: string) => {
      try {
        await removeWord(word);
        setWords((prev) => prev.filter((w) => w.word !== word));
        Toast.show({
          type: 'success',
          text1: `Removed "${word}" from vocabulary`,
          position: 'bottom',
          visibilityTime: 2000,
        });
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Failed to remove word',
          position: 'bottom',
        });
      }
    },
    [removeWord]
  );

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear Vocabulary',
      'Are you sure you want to clear all vocabulary words?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAll();
              setWords([]);
              setFilteredWords([]);
              Toast.show({
                type: 'success',
                text1: 'Vocabulary cleared',
                position: 'bottom',
                visibilityTime: 2000,
              });
            } catch {
              Toast.show({
                type: 'error',
                text1: 'Failed to clear vocabulary',
                position: 'bottom',
              });
            }
          },
        },
      ]
    );
  }, [clearAll]);

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString();

  const renderWordCard = ({ item }: { item: VocabularyWord }) => (
    <View style={[styles.wordCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Header: word + delete */}
      <View style={styles.wordHeader}>
        <Text style={[styles.wordText, { color: theme.text }]}>
          {item.word}
        </Text>
        <Pressable
          onPress={() => handleDelete(item.word)}
          hitSlop={6}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={theme.error} />
        </Pressable>
      </View>

      {/* Part of speech + date */}
      <View style={styles.metaRow}>
        <View
          style={[
            styles.posChip,
            { borderColor: theme.border },
          ]}
        >
          <Text style={[styles.posText, { color: theme.textSecondary }]}>
            {item.partOfSpeech}
          </Text>
        </View>
        <Text style={[styles.dateText, { color: theme.textMuted }]}>
          Added {formatDate(item.addedAt)}
        </Text>
      </View>

      {/* Definition */}
      <Text style={[styles.definition, { color: theme.text }]}>
        {item.definition}
      </Text>

      {/* Example */}
      {item.example ? (
        <Text style={[styles.example, { color: theme.textSecondary }]}>
          &ldquo;{item.example}&rdquo;
        </Text>
      ) : null}

      {/* Context */}
      {item.context ? (
        <Text style={[styles.context, { color: theme.textMuted }]}>
          {item.context}
        </Text>
      ) : null}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;

    if (words.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="book-outline"
            size={48}
            color={theme.textMuted}
          />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No vocabulary words yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Look up words in the reader and save them to build your vocabulary.
          </Text>
        </View>
      );
    }

    // No search results
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="close-circle-outline"
          size={48}
          color={theme.textMuted}
        />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          No results found
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Try a different search term
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Vocabulary
        </Text>
        {words.length > 0 && (
          <Pressable onPress={handleClearAll} hitSlop={6}>
            <Text style={[styles.clearAllText, { color: theme.error }]}>
              Clear All
            </Text>
          </Pressable>
        )}
      </View>

      {/* Search bar */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search vocabulary..."
          placeholderTextColor={theme.textMuted}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.textMuted}
            />
          </Pressable>
        )}
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}

      {/* Word list */}
      {!loading && (
        <FlatList
          data={filteredWords}
          renderItem={renderWordCard}
          keyExtractor={(item) => item.word}
          contentContainerStyle={[
            styles.listContent,
            filteredWords.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}

      {/* Stats footer */}
      {!loading && words.length > 0 && (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            {words.length} word{words.length !== 1 ? 's' : ''} in vocabulary
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  wordCard: {
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordText: {
    fontSize: 18,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  posChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  posText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
  },
  definition: {
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  example: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 19,
  },
  context: {
    fontSize: 12,
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
  },
});

export default VocabularyList;
