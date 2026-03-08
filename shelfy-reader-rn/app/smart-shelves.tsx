import React, { useState, useCallback, useMemo } from 'react';
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
import { useSmartShelvesStore } from '../src/stores/useSmartShelvesStore';
import { useAppStore } from '../src/stores/useAppStore';
import type { SmartShelf, SmartShelfFilter } from '../src/services/smartShelvesService';
import type { Book } from '../src/types';

// ── Icon mapping for shelf icons ───────────────────────────
const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  'book-open': 'book-outline',
  bookmark: 'bookmark-outline',
  'check-circle': 'checkmark-circle-outline',
  clock: 'time-outline',
  star: 'star-outline',
  heart: 'heart-outline',
  flame: 'flame-outline',
  library: 'library-outline',
};

function getShelfIcon(icon?: string): keyof typeof Ionicons.glyphMap {
  if (!icon) return 'library-outline';
  return ICON_MAP[icon] || 'library-outline';
}

// ── Filter matching logic ─────────────────────────────────
function matchesFilter(book: Book, filter: SmartShelfFilter): boolean {
  let fieldValue: any;
  switch (filter.field) {
    case 'readStatus':
      fieldValue = book.readStatus || 'unread';
      break;
    case 'format':
      fieldValue = book.format;
      break;
    case 'progress':
      fieldValue = book.progress ?? 0;
      break;
    case 'author':
      fieldValue = book.author ?? '';
      break;
    case 'genre':
      fieldValue = book.genre ?? book.metadata?.genre ?? '';
      break;
    case 'rating':
      fieldValue = book.metadata?.rating ?? 0;
      break;
    default:
      fieldValue = (book as any)[filter.field];
  }

  switch (filter.operator) {
    case 'equals':
      return fieldValue === filter.value;
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(String(filter.value).toLowerCase());
    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > Number(filter.value);
    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < Number(filter.value);
    case 'gte':
      return typeof fieldValue === 'number' && fieldValue >= Number(filter.value);
    case 'lte':
      return typeof fieldValue === 'number' && fieldValue <= Number(filter.value);
    case 'in':
      return Array.isArray(filter.value) && filter.value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(filter.value) && !filter.value.includes(fieldValue);
    default:
      return true;
  }
}

function getBooksForShelf(books: Book[], shelf: SmartShelf): Book[] {
  let filtered = books;

  if (shelf.filters.length > 0) {
    filtered = books.filter((book) => shelf.filters.every((f) => matchesFilter(book, f)));
  }

  // Sort
  if (shelf.sortBy) {
    const order = shelf.sortOrder === 'asc' ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (shelf.sortBy) {
        case 'dateAdded':
          aVal = new Date(a.dateAdded).getTime();
          bVal = new Date(b.dateAdded).getTime();
          break;
        case 'lastRead':
          aVal = a.lastRead ? new Date(a.lastRead).getTime() : 0;
          bVal = b.lastRead ? new Date(b.lastRead).getTime() : 0;
          break;
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'progress':
          aVal = a.progress ?? 0;
          bVal = b.progress ?? 0;
          break;
        default:
          aVal = (a as any)[shelf.sortBy!];
          bVal = (b as any)[shelf.sortBy!];
      }
      if (aVal < bVal) return -1 * order;
      if (aVal > bVal) return 1 * order;
      return 0;
    });
  }

  return filtered;
}

// ── Filter field options ──────────────────────────────────
const FIELD_OPTIONS = [
  { value: 'readStatus', label: 'Read Status' },
  { value: 'format', label: 'Format' },
  { value: 'progress', label: 'Progress' },
  { value: 'author', label: 'Author' },
  { value: 'genre', label: 'Genre' },
  { value: 'rating', label: 'Rating' },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
  { value: 'gte', label: 'at least' },
  { value: 'lte', label: 'at most' },
];

const SORT_OPTIONS = [
  { value: 'dateAdded', label: 'Date Added' },
  { value: 'lastRead', label: 'Last Read' },
  { value: 'title', label: 'Title' },
  { value: 'progress', label: 'Progress' },
];

// ── Main component ────────────────────────────────────────

