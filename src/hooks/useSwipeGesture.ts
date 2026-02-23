/**
 * useSwipeGesture Hook
 * Detects horizontal swipe gestures for page navigation.
 *
 * - Left swipe  → next page
 * - Right swipe → prev page
 *
 * Uses raw touch events so it works everywhere without Ionic Gesture dependency.
 * Co-exists with tap zones: only fires when movement exceeds the swipe threshold.
 */

import { useCallback, useRef } from 'react';

export interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal distance (px) to trigger a swipe (default 50) */
  threshold?: number;
  /** Maximum vertical movement relative to horizontal for it to count as horizontal swipe (default 0.5) */
  maxVerticalRatio?: number;
  /** Enabled flag */
  enabled?: boolean;
}

export interface UseSwipeGestureReturn {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export const useSwipeGesture = (options: UseSwipeGestureOptions = {}): UseSwipeGestureReturn => {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    maxVerticalRatio = 0.5,
    enabled = true,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  // Track whether the current touch has been identified as a vertical scroll
  const isScrollingRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    const touch = e.changedTouches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isScrollingRef.current = false;
  }, [enabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // If vertical movement is dominant early on, treat as scroll
    if (!isScrollingRef.current && Math.abs(dy) > Math.abs(dx) * 1.5) {
      isScrollingRef.current = true;
    }
  }, [enabled]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current || isScrollingRef.current) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    touchStartRef.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Must meet horizontal threshold and not be too vertical
    if (absDx < threshold) return;
    if (absDy / absDx > maxVerticalRatio) return;

    if (dx < 0) {
      // Swipe left → next page
      onSwipeLeft?.();
    } else {
      // Swipe right → previous page
      onSwipeRight?.();
    }
  }, [enabled, threshold, maxVerticalRatio, onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchMove, onTouchEnd };
};

export default useSwipeGesture;
