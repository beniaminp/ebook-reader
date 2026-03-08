import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { StarRating } from '../common/StarRating';

export interface BulkEditPanelProps {
  isActive: boolean;
  selectedCount: number;
  selectedBookIds: Set<string>;
  onSelectAll: () => void;
  onCancel: () => void;
  onEditComplete: () => void;
  onToast: (message: string, color: string) => void;
  onBulkUpdate?: (
    bookIds: Set<string>,
    updates: Record<string, string | number>
  ) => Promise<void>;
}

const READ_STATUS_OPTIONS = [
  { label: 'No change', value: '' },
  { label: 'Unread', value: 'unread' },
  { label: 'Reading', value: 'reading' },
  { label: 'Finished', value: 'finished' },
  { label: 'DNF', value: 'dnf' },
];

export function BulkEditPanel({
  isActive,
  selectedCount,
  selectedBookIds,
  onSelectAll,
  onCancel,
  onEditComplete,
  onToast,
  onBulkUpdate,
}: BulkEditPanelProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [showBulkEditSheet, setShowBulkEditSheet] = useState(false);
  const [bulkGenre, setBulkGenre] = useState('');
  const [bulkRating, setBulkRating] = useState(0);
  const [bulkSeries, setBulkSeries] = useState('');
  const [bulkLanguage, setBulkLanguage] = useState('');
  const [bulkReadStatus, setBulkReadStatus] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const resetFields = () => {
    setBulkGenre('');
    setBulkRating(0);
    setBulkSeries('');
    setBulkLanguage('');
    setBulkReadStatus('');
  };

  const handleBulkEdit = async () => {
    if (selectedBookIds.size === 0) return;
    setIsBulkSaving(true);
    try {
      if (onBulkUpdate) {
        const updates: Record<string, string | number> = {};
        if (bulkGenre.trim()) updates.genre = bulkGenre.trim();
        if (bulkRating > 0) updates.rating = bulkRating;
        if (bulkSeries.trim()) updates.series = bulkSeries.trim();
        if (bulkLanguage.trim()) updates.language = bulkLanguage.trim();
        if (bulkReadStatus) updates.readStatus = bulkReadStatus;
        await onBulkUpdate(selectedBookIds, updates);
      }
      onToast(
        `Updated ${selectedBookIds.size} book${selectedBookIds.size > 1 ? 's' : ''}`,
        'success'
      );
      setShowBulkEditSheet(false);
      resetFields();
      onEditComplete();
    } catch (err) {
      console.error('Bulk edit failed:', err);
      onToast('Failed to update books', 'danger');
    } finally {
      setIsBulkSaving(false);
    }
  };

  if (!isActive || selectedCount === 0) return null;

  return (
    <>
      {/* Bottom action bar */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: theme.primary,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <Text style={styles.selectedText}>{selectedCount} selected</Text>
        <View style={styles.actionButtons}>
          <Pressable
            onPress={() => {
              resetFields();
              setShowBulkEditSheet(true);
            }}
            style={[styles.actionBtn, { backgroundColor: '#FFFFFF' }]}
          >
            <Ionicons name="create-outline" size={16} color={theme.primary} />
            <Text style={[styles.actionBtnText, { color: theme.primary }]}>
              Edit
            </Text>
          </Pressable>
          <Pressable
            onPress={onSelectAll}
            style={[styles.actionBtn, styles.outlineBtn]}
          >
            <Text style={styles.outlineBtnText}>Select All</Text>
          </Pressable>
        </View>
      </View>

      {/* Bulk edit modal */}
      <Modal
        visible={showBulkEditSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBulkEditSheet(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Bulk Edit ({selectedCount} books)
            </Text>
            <Pressable
              onPress={() => setShowBulkEditSheet(false)}
              hitSlop={8}
            >
              <Ionicons name="close-outline" size={28} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentInner}
          >
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              Only filled fields will be applied. Leave blank to skip.
            </Text>

            {/* Genre */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Genre
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
                value={bulkGenre}
                onChangeText={setBulkGenre}
                placeholder="e.g. Fiction, Science"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Series */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Series
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
                value={bulkSeries}
                onChangeText={setBulkSeries}
                placeholder="e.g. Harry Potter"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Language */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Language
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
                value={bulkLanguage}
                onChangeText={setBulkLanguage}
                placeholder="e.g. en, fr, de"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Read Status */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Read Status
              </Text>
              <View style={styles.statusRow}>
                {READ_STATUS_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setBulkReadStatus(opt.value)}
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor:
                          bulkReadStatus === opt.value
                            ? theme.primary
                            : theme.surface,
                        borderColor:
                          bulkReadStatus === opt.value
                            ? theme.primary
                            : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        {
                          color:
                            bulkReadStatus === opt.value
                              ? '#FFFFFF'
                              : theme.text,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Rating */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Rating
              </Text>
              <View style={styles.ratingRow}>
                <StarRating
                  rating={bulkRating}
                  size={28}
                  onRate={(r) => setBulkRating(r)}
                />
                {bulkRating > 0 && (
                  <Pressable onPress={() => setBulkRating(0)}>
                    <Text
                      style={[styles.clearRating, { color: theme.textMuted }]}
                    >
                      Clear
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Apply button */}
          <View
            style={[
              styles.modalFooter,
              {
                borderTopColor: theme.border,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <Pressable
              onPress={handleBulkEdit}
              disabled={isBulkSaving}
              style={[
                styles.applyBtn,
                {
                  backgroundColor: isBulkSaving
                    ? theme.textMuted
                    : theme.primary,
                },
              ]}
            >
              {isBulkSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.applyBtnText}>
                  Apply to {selectedCount} Books
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
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
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    padding: 16,
  },
  hint: {
    fontSize: 13,
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
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearRating: {
    fontSize: 13,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  applyBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BulkEditPanel;