export default function SmartShelvesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Stores
  const shelves = useSmartShelvesStore((s) => s.shelves);
  const activeShelfId = useSmartShelvesStore((s) => s.activeShelfId);
  const addShelf = useSmartShelvesStore((s) => s.addShelf);
  const removeShelf = useSmartShelvesStore((s) => s.removeShelf);
  const updateShelf = useSmartShelvesStore((s) => s.updateShelf);
  const setActiveShelf = useSmartShelvesStore((s) => s.setActiveShelf);
  const resetDefaults = useSmartShelvesStore((s) => s.resetDefaults);
  const books = useAppStore((s) => s.books);

  // Local state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFilterField, setNewFilterField] = useState('readStatus');
  const [newFilterOp, setNewFilterOp] = useState('equals');
  const [newFilterValue, setNewFilterValue] = useState('');
  const [newSortBy, setNewSortBy] = useState('dateAdded');
  const [expandedShelfId, setExpandedShelfId] = useState<string | null>(null);

  // Compute book counts for each shelf
  const shelfBookCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const shelf of shelves) {
      counts[shelf.id] = getBooksForShelf(books, shelf).length;
    }
    return counts;
  }, [shelves, books]);

  const handleCreateShelf = useCallback(() => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a shelf name');
      return;
    }

    const filters: SmartShelfFilter[] = [];
    if (newFilterValue.trim()) {
      filters.push({
        field: newFilterField,
        operator: newFilterOp as SmartShelfFilter['operator'],
        value: newFilterValue.trim(),
      });
    }

    const shelf: SmartShelf = {
      id: `shelf-${Date.now()}`,
      name: newName.trim(),
      icon: 'library',
      filters,
      sortBy: newSortBy,
      sortOrder: 'desc',
      isDefault: false,
    };

    addShelf(shelf);
    setNewName('');
    setNewFilterField('readStatus');
    setNewFilterOp('equals');
    setNewFilterValue('');
    setNewSortBy('dateAdded');
    setShowCreate(false);
  }, [newName, newFilterField, newFilterOp, newFilterValue, newSortBy, addShelf]);

  const handleRemoveShelf = useCallback(
    (shelf: SmartShelf) => {
      if (shelf.isDefault) {
        Alert.alert('Cannot Remove', 'Default shelves cannot be removed.');
        return;
      }
      Alert.alert('Remove Shelf', `Remove "${shelf.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeShelf(shelf.id),
        },
      ]);
    },
    [removeShelf]
  );

  const handleToggleExpand = useCallback((shelfId: string) => {
    setExpandedShelfId((prev) => (prev === shelfId ? null : shelfId));
  }, []);

  const handleSetActive = useCallback(
    (shelfId: string) => {
      setActiveShelf(activeShelfId === shelfId ? null : shelfId);
    },
    [activeShelfId, setActiveShelf]
  );

  const handleSelectField = useCallback(() => {
    Alert.alert(
      'Filter Field',
      undefined,
      [
        ...FIELD_OPTIONS.map((opt) => ({
          text: `${opt.label}${newFilterField === opt.value ? ' \u2713' : ''}`,
          onPress: () => setNewFilterField(opt.value),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }, [newFilterField]);

  const handleSelectOperator = useCallback(() => {
    Alert.alert(
      'Operator',
      undefined,
      [
        ...OPERATOR_OPTIONS.map((opt) => ({
          text: `${opt.label}${newFilterOp === opt.value ? ' \u2713' : ''}`,
          onPress: () => setNewFilterOp(opt.value),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }, [newFilterOp]);

  const handleSelectSort = useCallback(() => {
    Alert.alert(
      'Sort By',
      undefined,
      [
        ...SORT_OPTIONS.map((opt) => ({
          text: `${opt.label}${newSortBy === opt.value ? ' \u2713' : ''}`,
          onPress: () => setNewSortBy(opt.value),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }, [newSortBy]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Smart Shelves</Text>
        <Pressable
          onPress={() => {
            Alert.alert('Reset', 'Reset all shelves to defaults? Custom shelves will be kept.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', onPress: resetDefaults },
            ]);
          }}
          style={{ padding: 8 }}
        >
          <Ionicons name="refresh" size={22} color={theme.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
          <Ionicons name="information-circle" size={20} color={theme.primary} />
          <Text style={{ color: theme.primary, fontSize: 13, flex: 1, marginLeft: 8 }}>
            Smart shelves automatically organize your books based on rules. Tap a shelf to set it as active in the library.
          </Text>
        </View>

        {/* Shelf List */}
        {shelves.map((shelf) => {
          const isActive = activeShelfId === shelf.id;
          const isExpanded = expandedShelfId === shelf.id;
          const matchedBooks = isExpanded ? getBooksForShelf(books, shelf) : [];

          return (
            <View
              key={shelf.id}
              style={[
                styles.shelfCard,
                {
                  backgroundColor: isActive ? theme.primary + '12' : theme.surface,
                  borderColor: isActive ? theme.primary : theme.border,
                },
              ]}
            >
              <Pressable
                onPress={() => handleToggleExpand(shelf.id)}
                onLongPress={() => handleRemoveShelf(shelf)}
                style={styles.shelfRow}
              >
                <View style={[styles.shelfIcon, { backgroundColor: (isActive ? theme.primary : theme.textMuted) + '18' }]}>
                  <Ionicons
                    name={getShelfIcon(shelf.icon)}
                    size={22}
                    color={isActive ? theme.primary : theme.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.shelfName, { color: theme.text }]}>{shelf.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                    {shelfBookCounts[shelf.id] ?? 0} books
                    {shelf.isDefault ? ' \u00b7 Default' : ''}
                  </Text>
                  {shelf.filters.length > 0 && (
                    <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
                      {shelf.filters.map((f) => `${f.field} ${f.operator} "${f.value}"`).join(', ')}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => handleSetActive(shelf.id)} style={{ padding: 8 }}>
                  <Ionicons
                    name={isActive ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isActive ? theme.primary : theme.textMuted}
                  />
                </Pressable>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.textMuted}
                />
              </Pressable>

              {/* Expanded: show matching books */}
              {isExpanded && (
                <View style={[styles.shelfBooks, { borderTopColor: theme.border }]}>
                  {matchedBooks.length === 0 ? (
                    <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
                      No books match this shelf's criteria
                    </Text>
                  ) : (
                    matchedBooks.slice(0, 10).map((book) => (
                      <Pressable
                        key={book.id}
                        onPress={() => router.push(`/reader/${book.id}`)}
                        style={styles.shelfBookRow}
                      >
                        <Ionicons name="book-outline" size={16} color={theme.textSecondary} />
                        <Text style={{ color: theme.text, fontSize: 14, flex: 1, marginLeft: 8 }} numberOfLines={1}>
                          {book.title}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                          {book.progress ? `${Math.round(book.progress * 100)}%` : ''}
                        </Text>
                      </Pressable>
                    ))
                  )}
                  {matchedBooks.length > 10 && (
                    <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: 'center', paddingTop: 6 }}>
                      +{matchedBooks.length - 10} more
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Create New Shelf */}
        {showCreate ? (
          <View style={[styles.createForm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.createFormTitle, { color: theme.text }]}>New Smart Shelf</Text>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g., High-Rated Fiction"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Filter Rule (optional)</Text>
            <View style={styles.filterRow}>
              <Pressable
                onPress={handleSelectField}
                style={[styles.filterChip, { borderColor: theme.border, backgroundColor: theme.background }]}
              >
                <Text style={{ color: theme.text, fontSize: 13 }}>
                  {FIELD_OPTIONS.find((f) => f.value === newFilterField)?.label}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSelectOperator}
                style={[styles.filterChip, { borderColor: theme.border, backgroundColor: theme.background }]}
              >
                <Text style={{ color: theme.text, fontSize: 13 }}>
                  {OPERATOR_OPTIONS.find((o) => o.value === newFilterOp)?.label}
                </Text>
              </Pressable>
            </View>
            <TextInput
              value={newFilterValue}
              onChangeText={setNewFilterValue}
              placeholder="Filter value (e.g., reading, epub)"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Sort By</Text>
            <Pressable
              onPress={handleSelectSort}
              style={[styles.filterChip, { borderColor: theme.border, backgroundColor: theme.background, alignSelf: 'flex-start' }]}
            >
              <Text style={{ color: theme.text, fontSize: 13 }}>
                {SORT_OPTIONS.find((s) => s.value === newSortBy)?.label}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.textMuted} style={{ marginLeft: 4 }} />
            </Pressable>

            <View style={styles.createFormButtons}>
              <Pressable
                onPress={() => {
                  setShowCreate(false);
                  setNewName('');
                  setNewFilterValue('');
                }}
                style={[styles.formButton, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateShelf}
                style={[styles.formButton, { backgroundColor: theme.primary }]}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Create Shelf</Text>
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
              Create Smart Shelf
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
  shelfCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  shelfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  shelfIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shelfName: {
    fontSize: 16,
    fontWeight: '600',
  },
  shelfBooks: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  shelfBookRow: {
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
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
