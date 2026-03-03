/**
 * Sleep Timer Store
 * Manages sleep timer state for auto-stopping reading sessions.
 * No persistence — timer resets on app restart.
 */

import { create } from 'zustand';

export interface SleepTimerState {
  /** Whether the timer is currently running */
  isActive: boolean;
  /** Remaining seconds on the timer */
  remainingSeconds: number;
  /** Total seconds the timer was started with */
  totalSeconds: number;
  /** Whether to show the "about to expire" warning (1 min remaining) */
  showWarning: boolean;
  /** Whether the timer has expired (triggers dimming overlay) */
  hasExpired: boolean;

  // Actions
  startTimer: (minutes: number) => void;
  stopTimer: () => void;
  extendTimer: (minutes: number) => void;
  tick: () => void;
  dismissExpired: () => void;
  dismissWarning: () => void;
}

export const useSleepTimerStore = create<SleepTimerState>((set, get) => ({
  isActive: false,
  remainingSeconds: 0,
  totalSeconds: 0,
  showWarning: false,
  hasExpired: false,

  startTimer: (minutes: number) => {
    const totalSeconds = minutes * 60;
    set({
      isActive: true,
      remainingSeconds: totalSeconds,
      totalSeconds,
      showWarning: false,
      hasExpired: false,
    });
  },

  stopTimer: () => {
    set({
      isActive: false,
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
      remainingSeconds: state.remainingSeconds + additionalSeconds,
      totalSeconds: state.totalSeconds + additionalSeconds,
      showWarning: false,
      hasExpired: false,
    });
  },

  tick: () => {
    const state = get();
    if (!state.isActive || state.remainingSeconds <= 0) return;

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
