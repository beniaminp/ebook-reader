/**
 * useBrightnessGesture Hook
 * Controls screen brightness via vertical touch drag on the left edge of the screen.
 *
 * - Drag up/down on left 15% of screen width to adjust brightness
 * - Shows vertical brightness indicator overlay with sun icon during drag
 * - Native: uses @capacitor-community/screen-brightness
 * - Web fallback: uses CSS filter: brightness() on a provided content ref
 */

import { useState, useRef, useCallback, ReactNode, useEffect } from 'react';
import { ScreenBrightness } from '@capacitor-community/screen-brightness';

export interface UseBrightnessGestureOptions {
  /** Width fraction of the left edge zone (default 0.15) */
  leftEdgeZone?: number;
  /** Minimum vertical movement (px) to detect as brightness drag (default 20) */
  minDragDistance?: number;
  /** Content div ref for web fallback brightness application */
  contentRef?: React.RefObject<HTMLDivElement | null>;
  /** Enabled flag */
  enabled?: boolean;
}

export interface UseBrightnessGestureReturn {
  /** Current brightness level (0-1) */
  brightness: number;
  /** Whether brightness overlay is visible */
  isDragging: boolean;
  /** Touch start handler */
  onTouchStart: (e: React.TouchEvent) => void;
  /** Touch move handler */
  onTouchMove: (e: React.TouchEvent) => void;
  /** Touch end handler */
  onTouchEnd: (e: React.TouchEvent) => void;
  /** Brightness indicator overlay component */
  brightnessOverlay: ReactNode;
  /** Whether the last touch was a brightness drag (for coordination with tap zones) */
  wasBrightnessDrag: boolean;
  /** Reset the brightness drag flag */
  resetBrightnessDragFlag: () => void;
}

const BrightnessIndicator: React.FC<{
  brightness: number;
  visible: boolean;
}> = ({ brightness, visible }) => {
  if (!visible) return null;

  // Calculate percentage for visual display
  const percent = Math.round(brightness * 100);

  return (
    <div
      className="brightness-indicator-overlay"
      style={{
        position: 'fixed',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {/* Sun icon */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: 'var(--ion-color-primary, #3880ff)' }}
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>

      {/* Progress bar */}
      <div
        style={{
          width: '8px',
          height: '200px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '4px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${percent}%`,
            backgroundColor: 'var(--ion-color-primary, #3880ff)',
            borderRadius: '4px',
            transition: 'height 0.05s ease-out',
          }}
        />
      </div>

      {/* Percentage text */}
      <div
        style={{
          color: 'var(--ion-color-primary, #3880ff)',
          fontSize: '14px',
          fontWeight: '600',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '4px 8px',
          borderRadius: '4px',
        }}
      >
        {percent}%
      </div>
    </div>
  );
};

export const useBrightnessGesture = (
  options: UseBrightnessGestureOptions = {}
): UseBrightnessGestureReturn => {
  const {
    leftEdgeZone = 0.15,
    minDragDistance = 20,
    contentRef,
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
        const result = await ScreenBrightness.getBrightness();
        const initialBrightness = result.brightness;
        setBrightnessState(initialBrightness);
        currentBrightnessRef.current = initialBrightness;
      } catch {
        // Might not be available on web, default to 1
        setBrightnessState(1);
        currentBrightnessRef.current = 1;
      }
    };

    if (enabled) {
      getInitialBrightness();
    }
  }, [enabled]);

  // Apply brightness (native or web fallback)
  const applyBrightness = useCallback(async (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setBrightnessState(clamped);
    currentBrightnessRef.current = clamped;

    try {
      await ScreenBrightness.setBrightness({ brightness: clamped });
    } catch {
      // Web fallback: apply CSS filter to content
      if (contentRef?.current) {
        // Map 0-1 to 0.2-1.5 range for CSS filter brightness
        // 0 -> 0.2 (very dim), 0.5 -> 1 (normal), 1 -> 1.5 (bright)
        const filterValue = 0.2 + clamped * 1.3;
        contentRef.current.style.filter = `brightness(${filterValue})`;
      }
    }
  }, [contentRef]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    const containerWidth = (e.currentTarget as HTMLElement).offsetWidth;
    const relativeX = touch.clientX / containerWidth;

    // Only activate in left edge zone
    if (relativeX < leftEdgeZone) {
      gestureStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        brightness: currentBrightnessRef.current,
      };
      isBrightnessGestureRef.current = false;
    }
  }, [enabled, leftEdgeZone]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !gestureStartRef.current) return;

    const touch = e.touches[0];
    const dy = Math.abs(touch.clientY - gestureStartRef.current.y);

    // Check if we've moved vertically enough to consider this a brightness gesture
    if (!isBrightnessGestureRef.current && dy > minDragDistance) {
      isBrightnessGestureRef.current = true;
      setIsDragging(true);
    }

    if (!isBrightnessGestureRef.current) return;

    // Calculate brightness change based on vertical movement
    const containerHeight = window.innerHeight;
    const deltaY = gestureStartRef.current.y - touch.clientY; // Negative = up, Positive = down

    // Map vertical movement to brightness change
    // Moving up decreases brightness, moving down increases it
    // Use full container height for the range
    const brightnessDelta = deltaY / containerHeight;
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

  const brightnessOverlay = (
    <BrightnessIndicator
      brightness={brightness}
      visible={isDragging}
    />
  );

  return {
    brightness,
    isDragging,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    brightnessOverlay,
    wasBrightnessDrag,
    resetBrightnessDragFlag,
  };
};

export default useBrightnessGesture;
