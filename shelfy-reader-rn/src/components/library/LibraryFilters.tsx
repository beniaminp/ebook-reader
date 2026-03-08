import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import type { ReadStatus } from '../../stores/useLibraryPrefsStore';
import type { BookSource } from '../../types';

export interface FilterState {
  format: string; // 'all' or a specific format like 'epub', 'pdf', etc.
  readStatus: ReadStatus; // 'all' | 'unread' | 'reading' | 'finished' | 'dnf'
  source: string; // 'all' | 'local' | 'opds' | 'calibre-web'
}

export const DEFAULT_FILTER_STATE: FilterState = {
  format: 'all',
  readStatus: 'all',
  source: 'all',
};

interface LibraryFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

interface ChipOption {
  label: string;
  value: string;
}

const FORMAT_OPTIONS: ChipOption[] = [
  { label: 'All', value: 'all' },
  { label: 'EPUB', value: 'epub' },
  { label: 'PDF', value: 'pdf' },
  { label: 'MOBI', value: 'mobi' },
  { label: 'FB2', value: 'fb2' },
  { label: 'TXT', value: 'txt' },
  { label: 'DOCX', value: 'docx' },
  { label: 'CBZ/CBR', value: 'cbz' },
];

const STATUS_OPTIONS: ChipOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Reading', value: 'reading' },
  { label: 'Finished', value: 'finished' },
  { label: 'DNF', value: 'dnf' },
];

const SOURCE_OPTIONS: ChipOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Local', value: 'local' },
  { label: 'OPDS', value: 'opds' },
  { label: 'Calibre', value: 'calibre-web' },
];

export function LibraryFilters({ filters, onFilterChange }: LibraryFiltersProps) {
  const { theme } = useTheme();

  const hasActiveFilters =
    filters.format !== 'all' ||
    filters.readStatus !== 'all' ||
    filters.source !== 'all';

  const clearAll = () => onFilterChange(DEFAULT_FILTER_STATE);

  return (
    <View style={styles.container}>
      {/* Format chips */}
      <FilterRow label="Format" theme={theme}>
        {FORMAT_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={filters.format === opt.value}
            theme={theme}
            onPress={() =>
              onFilterChange({ ...filters, format: opt.value })
            }
          />
        ))}
      </FilterRow>

      {/* Read Status chips */}
      <FilterRow label="Status" theme={theme}>
        {STATUS_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={filters.readStatus === opt.value}
            theme={theme}
            onPress={() =>
              onFilterChange({
                ...filters,
                readStatus: opt.value as ReadStatus,
              })
            }
          />
        ))}
      </FilterRow>

      {/* Source chips */}
      <FilterRow label="Source" theme={theme}>
        {SOURCE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={filters.source === opt.value}
            theme={theme}
            onPress={() =>
              onFilterChange({ ...filters, source: opt.value })
            }
          />
        ))}
      </FilterRow>

      {/* Clear all button */}
      {hasActiveFilters && (
        <Pressable onPress={clearAll} style={styles.clearButton}>
          <Ionicons name="close-circle-outline" size={16} color={theme.primary} />
          <Text style={[styles.clearText, { color: theme.primary }]}>
            Clear filters
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function FilterRow({
  label,
  theme,
  children,
}: {
  label: string;
  theme: { textSecondary: string };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.filterRow}>
      <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  active,
  theme,
  onPress,
}: {
  label: string;
  active: boolean;
  theme: { primary: string; surface: string; text: string; border: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.primary : theme.surface,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? '#FFFFFF' : theme.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  filterRow: {
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default LibraryFilters;
