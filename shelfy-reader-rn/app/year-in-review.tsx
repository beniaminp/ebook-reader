import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { useAppStore } from '../src/stores/useAppStore';

export default function YearInReviewScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const books = useAppStore((s) => s.books);
  const year = new Date().getFullYear();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{year} in Review</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.heroYear}>{year}</Text>
          <Text style={styles.heroLabel}>Your Reading Year</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{books.length}</Text>
              <Text style={styles.heroStatLabel}>Books</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {books.filter((b) => (b.progress ?? 0) >= 0.99).length}
              </Text>
              <Text style={styles.heroStatLabel}>Finished</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { padding: 16 },
  heroCard: { borderRadius: 20, padding: 32, alignItems: 'center' },
  heroYear: { fontSize: 48, fontWeight: '800', color: '#fff' },
  heroLabel: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  heroStats: { flexDirection: 'row', marginTop: 24, gap: 40 },
  heroStat: { alignItems: 'center' },
  heroStatValue: { fontSize: 36, fontWeight: '700', color: '#fff' },
  heroStatLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
});
