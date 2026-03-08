import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';

interface ReadingStreakCardProps {
  enabled: boolean;
  currentStreak: number;
  longestStreak: number;
  dailyGoalMinutes: number;
  todayMinutes: number;
  todayProgress: number; // 0-1
  isTodayGoalMet: boolean;
  getNewMilestone?: () => number | null;
  acknowledgeMilestone?: (milestone: number) => void;
  checkStreak?: () => void;
}

export function ReadingStreakCard({
  enabled,
  currentStreak,
  longestStreak,
  dailyGoalMinutes,
  todayMinutes,
  todayProgress,
  isTodayGoalMet,
  getNewMilestone,
  acknowledgeMilestone,
  checkStreak,
}: ReadingStreakCardProps) {
  const { theme } = useTheme();

  // Check streak on mount
  useEffect(() => {
    checkStreak?.();
  }, [checkStreak]);

  // Check for new milestones
  useEffect(() => {
    if (getNewMilestone && acknowledgeMilestone) {
      const milestone = getNewMilestone();
      if (milestone) {
        Toast.show({
          type: 'info',
          text1: `${milestone}-day reading streak!`,
          text2: 'Keep it up!',
          position: 'top',
          visibilityTime: 4000,
        });
        acknowledgeMilestone(milestone);
      }
    }
  }, [currentStreak, getNewMilestone, acknowledgeMilestone]);

  if (!enabled) return null;

  const formatMinutes = (mins: number): string => {
    if (mins < 1) return '0 min';
    if (mins < 60) return `${Math.round(mins)} min`;
    const hours = Math.floor(mins / 60);
    const remaining = Math.round(mins % 60);
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  const progress = Math.min(todayProgress, 1);
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - progress * circumference;
  const progressPercent = Math.min(Math.round(progress * 100), 100);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: isTodayGoalMet ? theme.success : theme.border,
        },
      ]}
    >
      {/* Left: Circular progress ring */}
      <View style={styles.progressContainer}>
        <Svg width={44} height={44} viewBox="0 0 44 44">
          <Circle
            cx={22}
            cy={22}
            r={radius}
            fill="none"
            stroke={theme.border}
            strokeWidth={4}
          />
          <Circle
            cx={22}
            cy={22}
            r={radius}
            fill="none"
            stroke={isTodayGoalMet ? theme.success : theme.primary}
            strokeWidth={4}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation={-90}
            origin="22, 22"
          />
        </Svg>
        <View style={styles.progressOverlay}>
          {isTodayGoalMet ? (
            <Ionicons name="trophy-outline" size={16} color={theme.success} />
          ) : (
            <Text style={[styles.progressPercent, { color: theme.text }]}>
              {progressPercent}
            </Text>
          )}
        </View>
      </View>

      {/* Center: Today's reading info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.todayLabel, { color: theme.text }]}>
          {isTodayGoalMet
            ? 'Goal reached!'
            : `${formatMinutes(todayMinutes)} of ${formatMinutes(dailyGoalMinutes)}`}
        </Text>
        <View style={styles.streakRow}>
          {currentStreak > 0 ? (
            <>
              <Ionicons name="flame" size={14} color={theme.warning} />
              <Text
                style={[styles.streakText, { color: theme.textSecondary }]}
              >
                {currentStreak} day streak
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="flame-outline"
                size={14}
                color={theme.textMuted}
              />
              <Text
                style={[styles.streakText, { color: theme.textSecondary }]}
              >
                Start your streak!
              </Text>
            </>
          )}
          {longestStreak > currentStreak && (
            <Text style={[styles.bestStreak, { color: theme.textMuted }]}>
              {' \u00B7 '}Best: {longestStreak}d
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  progressContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoContainer: {
    flex: 1,
  },
  todayLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  streakText: {
    fontSize: 12,
  },
  bestStreak: {
    fontSize: 12,
  },
});

export default ReadingStreakCard;
