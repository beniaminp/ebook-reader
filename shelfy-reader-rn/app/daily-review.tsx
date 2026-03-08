import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../src/components/common/Header';
import { useTheme } from '../src/theme/ThemeContext';
import { useReadingGoalsStore } from '../src/stores/useReadingGoalsStore';
import { useAppStore } from '../src/stores/useAppStore';

// --- Progress ring component (reused from reading-goals) ---
function ProgressRing({
  progress,
  size,
  strokeWidth,
  color,
  bgColor,
  children,
}: {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  bgColor: string;
  children?: React.ReactNode;
}) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: bgColor,
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: clampedProgress > 0.25 ? color : 'transparent',
          borderBottomColor: clampedProgress > 0.5 ? color : 'transparent',
          borderLeftColor: clampedProgress > 0.75 ? color : 'transparent',
          position: 'absolute',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      {children}
    </View>
  );
}

// --- Week day indicators ---
function WeekView({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  const weekRecords = useReadingGoalsStore((s) => s.getWeekRecords());
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <View style={styles.weekContainer}>
      {weekRecords.map((day, i) => {
        const goalMet = day.record?.goalMet ?? false;
        const hasMinutes = (day.record?.minutes ?? 0) > 0;
        return (
          <View key={day.date} style={styles.weekDay}>
            <Text style={[styles.weekDayLabel, { color: theme.textMuted }]}>
              {dayLabels[i]}
            </Text>
            <View
              style={[
                styles.weekDayDot,
                {
                  backgroundColor: goalMet
                    ? theme.success
                    : hasMinutes
                      ? theme.warning
                      : theme.surfaceVariant,
                },
              ]}
            >
              {goalMet && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function DailyReviewScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const books = useAppStore((s) => s.books);

  // Reading goals store
  const enabled = useReadingGoalsStore((s) => s.enabled);
  const dailyGoalMinutes = useReadingGoalsStore((s) => s.dailyGoalMinutes);
  const currentStreak = useReadingGoalsStore((s) => s.currentStreak);
  const longestStreak = useReadingGoalsStore((s) => s.longestStreak);
  const getTodayMinutes = useReadingGoalsStore((s) => s.getTodayMinutes);
  const getTodayProgress = useReadingGoalsStore((s) => s.getTodayProgress);
  const isTodayGoalMet = useReadingGoalsStore((s) => s.isTodayGoalMet);
  const getTotalMinutesThisWeek = useReadingGoalsStore((s) => s.getTotalMinutesThisWeek);
  const getDaysWithGoalMet = useReadingGoalsStore((s) => s.getDaysWithGoalMet);
  const yearlyGoalEnabled = useReadingGoalsStore((s) => s.yearlyGoalEnabled);
  const getYearlyGoalData = useReadingGoalsStore((s) => s.getYearlyGoalData);
  const getYearlyProgress = useReadingGoalsStore((s) => s.getYearlyProgress);

  const todayMinutes = getTodayMinutes();
  const todayProgress = getTodayProgress();
  const todayGoalMet = isTodayGoalMet();
  const weekMinutes = getTotalMinutesThisWeek();
  const daysMetLast30 = getDaysWithGoalMet(30);
  const yearlyData = getYearlyGoalData();
  const yearlyProgress = getYearlyProgress();
  const currentYear = new Date().getFullYear();

  // Count books currently being read
  const booksInProgress = books.filter(
    (b) => b.progress > 0 && b.progress < 1
  ).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Header title="Daily Review" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Today's summary card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
          <View style={styles.summaryHeader}>
            <Ionicons
              name={todayGoalMet ? 'checkmark-circle' : 'time-outline'}
              size={28}
              color={todayGoalMet ? theme.success : theme.primary}
            />
            <Text style={[styles.summaryTitle, { color: theme.text }]}>
              {todayGoalMet ? "Today's Goal Met!" : "Today's Progress"}
            </Text>
          </View>

          <View style={styles.summaryBody}>
            <ProgressRing
              progress={todayProgress}
              size={120}
              strokeWidth={8}
              color={todayGoalMet ? theme.success : theme.primary}
              bgColor={theme.surfaceVariant}
            >
              <Text style={[styles.ringValue, { color: theme.text }]}>{todayMinutes}</Text>
              <Text style={[styles.ringUnit, { color: theme.textSecondary }]}>
                / {dailyGoalMinutes} min
              </Text>
            </ProgressRing>

            <View style={styles.summaryStats}>
              <View style={styles.statRow}>
                <Ionicons name="flame" size={18} color={currentStreak > 0 ? '#FF6B35' : theme.textMuted} />
                <Text style={[styles.statText, { color: theme.text }]}>
                  {currentStreak} day streak
                </Text>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>
                  {weekMinutes} min this week
                </Text>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="checkmark-done" size={18} color={theme.textSecondary} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>
                  {daysMetLast30} / 30 days met
                </Text>
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: theme.surfaceVariant }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(todayProgress * 100, 100)}%`,
                  backgroundColor: todayGoalMet ? theme.success : theme.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
            {todayGoalMet
              ? 'Goal met! Keep it up!'
              : `${Math.max(0, dailyGoalMinutes - todayMinutes)} min remaining today`}
          </Text>
        </View>

        {/* This Week */}
        {enabled && (
          <View style={[styles.weekCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>This Week</Text>
            <WeekView theme={theme} />
          </View>
        )}

        {/* Streak card */}
        {enabled && (
          <View style={[styles.streakCard, { backgroundColor: theme.surface }]}>
            <View style={styles.streakIconContainer}>
              <Ionicons
                name="flame"
                size={40}
                color={currentStreak > 0 ? '#FF6B35' : theme.textMuted}
              />
            </View>
            <View style={styles.streakInfo}>
              <Text style={[styles.streakTitle, { color: theme.text }]}>Reading Streak</Text>
              <Text
                style={[
                  styles.streakValue,
                  { color: currentStreak > 0 ? '#FF6B35' : theme.textMuted },
                ]}
              >
                {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
              </Text>
            </View>
            <View style={styles.streakBest}>
              <Text style={[styles.streakBestLabel, { color: theme.textMuted }]}>Best</Text>
              <Text style={[styles.streakBestValue, { color: theme.textSecondary }]}>
                {longestStreak}
              </Text>
            </View>
          </View>
        )}

        {/* Quick stats grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="library-outline" size={24} color={theme.primary} />
            <Text style={[styles.statsNumber, { color: theme.text }]}>{books.length}</Text>
            <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Total Books</Text>
          </View>

          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="book-outline" size={24} color={theme.accent} />
            <Text style={[styles.statsNumber, { color: theme.text }]}>{booksInProgress}</Text>
            <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>In Progress</Text>
          </View>
        </View>

        {/* Yearly progress (if enabled) */}
        {yearlyGoalEnabled && (
          <View style={[styles.yearlyCard, { backgroundColor: theme.surface }]}>
            <View style={styles.yearlyHeader}>
              <Ionicons name="trophy-outline" size={22} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {currentYear} Book Goal
              </Text>
            </View>
            <View style={styles.yearlyBody}>
              <ProgressRing
                progress={yearlyProgress}
                size={80}
                strokeWidth={6}
                color={yearlyProgress >= 1 ? theme.success : theme.accent}
                bgColor={theme.surfaceVariant}
              >
                <Text style={[styles.yearlyRingValue, { color: theme.text }]}>
                  {yearlyData.booksFinished.length}
                </Text>
                <Text style={[styles.yearlyRingUnit, { color: theme.textSecondary }]}>
                  / {yearlyData.targetBooks}
                </Text>
              </ProgressRing>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[styles.yearlyProgressText, { color: theme.text }]}>
                  {yearlyData.booksFinished.length} of {yearlyData.targetBooks} books
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: theme.surfaceVariant, marginTop: 8 }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(yearlyProgress * 100, 100)}%`,
                        backgroundColor: yearlyProgress >= 1 ? theme.success : theme.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressLabel, { color: theme.textSecondary, marginTop: 4 }]}>
                  {yearlyProgress >= 1
                    ? 'Annual goal reached!'
                    : `${Math.max(0, yearlyData.targetBooks - yearlyData.booksFinished.length)} books to go`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Not enabled message */}
        {!enabled && (
          <View style={[styles.disabledCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="information-circle-outline" size={32} color={theme.textMuted} />
            <Text style={[styles.disabledText, { color: theme.textSecondary }]}>
              Reading goal tracking is disabled. Enable it in Reading Goals to track your daily progress and streaks.
            </Text>
            <Pressable
              style={[styles.enableBtn, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/reading-goals')}
            >
              <Text style={[styles.enableBtnText, { color: '#fff' }]}>Go to Reading Goals</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  // Summary card
  summaryCard: { padding: 20, borderRadius: 16, gap: 16 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryTitle: { fontSize: 20, fontWeight: '700' },
  summaryBody: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  summaryStats: { flex: 1, gap: 10 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statText: { fontSize: 14 },

  // Progress ring
  ringValue: { fontSize: 28, fontWeight: '700' },
  ringUnit: { fontSize: 12 },

  // Progress bar
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 12, textAlign: 'center', marginTop: 4 },

  // Week view
  weekCard: { borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  weekContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  weekDay: { alignItems: 'center', gap: 6 },
  weekDayLabel: { fontSize: 12, fontWeight: '500' },
  weekDayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Streak card
  streakCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  streakIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakInfo: { flex: 1 },
  streakTitle: { fontSize: 16, fontWeight: '600' },
  streakValue: { fontSize: 28, fontWeight: '700' },
  streakBest: { alignItems: 'center' },
  streakBestLabel: { fontSize: 11, fontWeight: '500' },
  streakBestValue: { fontSize: 20, fontWeight: '700' },

  // Stats grid
  statsGrid: { flexDirection: 'row', gap: 12 },
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  statsNumber: { fontSize: 24, fontWeight: '700' },
  statsLabel: { fontSize: 12 },

  // Yearly card
  yearlyCard: { padding: 20, borderRadius: 16, gap: 16 },
  yearlyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yearlyBody: { flexDirection: 'row', alignItems: 'center' },
  yearlyRingValue: { fontSize: 20, fontWeight: '700' },
  yearlyRingUnit: { fontSize: 10 },
  yearlyProgressText: { fontSize: 15, fontWeight: '600' },

  // Disabled state
  disabledCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  disabledText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  enableBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  enableBtnText: { fontSize: 14, fontWeight: '600' },
});
