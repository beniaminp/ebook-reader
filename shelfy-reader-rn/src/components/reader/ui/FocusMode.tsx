/**
 * FocusMode Component
 *
 * Dims the top and bottom portions of the screen, leaving a clear
 * "spotlight" band in the center for focused reading.
 *
 * Features:
 * - Two semi-transparent overlays (top and bottom) with a clear band between
 * - Configurable dimming opacity (10-80%)
 * - Reads settings from useThemeStore (focusMode, focusModeSettings)
 * - Non-interactive overlays (pointerEvents="none") so reading gestures pass through
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useThemeStore } from '../../../stores/useThemeStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * The spotlight band sits in the middle third of the screen by default.
 * Top overlay: 0 to ~38% of screen
 * Clear band: ~38% to ~62% of screen
 * Bottom overlay: ~62% to 100% of screen
 */
const SPOTLIGHT_TOP_RATIO = 0.38;
const SPOTLIGHT_BOTTOM_RATIO = 0.62;

interface FocusModeProps {
  /** Override enabled state from store */
  enabled?: boolean;
}

export function FocusMode({ enabled: propsEnabled }: FocusModeProps) {
  const { focusMode: storeEnabled, focusModeSettings } = useThemeStore();

  const enabled = propsEnabled ?? (storeEnabled && focusModeSettings.enabled);

  if (!enabled) return null;

  // Clamp opacity between 10-80%, convert to 0-1 range
  const dimOpacity = Math.min(0.8, Math.max(0.1, focusModeSettings.opacity / 100));

  const topHeight = SCREEN_HEIGHT * SPOTLIGHT_TOP_RATIO;
  const bottomHeight = SCREEN_HEIGHT * (1 - SPOTLIGHT_BOTTOM_RATIO);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.container}
      pointerEvents="none"
    >
      {/* Top dim overlay */}
      <View
        style={[
          styles.overlay,
          styles.topOverlay,
          {
            height: topHeight,
            backgroundColor: `rgba(0, 0, 0, ${dimOpacity})`,
          },
        ]}
      />

      {/* Bottom dim overlay */}
      <View
        style={[
          styles.overlay,
          styles.bottomOverlay,
          {
            height: bottomHeight,
            backgroundColor: `rgba(0, 0, 0, ${dimOpacity})`,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  topOverlay: {
    top: 0,
  },
  bottomOverlay: {
    bottom: 0,
  },
});

export default FocusMode;
