import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { useReadingGoalsStore } from '../src/stores/useReadingGoalsStore';
import { useAppStore } from '../src/stores/useAppStore';

// --- Progress ring component ---
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
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  // We'll use a simple bar-based approach since SVG isn't available in RN without extra deps
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background circle approximation using border */}
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
      {/* Progress arc using a clever rotation trick */}
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

// --- Edit modal ---
function EditGoalModal({
  visible,
  onClose,
  title,
  value,
  onSave,
  unit,
  min,
  max,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: number;
  onSave: (val: number) => void;
  unit: string;
  min: number;
  max: number;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const [inputValue, setInputValue] = useState(value.toString());

  const handleSave = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onSave(parsed);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: theme.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>

          <View style={styles.modalInputRow}>
            <Pressable
              style={[styles.modalStepBtn, { backgroundColor: theme.surfaceVariant }]}
              onPress={() => {
                const n = Math.max(min, parseInt(inputValue, 10) - 1 || min);
                setInputValue(n.toString());
              }}
            >
              <Ionicons name="remove" size={20} color={theme.text} />
            </Pressable>

            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.border }]}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="number-pad"
              selectTextOnFocus
            />

            <Pressable
              style={[styles.modalStepBtn, { backgroundColor: theme.surfaceVariant }]}
              onPress={() => {
                const n = Math.min(max, parseInt(inputValue, 10) + 1 || min);
                setInputValue(n.toString());
              }}
            >
              <Ionicons name="add" size={20} color={theme.text} />
            </Pressable>
          </View>

          <Text style={[styles.modalUnit, { color: theme.textSecondary }]}>{unit}</Text>
          <Text style={[styles.modalRange, { color: theme.textMuted }]}>
            Range: {min} - {max}
          </Text>

          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: theme.surfaceVariant }]}
              onPress={onClose}
            >
              <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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

// --- Main screen ---

