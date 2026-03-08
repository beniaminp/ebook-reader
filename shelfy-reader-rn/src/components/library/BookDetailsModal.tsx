import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { StarRating } from '../common/StarRating';
import {
  formatFileSize,
  formatDate,
  getFormatDisplayName,
  formatPercentage,
} from '../../utils/formatUtils';
import { useAppStore } from '../../stores/useAppStore';
import type { Book } from '../../types';

interface BookDetailsModalProps {
  book: Book | null;
  visible: boolean;
  onClose: () => void;
  onEdit?: (bookId: string, updates: Partial<Book>) => void;
}

export function BookDetailsModal({
  book,
  visible,
  onClose,
  onEdit,
}: BookDetailsModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const removeBook = useAppStore((s) => s.removeBook);

  // Editable field state
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [authorDraft, setAuthorDraft] = useState('');

  // Reset editing state when book changes or modal opens
  useEffect(() => {
    if (book && visible) {
      setTitleDraft(book.title);
      setAuthorDraft(book.author ?? '');
      setEditingTitle(false);
      setEditingAuthor(false);
    }
  }, [book, visible]);

  const handleSaveTitle = () => {
    if (book && titleDraft.trim() && titleDraft.trim() !== book.title) {
      onEdit?.(book.id, { title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const handleSaveAuthor = () => {
    if (book && authorDraft.trim() !== (book.author ?? '')) {
      onEdit?.(book.id, { author: authorDraft.trim() });
    }
    setEditingAuthor(false);
  };

  const handleRate = (rating: number) => {
    if (!book) return;
    const currentRating = book.metadata?.rating ?? 0;
    // Tap same rating to clear it
    const newRating = rating === currentRating ? 0 : rating;
    onEdit?.(book.id, {
      metadata: { ...book.metadata, rating: newRating },
    });
  };

  const handleDelete = () => {
    if (!book) return;
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
            onClose();
          },
        },
      ]
    );
  };

  if (!book) return null;

  const rating = book.metadata?.rating ?? 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.surface,
              borderBottomColor: theme.border,
              paddingTop: insets.top > 0 ? insets.top : 12,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Book Details
          </Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover Image */}
          <View style={styles.coverContainer}>
            {book.coverPath ? (
              <Image
                source={{ uri: book.coverPath }}
                style={[styles.coverImage, { backgroundColor: theme.surfaceVariant }]}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View
                style={[
                  styles.coverPlaceholder,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Ionicons name="book" size={48} color={theme.textMuted} />
              </View>
            )}
          </View>

          {/* Title (editable) */}
          <View style={styles.fieldRow}>
            {editingTitle ? (
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                onBlur={handleSaveTitle}
                onSubmitEditing={handleSaveTitle}
                autoFocus
                style={[
                  styles.editInput,
                  {
                    color: theme.text,
                    borderColor: theme.primary,
                    backgroundColor: theme.surface,
                    fontSize: 20,
                    fontWeight: '700',
                  },
                ]}
                returnKeyType="done"
              />
            ) : (
              <Pressable
                onPress={() => setEditingTitle(true)}
                style={styles.editableField}
              >
                <Text style={[styles.title, { color: theme.text }]}>
                  {book.title}
                </Text>
                <Ionicons
                  name="pencil"
                  size={16}
                  color={theme.textMuted}
                  style={styles.editIcon}
                />
              </Pressable>
            )}
          </View>

          {/* Author (editable) */}
          <View style={styles.fieldRow}>
            {editingAuthor ? (
              <TextInput
                value={authorDraft}
                onChangeText={setAuthorDraft}
                onBlur={handleSaveAuthor}
                onSubmitEditing={handleSaveAuthor}
                autoFocus
                placeholder="Unknown author"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.editInput,
                  {
                    color: theme.textSecondary,
                    borderColor: theme.primary,
                    backgroundColor: theme.surface,
                    fontSize: 16,
                  },
                ]}
                returnKeyType="done"
              />
            ) : (
              <Pressable
                onPress={() => setEditingAuthor(true)}
                style={styles.editableField}
              >
                <Text style={[styles.author, { color: theme.textSecondary }]}>
                  {book.author || 'Unknown author'}
                </Text>
                <Ionicons
                  name="pencil"
                  size={14}
                  color={theme.textMuted}
                  style={styles.editIcon}
                />
              </Pressable>
            )}
          </View>

          {/* Star Rating */}
          <View style={styles.ratingRow}>
            <StarRating rating={rating} onRate={handleRate} size={28} />
            {rating > 0 && (
              <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>
                {rating}/5
              </Text>
            )}
          </View>

          {/* Description */}
          {book.metadata?.description ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Description
              </Text>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {book.metadata.description}
              </Text>
            </View>
          ) : null}

          {/* Review */}
          {book.review ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Your Review
              </Text>
              <Text
                style={[
                  styles.description,
                  { color: theme.textSecondary, fontStyle: 'italic' },
                ]}
              >
                &ldquo;{book.review}&rdquo;
              </Text>
            </View>
          ) : null}

          {/* Details List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Details
            </Text>
            <View
              style={[
                styles.detailsCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <DetailRow
                label="Format"
                value={getFormatDisplayName(book.format)}
                theme={theme}
              />
              {book.fileSize != null && book.fileSize > 0 && (
                <DetailRow
                  label="File Size"
                  value={formatFileSize(book.fileSize)}
                  theme={theme}
                />
              )}
              <DetailRow
                label="Pages"
                value={book.totalPages > 0 ? String(book.totalPages) : 'Unknown'}
                theme={theme}
              />
              <DetailRow
                label="Progress"
                value={
                  book.progress != null && book.progress > 0
                    ? formatPercentage(book.progress)
                    : 'Not started'
                }
                theme={theme}
              />
              <DetailRow
                label="Date Added"
                value={
                  book.dateAdded
                    ? formatDate(book.dateAdded)
                    : 'Unknown'
                }
                theme={theme}
              />
              <DetailRow
                label="Last Read"
                value={
                  book.lastRead
                    ? formatDate(book.lastRead)
                    : 'Never'
                }
                theme={theme}
              />
              <DetailRow
                label="Source"
                value={book.source ?? 'local'}
                theme={theme}
                isLast
              />
            </View>
          </View>

          {/* Series Info */}
          {(book.series || book.metadata?.series) ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Series
              </Text>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {book.series || book.metadata?.series}
                {(book.seriesIndex ?? book.metadata?.seriesIndex) != null &&
                  ` #${book.seriesIndex ?? book.metadata?.seriesIndex}`}
              </Text>
            </View>
          ) : null}

          {/* Metadata extras */}
          {book.metadata?.publisher || book.metadata?.language || book.metadata?.isbn ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Publication Info
              </Text>
              <View
                style={[
                  styles.detailsCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                {book.metadata.publisher && (
                  <DetailRow
                    label="Publisher"
                    value={book.metadata.publisher}
                    theme={theme}
                  />
                )}
                {book.metadata.language && (
                  <DetailRow
                    label="Language"
                    value={book.metadata.language}
                    theme={theme}
                  />
                )}
                {book.metadata.isbn && (
                  <DetailRow
                    label="ISBN"
                    value={book.metadata.isbn}
                    theme={theme}
                    isLast
                  />
                )}
              </View>
            </View>
          ) : null}

          {/* Delete Button */}
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: theme.error }]}
          >
            <Ionicons name="trash-outline" size={18} color={theme.error} />
            <Text style={[styles.deleteText, { color: theme.error }]}>
              Delete Book
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DetailRow({
  label,
  value,
  theme,
  isLast,
}: {
  label: string;
  value: string;
  theme: { text: string; textSecondary: string; border: string };
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}
    >
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    bottom: 10,
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  coverContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  coverImage: {
    width: 160,
    height: 240,
    borderRadius: 8,
  },
  coverPlaceholder: {
    width: 160,
    height: 240,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldRow: {
    marginBottom: 8,
  },
  editableField: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flexShrink: 1,
  },
  author: {
    fontSize: 16,
    flexShrink: 1,
  },
  editIcon: {
    marginLeft: 8,
    opacity: 0.5,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  ratingLabel: {
    marginLeft: 10,
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailsCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BookDetailsModal;
