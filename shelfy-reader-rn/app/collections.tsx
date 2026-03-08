import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { useAppStore } from '../src/stores/useAppStore';
import { databaseService } from '../src/services/database';
import type { Collection, Book } from '../src/types';

export default function CollectionsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const books = useAppStore((s) => s.books);

  // Local state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionBooks, setCollectionBooks] = useState<Record<string, Book[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showAddBook, setShowAddBook] = useState<string | null>(null);

  // Load collections
  const loadCollections = useCallback(() => {
    const allCollections = databaseService.getAllCollections();
    setCollections(allCollections);
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Load books for a specific collection
  const loadCollectionBooks = useCallback((collectionId: string) => {
    const booksInCollection = databaseService.getBooksInCollection(collectionId);
    setCollectionBooks((prev) => ({ ...prev, [collectionId]: booksInCollection }));
  }, []);

  // Expand/collapse a collection
  const handleToggleExpand = useCallback(
    (collectionId: string) => {
      if (expandedId === collectionId) {
        setExpandedId(null);
      } else {
        setExpandedId(collectionId);
        loadCollectionBooks(collectionId);
      }
    },
    [expandedId, loadCollectionBooks]
  );

  // Create collection
  const handleCreate = useCallback(() => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }

    const result = databaseService.createCollection({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      sortOrder: collections.length,
    });

    if (result) {
      loadCollections();
      setNewName('');
      setNewDescription('');
      setShowCreate(false);
    } else {
      Alert.alert('Error', 'Failed to create collection');
    }
  }, [newName, newDescription, collections.length, loadCollections]);

  // Delete collection
  const handleDelete = useCallback(
    (collection: Collection) => {
      Alert.alert('Delete Collection', `Delete "${collection.name}"? Books will not be removed from the library.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            databaseService.deleteCollection(collection.id);
            loadCollections();
            if (expandedId === collection.id) setExpandedId(null);
          },
        },
      ]);
    },
    [loadCollections, expandedId]
  );

  // Rename collection
  const handleRename = useCallback(
    (collection: Collection) => {
      Alert.prompt
        ? Alert.prompt('Rename Collection', 'Enter new name:', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Rename',
              onPress: (newNameVal?: string) => {
                if (newNameVal && newNameVal.trim()) {
                  databaseService.updateCollection(collection.id, { name: newNameVal.trim() });
                  loadCollections();
                }
              },
            },
          ], 'plain-text', collection.name)
        : // Android fallback - prompt is iOS only
          Alert.alert('Rename', 'Long-press a collection to manage it. Renaming requires iOS. On Android, delete and recreate.');
    },
    [loadCollections]
  );

  // Add a book to a collection
  const handleAddBook = useCallback(
    (bookId: string, collectionId: string) => {
      databaseService.addBookToCollection(bookId, collectionId);
      loadCollectionBooks(collectionId);
      setShowAddBook(null);
    },
    [loadCollectionBooks]
  );

  // Remove a book from a collection
  const handleRemoveBook = useCallback(
    (bookId: string, collectionId: string, bookTitle: string) => {
      Alert.alert('Remove from Collection', `Remove "${bookTitle}" from this collection?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            databaseService.removeBookFromCollection(bookId, collectionId);
            loadCollectionBooks(collectionId);
          },
        },
      ]);
    },
    [loadCollectionBooks]
  );

  // Collection long press
  const handleCollectionLongPress = useCallback(
    (collection: Collection) => {
      Alert.alert(collection.name, undefined, [
        { text: 'Rename', onPress: () => handleRename(collection) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(collection),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [handleRename, handleDelete]
  );

  // Get books NOT in a specific collection (for the "add book" picker)
  const getAvailableBooks = useCallback(
    (collectionId: string): Book[] => {
      const inCollection = new Set(
        (collectionBooks[collectionId] || []).map((b) => b.id)
      );
      return books.filter((b) => !inCollection.has(b.id));
    },
    [books, collectionBooks]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Collections</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info */}
        <View style={[styles.infoBanner, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
          <Ionicons name="information-circle" size={20} color={theme.primary} />
          <Text style={{ color: theme.primary, fontSize: 13, flex: 1, marginLeft: 8 }}>
            Organize your books into custom collections. Long-press a collection to rename or delete it.
          </Text>
        </View>

        {/* Collection List */}
        {collections.length === 0 && !showCreate ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No collections yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Create a collection to organize your books
            </Text>
          </View>
        ) : (
          collections.map((collection) => {
            const isExpanded = expandedId === collection.id;
            const booksInThis = collectionBooks[collection.id] || [];
            const isAddingBook = showAddBook === collection.id;
            const availableBooks = isAddingBook ? getAvailableBooks(collection.id) : [];

            return (
              <View
                key={collection.id}
                style={[styles.collectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                {/* Collection header */}
                <Pressable
                  onPress={() => handleToggleExpand(collection.id)}
                  onLongPress={() => handleCollectionLongPress(collection)}
                  style={styles.collectionRow}
                >
                  <View style={[styles.collectionIcon, { backgroundColor: theme.primary + '18' }]}>
                    <Ionicons name="folder" size={22} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.collectionName, { color: theme.text }]}>
                      {collection.name}
                    </Text>
                    {collection.description ? (
                      <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {collection.description}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.textMuted}
                  />
                </Pressable>

                {/* Expanded: book list */}
                {isExpanded && (
                  <View style={[styles.collectionBooks, { borderTopColor: theme.border }]}>
                    {booksInThis.length === 0 ? (
                      <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
                        No books in this collection
                      </Text>
                    ) : (
                      booksInThis.map((book) => (
                        <View key={book.id} style={styles.bookRow}>
                          <Pressable
                            onPress={() => router.push(`/reader/${book.id}`)}
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                          >
                            <Ionicons name="book-outline" size={16} color={theme.textSecondary} />
                            <Text style={{ color: theme.text, fontSize: 14, flex: 1, marginLeft: 8 }} numberOfLines={1}>
                              {book.title}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleRemoveBook(book.id, collection.id, book.title)}
                            style={{ padding: 4 }}
                          >
                            <Ionicons name="close-circle-outline" size={18} color={theme.error} />
                          </Pressable>
                        </View>
                      ))
                    )}

                    {/* Add book button / picker */}
                    {isAddingBook ? (
                      <View style={[styles.addBookPicker, { borderTopColor: theme.border }]}>
                        <Text style={[styles.addBookTitle, { color: theme.textSecondary }]}>
                          Select a book to add:
                        </Text>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                          {availableBooks.length === 0 ? (
                            <Text style={{ color: theme.textMuted, fontSize: 13, paddingVertical: 8 }}>
                              All books are already in this collection
                            </Text>
                          ) : (
                            availableBooks.map((book) => (
                              <Pressable
                                key={book.id}
                                onPress={() => handleAddBook(book.id, collection.id)}
                                style={styles.bookPickerRow}
                              >
                                <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
                                <Text style={{ color: theme.text, fontSize: 14, flex: 1, marginLeft: 8 }} numberOfLines={1}>
                                  {book.title}
                                </Text>
                                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                                  {book.author}
                                </Text>
                              </Pressable>
                            ))
                          )}
                        </ScrollView>
                        <Pressable
                          onPress={() => setShowAddBook(null)}
                          style={{ alignSelf: 'flex-end', paddingVertical: 8 }}
                        >
                          <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 13 }}>Done</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => {
                          setShowAddBook(collection.id);
                          loadCollectionBooks(collection.id);
                        }}
                        style={[styles.addBookButton, { borderColor: theme.primary }]}
                      >
                        <Ionicons name="add" size={16} color={theme.primary} />
                        <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13, marginLeft: 4 }}>
                          Add Book
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Create New Collection */}
        {showCreate ? (
          <View style={[styles.createForm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.createFormTitle, { color: theme.text }]}>New Collection</Text>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g., Favorites, To Read"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Description (optional)</Text>
            <TextInput
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="What's this collection about?"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />

            <View style={styles.createFormButtons}>
              <Pressable
                onPress={() => {
                  setShowCreate(false);
                  setNewName('');
                  setNewDescription('');
                }}
                style={[styles.formButton, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                style={[styles.formButton, { backgroundColor: theme.primary }]}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Create</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowCreate(true)}
            style={[styles.addButton, { borderColor: theme.primary }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: '600', marginLeft: 8 }}>
              Create Collection
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  collectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  collectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  collectionBooks: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  addBookPicker: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  addBookTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  bookPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  createForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  createFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  createFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  formButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
