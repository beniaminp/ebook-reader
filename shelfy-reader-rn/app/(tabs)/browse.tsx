import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';

const FEATURED_SOURCES = [
  {
    id: 'gutenberg',
    title: 'Project Gutenberg',
    description: 'Over 70,000 free eBooks',
    icon: 'book' as const,
  },
  {
    id: 'standard',
    title: 'Standard Ebooks',
    description: 'Beautifully formatted public domain ebooks',
    icon: 'star' as const,
  },
  {
    id: 'feedbooks',
    title: 'Feedbooks',
    description: 'Public domain books in EPUB format',
    icon: 'globe' as const,
  },
  {
    id: 'manybooks',
    title: 'ManyBooks',
    description: 'Free eBooks for your reading pleasure',
    icon: 'library' as const,
  },
];

export default function BrowseScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Browse</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          FEATURED SOURCES
        </Text>
        {FEATURED_SOURCES.map((source) => (
          <Pressable
            key={source.id}
            style={[styles.sourceCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={[styles.sourceIcon, { backgroundColor: theme.surface }]}>
              <Ionicons name={source.icon} size={24} color={theme.primary} />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={[styles.sourceTitle, { color: theme.text }]}>
                {source.title}
              </Text>
              <Text style={[styles.sourceDesc, { color: theme.textSecondary }]}>
                {source.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sourceDesc: {
    fontSize: 13,
    marginTop: 2,
  },
});
