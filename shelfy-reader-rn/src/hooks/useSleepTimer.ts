/**
 * useSleepTimer Hook
 * Manages the sleep timer interval countdown and triggers actions on expiry.
 * - Runs a 1-second interval while the timer is active in time mode
 * - Calls onExpire callback when the timer reaches zero (stop TTS, etc.)
 * - Supports "end of chapter" mode (triggers via chapter change detection)
 * - Cleans up interval on unmount
 *
 * React Native version: no DOM or Capacitor dependencies.
 */

import { useEffect, useRef } from 'react';
import { useSleepTimerStore } from '../stores/useSleepTimerStore';
import type { SleepTimerMode } from '../stores/useSleepTimerStore';

export interface UseSleepTimerOptions {
  /** Called when the timer expires (e.g., stop TTS) */
  onExpire?: () => void;
}

export interface UseSleepTimerReturn {
  isActive: boolean;
  mode: SleepTimerMode;
  remainingSeconds: number;
  totalSeconds: number;
  showWarning: boolean;
  hasExpired: boolean;
  startTimer: (minutes: number) => void;
  startEndOfChapter: () => void;
  stopTimer: () => void;
  extendTimer: (minutes: number) => void;
  /** Call when a chapter change is detected (triggers end-of-chapter expiry) */
  triggerEndOfChapter: () => void;
  dismissExpired: () => void;
  dismissWarning: () => void;
  /** Formatted remaining time string, e.g. "23:45" or "End of chapter" */
  formattedTime: string;
  /** Progress fraction 0-1 (only for time mode) */
  progressFraction: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function useSleepTimer(options: UseSleepTimerOptions = {}): UseSleepTimerReturn {
  const {
    isActive,
    mode,
    remainingSeconds,
    totalSeconds,
    showWarning,
    hasExpired,
    startTimer,
    startEndOfChapter,
    stopTimer,
    extendTimer,
    triggerEndOfChapter,
    dismissExpired,
    dismissWarning,
  } = useSleepTimerStore();

  const onExpireRef = useRef(options.onExpire);
  onExpireRef.current = options.onExpire;

  const prevHasExpiredRef = useRef(false);

  // Run interval while active (time mode only)
  useEffect(() => {
    if (!isActive || mode !== 'time') return;

    const interval = setInterval(() => {
      useSleepTimerStore.getState().tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, mode]);

  // Fire onExpire callback when timer transitions to expired
  useEffect(() => {
    if (hasExpired && !prevHasExpiredRef.current) {
      onExpireRef.current?.();
    }
    prevHasExpiredRef.current = hasExpired;
  }, [hasExpired]);

  const formattedTime =
    mode === 'end-of-chapter' && isActive
      ? 'End of chapter'
      : formatTime(remainingSeconds);

  const progressFraction =
    mode === 'time' && totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;

  return {
    isActive,
    mode,
    remainingSeconds,
    totalSeconds,
    showWarning,
    hasExpired,
    startTimer,
    startEndOfChapter,
    stopTimer,
    extendTimer,
    triggerEndOfChapter,
    dismissExpired,
    dismissWarning,
    formattedTime,
    progressFraction,
  };
}

export default useSleepTimer;
