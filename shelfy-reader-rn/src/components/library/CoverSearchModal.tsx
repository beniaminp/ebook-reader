import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import type { Book } from '../../types';

export interface CoverSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  onCoverSelected: (bookId: string, coverUrl: string) => void;
  onToast: (message: string, color: string) => void;
}

interface CoverResult {
  url: string;
  source: string;
  title?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const COVER_COLUMNS = 3;
const COVER_GAP = 8;
const COVER_PADDING = 16;
const COVER_WIDTH =
  (SCREEN_WIDTH - COVER_PADDING * 2 - COVER_GAP * (COVER_COLUMNS - 1)) /
  COVER_COLUMNS;

export function CoverSearchModal({
  isOpen,
  onClose,
  book,
  onCoverSelected,
  onToast,
}: CoverSearchModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [coverSearchQuery, setCoverSearchQuery] = useState('');
  const [coverResults, setCoverResults] = useState<CoverResult[]>([]);
  const [isCoverSearching, setIsCoverSearching] = useState(false);
  const [isSavingCover, setIsSavingCover] = useState(false);

  // Auto-populate search query when opening
  useEffect(() => {
    if (book && isOpen) {
      const q =
        `${book.title} ${book.author !== 'Unknown' ? book.author : ''}`.trim();
      setCoverSearchQuery(q);
      setCoverResults([]);
      // Auto-search on open
      const timer = setTimeout(() => searchCovers(q), 300);
      return () => clearTimeout(timer);
    }
  }, [book, isOpen]);

  const searchCovers = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setIsCoverSearching(true);
    setCoverResults([]);

    const results: CoverResult[] = [];

    // Search Google Books API
    try {
      const googleRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12`
      );
      const googleData = await googleRes.json();
      if (googleData.items) {
        for (const item of googleData.items) {
          const imageLinks = item.volumeInfo?.imageLinks;
          if (imageLinks) {
            const url = imageLinks.thumbnail || imageLinks.smallThumbnail;
            if (url) {
              const hiRes = url
                .replace('zoom=1', 'zoom=3')
                .replace('&edge=curl', '')
                .replace('http://', 'https://');
              results.push({
                url: hiRes,
                source: 'Google Books',
                title: item.volumeInfo?.title,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Google Books cover search failed:', err);
    }

    // Search Open Library API
    try {
      const olRes = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,cover_i`
      );
      const olData = await olRes.json();
      if (olData.docs) {
        for (const doc of olData.docs) {
          if (doc.cover_i) {
            results.push({
              url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
              source: 'Open Library',
              title: doc.title,
            });
          }
        }
      }
    } catch (err) {
      console.error('Open Library cover search failed:', err);
    }

    setCoverResults(results);
    setIsCoverSearching(false);
  }, []);

  const selectCover = useCallback(
    async (coverUrl: string) => {
      if (!book || isSavingCover) return;
      setIsSavingCover(true);

      try {
        onCoverSelected(book.id, coverUrl);
        onClose();
        onToast('Cover updated successfully', 'success');
      } catch (err) {
        console.error('Failed to save cover:', err);
        onToast('Failed to download cover image', 'danger');
      } finally {
        setIsSavingCover(false);
      }
    },
    [book, isSavingCover, onCoverSelected, onClose, onToast]
  );

  const renderCoverItem = ({ item, index }: { item: CoverResult; index: number }) => (
    <Pressable
      onPress={() => selectCover(item.url)}
      style={[styles.coverItem, { backgroundColor: theme.surfaceVariant }]}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.coverImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.coverInfo}>
        {item.title && (
          <Text
            numberOfLines={1}
            style={[styles.coverTitle, { color: theme.text }]}
          >
            {item.title}
          </Text>
        )}
        <Text style={[styles.coverSource, { color: theme.textMuted }]}>
          {item.source}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background, paddingTop: insets.top },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Download Cover
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close-outline" size={28} color={theme.text} />
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={[styles.searchRow, { borderBottomColor: theme.border }]}>
          <View
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={theme.textMuted}
            />
            <TextInput
              style={[styles.searchText, { color: theme.text }]}
              value={coverSearchQuery}
              onChangeText={setCoverSearchQuery}
              placeholder="Search by title or author..."
              placeholderTextColor={theme.textMuted}
              returnKeyType="search"
              onSubmitEditing={() => searchCovers(coverSearchQuery)}
            />
          </View>
          <Pressable
            onPress={() => searchCovers(coverSearchQuery)}
            disabled={isCoverSearching || !coverSearchQuery.trim()}
            style={[styles.searchButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="search" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Loading state */}
        {isCoverSearching && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.centeredText, { color: theme.textSecondary }]}>
              Searching for covers...
            </Text>
          </View>
        )}

        {/* Empty state */}
        {!isCoverSearching &&
          coverResults.length === 0 &&
          coverSearchQuery.length > 0 && (
            <View style={styles.centered}>
              <Ionicons
                name="image-outline"
                size={48}
                color={theme.textMuted}
              />
              <Text
                style={[styles.centeredText, { color: theme.textSecondary }]}
              >
                Press search to find covers
              </Text>
            </View>
          )}

        {/* Saving overlay */}
        {isSavingCover && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.centeredText, { color: theme.textSecondary }]}>
              Saving cover...
            </Text>
          </View>
        )}

        {/* Results grid */}
        {coverResults.length > 0 && !isSavingCover && (
          <FlatList
            data={coverResults}
            renderItem={renderCoverItem}
            keyExtractor={(item, index) => `${item.source}-${index}`}
            numColumns={COVER_COLUMNS}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={styles.gridRow}
          />
        )}
      </View>
    </Modal>
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  searchText: {
    flex: 1,
    fontSize: 15,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  centeredText: {
    fontSize: 15,
  },
  gridContainer: {
    padding: COVER_PADDING,
  },
  gridRow: {
    gap: COVER_GAP,
    marginBottom: COVER_GAP,
  },
  coverItem: {
    width: COVER_WIDTH,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  coverInfo: {
    padding: 6,
  },
  coverTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  coverSource: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default CoverSearchModal;
