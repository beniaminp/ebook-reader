import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface EarnedBadge {
  id: string;
  name: string;
  icon: string;
  progress: number; // 0 to 1
  earnedAt: Date;
}

interface ReadingBadgesProps {
  badges: EarnedBadge[];
}

export function ReadingBadges({ badges }: ReadingBadgesProps) {
  const { theme } = useTheme();

  const earned = badges.filter((b) => b.progress >= 1);
  const inProgress = badges.filter((b) => b.progress < 1);

  const formatDate = (date: Date): string => {
    if (date.getTime() === 0) return '';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatProgress = (badge: EarnedBadge): string => {
    const pct = Math.round(badge.progress * 100);
    return `${pct}%`;
  };

  if (badges.length === 0) {
    return (
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          No badges yet
        </Text>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          Start reading to earn your first badge!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Earned badges */}
      {earned.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Earned
          </Text>
          <View style={styles.grid}>
            {earned.map((badge) => (
              <View
                key={badge.id}
                style={[styles.badgeItem, { backgroundColor: theme.surface }]}
              >
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                <Text
                  numberOfLines={2}
                  style={[styles.badgeName, { color: theme.text }]}
                >
                  {badge.name}
                </Text>
                <Text style={[styles.badgeDate, { color: theme.textMuted }]}>
                  {formatDate(badge.earnedAt)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* In progress badges */}
      {inProgress.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            In Progress
          </Text>
          <View style={styles.grid}>
            {inProgress.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeItem,
                  styles.badgeItemLocked,
                  { backgroundColor: theme.surface },
                ]}
              >
                <Text style={[styles.badgeIcon, styles.badgeIconLocked]}>
                  {badge.icon}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.badgeName, { color: theme.textSecondary }]}
                >
                  {badge.name}
                </Text>
                <Text
                  style={[
                    styles.progressLabel,
                    { color: theme.primary },
                  ]}
                >
                  {formatProgress(badge)}
                </Text>
                <View
                  style={[
                    styles.progressBarBg,
                    { backgroundColor: theme.border },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: theme.primary,
                        width: `${Math.round(badge.progress * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  section: {
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    width: 100,
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  badgeItemLocked: {
    opacity: 0.7,
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  badgeIconLocked: {
    opacity: 0.5,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDate: {
    fontSize: 10,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default ReadingBadges;
