import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';

export default function ReadingGoalsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Reading Goals</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.goalCard, { backgroundColor: theme.surface }]}>
          <Ionicons name="time" size={32} color={theme.primary} />
          <Text style={[styles.goalTitle, { color: theme.text }]}>Daily Reading</Text>
          <Text style={[styles.goalValue, { color: theme.primary }]}>30 min</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>
            Set your daily reading target
          </Text>
        </View>
        <View style={[styles.goalCard, { backgroundColor: theme.surface }]}>
          <Ionicons name="book" size={32} color={theme.primary} />
          <Text style={[styles.goalTitle, { color: theme.text }]}>Yearly Goal</Text>
          <Text style={[styles.goalValue, { color: theme.primary }]}>12 books</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>
            Books to read this year
          </Text>
        </View>
        <View style={[styles.streakCard, { backgroundColor: theme.surface }]}>
          <Ionicons name="flame" size={28} color="#FF6B35" />
          <View>
            <Text style={[styles.goalTitle, { color: theme.text }]}>Current Streak</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>0 days</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { padding: 16, gap: 16 },
  goalCard: { padding: 20, borderRadius: 16, alignItems: 'center', gap: 8 },
  goalTitle: { fontSize: 18, fontWeight: '600' },
  goalValue: { fontSize: 32, fontWeight: '700' },
  streakCard: { flexDirection: 'row', padding: 20, borderRadius: 16, alignItems: 'center', gap: 16 },
});
