/**
 * Bookmarks Panel Component
 *
 * Displays all bookmarks for a book in a list format.
 * Allows navigation to bookmark location, note editing, and deletion.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import type { EpubBookmark } from '../../services/annotationsService';

interface BookmarksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: EpubBookmark[];
  onGoToBookmark: (cfi: string) => void;
  onDeleteBookmark: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}

export function BookmarksPanel({
  isOpen,
  onClose,
  bookmarks,
  onGoToBookmark,
  onDeleteBookmark,
  onUpdateNote,
}: BookmarksPanelProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const handleEditNote = useCallback((bookmark: EpubBookmark) => {
    setEditingId(bookmark.id);
    setNoteText(bookmark.note || '');
  }, []);

  const handleSaveNote = useCallback(() => {
    if (editingId) {
      onUpdateNote(editingId, noteText);
      setEditingId(null);
      setNoteText('');
    }
  }, [editingId, noteText, onUpdateNote]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setNoteText('');
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete Bookmark', 'Remove this bookmark?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteBookmark(id),
        },
      ]);
    },
    [onDeleteBookmark]
  );

  const handleGoToBookmark = useCallback(
    (cfi: string) => {
      onGoToBookmark(cfi);
      onClose();
    },
    [onGoToBookmark, onClose]
  );

  const renderBookmarkItem = useCallback(
    ({ item }: { item: EpubBookmark }) => (
      <Pressable
        onPress={() => handleGoToBookmark(item.cfi)}
        style={[styles.bookmarkItem, { borderBottomColor: theme.border }]}
      >
        <Ionicons
          name="bookmark"
          size={20}
          color={theme.primary}
          style={styles.bookmarkIcon}
        />
        <View style={styles.bookmarkContent}>
          <Text style={[styles.bookmarkTitle, { color: theme.text }]}>
            {item.chapterTitle || 'Bookmark'}
          </Text>
          {item.textPreview ? (
            <Text
              numberOfLines={2}
              style={[styles.bookmarkPreview, { color: theme.textSecondary }]}
            >
              {item.textPreview}
            </Text>
          ) : null}
          {item.note ? (
            <Text
              numberOfLines={2}
              style={[styles.bookmarkNote, { color: theme.textMuted }]}
            >
              Note: {item.note}
            </Text>
          ) : null}
        </View>
        <View style={styles.bookmarkActions}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              handleEditNote(item);
            }}
            hitSlop={6}
            style={styles.iconBtn}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              handleDelete(item.id);
            }}
            hitSlop={6}
            style={styles.iconBtn}
          >
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </Pressable>
        </View>
      </Pressable>
    ),
    [theme, handleGoToBookmark, handleEditNote, handleDelete]
  );

  return (
    <>
      {/* Main Bookmarks Modal */}
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
              Bookmarks ({bookmarks.length})
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          {bookmarks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="bookmark-outline"
                size={48}
                color={theme.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>
                No bookmarks yet
              </Text>
              <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
                Tap the bookmark icon while reading to create one
              </Text>
            </View>
          ) : (
            <FlatList
              data={bookmarks}
              renderItem={renderBookmarkItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
            />
          )}
        </View>
      </Modal>

      {/* Note Edit Modal */}
      <Modal
        visible={editingId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancelEdit}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: theme.background, paddingTop: insets.top },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Pressable onPress={handleCancelEdit} hitSlop={8}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Edit Note
            </Text>
            <Pressable onPress={handleSaveNote} hitSlop={8}>
              <Text style={[styles.saveText, { color: theme.primary }]}>
                Save
              </Text>
            </Pressable>
          </View>

          <View style={styles.noteEditContent}>
            <TextInput
              style={[
                styles.noteInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add a note for this bookmark..."
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>
        </View>
      </Modal>
    </>
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
  cancelText: {
    fontSize: 16,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 24,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bookmarkIcon: {
    marginRight: 12,
  },
  bookmarkContent: {
    flex: 1,
  },
  bookmarkTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  bookmarkPreview: {
    fontSize: 13,
    marginTop: 2,
  },
  bookmarkNote: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  bookmarkActions: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 8,
  },
  iconBtn: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  noteEditContent: {
    padding: 16,
    flex: 1,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 200,
  },
});

export default BookmarksPanel;
