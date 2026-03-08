import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { File, Directory, Paths } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAppStore } from '../../src/stores/useAppStore';
import { useLibraryPrefsStore, SortOption } from '../../src/stores/useLibraryPrefsStore';
import { BookCard } from '../../src/components/library/BookCard';
import { detectFormat, formatFileSize, formatDate, getFormatDisplayName, formatPercentage } from '../../src/utils/formatUtils';
import type { Book } from '../../src/types';

export default function LibraryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const books = useAppStore((s) => s.books);
  const loadBooks = useAppStore((s) => s.loadBooks);
  const addBook = useAppStore((s) => s.addBook);
  const removeBook = useAppStore((s) => s.removeBook);
  const updateBook = useAppStore((s) => s.updateBook);

  const viewMode = useLibraryPrefsStore((s) => s.viewMode);
  const sortBy = useLibraryPrefsStore((s) => s.sortBy);
  const setViewMode = useLibraryPrefsStore((s) => s.setViewMode);
  const setSortBy = useLibraryPrefsStore((s) => s.setSortBy);

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
      case 'lastRead':
        return (
          new Date(b.lastRead ?? b.dateAdded).getTime() -
          new Date(a.lastRead ?? a.dateAdded).getTime()
        );
      case 'progress':
        return (b.progress ?? 0) - (a.progress ?? 0);
      case 'rating':
        return (b.metadata?.rating ?? 0) - (a.metadata?.rating ?? 0);
      case 'dateAdded':
      default:
        return (
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
        );
    }
  });

  const cardViewMode: 'grid' | 'list' = viewMode === 'list' ? 'list' : 'grid';
  const numColumns = cardViewMode === 'grid' ? Math.floor(width / 140) : 1;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  }, [loadBooks]);

  const handleLongPress = useCallback(
    (book: Book) => {
      const isRead = book.progress != null && book.progress >= 1.0;
      Alert.alert(
        book.title,
        book.author || undefined,
        [
          {
            text: 'Open',
            onPress: () => router.push(`/reader/${book.id}`),
          },
          {
            text: 'Book Info',
            onPress: () => {
              const info = [
                `Title: ${book.title}`,
                `Author: ${book.author || 'Unknown'}`,
                `Format: ${getFormatDisplayName(book.format)}`,
                `File Size: ${book.fileSize ? formatFileSize(book.fileSize) : 'Unknown'}`,
                `Date Added: ${formatDate(book.dateAdded)}`,
                book.progress != null && book.progress > 0
                  ? `Progress: ${formatPercentage(book.progress)}`
                  : null,
              ]
                .filter(Boolean)
                .join('\n');
              Alert.alert('Book Info', info);
            },
          },
          {
            text: isRead ? 'Mark as Unread' : 'Mark as Read',
            onPress: async () => {
              const newProgress = isRead ? 0 : 1.0;
              await updateBook(book.id, { progress: newProgress });
              await loadBooks();
            },
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Delete Book',
                `Are you sure you want to delete "${book.title}"? This cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await removeBook(book.id);
                    },
                  },
                ]
              );
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    },
    [router, removeBook, updateBook, loadBooks]
  );

  const SORT_OPTIONS: { label: string; value: SortOption }[] = [
    { label: 'Title', value: 'title' },
    { label: 'Author', value: 'author' },
    { label: 'Date Added', value: 'dateAdded' },
    { label: 'Last Read', value: 'lastRead' },
    { label: 'Progress', value: 'progress' },
  ];

  const handleSort = useCallback(() => {
    Alert.alert(
      'Sort By',
      undefined,
      [
        ...SORT_OPTIONS.map((opt) => ({
          text: `${opt.label}${sortBy === opt.value ? ' ✓' : ''}`,
          onPress: () => setSortBy(opt.value),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }, [sortBy, setSortBy]);

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

        const bookId = Crypto.randomUUID();

        // Copy file from cache to permanent books directory
        const booksDir = new Directory(Paths.document, 'books');
        if (!booksDir.exists) {
          booksDir.create({ intermediates: true });
        }
        const bookDir = new Directory(booksDir, bookId);
        if (!bookDir.exists) {
          bookDir.create({ intermediates: true });
        }

        const sourceFile = new File(asset.uri);
        sourceFile.copy(bookDir);
        const destFile = new File(bookDir, asset.name);
        const filePath = destFile.uri;

        const bookData: Omit<Book, 'dateAdded'> = {
          id: bookId,
          title: asset.name.replace(/\.[^/.]+$/, ''),
          author: '',
          format,
          filePath,
          fileSize: asset.size ?? 0,
          totalPages: 0,
          currentPage: 0,
          progress: 0,
          lastRead: new Date(),
          source: 'local',
          downloaded: true,
        };

        await addBook(bookData);
      }
    } catch (e: any) {
      console.error('Import failed:', e);
      Alert.alert('Import failed', e?.message ?? 'Could not import the file.');
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
        <Pressable onPress={handleSort} style={{ padding: 8 }}>
          <Ionicons name="swap-vertical" size={22} color={theme.text} />
        </Pressable>
        <Pressable onPress={() => setViewMode(cardViewMode === 'grid' ? 'list' : 'grid')} style={{ padding: 8 }}>
          <Ionicons
            name={cardViewMode === 'grid' ? 'list' : 'grid'}
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
          key={`${cardViewMode}-${numColumns}`}
          renderItem={({ item }) => (
            <BookCard
              book={item}
              viewMode={cardViewMode}
              onPress={() => router.push(`/reader/${item.id}`)}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          keyExtractor={(book) => book.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
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
