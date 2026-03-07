/**
 * Sleep Timer Store
 * Manages sleep timer state for auto-stopping reading sessions.
 * Supports both time-based timers and "end of chapter" mode.
 * No persistence -- timer resets on app restart.
 */

import { create } from 'zustand';

export type SleepTimerMode = 'time' | 'end-of-chapter';

export interface SleepTimerState {
  /** Whether the timer is currently running */
  isActive: boolean;
  /** Timer mode: countdown or end-of-chapter */
  mode: SleepTimerMode;
  /** Remaining seconds on the timer (only for time mode) */
  remainingSeconds: number;
  /** Total seconds the timer was started with (only for time mode) */
  totalSeconds: number;
  /** Whether to show the "about to expire" warning (1 min remaining) */
  showWarning: boolean;
  /** Whether the timer has expired (triggers dimming overlay) */
  hasExpired: boolean;

  // Actions
  startTimer: (minutes: number) => void;
  startEndOfChapter: () => void;
  stopTimer: () => void;
  extendTimer: (minutes: number) => void;
  tick: () => void;
  /** Called when a chapter change is detected while in end-of-chapter mode */
  triggerEndOfChapter: () => void;
  dismissExpired: () => void;
  dismissWarning: () => void;
}

export const useSleepTimerStore = create<SleepTimerState>((set, get) => ({
  isActive: false,
  mode: 'time',
  remainingSeconds: 0,
  totalSeconds: 0,
  showWarning: false,
  hasExpired: false,

  startTimer: (minutes: number) => {
    const totalSeconds = minutes * 60;
    set({
      isActive: true,
      mode: 'time',
      remainingSeconds: totalSeconds,
      totalSeconds,
      showWarning: false,
      hasExpired: false,
    });
  },

  startEndOfChapter: () => {
    set({
      isActive: true,
      mode: 'end-of-chapter',
      remainingSeconds: 0,
      totalSeconds: 0,
      showWarning: false,
      hasExpired: false,
    });
  },

  stopTimer: () => {
    set({
      isActive: false,
      mode: 'time',
      remainingSeconds: 0,
      totalSeconds: 0,
      showWarning: false,
      hasExpired: false,
    });
  },

  extendTimer: (minutes: number) => {
    const state = get();
    const additionalSeconds = minutes * 60;
    set({
      isActive: true,
      mode: 'time',
      remainingSeconds: state.remainingSeconds + additionalSeconds,
      totalSeconds: state.totalSeconds + additionalSeconds,
      showWarning: false,
      hasExpired: false,
    });
  },

  tick: () => {
    const state = get();
    // Only tick for time-based timers
    if (!state.isActive || state.mode !== 'time' || state.remainingSeconds <= 0) return;

    const newRemaining = state.remainingSeconds - 1;

    if (newRemaining <= 0) {
      // Timer expired
      set({
        isActive: false,
        remainingSeconds: 0,
        showWarning: false,
        hasExpired: true,
      });
    } else if (newRemaining <= 60 && !state.showWarning) {
      // Show warning at 1 minute remaining
      set({
        remainingSeconds: newRemaining,
        showWarning: true,
      });
    } else {
      set({
        remainingSeconds: newRemaining,
      });
    }
  },

  triggerEndOfChapter: () => {
    const state = get();
    if (!state.isActive || state.mode !== 'end-of-chapter') return;
    // Trigger expiry
    set({
      isActive: false,
      remainingSeconds: 0,
      showWarning: false,
      hasExpired: true,
    });
  },

  dismissExpired: () => {
    set({
      hasExpired: false,
      totalSeconds: 0,
    });
  },

  dismissWarning: () => {
    set({
      showWarning: false,
    });
  },
}));
