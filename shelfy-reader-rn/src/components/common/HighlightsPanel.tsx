/**
 * Highlights Panel Component
 *
 * Displays all highlights for a book in a list format.
 * Allows navigation to highlight location, editing (color, note, tags),
 * and deletion. Supports tag display and filtering by tags.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import type { EpubHighlight } from '../../services/annotationsService';
import { HIGHLIGHT_COLORS } from '../../services/annotationsService';
import { TagInput, TagBadges, saveTagsToSuggestions } from './TagInput';

interface HighlightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: EpubHighlight[];
  onGoToHighlight: (cfiRange: string) => void;
  onDeleteHighlight: (id: string) => void;
  onUpdateHighlight: (
    id: string,
    updates: { color?: string; note?: string; tags?: string[] }
  ) => void;
}

export function HighlightsPanel({
  isOpen,
  onClose,
  highlights,
  onGoToHighlight,
  onDeleteHighlight,
  onUpdateHighlight,
}: HighlightsPanelProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>(
    HIGHLIGHT_COLORS[0].value
  );
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Collect all unique tags across highlights
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    highlights.forEach((h) => {
      if (h.tags) {
        h.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet).sort();
  }, [highlights]);

  // Filter highlights by selected tags
  const filteredHighlights = useMemo(() => {
    if (filterTags.length === 0) return highlights;
    return highlights.filter(
      (h) => h.tags && filterTags.some((ft) => h.tags!.includes(ft))
    );
  }, [highlights, filterTags]);

  const handleEdit = useCallback((highlight: EpubHighlight) => {
    setEditingId(highlight.id);
    setNoteText(highlight.note || '');
    setEditTags(highlight.tags || []);
    setSelectedColor(highlight.color);
  }, []);

  const handleSave = useCallback(() => {
    if (editingId) {
      onUpdateHighlight(editingId, {
        note: noteText,
        color: selectedColor,
        tags: editTags,
      });
      if (editTags.length > 0) {
        saveTagsToSuggestions(editTags);
      }
      setEditingId(null);
      setNoteText('');
      setEditTags([]);
    }
  }, [editingId, noteText, selectedColor, editTags, onUpdateHighlight]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setNoteText('');
    setEditTags([]);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete Highlight', 'Remove this highlight?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteHighlight(id),
        },
      ]);
    },
    [onDeleteHighlight]
  );

  const handleGoToHighlight = useCallback(
    (cfiRange: string) => {
      onGoToHighlight(cfiRange);
      onClose();
    },
    [onGoToHighlight, onClose]
  );

  const toggleFilterTag = useCallback((tag: string) => {
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const toggleExpandNote = useCallback((id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderHighlightItem = useCallback(
    ({ item }: { item: EpubHighlight }) => {
      const hasNote = !!item.note;
      const hasTags = item.tags && item.tags.length > 0;
      const isExpanded = expandedNotes.has(item.id);

      return (
        <Pressable
          onPress={() => handleGoToHighlight(item.cfiRange)}
          style={[
            styles.highlightItem,
            {
              borderBottomColor: theme.border,
              borderLeftColor: item.color,
            },
          ]}
        >
          <View style={styles.highlightContent}>
            {/* Highlighted text */}
            <View
              style={[
                styles.highlightTextBox,
                { backgroundColor: item.color + '40' },
              ]}
            >
              <Text
                style={[styles.highlightText, { color: theme.text }]}
                numberOfLines={4}
              >
                {'\u201C'}
                {item.text}
                {'\u201D'}
              </Text>
            </View>

            {/* Chapter title */}
            {item.chapterTitle ? (
              <Text
                style={[styles.chapterTitle, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {item.chapterTitle}
              </Text>
            ) : null}

            {/* Tags display */}
            {hasTags ? (
              <TagBadges
                tags={item.tags!}
                onTagPress={toggleFilterTag}
                compact
              />
            ) : null}

            {/* Expandable note */}
            {hasNote ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  toggleExpandNote(item.id);
                }}
                style={[
                  styles.noteContainer,
                  {
                    backgroundColor: theme.surface,
                    borderLeftColor: item.color,
                  },
                ]}
              >
                <View style={styles.noteHeader}>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={theme.textMuted}
                  />
                  <Text style={[styles.noteLabel, { color: theme.textMuted }]}>
                    Note
                  </Text>
                </View>
                {isExpanded ? (
                  <Text style={[styles.noteBody, { color: theme.text }]}>
                    {item.note}
                  </Text>
                ) : null}
              </Pressable>
            ) : null}
          </View>

          {/* Actions */}
          <View style={styles.highlightActions}>
            {hasNote ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  toggleExpandNote(item.id);
                }}
                hitSlop={6}
                style={[
                  styles.noteIndicator,
                  { backgroundColor: item.color + '30' },
                ]}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={14}
                  color={item.color}
                />
              </Pressable>
            ) : null}
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                handleEdit(item);
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
      );
    },
    [
      theme,
      expandedNotes,
      handleGoToHighlight,
      handleEdit,
      handleDelete,
      toggleFilterTag,
      toggleExpandNote,
    ]
  );

  return (
    <>
      {/* Main Highlights Modal */}
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
              Highlights ({filteredHighlights.length})
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          {/* Tag filter bar */}
          {allTags.length > 0 ? (
            <View
              style={[
                styles.tagFilterBar,
                { borderBottomColor: theme.border },
              ]}
            >
              <Ionicons
                name="pricetag-outline"
                size={16}
                color={theme.textMuted}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagFilterScroll}
              >
                {allTags.map((tag) => {
                  const isActive = filterTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleFilterTag(tag)}
                      style={[
                        styles.filterTagChip,
                        {
                          backgroundColor: isActive
                            ? theme.primary
                            : theme.surface,
                          borderColor: isActive
                            ? theme.primary
                            : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterTagText,
                          {
                            color: isActive ? '#fff' : theme.text,
                          },
                        ]}
                      >
                        #{tag}
                      </Text>
                      {isActive ? (
                        <Ionicons
                          name="close-circle"
                          size={12}
                          color="#fff"
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
                {filterTags.length > 0 ? (
                  <Pressable
                    onPress={() => setFilterTags([])}
                    style={[
                      styles.filterTagChip,
                      { borderColor: theme.error },
                    ]}
                  >
                    <Text
                      style={[styles.filterTagText, { color: theme.error }]}
                    >
                      Clear
                    </Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            </View>
          ) : null}

          {filteredHighlights.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="color-palette-outline"
                size={48}
                color={theme.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>
                {filterTags.length > 0
                  ? 'No highlights match the selected tags'
                  : 'No highlights yet'}
              </Text>
              {filterTags.length === 0 ? (
                <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
                  Select some text to create a highlight
                </Text>
              ) : null}
            </View>
          ) : (
            <FlatList
              data={filteredHighlights}
              renderItem={renderHighlightItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
            />
          )}
        </View>
      </Modal>

      {/* Edit Highlight Modal */}
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
              <Text
                style={[styles.cancelText, { color: theme.textSecondary }]}
              >
                Cancel
              </Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Edit Highlight
            </Text>
            <Pressable onPress={handleSave} hitSlop={8}>
              <Text style={[styles.saveText, { color: theme.primary }]}>
                Save
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.editContent}>
            {/* Color picker */}
            <Text
              style={[styles.editLabel, { color: theme.textSecondary }]}
            >
              Color
            </Text>
            <View style={styles.colorRow}>
              {HIGHLIGHT_COLORS.map((color) => (
                <Pressable
                  key={color.value}
                  onPress={() => setSelectedColor(color.value)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: color.value,
                      borderColor:
                        selectedColor === color.value
                          ? theme.text
                          : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>

            {/* Note */}
            <Text
              style={[
                styles.editLabel,
                { color: theme.textSecondary, marginTop: 20 },
              ]}
            >
              Note
            </Text>
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
              placeholder="Add a note for this highlight..."
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
            />

            {/* Tags */}
            <View style={styles.tagInputSection}>
              <TagInput
                tags={editTags}
                onChange={setEditTags}
                placeholder="Add tags (e.g. metaphor, research)..."
              />
            </View>
          </ScrollView>
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
  tagFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  tagFilterScroll: {
    gap: 6,
  },
  filterTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterTagText: {
    fontSize: 12,
  },
  list: {
    paddingBottom: 24,
  },
  highlightItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
  },
  highlightContent: {
    flex: 1,
  },
  highlightTextBox: {
    padding: 8,
    borderRadius: 4,
  },
  highlightText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  chapterTitle: {
    fontSize: 12,
    marginTop: 4,
  },
  noteContainer: {
    marginTop: 6,
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  highlightActions: {
    marginLeft: 8,
    alignItems: 'center',
    gap: 8,
  },
  noteIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  editContent: {
    padding: 16,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 120,
  },
  tagInputSection: {
    marginTop: 20,
  },
});

export default HighlightsPanel;
