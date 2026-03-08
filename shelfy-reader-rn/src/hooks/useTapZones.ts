/**
 * useTapZones Hook
 * Divides the screen into configurable tap zones for touch-based navigation.
 *
 * Default zones:
 *  - Left third  -> previous page
 *  - Right third -> next page
 *  - Center      -> toggle toolbar
 *  - Upper-right corner -> toggle bookmark
 *
 * React Native version: uses GestureResponderEvent and Dimensions
 * instead of web DOM touch events.
 */

import { useCallback, useRef } from 'react';
import { Dimensions, type GestureResponderEvent } from 'react-native';
import { useThemeStore } from '../stores/useThemeStore';

export type TapZoneAction = 'prev' | 'next' | 'toggle-toolbar' | 'bookmark' | 'none';

export interface TapZoneConfig {
  /** Left zone boundary as fraction of total width (default 0.33) */
  leftBoundary?: number;
  /** Right zone boundary as fraction of total width (default 0.67) */
  rightBoundary?: number;
  /** Upper-right bookmark zone: min relative X (default 0.80) */
  bookmarkMinX?: number;
  /** Upper-right bookmark zone: max relative Y (default 0.12) */
  bookmarkMaxY?: number;
  leftAction?: TapZoneAction;
  centerAction?: TapZoneAction;
  rightAction?: TapZoneAction;
}

export interface UseTapZonesOptions {
  onPrev?: () => void;
  onNext?: () => void;
  onToggleToolbar?: () => void;
  onToggleBookmark?: () => void;
  config?: TapZoneConfig;
  /** Maximum movement in px that still counts as a tap (not a swipe).
   *  Falls back to useThemeStore.tapSensitivity when not provided. */
  maxTapMovement?: number;
  /** Enabled flag - set to false to disable tap zones */
  enabled?: boolean;
  /** Optional callback to check if brightness gesture was active (to skip left-zone tap) */
  wasBrightnessDrag?: () => boolean;
  /** Optional callback to reset brightness drag flag after checking */
  resetBrightnessDragFlag?: () => void;
}

export interface UseTapZonesReturn {
  onTouchStart: (e: GestureResponderEvent) => void;
  onTouchEnd: (e: GestureResponderEvent) => void;
}

const DEFAULT_CONFIG: Required<TapZoneConfig> = {
  leftBoundary: 0.33,
  rightBoundary: 0.67,
  bookmarkMinX: 0.80,
  bookmarkMaxY: 0.12,
  leftAction: 'prev',
  centerAction: 'toggle-toolbar',
  rightAction: 'next',
};

export const useTapZones = (options: UseTapZonesOptions = {}): UseTapZonesReturn => {
  const {
    onPrev,
    onNext,
    onToggleToolbar,
    onToggleBookmark,
    config = {},
    maxTapMovement: maxTapMovementProp,
    enabled = true,
    wasBrightnessDrag,
    resetBrightnessDragFlag,
  } = options;

  const tapSensitivity = useThemeStore((s) => s.tapSensitivity);
  const maxTapMovement = maxTapMovementProp ?? tapSensitivity;

  const mergedConfig: Required<TapZoneConfig> = { ...DEFAULT_CONFIG, ...config };

  // Track touch start position to distinguish taps from swipes
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const onTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      if (!enabled) return;
      const { pageX, pageY } = e.nativeEvent;
      touchStartRef.current = { x: pageX, y: pageY, time: Date.now() };
    },
    [enabled]
  );

  const onTouchEnd = useCallback(
    (e: GestureResponderEvent) => {
      if (!enabled || !touchStartRef.current) return;

      const { pageX, pageY } = e.nativeEvent;
      const dx = Math.abs(pageX - touchStartRef.current.x);
      const dy = Math.abs(pageY - touchStartRef.current.y);

      touchStartRef.current = null;

      // If the finger moved too much it's a swipe, not a tap
      if (dx > maxTapMovement || dy > maxTapMovement) return;

      const { width, height } = Dimensions.get('window');
      const relativeX = pageX / width;
      const relativeY = pageY / height;

      // Check if brightness gesture was active (particularly for left edge)
      const isBrightnessDragActive = wasBrightnessDrag?.();
      if (isBrightnessDragActive) {
        resetBrightnessDragFlag?.();
        return;
      }

      // Upper-right corner -> bookmark toggle
      if (
        relativeX > mergedConfig.bookmarkMinX &&
        relativeY < mergedConfig.bookmarkMaxY &&
        onToggleBookmark
      ) {
        onToggleBookmark();
        return;
      }

      let action: TapZoneAction;
      if (relativeX < mergedConfig.leftBoundary) {
        action = mergedConfig.leftAction;
      } else if (relativeX > mergedConfig.rightBoundary) {
        action = mergedConfig.rightAction;
      } else {
        action = mergedConfig.centerAction;
      }

      switch (action) {
        case 'prev':
          onPrev?.();
          break;
        case 'next':
          onNext?.();
          break;
        case 'toggle-toolbar':
          onToggleToolbar?.();
          break;
        case 'bookmark':
          onToggleBookmark?.();
          break;
        default:
          break;
      }
    },
    [
      enabled,
      maxTapMovement,
      mergedConfig,
      onPrev,
      onNext,
      onToggleToolbar,
      onToggleBookmark,
      wasBrightnessDrag,
      resetBrightnessDragFlag,
    ]
  );

  return { onTouchStart, onTouchEnd };
};

export default useTapZones;
