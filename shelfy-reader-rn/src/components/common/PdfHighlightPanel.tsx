/**
 * PDF Highlights Panel Component
 *
 * Displays all PDF highlights for a book in a list format.
 * Allows navigation to highlight location, editing, and deletion.
 *
 * React Native version: uses Modal, FlatList, TextInput, and Pressable
 * instead of Ionic modal/list components.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../hooks/useToast';
import type { PdfHighlight } from '../../services/pdfService';
import { HIGHLIGHT_COLORS } from '../../services/annotationsService';

interface PdfHighlightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: PdfHighlight[];
  onGoToHighlight: (pageNumber: number) => void;
  onDeleteHighlight: (id: string) => void;
  onUpdateHighlight: (
    id: string,
    updates: { color?: string; note?: string },
  ) => void;
}

export const PdfHighlightPanel: React.FC<PdfHighlightPanelProps> = ({
  isOpen,
  onClose,
  highlights,
  onGoToHighlight,
  onDeleteHighlight,
  onUpdateHighlight,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(
    HIGHLIGHT_COLORS[0].value,
  );

  const handleEdit = useCallback((highlight: PdfHighlight) => {
    setEditingId(highlight.id);
    setNoteText(highlight.note || '');
    setSelectedColor(highlight.color);
  }, []);

  const handleSave = useCallback(() => {
    if (editingId) {
      onUpdateHighlight(editingId, { note: noteText, color: selectedColor });
      setEditingId(null);
      setNoteText('');
      showToast('Highlight updated');
    }
  }, [editingId, noteText, selectedColor, onUpdateHighlight, showToast]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setNoteText('');
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      onDeleteHighlight(id);
      showToast('Highlight removed');
    },
    [onDeleteHighlight, showToast],
  );

  const handleGoToHighlight = useCallback(
    (pageNumber: number) => {
      onGoToHighlight(pageNumber);
      onClose();
    },
    [onGoToHighlight, onClose],
  );

  const renderHighlight = useCallback(
    ({ item }: { item: PdfHighlight }) => (
      <Pressable
        style={[
          styles.highlightItem,
          {
            backgroundColor: theme.surface,
            borderLeftColor: item.color,
          },
        ]}
        onPress={() => handleGoToHighlight(item.pageNumber)}
      >
        <View style={styles.highlightHeader}>
          <Ionicons
            name="document-text-outline"
            size={16}
            color={theme.textMuted}
          />
          <Text style={[styles.pageLabel, { color: theme.textMuted }]}>
            Page {item.pageNumber}
          </Text>
        </View>

        <View
          style={[
            styles.highlightTextBg,
            { backgroundColor: item.color + '40' },
          ]}
        >
          <Text style={[styles.highlightText, { color: theme.text }]}>
            &ldquo;{item.text}&rdquo;
          </Text>
        </View>

        {item.note ? (
          <Text style={[styles.noteText, { color: theme.textSecondary }]}>
            Note: {item.note}
          </Text>
        ) : null}

        <View style={styles.itemActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="create-outline" size={20} color={theme.primary} />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </Pressable>
        </View>
      </Pressable>
    ),
    [theme, handleGoToHighlight, handleEdit, handleDelete],
  );

  return (
    <>
      {/* Main highlights list modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.background,
              paddingTop: insets.top,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Highlights ({highlights.length})
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          {highlights.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="color-palette"
                size={48}
                color={theme.textMuted}
              />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No highlights yet
              </Text>
              <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
                Select some text to create a highlight
              </Text>
            </View>
          ) : (
            <FlatList
              data={highlights}
              keyExtractor={(item) => item.id}
              renderItem={renderHighlight}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal
        visible={editingId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancelEdit}
      >
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.background,
              paddingTop: insets.top,
            },
          ]}
        >
          {/* Edit header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={handleCancelEdit}>
              <Text style={[styles.headerAction, { color: theme.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Edit Highlight
            </Text>
            <Pressable onPress={handleSave}>
              <Text style={[styles.headerAction, { color: theme.primary, fontWeight: '700' }]}>
                Save
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.editContent}>
            {/* Color selector */}
            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
              Color
            </Text>
            <View style={styles.colorRow}>
              {HIGHLIGHT_COLORS.map((color) => (
                <Pressable
                  key={color.value}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: color.value,
                      borderColor:
                        selectedColor === color.value
                          ? theme.text
                          : theme.border,
                      borderWidth: selectedColor === color.value ? 3 : 1,
                    },
                  ]}
                  onPress={() => setSelectedColor(color.value)}
                />
              ))}
            </View>

            {/* Note input */}
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
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add a note for this highlight..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  headerAction: {
    fontSize: 16,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 4,
  },

  // List
  listContent: {
    padding: 12,
    gap: 10,
  },
  highlightItem: {
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pageLabel: {
    fontSize: 12,
  },
  highlightTextBg: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  noteText: {
    fontSize: 13,
    marginBottom: 8,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    padding: 6,
  },

  // Edit modal
  editContent: {
    padding: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
  },
});

export default PdfHighlightPanel;
