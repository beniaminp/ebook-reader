import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAppStore } from '../../src/stores/useAppStore';
import { useLibraryPrefsStore } from '../../src/stores/useLibraryPrefsStore';
import { BookCard } from '../../src/components/library/BookCard';
import { detectFormat } from '../../src/utils/formatUtils';
import { storeBookFile } from '../../src/services/fileStorage';
import * as db from '../../src/services/database';
import type { Book } from '../../src/types';

export default function LibraryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const books = useAppStore((s) => s.books);
  const loadBooks = useAppStore((s) => s.loadBooks);
  const addBook = useAppStore((s) => s.addBook);

  const viewMode = useLibraryPrefsStore((s) => s.viewMode);
  const sortBy = useLibraryPrefsStore((s) => s.sortBy);
  const toggleViewMode = useLibraryPrefsStore((s) => s.toggleViewMode);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  const filteredBooks = books.filter((book) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      book.title.toLowerCase().includes(q) ||
      (book.author?.toLowerCase().includes(q) ?? false)
    );
  });

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'author':
        return (a.author ?? '').localeCompare(b.author ?? '');
      case 'recent':
        return (
          new Date(b.lastRead ?? b.createdAt).getTime() -
          new Date(a.lastRead ?? a.createdAt).getTime()
        );
      case 'added':
      default:
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  });

  const numColumns = viewMode === 'grid' ? Math.floor(width / 140) : 1;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  }, [loadBooks]);

  const importBook = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) return;

      for (const asset of result.assets) {
        const format = detectFormat(asset.name, asset.mimeType ?? undefined);
        if (!format) {
          Alert.alert('Unsupported format', `Cannot import ${asset.name}`);
          continue;
        }

        const bookId = crypto.randomUUID();
        const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const bytes = Uint8Array.from(atob(fileContent), (c) =>
          c.charCodeAt(0)
        );
        const filePath = await storeBookFile(
          bookId,
          asset.name,
          bytes.buffer as ArrayBuffer
        );

        const book: Book = {
          id: bookId,
          title: asset.name.replace(/\.[^/.]+$/, ''),
          format,
          filePath,
          fileSize: asset.size ?? 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.addBook(book);
        addBook(book);
      }
    } catch (e) {
      console.error('Import failed:', e);
      Alert.alert('Import failed', 'Could not import the file.');
    }
  }, [addBook]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        paddingTop: insets.top,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: theme.text,
            flex: 1,
          }}
        >
          Library
        </Text>
        <Pressable onPress={toggleViewMode} style={{ padding: 8 }}>
          <Ionicons
            name={viewMode === 'grid' ? 'list' : 'grid'}
            size={22}
            color={theme.text}
          />
        </Pressable>
        <Pressable onPress={() => router.push('/search')} style={{ padding: 8 }}>
          <Ionicons name="search" size={22} color={theme.text} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderRadius: 10,
            paddingHorizontal: 12,
            height: 40,
          }}
        >
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search library..."
            placeholderTextColor={theme.textMuted}
            style={{
              flex: 1,
              marginLeft: 8,
              color: theme.text,
              fontSize: 16,
            }}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Book List */}
      {sortedBooks.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="book-outline" size={64} color={theme.textMuted} />
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 18,
              marginTop: 16,
            }}
          >
            {searchQuery ? 'No books found' : 'Your library is empty'}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 14, marginTop: 8 }}>
            Tap + to import a book
          </Text>
        </View>
      ) : (
        <FlashList
          data={sortedBooks}
          numColumns={numColumns}
          key={`${viewMode}-${numColumns}`}
          renderItem={({ item }) => (
            <BookCard
              book={item}
              viewMode={viewMode}
              onPress={() => router.push(`/reader/${item.id}`)}
            />
          )}
          estimatedItemSize={viewMode === 'grid' ? 200 : 80}
          keyExtractor={(book) => book.id}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={importBook}
        style={{
          position: 'absolute',
          bottom: 24 + insets.bottom,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.primary,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.27,
          shadowRadius: 4.65,
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
