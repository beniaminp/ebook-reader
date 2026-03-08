/**
 * ReaderSearchModal -- search modal for the unified reader.
 *
 * React Native equivalent of the Ionic ReaderSearch component.
 * Uses Modal, TextInput, FlatList for search results.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import type { ReaderEngineRef, SearchResult } from '../../../types/reader';

export interface ReaderSearchModalProps {
  visible: boolean;
  onClose: () => void;
  engineRef: React.RefObject<ReaderEngineRef | null>;
}

export function ReaderSearchModal({ visible, onClose, engineRef }: ReaderSearchModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !engineRef.current) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const results = await engineRef.current.search(searchQuery);
      setSearchResults(results);
      setCurrentSearchIndex(0);
      if (results.length > 0) {
        engineRef.current.goToLocation(results[0].location);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, engineRef]);

  const goToSearchResult = useCallback(
    (idx: number) => {
      if (searchResults.length === 0 || !engineRef.current) return;
      setCurrentSearchIndex(idx);
      engineRef.current.goToLocation(searchResults[idx].location);
    },
    [searchResults, engineRef],
  );

  const goToNextSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    goToSearchResult((currentSearchIndex + 1) % searchResults.length);
  }, [goToSearchResult, currentSearchIndex, searchResults.length]);

  const goToPrevSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    goToSearchResult((currentSearchIndex - 1 + searchResults.length) % searchResults.length);
  }, [goToSearchResult, currentSearchIndex, searchResults.length]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
    setHasSearched(false);
    onClose();
  }, [onClose]);

  const renderResultItem = useCallback(
    ({ item, index }: { item: SearchResult; index: number }) => {
      const isActive = index === currentSearchIndex;
      return (
        <Pressable
          style={[
            styles.resultItem,
            {
              backgroundColor: isActive ? theme.primary + '15' : 'transparent',
              borderBottomColor: theme.border,
            },
          ]}
          onPress={() => {
            goToSearchResult(index);
            onClose();
          }}
        >
          {item.label ? (
            <Text style={[styles.resultLabel, { color: theme.text }]} numberOfLines={1}>
              {item.label}
            </Text>
          ) : null}
          <Text style={[styles.resultExcerpt, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.excerpt}
          </Text>
        </Pressable>
      );
    },
    [currentSearchIndex, theme, goToSearchResult, onClose],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Search</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, { color: theme.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                placeholder="Search in book..."
                placeholderTextColor={theme.textMuted}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </Pressable>
              )}
            </View>
            <Pressable
              style={[styles.searchButton, { backgroundColor: theme.primary }]}
              onPress={handleSearch}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>

          {/* Searching indicator */}
          {searching && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.statusText, { color: theme.textMuted }]}>Searching...</Text>
            </View>
          )}

          {/* Results navigation bar */}
          {!searching && searchResults.length > 0 && (
            <View style={[styles.navRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
                {currentSearchIndex + 1} of {searchResults.length} results
              </Text>
              <View style={styles.navButtons}>
                <Pressable style={styles.navButton} onPress={goToPrevSearchResult} hitSlop={8}>
                  <Ionicons name="chevron-back" size={22} color={theme.primary} />
                </Pressable>
                <Pressable style={styles.navButton} onPress={goToNextSearchResult} hitSlop={8}>
                  <Ionicons name="chevron-forward" size={22} color={theme.primary} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Results list */}
          {!searching && searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              keyExtractor={(item, idx) => `${item.location}-${idx}`}
              renderItem={renderResultItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* No results */}
          {!searching && hasSearched && searchResults.length === 0 && (
            <View style={styles.centered}>
              <Ionicons name="search-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.statusText, { color: theme.textMuted }]}>
                No results found for "{searchQuery}"
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultCount: {
    fontSize: 13,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  navButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 16,
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultExcerpt: {
    fontSize: 12,
    lineHeight: 18,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ReaderSearchModal;
