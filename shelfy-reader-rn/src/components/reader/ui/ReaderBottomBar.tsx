import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { formatPercentage } from '../../../utils/formatUtils';
import type { ReaderProgress } from '../engines/types';

interface ReaderBottomBarProps {
  visible: boolean;
  progress: ReaderProgress | null;
  onSliderChange?: (value: number) => void;
}

export function ReaderBottomBar({
  visible,
  progress,
  onSliderChange,
}: ReaderBottomBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(visible ? 0 : 120);

  React.useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 120, { duration: 200 });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          backgroundColor: theme.background + 'F0',
          paddingBottom: insets.bottom + 8,
          borderTopColor: theme.border,
        },
      ]}
    >
      {progress && (
        <>
          <View style={styles.progressRow}>
            <Text style={[styles.pageText, { color: theme.textSecondary }]}>
              {progress.current} / {progress.total}
            </Text>
            <Text style={[styles.pageText, { color: theme.textSecondary }]}>
              {formatPercentage(progress.fraction)}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.primary,
                  width: `${Math.min(progress.fraction * 100, 100)}%`,
                },
              ]}
            />
          </View>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pageText: {
    fontSize: 13,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
