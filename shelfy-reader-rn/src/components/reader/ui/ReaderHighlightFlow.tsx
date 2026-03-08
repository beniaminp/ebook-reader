/**
 * ReaderHighlightFlow - Color picker modal for creating highlights.
 *
 * Shows a bottom-sheet style modal with color selection, optional tags,
 * and a save button. Extracted from the reader container.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { HIGHLIGHT_COLORS } from '../../../services/annotationsService';
import { TagInput, saveTagsToSuggestions } from '../../common/TagInput';
import type { Highlight } from '../../../types';
import type { ReaderEngineRef } from '../../../types/reader';

export interface HighlightMeta {
  cfi?: string;
  startOffset?: number;
  endOffset?: number;
}

export interface ReaderHighlightFlowProps {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
  pendingText: string;
  pendingMeta: HighlightMeta | null;
  onHighlightCreated: (highlight: Highlight) => void;
  onToast: (message: string) => void;
  onClearSelection: () => void;
}

export function ReaderHighlightFlow({
  bookId,
  isOpen,
  onClose,
  pendingText,
  pendingMeta,
  onHighlightCreated,
  onToast,
  onClearSelection,
}: ReaderHighlightFlowProps) {
  const { theme } = useTheme();

  const [pendingHighlightColor, setPendingHighlightColor] = useState<string>(
    HIGHLIGHT_COLORS[0].value
  );
  const [pendingHighlightTags, setPendingHighlightTags] = useState<string[]>(
    []
  );

  const handleDismiss = useCallback(() => {
    onClose();
    setPendingHighlightColor(HIGHLIGHT_COLORS[0].value);
    setPendingHighlightTags([]);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    const meta = pendingMeta;
    const text = pendingText;
    if (!meta) return;

    // Determine location string
    let locationStr = '';
    if (meta.cfi) {
      locationStr = meta.cfi;
    } else if (
      meta.startOffset !== undefined &&
      meta.endOffset !== undefined
    ) {
      locationStr = `${meta.startOffset}-${meta.endOffset}`;
    }

    // Build highlight object
    const now = new Date();
    const highlight: Highlight = {
      id: `${bookId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      bookId,
      location: {
        bookId,
        cfi: meta.cfi,
        position: 0,
      },
      text,
      color: pendingHighlightColor,
      tags:
        pendingHighlightTags.length > 0 ? pendingHighlightTags : undefined,
      timestamp: now,
    };

    // Persist tags to suggestions
    if (pendingHighlightTags.length > 0) {
      saveTagsToSuggestions(pendingHighlightTags);
    }

    onHighlightCreated(highlight);
    onToast('Highlight added');

    onClose();
    setPendingHighlightColor(HIGHLIGHT_COLORS[0].value);
    setPendingHighlightTags([]);
    onClearSelection();
  }, [
    bookId,
    pendingMeta,
    pendingText,
    pendingHighlightColor,
    pendingHighlightTags,
    onHighlightCreated,
    onToast,
    onClose,
    onClearSelection,
  ]);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.surface }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          {/* Handle bar */}
          <View
            style={[styles.handleBar, { backgroundColor: theme.border }]}
          />

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            Pick highlight color
          </Text>

          {/* Text preview */}
          {pendingText ? (
            <Text
              numberOfLines={2}
              style={[styles.previewText, { color: theme.textSecondary }]}
            >
              {'\u201C'}
              {pendingText.length > 80
                ? pendingText.slice(0, 80) + '...'
                : pendingText}
              {'\u201D'}
            </Text>
          ) : null}

          {/* Color picker */}
          <View style={styles.colorRow}>
            {HIGHLIGHT_COLORS.map((color) => (
              <Pressable
                key={color.value}
                onPress={() => setPendingHighlightColor(color.value)}
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: color.value,
                    borderColor:
                      pendingHighlightColor === color.value
                        ? theme.text
                        : 'transparent',
                    transform: [
                      {
                        scale:
                          pendingHighlightColor === color.value ? 1.15 : 1,
                      },
                    ],
                  },
                ]}
              >
                {pendingHighlightColor === color.value ? (
                  <Ionicons name="checkmark" size={16} color="#333" />
                ) : null}
              </Pressable>
            ))}
          </View>

          {/* Tags */}
          <View style={styles.tagSection}>
            <TagInput
              tags={pendingHighlightTags}
              onChange={setPendingHighlightTags}
              compact
              placeholder="Add tags..."
            />
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.saveBtnText}>Save Highlight</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 14,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  tagSection: {
    marginBottom: 14,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReaderHighlightFlow;
