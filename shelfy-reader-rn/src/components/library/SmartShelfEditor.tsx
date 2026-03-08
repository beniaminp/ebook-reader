/**
 * SmartShelfEditor Component
 *
 * Modal editor for creating and editing smart shelf rules.
 * Supports field/operator/value rule rows, match mode (AND/OR),
 * sorting, and limit configuration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import type { SmartShelf, SmartShelfFilter } from '../../services/smartShelvesService';

// Field definitions
const FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: 'readStatus', label: 'Status' },
  { value: 'format', label: 'Format' },
  { value: 'author', label: 'Author' },
  { value: 'title', label: 'Title' },
  { value: 'genre', label: 'Genre' },
  { value: 'series', label: 'Series' },
  { value: 'progress', label: 'Progress' },
  { value: 'rating', label: 'Rating' },
];

// Operator definitions
const OPERATOR_OPTIONS: { value: SmartShelfFilter['operator']; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
];

// Status options
const STATUS_OPTIONS = ['unread', 'reading', 'finished', 'dnf'] as const;

// Format options
const FORMAT_OPTIONS = [
  'epub',
  'pdf',
  'mobi',
  'azw3',
  'fb2',
  'cbz',
  'cbr',
  'txt',
  'html',
  'docx',
  'odt',
  'md',
] as const;

// Sort options
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'dateAdded', label: 'Date Added' },
  { value: 'lastRead', label: 'Last Read' },
  { value: 'title', label: 'Title' },
  { value: 'progress', label: 'Progress' },
  { value: 'rating', label: 'Rating' },
];

interface SmartShelfEditorProps {
  isOpen: boolean;
  shelf: SmartShelf | null;
  onSave: (shelf: SmartShelf) => void;
  onDelete?: (shelfId: string) => void;
  onDismiss: () => void;
}

export function SmartShelfEditor({
  isOpen,
  shelf,
  onSave,
  onDelete,
  onDismiss,
}: SmartShelfEditorProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [filters, setFilters] = useState<SmartShelfFilter[]>([]);
  const [matchAll, setMatchAll] = useState(true);
  const [sortBy, setSortBy] = useState('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState<number>(0);

  const isEditing = shelf !== null;
  const isDefault = shelf?.isDefault === true;

  useEffect(() => {
    if (shelf) {
      setName(shelf.name);
      setFilters([...shelf.filters]);
      setMatchAll(true); // RN SmartShelf doesn't have matchAll field yet
      setSortBy(shelf.sortBy || 'dateAdded');
      setSortOrder(shelf.sortOrder || 'desc');
      setLimit(0);
    } else {
      setName('');
      setFilters([{ field: 'readStatus', operator: 'equals', value: 'reading' }]);
      setMatchAll(true);
      setSortBy('dateAdded');
      setSortOrder('desc');
      setLimit(0);
    }
  }, [shelf, isOpen]);

  const addRule = useCallback(() => {
    setFilters((prev) => [
      ...prev,
      { field: 'format', operator: 'equals', value: '' },
    ]);
  }, []);

  const removeRule = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateRule = useCallback(
    (index: number, updates: Partial<SmartShelfFilter>) => {
      setFilters((prev) =>
        prev.map((rule, i) => {
          if (i !== index) return rule;
          const updated = { ...rule, ...updates };
          // If field changed, reset value
          if (updates.field && updates.field !== rule.field) {
            updated.value = '';
          }
          return updated;
        })
      );
    },
    []
  );

  const handleSave = useCallback(() => {
    if (!name.trim() || filters.length === 0) return;

    const result: SmartShelf = {
      id: shelf?.id || `smart-custom-${Date.now()}`,
      name: name.trim(),
      icon: shelf?.icon || 'bookmark-outline',
      filters,
      sortBy,
      sortOrder,
      isDefault: shelf?.isDefault,
    };
    onSave(result);
    onDismiss();
  }, [name, filters, sortBy, sortOrder, shelf, onSave, onDismiss]);

  const handleDelete = useCallback(() => {
    if (!shelf || !onDelete) return;
    Alert.alert(
      'Delete Smart Shelf',
      `Delete "${shelf.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(shelf.id);
            onDismiss();
          },
        },
      ]
    );
  }, [shelf, onDelete, onDismiss]);

  const renderValueInput = (rule: SmartShelfFilter, index: number) => {
    // Status field: show status option buttons
    if (rule.field === 'readStatus') {
      return (
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => updateRule(index, { value: s })}
              style={[
                styles.optionChip,
                {
                  backgroundColor:
                    rule.value === s ? theme.primary : theme.surface,
                  borderColor:
                    rule.value === s ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionChipText,
                  {
                    color: rule.value === s ? '#fff' : theme.text,
                  },
                ]}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      );
    }

    // Format field: show format option buttons
    if (rule.field === 'format') {
      return (
        <View style={styles.chipRow}>
          {FORMAT_OPTIONS.map((f) => (
            <Pressable
              key={f}
              onPress={() => updateRule(index, { value: f })}
              style={[
                styles.optionChip,
                {
                  backgroundColor:
                    rule.value === f ? theme.primary : theme.surface,
                  borderColor:
                    rule.value === f ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionChipText,
                  {
                    color: rule.value === f ? '#fff' : theme.text,
                  },
                ]}
              >
                {f.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      );
    }

    // Numeric fields
    if (rule.field === 'progress' || rule.field === 'rating') {
      return (
        <TextInput
          style={[
            styles.valueInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.surface,
            },
          ]}
          value={String(rule.value || '')}
          onChangeText={(text) => {
            const val = parseFloat(text) || 0;
            updateRule(index, { value: val });
          }}
          placeholder={rule.field === 'progress' ? '0 to 1' : '0 to 5'}
          placeholderTextColor={theme.textMuted}
          keyboardType="numeric"
        />
      );
    }

    // Default: text input
    return (
      <TextInput
        style={[
          styles.valueInput,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.surface,
          },
        ]}
        value={String(rule.value || '')}
        onChangeText={(text) => updateRule(index, { value: text })}
        placeholder="Value"
        placeholderTextColor={theme.textMuted}
      />
    );
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background, paddingTop: insets.top },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onDismiss} hitSlop={8}>
            <Ionicons name="close-outline" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {isEditing ? 'Edit Smart Shelf' : 'New Smart Shelf'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Shelf Name */}
          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Shelf Name
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
              value={name}
              onChangeText={setName}
              placeholder="e.g. My Favorites, Sci-Fi Books"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          {/* Match mode */}
          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Match
            </Text>
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setMatchAll(true)}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: matchAll
                      ? theme.primary
                      : theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: matchAll ? '#fff' : theme.text },
                  ]}
                >
                  All rules (AND)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMatchAll(false)}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: !matchAll
                      ? theme.primary
                      : theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: !matchAll ? '#fff' : theme.text },
                  ]}
                >
                  Any rule (OR)
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Rules section */}
          <View style={styles.rulesSectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Rules
            </Text>
            <Pressable onPress={addRule} style={styles.addRuleBtn}>
              <Ionicons name="add-outline" size={18} color={theme.primary} />
              <Text
                style={[styles.addRuleBtnText, { color: theme.primary }]}
              >
                Add Rule
              </Text>
            </Pressable>
          </View>

          {filters.length === 0 ? (
            <Text
              style={[styles.noRulesText, { color: theme.textMuted }]}
            >
              No rules added yet. Add at least one rule to define this smart
              shelf.
            </Text>
          ) : null}

          {filters.map((rule, index) => (
            <View
              key={index}
              style={[
                styles.ruleCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* Field selector */}
              <View style={styles.ruleFieldRow}>
                <Text
                  style={[
                    styles.ruleFieldLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Field
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {FIELD_OPTIONS.map((f) => (
                    <Pressable
                      key={f.value}
                      onPress={() => updateRule(index, { field: f.value })}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor:
                            rule.field === f.value
                              ? theme.primary
                              : theme.background,
                          borderColor:
                            rule.field === f.value
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          {
                            color:
                              rule.field === f.value ? '#fff' : theme.text,
                          },
                        ]}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Operator selector */}
              <View style={styles.ruleFieldRow}>
                <Text
                  style={[
                    styles.ruleFieldLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Operator
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {OPERATOR_OPTIONS.map((op) => (
                    <Pressable
                      key={op.value}
                      onPress={() => updateRule(index, { operator: op.value })}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor:
                            rule.operator === op.value
                              ? theme.primary
                              : theme.background,
                          borderColor:
                            rule.operator === op.value
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          {
                            color:
                              rule.operator === op.value
                                ? '#fff'
                                : theme.text,
                          },
                        ]}
                      >
                        {op.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Value input */}
              <View style={styles.ruleFieldRow}>
                <Text
                  style={[
                    styles.ruleFieldLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Value
                </Text>
                {renderValueInput(rule, index)}
              </View>

              {/* Remove button */}
              <Pressable
                onPress={() => removeRule(index)}
                style={[styles.removeRuleBtn, { borderColor: theme.error }]}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={theme.error}
                />
                <Text
                  style={[styles.removeRuleBtnText, { color: theme.error }]}
                >
                  Remove Rule
                </Text>
              </Pressable>
            </View>
          ))}

          {/* Sorting section */}
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.text, marginTop: 24 },
            ]}
          >
            Sorting & Limit
          </Text>

          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Sort by
            </Text>
            <View style={styles.chipRow}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setSortBy(opt.value)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor:
                        sortBy === opt.value
                          ? theme.primary
                          : theme.surface,
                      borderColor:
                        sortBy === opt.value
                          ? theme.primary
                          : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      {
                        color:
                          sortBy === opt.value ? '#fff' : theme.text,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Order
            </Text>
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setSortOrder('desc')}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor:
                      sortOrder === 'desc'
                        ? theme.primary
                        : theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: sortOrder === 'desc' ? '#fff' : theme.text,
                    },
                  ]}
                >
                  Newest / Highest
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSortOrder('asc')}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor:
                      sortOrder === 'asc'
                        ? theme.primary
                        : theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: sortOrder === 'asc' ? '#fff' : theme.text,
                    },
                  ]}
                >
                  Oldest / Lowest
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Max results (0 = unlimited)
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
              value={String(limit)}
              onChangeText={(text) => setLimit(parseInt(text, 10) || 0)}
              keyboardType="numeric"
            />
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={!name.trim() || filters.length === 0}
            style={[
              styles.saveBtn,
              {
                backgroundColor:
                  name.trim() && filters.length > 0
                    ? theme.primary
                    : theme.textMuted,
              },
            ]}
          >
            <Text style={styles.saveBtnText}>
              {isEditing ? 'Save Changes' : 'Create Smart Shelf'}
            </Text>
          </Pressable>

          {/* Delete button */}
          {isEditing && !isDefault && onDelete ? (
            <Pressable
              onPress={handleDelete}
              style={[styles.deleteBtn, { borderColor: theme.error }]}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={theme.error}
              />
              <Text
                style={[styles.deleteBtnText, { color: theme.error }]}
              >
                Delete Smart Shelf
              </Text>
            </Pressable>
          ) : null}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
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
  content: {
    flex: 1,
    padding: 16,
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
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rulesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addRuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addRuleBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noRulesText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  ruleCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  ruleFieldRow: {
    marginBottom: 10,
  },
  ruleFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  valueInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  removeRuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginTop: 4,
  },
  removeRuleBtnText: {
    fontSize: 13,
    fontWeight: '500',
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    gap: 6,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SmartShelfEditor;
