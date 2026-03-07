import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { useAppStore } from '../src/stores/useAppStore';

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <Ionicons name={icon as any} size={24} color={theme.primary} />
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function StatisticsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const books = useAppStore((s) => s.books);

  const totalBooks = books.length;
  const finishedBooks = books.filter((b) => (b.progress ?? 0) >= 0.99).length;
  const inProgressBooks = books.filter(
    (b) => (b.progress ?? 0) > 0 && (b.progress ?? 0) < 0.99
  ).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Statistics</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsGrid}>
          <StatCard label="Total Books" value={totalBooks.toString()} icon="library" />
          <StatCard label="Finished" value={finishedBooks.toString()} icon="checkmark-circle" />
          <StatCard label="In Progress" value={inProgressBooks.toString()} icon="book" />
          <StatCard label="Unread" value={(totalBooks - finishedBooks - inProgressBooks).toString()} icon="eye-off" />
        </View>
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
  title: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { padding: 16 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 13 },
});
