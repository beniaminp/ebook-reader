/**
 * ReadingRuler Component
 *
 * A horizontal highlight line overlay that follows the user's touch position
 * or stays fixed at a tapped location. Helps readers track their current line.
 *
 * Features:
 * - Configurable height (1-4 lines)
 * - Configurable opacity (10-100%)
 * - Configurable color (accent/yellow/green/blue/pink/red)
 * - Follows touch movement, hides after 2s of inactivity
 * - Reads settings from useThemeStore (readingRuler, readingRulerSettings)
 * - Rendered as an absolute-positioned View overlaying the reader
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { useThemeStore } from '../../../stores/useThemeStore';
import type { RulerColor } from '../../../services/themeService';

/** Color map for ruler color options */
const RULER_COLORS: Record<RulerColor, string> = {
  accent: '', // resolved dynamically from theme
  yellow: 'rgba(255, 220, 0, 0.6)',
  green: 'rgba(76, 175, 80, 0.6)',
  blue: 'rgba(33, 150, 243, 0.6)',
  pink: 'rgba(233, 30, 99, 0.6)',
  red: 'rgba(244, 67, 54, 0.6)',
};

interface ReadingRulerProps {
  /** Override enabled state from store */
  enabled?: boolean;
}

export function ReadingRuler({ enabled: propsEnabled }: ReadingRulerProps) {
  const { theme } = useTheme();
  const { readingRuler: storeEnabled, readingRulerSettings } = useThemeStore();

  const enabled = propsEnabled ?? (storeEnabled || readingRulerSettings.enabled);

  const [position, setPosition] = useState<number | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rulerOpacity = useSharedValue(0);

  // Resolve color
  const resolveColor = useCallback(
    (color: RulerColor): string => {
      if (color === 'accent') return theme.readerAccent;
      return RULER_COLORS[color] || theme.readerAccent;
    },
    [theme.readerAccent]
  );

  const scheduleHide = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      rulerOpacity.value = withTiming(0, { duration: 300 });
    }, 2000);
  }, []);

  const showRuler = useCallback(
    (y: number) => {
      setPosition(y);
      rulerOpacity.value = withTiming(1, { duration: 150 });
      scheduleHide();
    },
    [scheduleHide]
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  // PanResponder to track touch position
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => false,
      // We use onStartShouldSetPanResponderCapture so the ruler doesn't
      // steal touches from the reader below. Instead, we use a transparent
      // overlay approach with pointerEvents="box-none".
    })
  ).current;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: rulerOpacity.value,
  }));

  if (!enabled) return null;

  const height = readingRulerSettings.height;
  const opacity = readingRulerSettings.opacity / 100;
  const color = resolveColor(readingRulerSettings.color);

  // Height in pixels: each "line" is ~24px (font size * line height approx)
  const rulerHeightPx = height * 24;

  return (
    <View
      style={styles.touchArea}
      pointerEvents="box-none"
      onTouchStart={(e) => showRuler(e.nativeEvent.pageY)}
      onTouchMove={(e) => showRuler(e.nativeEvent.pageY)}
    >
      {position !== null && (
        <Animated.View
          style={[
            styles.ruler,
            animatedStyle,
            {
              top: position - rulerHeightPx / 2,
              height: rulerHeightPx,
              backgroundColor: color,
              opacity: opacity,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  ruler: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 2,
  },
});

export default ReadingRuler;
