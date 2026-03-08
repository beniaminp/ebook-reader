/**
 * TimeLeftDisplay Component
 *
 * A small floating display showing estimated time left in the current
 * chapter or book, positioned at the bottom-right of the reader.
 *
 * Calculates remaining time based on current page, total pages,
 * and an estimated reading speed (pages per minute).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';

interface TimeLeftDisplayProps {
  /** Current page number (1-based) */
  currentPage: number;
  /** Total pages in chapter or book */
  totalPages: number;
  /** Reading speed in pages per minute (default: 1) */
  readingSpeed?: number;
  /** Whether to show "in book" instead of "in chapter" */
  isBookLevel?: boolean;
  /** Whether to display the component */
  visible?: boolean;
}

/**
 * Format minutes into a human-readable string.
 * e.g. 5 -> "5 min", 90 -> "1 hr 30 min", 125 -> "2 hr 5 min"
 */
function formatTimeLeft(totalMinutes: number): string {
  if (totalMinutes <= 0) return '< 1 min';
  if (totalMinutes < 1) return '< 1 min';

  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);

  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export function TimeLeftDisplay({
  currentPage,
  totalPages,
  readingSpeed = 1,
  isBookLevel = false,
  visible = true,
}: TimeLeftDisplayProps) {
  const { theme } = useTheme();

  if (!visible || totalPages <= 0 || currentPage < 0) return null;

  const pagesRemaining = Math.max(0, totalPages - currentPage);
  const effectiveSpeed = Math.max(0.1, readingSpeed);
  const minutesLeft = pagesRemaining / effectiveSpeed;

  const label = isBookLevel ? 'left in book' : 'left in chapter';
  const timeText = formatTimeLeft(minutesLeft);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.container,
        { backgroundColor: theme.surface + 'CC' },
      ]}
      pointerEvents="none"
    >
      <Text
        style={[styles.text, { color: theme.textSecondary }]}
        numberOfLines={1}
      >
        {timeText} {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});

export default TimeLeftDisplay;
