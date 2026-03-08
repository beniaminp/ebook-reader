import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import type { Collection } from '../../types';

export interface ShelfManagerProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  bookCollectionMap: Record<string, string[]>;
  onCreateShelf: (name: string, description?: string) => Promise<void>;
  onUpdateShelf: (
    id: string,
    name: string,
    description?: string
  ) => Promise<void>;
  onDeleteShelf: (id: string) => Promise<void>;
  currentCollectionId: string;
  onFilterCollectionChange: (collectionId: string) => void;
}

export function ShelfManager({
  isOpen,
  onClose,
  collections,
  bookCollectionMap,
  onCreateShelf,
  onUpdateShelf,
  onDeleteShelf,
  currentCollectionId,
  onFilterCollectionChange,
}: ShelfManagerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Create / Edit shelf state
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Collection | null>(null);
  const [shelfName, setShelfName] = useState('');
  const [shelfDescription, setShelfDescription] = useState('');

  const openShelfModal = useCallback((shelf?: Collection) => {
    if (shelf) {
      setEditingShelf(shelf);
      setShelfName(shelf.name);
      setShelfDescription(shelf.description || '');
    } else {
      setEditingShelf(null);
      setShelfName('');
      setShelfDescription('');
    }
    setShowShelfModal(true);
  }, []);

  const handleSaveShelf = useCallback(async () => {
    if (!shelfName.trim()) return;
    try {
      if (editingShelf) {
        await onUpdateShelf(
          editingShelf.id,
          shelfName.trim(),
          shelfDescription.trim() || undefined
        );
      } else {
        await onCreateShelf(
          shelfName.trim(),
          shelfDescription.trim() || undefined
        );
      }
      setShowShelfModal(false);
      setEditingShelf(null);
      setShelfName('');
      setShelfDescription('');
    } catch (err) {
      console.error('Failed to save shelf:', err);
    }
  }, [
    shelfName,
    shelfDescription,
    editingShelf,
    onCreateShelf,
    onUpdateShelf,
  ]);

  const handleDeleteShelf = useCallback(
    (shelf: Collection) => {
      Alert.alert(
        'Delete Shelf',
        `Delete "${shelf.name}"? Books in this shelf will not be deleted.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await onDeleteShelf(shelf.id);
                if (currentCollectionId === shelf.id) {
                  onFilterCollectionChange('all');
                }
              } catch (err) {
                console.error('Failed to delete shelf:', err);
              }
            },
          },
        ]
      );
    },
    [currentCollectionId, onDeleteShelf, onFilterCollectionChange]
  );

  const getBookCount = (collectionId: string): number =>
    bookCollectionMap[collectionId]?.length || 0;

  const renderShelfItem = ({ item }: { item: Collection }) => (
    <View style={[styles.shelfItem, { borderBottomColor: theme.border }]}>
      <View style={styles.shelfInfo}>
        <Text style={[styles.shelfName, { color: theme.text }]}>
          {item.name}
        </Text>
        {item.description ? (
          <Text
            numberOfLines={1}
            style={[styles.shelfDescription, { color: theme.textSecondary }]}
          >
            {item.description}
          </Text>
        ) : null}
        <Text style={[styles.bookCount, { color: theme.textMuted }]}>
          {getBookCount(item.id)} book
          {getBookCount(item.id) !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.shelfActions}>
        <Pressable
          onPress={() => {
            onClose();
            openShelfModal(item);
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
          onPress={() => handleDeleteShelf(item)}
          hitSlop={6}
          style={styles.iconBtn}
        >
          <Ionicons name="trash-outline" size={20} color={theme.error} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <>
      {/* Manage Shelves Modal */}
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
              Manage Shelves
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={[styles.doneText, { color: theme.primary }]}>
                Done
              </Text>
            </Pressable>
          </View>

          {/* Section header */}
          <View style={styles.sectionHeader}>
            <Text
              style={[styles.sectionTitle, { color: theme.text }]}
            >
              Collections
            </Text>
            <Pressable
              onPress={() => {
                onClose();
                openShelfModal();
              }}
              style={styles.addBtn}
            >
              <Ionicons name="add-outline" size={20} color={theme.primary} />
              <Text style={[styles.addBtnText, { color: theme.primary }]}>
                Add
              </Text>
            </Pressable>
          </View>

          {collections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No collections yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={collections}
              renderItem={renderShelfItem}
              keyExtractor={(item) => item.id}
            />
          )}
        </View>
      </Modal>

      {/* Create / Edit Shelf Modal */}
      <Modal
        visible={showShelfModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShelfModal(false)}
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
              {editingShelf ? 'Edit Shelf' : 'New Shelf'}
            </Text>
            <Pressable onPress={() => setShowShelfModal(false)} hitSlop={8}>
              <Text style={[styles.doneText, { color: theme.primary }]}>
                Cancel
              </Text>
            </Pressable>
          </View>

          <View style={styles.formContent}>
            {/* Name field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Shelf Name *
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
                value={shelfName}
                onChangeText={setShelfName}
                placeholder="e.g. Sci-Fi, Work, Summer Reading"
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
            </View>

            {/* Description field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Description
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
                value={shelfDescription}
                onChangeText={setShelfDescription}
                placeholder="Optional description"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Save button */}
            <Pressable
              onPress={handleSaveShelf}
              disabled={!shelfName.trim()}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: shelfName.trim()
                    ? theme.primary
                    : theme.textMuted,
                },
              ]}
            >
              <Text style={styles.saveBtnText}>
                {editingShelf ? 'Save Changes' : 'Create Shelf'}
              </Text>
            </Pressable>

            {/* Delete button when editing */}
            {editingShelf && (
              <Pressable
                onPress={() => {
                  handleDeleteShelf(editingShelf);
                  setShowShelfModal(false);
                }}
                style={[styles.deleteBtn, { borderColor: theme.error }]}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.error}
                />
                <Text style={[styles.deleteBtnText, { color: theme.error }]}>
                  Delete Shelf
                </Text>
              </Pressable>
            )}
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
  doneText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  shelfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shelfInfo: {
    flex: 1,
  },
  shelfName: {
    fontSize: 16,
    fontWeight: '500',
  },
  shelfDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  bookCount: {
    fontSize: 12,
    marginTop: 2,
  },
  shelfActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  formContent: {
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

export default ShelfManager;
