/**
 * useTapZones Hook
 * Divides the screen into configurable tap zones for touch-based navigation.
 *
 * Default zones:
 *  - Left third  → previous page
 *  - Right third → next page
 *  - Center      → toggle toolbar
 */

import { useCallback, useRef } from 'react';

export type TapZoneAction = 'prev' | 'next' | 'toggle-toolbar' | 'none';

export interface TapZoneConfig {
  /** Left zone boundary as fraction of total width (default 0.33) */
  leftBoundary?: number;
  /** Right zone boundary as fraction of total width (default 0.67) */
  rightBoundary?: number;
  leftAction?: TapZoneAction;
  centerAction?: TapZoneAction;
  rightAction?: TapZoneAction;
}

export interface UseTapZonesOptions {
  onPrev?: () => void;
  onNext?: () => void;
  onToggleToolbar?: () => void;
  config?: TapZoneConfig;
  /** Maximum movement in px that still counts as a tap (not a swipe) */
  maxTapMovement?: number;
  /** Enabled flag – set to false to disable tap zones */
  enabled?: boolean;
  /** Optional callback to check if brightness gesture was active (to skip left-zone tap) */
  wasBrightnessDrag?: () => boolean;
  /** Optional callback to reset brightness drag flag after checking */
  resetBrightnessDragFlag?: () => void;
}

export interface UseTapZonesReturn {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

const DEFAULT_CONFIG: Required<TapZoneConfig> = {
  leftBoundary: 0.33,
  rightBoundary: 0.67,
  leftAction: 'prev',
  centerAction: 'toggle-toolbar',
  rightAction: 'next',
};

export const useTapZones = (options: UseTapZonesOptions = {}): UseTapZonesReturn => {
  const {
    onPrev,
    onNext,
    onToggleToolbar,
    config = {},
    maxTapMovement = 10,
    enabled = true,
    wasBrightnessDrag,
    resetBrightnessDragFlag,
  } = options;

  const mergedConfig: Required<TapZoneConfig> = { ...DEFAULT_CONFIG, ...config };

  // Track touch start position to distinguish taps from swipes
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const touch = e.changedTouches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [enabled]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const dx = Math.abs(touch.clientX - touchStartRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);

      touchStartRef.current = null;

      // If the finger moved too much it's a swipe, not a tap
      if (dx > maxTapMovement || dy > maxTapMovement) return;

      const containerWidth = (e.currentTarget as HTMLElement).offsetWidth;
      const relativeX = touch.clientX / containerWidth;

      // Check if brightness gesture was active (particularly for left edge)
      const isBrightnessDragActive = wasBrightnessDrag?.();
      if (isBrightnessDragActive) {
        resetBrightnessDragFlag?.();
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
      wasBrightnessDrag,
      resetBrightnessDragFlag,
    ]
  );

  return { onTouchStart, onTouchEnd };
};

export default useTapZones;
