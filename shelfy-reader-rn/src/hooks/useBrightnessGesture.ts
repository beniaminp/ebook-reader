/**
 * useBrightnessGesture Hook
 * Controls screen brightness via vertical touch drag on the left edge of the screen.
 *
 * - Drag up/down on left 15% of screen width to adjust brightness
 * - Uses expo-brightness for native screen brightness control
 * - Returns gesture handlers compatible with React Native's gesture system
 *
 * React Native version: uses expo-brightness instead of @capacitor-community/screen-brightness.
 * Returns raw gesture data instead of ReactNode overlay (UI rendered by consumer).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Dimensions } from 'react-native';
import * as Brightness from 'expo-brightness';

export interface UseBrightnessGestureOptions {
  /** Width fraction of the left edge zone (default 0.15) */
  leftEdgeZone?: number;
  /** Minimum vertical movement (px) to detect as brightness drag (default 20) */
  minDragDistance?: number;
  /** Enabled flag */
  enabled?: boolean;
}

export interface UseBrightnessGestureReturn {
  /** Current brightness level (0-1) */
  brightness: number;
  /** Whether brightness overlay is visible */
  isDragging: boolean;
  /** Brightness percentage (0-100) for display */
  brightnessPercent: number;
  /** Touch start handler - call with { x, y } of the touch */
  onTouchStart: (x: number, y: number) => void;
  /** Touch move handler - call with { x, y } of the touch */
  onTouchMove: (x: number, y: number) => void;
  /** Touch end handler */
  onTouchEnd: () => void;
  /** Whether the last touch was a brightness drag (for coordination with tap zones) */
  wasBrightnessDrag: boolean;
  /** Reset the brightness drag flag */
  resetBrightnessDragFlag: () => void;
}

export const useBrightnessGesture = (
  options: UseBrightnessGestureOptions = {}
): UseBrightnessGestureReturn => {
  const {
    leftEdgeZone = 0.15,
    minDragDistance = 20,
    enabled = true,
  } = options;

  const [brightness, setBrightnessState] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [wasBrightnessDrag, setWasBrightnessDrag] = useState(false);

  // Refs to track gesture state
  const gestureStartRef = useRef<{
    x: number;
    y: number;
    brightness: number;
  } | null>(null);

  const isBrightnessGestureRef = useRef(false);
  const currentBrightnessRef = useRef(1);

  // Update ref when brightness changes
  useEffect(() => {
    currentBrightnessRef.current = brightness;
  }, [brightness]);

  // Get initial brightness on mount
  useEffect(() => {
    const getInitialBrightness = async () => {
      try {
        const initialBrightness = await Brightness.getBrightnessAsync();
        setBrightnessState(initialBrightness);
        currentBrightnessRef.current = initialBrightness;
      } catch {
        // Default to 1 if unavailable
        setBrightnessState(1);
        currentBrightnessRef.current = 1;
      }
    };

    if (enabled) {
      getInitialBrightness();
    }
  }, [enabled]);

  // Apply brightness (native)
  const applyBrightness = useCallback(async (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setBrightnessState(clamped);
    currentBrightnessRef.current = clamped;

    try {
      await Brightness.setBrightnessAsync(clamped);
    } catch {
      // Silently fail if brightness control is unavailable
    }
  }, []);

  const onTouchStart = useCallback((x: number, y: number) => {
    if (!enabled) return;

    const { width } = Dimensions.get('window');
    const relativeX = x / width;

    // Only activate in left edge zone
    if (relativeX < leftEdgeZone) {
      gestureStartRef.current = {
        x,
        y,
        brightness: currentBrightnessRef.current,
      };
      isBrightnessGestureRef.current = false;
    }
  }, [enabled, leftEdgeZone]);

  const onTouchMove = useCallback((x: number, y: number) => {
    if (!enabled || !gestureStartRef.current) return;

    const dy = Math.abs(y - gestureStartRef.current.y);

    // Check if we've moved vertically enough to consider this a brightness gesture
    if (!isBrightnessGestureRef.current && dy > minDragDistance) {
      isBrightnessGestureRef.current = true;
      setIsDragging(true);
    }

    if (!isBrightnessGestureRef.current) return;

    // Calculate brightness change based on vertical movement
    const { height } = Dimensions.get('window');
    const deltaY = gestureStartRef.current.y - y; // Up = positive = brighter

    // Map vertical movement to brightness change
    const brightnessDelta = deltaY / height;
    const newBrightness = gestureStartRef.current.brightness + brightnessDelta;

    applyBrightness(newBrightness);
  }, [enabled, minDragDistance, applyBrightness]);

  const onTouchEnd = useCallback(() => {
    if (!enabled) return;

    if (isBrightnessGestureRef.current) {
      setWasBrightnessDrag(true);
    }

    // Reset gesture state
    gestureStartRef.current = null;
    isBrightnessGestureRef.current = false;
    setIsDragging(false);
  }, [enabled]);

  const resetBrightnessDragFlag = useCallback(() => {
    setWasBrightnessDrag(false);
  }, []);

  return {
    brightness,
    isDragging,
    brightnessPercent: Math.round(brightness * 100),
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    wasBrightnessDrag,
    resetBrightnessDragFlag,
  };
};

export default useBrightnessGesture;
