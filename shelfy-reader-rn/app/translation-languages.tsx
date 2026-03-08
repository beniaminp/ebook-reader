import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../src/components/common/Header';
import { useTheme } from '../src/theme/ThemeContext';
import { SUPPORTED_LANGUAGES } from '../src/services/translationService';

interface LanguageItem {
  code: string;
  name: string;
  target?: boolean;
}

export default function TranslationLanguagesScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [downloadedLangs, setDownloadedLangs] = useState<Set<string>>(new Set());
  const [loadingLangs, setLoadingLangs] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');

  // Filter languages: exclude 'auto', only show target languages
  const languages = useMemo(
    () => SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto' && l.target !== false),
    []
  );

  const filtered = useMemo(() => {
    if (!searchText) return languages;
    const query = searchText.toLowerCase();
    return languages.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        l.code.toLowerCase().includes(query)
    );
  }, [languages, searchText]);

  // Sort: downloaded first, then alphabetical
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aDown = downloadedLangs.has(a.code) ? 0 : 1;
      const bDown = downloadedLangs.has(b.code) ? 0 : 1;
      if (aDown !== bDown) return aDown - bDown;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, downloadedLangs]);

  const handleDownload = useCallback(async (langCode: string, langName: string) => {
    setLoadingLangs((prev) => new Set(prev).add(langCode));
    try {
      // Simulate download - in a real implementation this would call a native
      // translation model download service (e.g., MLKit on Android)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setDownloadedLangs((prev) => new Set(prev).add(langCode));
      Alert.alert('Downloaded', `${langName} model downloaded successfully.`);
    } catch {
      Alert.alert('Error', `Failed to download ${langName} model.`);
    } finally {
      setLoadingLangs((prev) => {
        const next = new Set(prev);
        next.delete(langCode);
        return next;
      });
    }
  }, []);

  const handleDelete = useCallback(async (langCode: string, langName: string) => {
    Alert.alert(
      'Delete Model',
      `Delete the ${langName} translation model? You can re-download it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoadingLangs((prev) => new Set(prev).add(langCode));
            try {
              // Simulate delete
              await new Promise((resolve) => setTimeout(resolve, 500));
              setDownloadedLangs((prev) => {
                const next = new Set(prev);
                next.delete(langCode);
                return next;
              });
            } catch {
              Alert.alert('Error', `Failed to delete ${langName} model.`);
            } finally {
              setLoadingLangs((prev) => {
                const next = new Set(prev);
                next.delete(langCode);
                return next;
              });
            }
          },
        },
      ]
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: LanguageItem }) => {
      const isDownloaded = downloadedLangs.has(item.code);
      const isLoading = loadingLangs.has(item.code);

      return (
        <View style={[styles.languageItem, { backgroundColor: theme.surface }]}>
          <View style={styles.languageLeft}>
            {isDownloaded && (
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            )}
            <View style={styles.languageInfo}>
              <Text style={[styles.languageName, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.languageCode, { color: theme.textMuted }]}>
                {item.code.toUpperCase()}
              </Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : isDownloaded ? (
            <Pressable
              style={[styles.actionBtn, styles.deleteBtn, { borderColor: theme.error }]}
              onPress={() => handleDelete(item.code, item.name)}
            >
              <Ionicons name="trash-outline" size={16} color={theme.error} />
              <Text style={[styles.actionBtnText, { color: theme.error }]}>Delete</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.actionBtn, styles.downloadBtn, { borderColor: theme.primary }]}
              onPress={() => handleDownload(item.code, item.name)}
            >
              <Ionicons name="download-outline" size={16} color={theme.primary} />
              <Text style={[styles.actionBtnText, { color: theme.primary }]}>Download</Text>
            </Pressable>
          )}
        </View>
      );
    },
    [theme, downloadedLangs, loadingLangs, handleDownload, handleDelete]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Header title="Translation Languages" onBack={() => router.back()} />

      {/* Info section */}
      <View style={[styles.infoSection, { backgroundColor: theme.surface }]}>
        <Ionicons name="cloud-download-outline" size={24} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Download language models for offline translation (~30 MB each). Downloaded languages
          are used for both interlinear translation and the translate popup.
        </Text>
      </View>

      {/* Stats bar */}
      <View style={[styles.statsBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.statsText, { color: theme.textSecondary }]}>
          {downloadedLangs.size} downloaded &middot; {languages.length} available
        </Text>
      </View>

      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="search" size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search languages..."
          placeholderTextColor={theme.textMuted}
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => setSearchText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Language list */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.code}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No languages match "{searchText}"
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Info section
  infoSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Stats bar
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statsText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },

  // List
  listContent: {
    paddingBottom: 32,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },

  // Language item
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  languageInfo: {
    gap: 2,
  },
  languageName: {
    fontSize: 15,
    fontWeight: '500',
  },
  languageCode: {
    fontSize: 12,
  },

  // Action buttons
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  downloadBtn: {},
  deleteBtn: {},
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
});