export default function ReadingGoalsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const books = useAppStore((s) => s.books);

  // Reading goals store
  const enabled = useReadingGoalsStore((s) => s.enabled);
  const dailyGoalMinutes = useReadingGoalsStore((s) => s.dailyGoalMinutes);
  const currentStreak = useReadingGoalsStore((s) => s.currentStreak);
  const longestStreak = useReadingGoalsStore((s) => s.longestStreak);
  const yearlyGoalEnabled = useReadingGoalsStore((s) => s.yearlyGoalEnabled);
  const setEnabled = useReadingGoalsStore((s) => s.setEnabled);
  const setDailyGoal = useReadingGoalsStore((s) => s.setDailyGoal);
  const setYearlyGoalEnabled = useReadingGoalsStore((s) => s.setYearlyGoalEnabled);
  const setYearlyBookTarget = useReadingGoalsStore((s) => s.setYearlyBookTarget);
  const getTodayMinutes = useReadingGoalsStore((s) => s.getTodayMinutes);
  const getTodayProgress = useReadingGoalsStore((s) => s.getTodayProgress);
  const getYearlyGoalData = useReadingGoalsStore((s) => s.getYearlyGoalData);
  const getYearlyProgress = useReadingGoalsStore((s) => s.getYearlyProgress);
  const getTotalMinutesThisWeek = useReadingGoalsStore((s) => s.getTotalMinutesThisWeek);
  const getDaysWithGoalMet = useReadingGoalsStore((s) => s.getDaysWithGoalMet);

  const todayMinutes = getTodayMinutes();
  const todayProgress = getTodayProgress();
  const yearlyData = getYearlyGoalData();
  const yearlyProgress = getYearlyProgress();
  const weekMinutes = getTotalMinutesThisWeek();
  const daysMetThisMonth = getDaysWithGoalMet(30);

  const [editingDaily, setEditingDaily] = useState(false);
  const [editingYearly, setEditingYearly] = useState(false);

  const currentYear = new Date().getFullYear();

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
        {/* Enable/disable toggle */}
        <View style={[styles.toggleRow, { backgroundColor: theme.surface }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>Goal Tracking</Text>
            <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>
              Track daily reading minutes and streaks
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: theme.surfaceVariant, true: theme.primary + '80' }}
            thumbColor={enabled ? theme.primary : theme.textMuted}
          />
        </View>

        {/* Daily Reading Goal */}
        <Pressable
          style={[styles.goalCard, { backgroundColor: theme.surface, opacity: enabled ? 1 : 0.5 }]}
          onPress={() => enabled && setEditingDaily(true)}
          disabled={!enabled}
        >
          <View style={styles.goalCardHeader}>
            <Ionicons name="time" size={24} color={theme.primary} />
            <Text style={[styles.goalCardTitle, { color: theme.text }]}>Daily Reading</Text>
            <Ionicons name="pencil" size={16} color={theme.textMuted} />
          </View>

          <View style={styles.goalCardBody}>
            <ProgressRing
              progress={todayProgress}
              size={100}
              strokeWidth={6}
              color={todayProgress >= 1 ? theme.success : theme.primary}
              bgColor={theme.surfaceVariant}
            >
              <Text style={[styles.ringValue, { color: theme.text }]}>{todayMinutes}</Text>
              <Text style={[styles.ringUnit, { color: theme.textSecondary }]}>min</Text>
            </ProgressRing>

            <View style={styles.goalCardDetails}>
              <Text style={[styles.goalTarget, { color: theme.primary }]}>
                {dailyGoalMinutes} min / day
              </Text>
              <View style={styles.goalDetailRow}>
                <Ionicons name="calendar" size={14} color={theme.textSecondary} />
                <Text style={[styles.goalDetailText, { color: theme.textSecondary }]}>
                  This week: {weekMinutes} min
                </Text>
              </View>
              <View style={styles.goalDetailRow}>
                <Ionicons name="checkmark-done" size={14} color={theme.textSecondary} />
                <Text style={[styles.goalDetailText, { color: theme.textSecondary }]}>
                  Last 30 days: {daysMetThisMonth} days met
                </Text>
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <View style={[styles.goalProgressTrack, { backgroundColor: theme.surfaceVariant }]}>
            <View
              style={[
                styles.goalProgressFill,
                {
                  width: `${Math.min(todayProgress * 100, 100)}%`,
                  backgroundColor: todayProgress >= 1 ? theme.success : theme.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.goalProgressText, { color: theme.textSecondary }]}>
            {todayProgress >= 1
              ? 'Goal met! Keep it up!'
              : `${Math.max(0, dailyGoalMinutes - todayMinutes)} min remaining today`}
          </Text>
        </Pressable>

        {/* This Week */}
        {enabled && (
          <View style={[styles.weekCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.weekTitle, { color: theme.text }]}>This Week</Text>
            <WeekView theme={theme} />
          </View>
        )}

        {/* Yearly Book Goal */}
        <View style={[styles.toggleRow, { backgroundColor: theme.surface }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>Yearly Book Goal</Text>
            <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>
              Set a target number of books per year
            </Text>
          </View>
          <Switch
            value={yearlyGoalEnabled}
            onValueChange={setYearlyGoalEnabled}
            trackColor={{ false: theme.surfaceVariant, true: theme.primary + '80' }}
            thumbColor={yearlyGoalEnabled ? theme.primary : theme.textMuted}
          />
        </View>

        {yearlyGoalEnabled && (
          <Pressable
            style={[styles.goalCard, { backgroundColor: theme.surface }]}
            onPress={() => setEditingYearly(true)}
          >
            <View style={styles.goalCardHeader}>
              <Ionicons name="book" size={24} color={theme.primary} />
              <Text style={[styles.goalCardTitle, { color: theme.text }]}>
                {currentYear} Book Goal
              </Text>
              <Ionicons name="pencil" size={16} color={theme.textMuted} />
            </View>

            <View style={styles.goalCardBody}>
              <ProgressRing
                progress={yearlyProgress}
                size={100}
                strokeWidth={6}
                color={yearlyProgress >= 1 ? theme.success : theme.accent}
                bgColor={theme.surfaceVariant}
              >
                <Text style={[styles.ringValue, { color: theme.text }]}>
                  {yearlyData.booksFinished.length}
                </Text>
                <Text style={[styles.ringUnit, { color: theme.textSecondary }]}>
                  / {yearlyData.targetBooks}
                </Text>
              </ProgressRing>

              <View style={styles.goalCardDetails}>
                <Text style={[styles.goalTarget, { color: theme.accent }]}>
                  {yearlyData.targetBooks} books in {currentYear}
                </Text>
                <View style={styles.goalDetailRow}>
                  <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                  <Text style={[styles.goalDetailText, { color: theme.textSecondary }]}>
                    {yearlyData.booksFinished.length} finished
                  </Text>
                </View>
                <View style={styles.goalDetailRow}>
                  <Ionicons name="trending-up" size={14} color={theme.textSecondary} />
                  <Text style={[styles.goalDetailText, { color: theme.textSecondary }]}>
                    {Math.round(yearlyProgress * 100)}% of goal
                  </Text>
                </View>
              </View>
            </View>

            {/* Progress bar */}
            <View style={[styles.goalProgressTrack, { backgroundColor: theme.surfaceVariant }]}>
              <View
                style={[
                  styles.goalProgressFill,
                  {
                    width: `${Math.min(yearlyProgress * 100, 100)}%`,
                    backgroundColor: yearlyProgress >= 1 ? theme.success : theme.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.goalProgressText, { color: theme.textSecondary }]}>
              {yearlyProgress >= 1
                ? 'Annual goal reached!'
                : `${Math.max(0, yearlyData.targetBooks - yearlyData.booksFinished.length)} books to go`}
            </Text>
          </Pressable>
        )}

        {/* Streak Card */}
        {enabled && (
          <View style={[styles.streakCard, { backgroundColor: theme.surface }]}>
            <View style={styles.streakIconContainer}>
              <Ionicons
                name="flame"
                size={36}
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

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit modals */}
      <EditGoalModal
        visible={editingDaily}
        onClose={() => setEditingDaily(false)}
        title="Daily Reading Goal"
        value={dailyGoalMinutes}
        onSave={(val) => setDailyGoal(val)}
        unit="minutes per day"
        min={5}
        max={120}
        theme={theme}
      />

      <EditGoalModal
        visible={editingYearly}
        onClose={() => setEditingYearly(false)}
        title="Yearly Book Goal"
        value={yearlyData.targetBooks}
        onSave={(val) => setYearlyBookTarget(currentYear, val)}
        unit="books per year"
        min={1}
        max={500}
        theme={theme}
      />
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
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  toggleLabel: { fontSize: 16, fontWeight: '600' },
  toggleSub: { fontSize: 13, marginTop: 2 },

  // Goal card
  goalCard: { padding: 20, borderRadius: 16, gap: 16 },
  goalCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalCardTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
  goalCardBody: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  goalCardDetails: { flex: 1, gap: 8 },
  goalTarget: { fontSize: 16, fontWeight: '700' },
  goalDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalDetailText: { fontSize: 13 },

  // Progress ring content
  ringValue: { fontSize: 24, fontWeight: '700' },
  ringUnit: { fontSize: 11 },

  // Progress bar
  goalProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  goalProgressFill: { height: '100%', borderRadius: 3 },
  goalProgressText: { fontSize: 12, textAlign: 'center' },

  // Week view
  weekCard: { borderRadius: 12, padding: 16, gap: 12 },
  weekTitle: { fontSize: 15, fontWeight: '600' },
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalStepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInput: {
    width: 80,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  modalUnit: { fontSize: 14 },
  modalRange: { fontSize: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: { fontSize: 16, fontWeight: '600' },
});
