/**
 * useSwipeGesture Hook
 * Detects horizontal and vertical swipe gestures for page navigation.
 *
 * - Left swipe  -> next page
 * - Right swipe -> prev page
 *
 * Co-exists with tap zones: only fires when movement exceeds the swipe threshold.
 *
 * React Native version: uses GestureResponderEvent and reads the swipe
 * threshold from useThemeStore.
 */

import { useCallback, useRef } from 'react';
import { type GestureResponderEvent } from 'react-native';
import { useThemeStore } from '../stores/useThemeStore';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /** Minimum horizontal distance (px) to trigger a swipe.
   *  Falls back to useThemeStore.swipeThreshold when not provided (default 50). */
  threshold?: number;
  /** Maximum vertical movement relative to horizontal for it to count as horizontal swipe (default 0.5) */
  maxVerticalRatio?: number;
  /** Maximum horizontal movement relative to vertical for it to count as vertical swipe (default 0.5) */
  maxHorizontalRatio?: number;
  /** Enabled flag */
  enabled?: boolean;
}

export interface UseSwipeGestureReturn {
  onTouchStart: (e: GestureResponderEvent) => void;
  onTouchMove: (e: GestureResponderEvent) => void;
  onTouchEnd: (e: GestureResponderEvent) => void;
  /** The last detected swipe direction (null if none) */
  lastDirection: SwipeDirection | null;
}

export const useSwipeGesture = (options: UseSwipeGestureOptions = {}): UseSwipeGestureReturn => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold: thresholdProp,
    maxVerticalRatio = 0.5,
    maxHorizontalRatio = 0.5,
    enabled = true,
  } = options;

  const storeThreshold = useThemeStore((s) => s.swipeThreshold);
  const threshold = thresholdProp ?? storeThreshold;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  // Track whether the current touch has been identified as a vertical scroll
  const isScrollingRef = useRef(false);
  const lastDirectionRef = useRef<SwipeDirection | null>(null);

  const onTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      if (!enabled) return;
      const { pageX, pageY } = e.nativeEvent;
      touchStartRef.current = { x: pageX, y: pageY };
      isScrollingRef.current = false;
      lastDirectionRef.current = null;
    },
    [enabled]
  );

  const onTouchMove = useCallback(
    (e: GestureResponderEvent) => {
      if (!enabled || !touchStartRef.current) return;

      const { pageX, pageY } = e.nativeEvent;
      const dx = pageX - touchStartRef.current.x;
      const dy = pageY - touchStartRef.current.y;

      // If vertical movement is dominant early on, treat as scroll
      if (!isScrollingRef.current && Math.abs(dy) > Math.abs(dx) * 1.5) {
        isScrollingRef.current = true;
      }
    },
    [enabled]
  );

  const onTouchEnd = useCallback(
    (e: GestureResponderEvent) => {
      if (!enabled || !touchStartRef.current) {
        touchStartRef.current = null;
        return;
      }

      // If identified as a scroll, skip swipe detection unless vertical swipe handlers exist
      if (isScrollingRef.current && !onSwipeUp && !onSwipeDown) {
        touchStartRef.current = null;
        return;
      }

      const { pageX, pageY } = e.nativeEvent;
      const dx = pageX - touchStartRef.current.x;
      const dy = pageY - touchStartRef.current.y;

      touchStartRef.current = null;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Determine if this is a horizontal or vertical swipe
      if (absDx >= absDy) {
        // Horizontal swipe candidate
        if (absDx < threshold) return;
        if (absDy / absDx > maxVerticalRatio) return;

        if (dx < 0) {
          lastDirectionRef.current = 'left';
          onSwipeLeft?.();
        } else {
          lastDirectionRef.current = 'right';
          onSwipeRight?.();
        }
      } else {
        // Vertical swipe candidate
        if (absDy < threshold) return;
        if (absDx / absDy > maxHorizontalRatio) return;

        if (dy < 0) {
          lastDirectionRef.current = 'up';
          onSwipeUp?.();
        } else {
          lastDirectionRef.current = 'down';
          onSwipeDown?.();
        }
      }
    },
    [enabled, threshold, maxVerticalRatio, maxHorizontalRatio, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    lastDirection: lastDirectionRef.current,
  };
};

export default useSwipeGesture;
