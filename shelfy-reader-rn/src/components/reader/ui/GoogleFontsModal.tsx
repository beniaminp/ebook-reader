import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useThemeStore } from '../../../stores/useThemeStore';

interface GoogleFontsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectFont: (fontFamily: string) => void;
}

interface GoogleFontItem {
  family: string;
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
}

const POPULAR_GOOGLE_FONTS: GoogleFontItem[] = [
  { family: 'Roboto', category: 'sans-serif' },
  { family: 'Open Sans', category: 'sans-serif' },
  { family: 'Lato', category: 'sans-serif' },
  { family: 'Montserrat', category: 'sans-serif' },
  { family: 'Roboto Slab', category: 'serif' },
  { family: 'Merriweather', category: 'serif' },
  { family: 'Playfair Display', category: 'serif' },
  { family: 'PT Serif', category: 'serif' },
  { family: 'Lora', category: 'serif' },
  { family: 'Noto Serif', category: 'serif' },
  { family: 'Source Sans 3', category: 'sans-serif' },
  { family: 'Nunito', category: 'sans-serif' },
  { family: 'Raleway', category: 'sans-serif' },
  { family: 'Inter', category: 'sans-serif' },
  { family: 'Poppins', category: 'sans-serif' },
  { family: 'Oswald', category: 'sans-serif' },
  { family: 'Roboto Mono', category: 'monospace' },
  { family: 'Source Code Pro', category: 'monospace' },
  { family: 'Fira Code', category: 'monospace' },
  { family: 'JetBrains Mono', category: 'monospace' },
  { family: 'Crimson Text', category: 'serif' },
  { family: 'Libre Baskerville', category: 'serif' },
  { family: 'EB Garamond', category: 'serif' },
  { family: 'Bitter', category: 'serif' },
  { family: 'Dancing Script', category: 'handwriting' },
  { family: 'Pacifico', category: 'handwriting' },
  { family: 'Caveat', category: 'handwriting' },
  { family: 'Lobster', category: 'display' },
  { family: 'Abril Fatface', category: 'display' },
  { family: 'Comfortaa', category: 'display' },
];

type CategoryFilter = 'all' | 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';

const CATEGORIES: { label: string; value: CategoryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Serif', value: 'serif' },
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Display', value: 'display' },
  { label: 'Handwriting', value: 'handwriting' },
  { label: 'Monospace', value: 'monospace' },
];

const SAMPLE_TEXT = 'The quick brown fox jumps over the lazy dog';

export function GoogleFontsModal({ visible, onClose, onSelectFont }: GoogleFontsModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { customFonts, addGoogleFont } = useThemeStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [loadingFont, setLoadingFont] = useState<string | null>(null);

  const addedGoogleFonts = useMemo(
    () => new Set(customFonts.filter((f) => f.source === 'google-fonts').map((f) => f.name)),
    [customFonts],
  );

  const filtered = useMemo(() => {
    return POPULAR_GOOGLE_FONTS.filter((font) => {
      const matchesSearch = font.family.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || font.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const handleAddFont = async (family: string) => {
    if (addedGoogleFonts.has(family)) return;
    setLoadingFont(family);
    try {
      await addGoogleFont(family);
      onSelectFont(family);
    } catch (error) {
      console.error('Failed to add Google Font:', error);
    } finally {
      setLoadingFont(null);
    }
  };

  const renderFontItem = ({ item }: { item: GoogleFontItem }) => {
    const isAdded = addedGoogleFonts.has(item.family);
    const isLoading = loadingFont === item.family;

    return (
      <View style={[styles.fontItem, { borderBottomColor: theme.border }]}>
        <View style={styles.fontInfo}>
          <Text style={[styles.fontName, { color: theme.text }]}>{item.family}</Text>
          <Text style={[styles.fontCategory, { color: theme.textMuted }]}>{item.category}</Text>
          <Text
            style={[styles.fontPreview, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {SAMPLE_TEXT}
          </Text>
        </View>
        <Pressable
          style={[
            styles.addButton,
            {
              backgroundColor: isAdded ? theme.success + '20' : theme.primary + '15',
              borderColor: isAdded ? theme.success : theme.primary,
            },
          ]}
          onPress={() => handleAddFont(item.family)}
          disabled={isAdded || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons
              name={isAdded ? 'checkmark-circle' : 'add-circle-outline'}
              size={22}
              color={isAdded ? theme.success : theme.primary}
            />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Google Fonts</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search fonts..."
                placeholderTextColor={theme.textMuted}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Category Chips */}
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.value;
              return (
                <Pressable
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isActive ? theme.primary : theme.surface,
                      borderColor: isActive ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: isActive ? '#fff' : theme.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Font List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.family}
            renderItem={renderFontItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="text-outline" size={40} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  No fonts match your search.
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchContainer: {
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 16,
  },
  fontItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  fontInfo: {
    flex: 1,
    gap: 2,
  },
  fontName: {
    fontSize: 15,
    fontWeight: '600',
  },
  fontCategory: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  fontPreview: {
    fontSize: 13,
    marginTop: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default GoogleFontsModal;
