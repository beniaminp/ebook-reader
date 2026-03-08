/**
 * SeriesView Component
 *
 * Displays books grouped by series with cover stacks, progress indicators,
 * and a detail view for individual series. Allows editing series info.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import type { Book } from '../../types';
import { useAppStore } from '../../stores/useAppStore';

/** Represents a group of books in a series */
export interface SeriesGroup {
  name: string;
  books: Book[];
  totalBooks: number;
  readBooks: number;
  coverPath?: string;
  averageProgress: number;
}

interface SeriesViewProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
}

export function SeriesView({ books, onOpenBook }: SeriesViewProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const updateBook = useAppStore((s) => s.updateBook);

  const [selectedSeries, setSelectedSeries] = useState<SeriesGroup | null>(
    null
  );
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editSeriesName, setEditSeriesName] = useState('');
  const [editSeriesIndex, setEditSeriesIndex] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // Group books by series
  const seriesGroups = useMemo((): SeriesGroup[] => {
    const map = new Map<string, Book[]>();

    books.forEach((book) => {
      const seriesName = book.series || book.metadata?.series;
      if (seriesName) {
        const existing = map.get(seriesName) || [];
        existing.push(book);
        map.set(seriesName, existing);
      }
    });

    return Array.from(map.entries())
      .map(([name, seriesBooks]) => {
        const sorted = [...seriesBooks].sort((a, b) => {
          const aIndex =
            a.seriesIndex ?? a.metadata?.seriesIndex ?? Infinity;
          const bIndex =
            b.seriesIndex ?? b.metadata?.seriesIndex ?? Infinity;
          return aIndex - bIndex;
        });

        const readBooks = sorted.filter((b) => b.progress >= 0.95).length;
        const totalProgress = sorted.reduce(
          (sum, b) => sum + (b.progress || 0),
          0
        );

        return {
          name,
          books: sorted,
          totalBooks: sorted.length,
          readBooks,
          coverPath: sorted[0]?.coverPath,
          averageProgress:
            sorted.length > 0 ? totalProgress / sorted.length : 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [books]);

  // Books not in any series
  const standaloneCount = useMemo(() => {
    return books.filter((b) => !b.series && !b.metadata?.series).length;
  }, [books]);

  const handleSeriesClick = useCallback((group: SeriesGroup) => {
    setSelectedSeries(group);
  }, []);

  const openEditModal = useCallback((book: Book) => {
    setEditingBook(book);
    setEditSeriesName(book.series || book.metadata?.series || '');
    setEditSeriesIndex(
      String(book.seriesIndex ?? book.metadata?.seriesIndex ?? '')
    );
    setShowEditModal(true);
  }, []);

  const handleSaveSeriesEdit = useCallback(async () => {
    if (!editingBook) return;

    const updates: Partial<Book> = {
      series: editSeriesName.trim() || undefined,
      seriesIndex: editSeriesIndex ? parseFloat(editSeriesIndex) : undefined,
    };

    await updateBook(editingBook.id, updates);

    setShowEditModal(false);
    setEditingBook(null);

    // If we're viewing a series and the name changed, close the series view
    if (selectedSeries && editSeriesName.trim() !== selectedSeries.name) {
      setSelectedSeries(null);
    }
  }, [
    editingBook,
    editSeriesName,
    editSeriesIndex,
    selectedSeries,
    updateBook,
  ]);

  const getProgressWidth = (book: Book) => {
    if (book.progress > 1) return book.progress;
    return Math.round(book.progress * 100);
  };

  // Series detail view
  if (selectedSeries) {
    const completionPct = Math.round(
      (selectedSeries.readBooks / selectedSeries.totalBooks) * 100
    );

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Detail header */}
        <View
          style={[styles.detailHeader, { borderBottomColor: theme.border }]}
        >
          <Pressable
            onPress={() => setSelectedSeries(null)}
            hitSlop={8}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.detailInfo}>
            <Text
              style={[styles.detailTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {selectedSeries.name}
            </Text>
            <Text
              style={[styles.detailSubtitle, { color: theme.textSecondary }]}
            >
              {selectedSeries.readBooks} of {selectedSeries.totalBooks} read
            </Text>
          </View>
        </View>

        {/* Series progress bar */}
        <View style={styles.detailProgressContainer}>
          <View
            style={[styles.progressBarBg, { backgroundColor: theme.surface }]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: theme.success,
                  width: `${completionPct}%` as any,
                },
              ]}
            />
          </View>
          <Text
            style={[styles.progressText, { color: theme.textSecondary }]}
          >
            {completionPct}% complete
          </Text>
        </View>

        {/* Books list */}
        <FlatList
          data={selectedSeries.books}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const seriesIdx =
              item.seriesIndex ?? item.metadata?.seriesIndex;
            return (
              <Pressable
                onPress={() => onOpenBook(item)}
                style={[
                  styles.seriesBookItem,
                  { borderBottomColor: theme.border },
                ]}
              >
                {/* Index */}
                <View
                  style={[
                    styles.bookIndex,
                    { backgroundColor: theme.surface },
                  ]}
                >
                  <Text
                    style={[styles.bookIndexText, { color: theme.primary }]}
                  >
                    {seriesIdx != null ? `#${seriesIdx}` : '--'}
                  </Text>
                </View>

                {/* Cover */}
                <View style={styles.bookCover}>
                  {item.coverPath ? (
                    <Image
                      source={{ uri: item.coverPath }}
                      style={styles.coverImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.coverPlaceholder,
                        { backgroundColor: theme.surface },
                      ]}
                    >
                      <Ionicons
                        name="book-outline"
                        size={20}
                        color={theme.textMuted}
                      />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.bookInfo}>
                  <Text
                    style={[styles.bookTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.bookAuthor,
                      { color: theme.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.author}
                  </Text>

                  {/* Progress */}
                  {item.progress >= 0.95 ? (
                    <View style={styles.badgeRow}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={14}
                        color={theme.success}
                      />
                      <Text
                        style={[
                          styles.badgeText,
                          { color: theme.success },
                        ]}
                      >
                        Read
                      </Text>
                    </View>
                  ) : item.progress > 0 ? (
                    <View style={styles.bookProgressRow}>
                      <View
                        style={[
                          styles.miniProgressBg,
                          { backgroundColor: theme.surface },
                        ]}
                      >
                        <View
                          style={[
                            styles.miniProgressFill,
                            {
                              backgroundColor: theme.primary,
                              width: `${getProgressWidth(item)}%` as any,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.miniProgressText,
                          { color: theme.textMuted },
                        ]}
                      >
                        {Math.round(item.progress * 100)}%
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.notStartedText,
                        { color: theme.textMuted },
                      ]}
                    >
                      Not started
                    </Text>
                  )}
                </View>

                {/* Edit button */}
                <Pressable
                  onPress={() => openEditModal(item)}
                  hitSlop={6}
                  style={styles.editBtn}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.listContent}
        />

        {/* Edit Series Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View
            style={[
              styles.editModalContainer,
              {
                backgroundColor: theme.background,
                paddingTop: insets.top,
              },
            ]}
          >
            <View
              style={[
                styles.editModalHeader,
                { borderBottomColor: theme.border },
              ]}
            >
              <Text style={[styles.editModalTitle, { color: theme.text }]}>
                Edit Series Info
              </Text>
              <Pressable onPress={() => setShowEditModal(false)} hitSlop={8}>
                <Ionicons name="close-outline" size={24} color={theme.text} />
              </Pressable>
            </View>

            {editingBook ? (
              <View style={styles.editFormContent}>
                <Text
                  style={[
                    styles.editBookLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Editing: {editingBook.title}
                </Text>

                <View style={styles.fieldGroup}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Series Name
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: theme.surface,
                      },
                    ]}
                    value={editSeriesName}
                    onChangeText={setEditSeriesName}
                    placeholder="e.g. Harry Potter"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Position in Series
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: theme.surface,
                      },
                    ]}
                    value={editSeriesIndex}
                    onChangeText={setEditSeriesIndex}
                    placeholder="e.g. 1, 2, 3"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>

                <Pressable
                  onPress={handleSaveSeriesEdit}
                  style={[
                    styles.saveBtn,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Modal>
      </View>
    );
  }

  // Series grid overview
  if (seriesGroups.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="library-outline"
          size={48}
          color={theme.textMuted}
        />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          No Series Found
        </Text>
        <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
          Books with series metadata will appear here. You can add series info
          by long-pressing a book in the library and selecting "Book Details".
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={seriesGroups}
        keyExtractor={(item) => item.name}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item: group }) => (
          <Pressable
            onPress={() => handleSeriesClick(group)}
            style={[styles.seriesCard, { backgroundColor: theme.card }]}
          >
            {/* Stacked covers */}
            <View style={styles.coverStack}>
              {group.books.slice(0, 3).map((book, i) => (
                <View
                  key={book.id}
                  style={[
                    styles.stackCover,
                    {
                      zIndex: 3 - i,
                      left: i * 8,
                      top: i * 4,
                    },
                  ]}
                >
                  {book.coverPath ? (
                    <Image
                      source={{ uri: book.coverPath }}
                      style={styles.stackCoverImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.stackCoverPlaceholder,
                        { backgroundColor: theme.surface },
                      ]}
                    >
                      <Ionicons
                        name="book-outline"
                        size={16}
                        color={theme.textMuted}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Series info */}
            <Text
              style={[styles.seriesCardTitle, { color: theme.text }]}
              numberOfLines={2}
            >
              {group.name}
            </Text>
            <Text
              style={[
                styles.seriesCardCount,
                { color: theme.textSecondary },
              ]}
            >
              {group.totalBooks} book{group.totalBooks !== 1 ? 's' : ''}
            </Text>

            {/* Progress */}
            <View style={styles.seriesCardProgress}>
              <View
                style={[
                  styles.miniProgressBg,
                  { backgroundColor: theme.surface },
                ]}
              >
                <View
                  style={[
                    styles.miniProgressFill,
                    {
                      backgroundColor: theme.success,
                      width:
                        `${(group.readBooks / group.totalBooks) * 100}%` as any,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.miniProgressText,
                  { color: theme.textMuted },
                ]}
              >
                {group.readBooks}/{group.totalBooks}
              </Text>
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          standaloneCount > 0 ? (
            <Text
              style={[styles.standaloneHint, { color: theme.textMuted }]}
            >
              {standaloneCount} book{standaloneCount !== 1 ? 's' : ''} not in
              any series
            </Text>
          ) : null
        }
        contentContainerStyle={styles.gridContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Detail view
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    marginRight: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  detailSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  detailProgressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  seriesBookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bookIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bookIndexText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bookCover: {
    width: 40,
    height: 56,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  bookAuthor: {
    fontSize: 13,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  miniProgressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  miniProgressText: {
    fontSize: 11,
    minWidth: 30,
  },
  notStartedText: {
    fontSize: 12,
    marginTop: 4,
  },
  editBtn: {
    padding: 6,
    marginLeft: 8,
  },

  // Edit modal
  editModalContainer: {
    flex: 1,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editFormContent: {
    padding: 16,
  },
  editBookLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Grid overview
  gridContent: {
    padding: 12,
  },
  gridRow: {
    gap: 12,
  },
  seriesCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  coverStack: {
    height: 80,
    marginBottom: 8,
    position: 'relative',
  },
  stackCover: {
    position: 'absolute',
    width: 50,
    height: 70,
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  stackCoverImage: {
    width: '100%',
    height: '100%',
  },
  stackCoverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seriesCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  seriesCardCount: {
    fontSize: 12,
    marginTop: 2,
  },
  seriesCardProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  standaloneHint: {
    textAlign: 'center',
    fontSize: 13,
    padding: 16,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default SeriesView;
