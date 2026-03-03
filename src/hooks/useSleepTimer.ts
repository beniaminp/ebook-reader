/**
 * useSleepTimer Hook
 * Manages the sleep timer interval countdown and triggers actions on expiry.
 * - Runs a 1-second interval while the timer is active
 * - Calls onExpire callback when the timer reaches zero (stop TTS, etc.)
 * - Cleans up interval on unmount
 */

import { useEffect, useRef } from 'react';
import { useSleepTimerStore } from '../stores/useSleepTimerStore';

export interface UseSleepTimerOptions {
  /** Called when the timer expires (e.g., stop TTS) */
  onExpire?: () => void;
}

export interface UseSleepTimerReturn {
  isActive: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  showWarning: boolean;
  hasExpired: boolean;
  startTimer: (minutes: number) => void;
  stopTimer: () => void;
  extendTimer: (minutes: number) => void;
  dismissExpired: () => void;
  dismissWarning: () => void;
  /** Formatted remaining time string, e.g. "23:45" */
  formattedTime: string;
  /** Progress fraction 0-1 */
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
    remainingSeconds,
    totalSeconds,
    showWarning,
    hasExpired,
    startTimer,
    stopTimer,
    extendTimer,
    dismissExpired,
    dismissWarning,
  } = useSleepTimerStore();

  const onExpireRef = useRef(options.onExpire);
  onExpireRef.current = options.onExpire;

  const prevHasExpiredRef = useRef(false);

  // Run interval while active
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      useSleepTimerStore.getState().tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Fire onExpire callback when timer transitions to expired
  useEffect(() => {
    if (hasExpired && !prevHasExpiredRef.current) {
      onExpireRef.current?.();
    }
    prevHasExpiredRef.current = hasExpired;
  }, [hasExpired]);

  const formattedTime = formatTime(remainingSeconds);
  const progressFraction = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;

  return {
    isActive,
    remainingSeconds,
    totalSeconds,
    showWarning,
    hasExpired,
    startTimer,
    stopTimer,
    extendTimer,
    dismissExpired,
    dismissWarning,
    formattedTime,
    progressFraction,
  };
}

export default useSleepTimer;
