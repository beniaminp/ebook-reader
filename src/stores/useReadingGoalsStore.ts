/**
 * Reading Goals & Streaks Store
 *
 * Tracks daily reading goals, reading minutes per day,
 * and consecutive-day reading streaks.
 *
 * Persists to localStorage via Zustand persist middleware
 * with `ebook_reading_goals` key.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Get date string in YYYY-MM-DD format for a given timestamp (local timezone). */
function toDateStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DailyRecord {
  /** Reading minutes logged for the day */
  minutes: number;
  /** Whether the goal was met for the day */
  goalMet: boolean;
}

interface ReadingGoalsState {
  /** Whether streak tracking is enabled */
  enabled: boolean;
  /** Daily reading goal in minutes */
  dailyGoalMinutes: number;
  /** Map of date string (YYYY-MM-DD) to daily reading record */
  dailyRecords: Record<string, DailyRecord>;
  /** Current streak count (consecutive days meeting goal) */
  currentStreak: number;
  /** Longest streak ever achieved */
  longestStreak: number;
  /** Date string of the last day the goal was met */
  lastGoalMetDate: string | null;
  /** Timestamp of the last milestone celebration shown */
  lastMilestoneCelebrated: number;

  // Actions
  addReadingTime: (minutes: number) => void;
  setDailyGoal: (minutes: number) => void;
  setEnabled: (enabled: boolean) => void;
  checkStreak: () => void;
  resetStreak: () => void;
  getTodayMinutes: () => number;
  getTodayProgress: () => number;
  isTodayGoalMet: () => boolean;
  getNewMilestone: () => number | null;
  acknowledgeMilestone: (streak: number) => void;
}

/** Milestone streak counts that trigger celebration */
const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

export const useReadingGoalsStore = create<ReadingGoalsState>()(
  persist(
    (set, get) => ({
      enabled: true,
      dailyGoalMinutes: 20,
      dailyRecords: {},
      currentStreak: 0,
      longestStreak: 0,
      lastGoalMetDate: null,
      lastMilestoneCelebrated: 0,

      addReadingTime: (minutes: number) => {
        if (!get().enabled || minutes <= 0) return;

        const today = toDateStr(Date.now());
        const state = get();
        const existing = state.dailyRecords[today] || { minutes: 0, goalMet: false };
        const newMinutes = existing.minutes + minutes;
        const goalMet = newMinutes >= state.dailyGoalMinutes;

        const updatedRecord: DailyRecord = {
          minutes: newMinutes,
          goalMet,
        };

        set((prev) => ({
          dailyRecords: {
            ...prev.dailyRecords,
            [today]: updatedRecord,
          },
        }));

        // If the goal was just met (transition from not met to met), update streak
        if (goalMet && !existing.goalMet) {
          get().checkStreak();
        }
      },

      setDailyGoal: (minutes: number) => {
        const clampedMinutes = Math.max(5, Math.min(120, minutes));
        set({ dailyGoalMinutes: clampedMinutes });

        // Re-evaluate all daily records against the new goal
        const state = get();
        const updatedRecords: Record<string, DailyRecord> = {};
        for (const [date, record] of Object.entries(state.dailyRecords)) {
          updatedRecords[date] = {
            ...record,
            goalMet: record.minutes >= clampedMinutes,
          };
        }
        set({ dailyRecords: updatedRecords });

        // Recalculate streak from scratch
        get().checkStreak();
      },

      setEnabled: (enabled: boolean) => {
        set({ enabled });
      },

      checkStreak: () => {
        const state = get();
        const today = toDateStr(Date.now());
        const todayRecord = state.dailyRecords[today];

        // Walk backwards from today counting consecutive goal-met days
        let streak = 0;
        const checkDate = new Date();

        // If today's goal is not met yet, start counting from yesterday
        if (!todayRecord?.goalMet) {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
          const dateStr = toDateStr(checkDate.getTime());
          const record = state.dailyRecords[dateStr];

          if (record?.goalMet) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }

        // If today's goal IS met, include today in the streak
        // (already handled by starting from today above)

        const lastGoalMetDate = todayRecord?.goalMet
          ? today
          : state.lastGoalMetDate;

        const longestStreak = Math.max(state.longestStreak, streak);

        set({
          currentStreak: streak,
          longestStreak,
          lastGoalMetDate,
        });
      },

      resetStreak: () => {
        set({
          dailyRecords: {},
          currentStreak: 0,
          longestStreak: 0,
          lastGoalMetDate: null,
          lastMilestoneCelebrated: 0,
        });
      },

      getTodayMinutes: () => {
        const today = toDateStr(Date.now());
        return get().dailyRecords[today]?.minutes || 0;
      },

      getTodayProgress: () => {
        const state = get();
        const todayMinutes = state.dailyRecords[toDateStr(Date.now())]?.minutes || 0;
        return Math.min(1, todayMinutes / state.dailyGoalMinutes);
      },

      isTodayGoalMet: () => {
        const today = toDateStr(Date.now());
        return get().dailyRecords[today]?.goalMet || false;
      },

      getNewMilestone: () => {
        const state = get();
        const streak = state.currentStreak;
        if (streak <= 0) return null;

        // Check if current streak matches a milestone and hasn't been celebrated
        const milestone = MILESTONES.find(
          (m) => streak >= m && m > state.lastMilestoneCelebrated
        );
        return milestone || null;
      },

      acknowledgeMilestone: (streak: number) => {
        set({ lastMilestoneCelebrated: streak });
      },
    }),
    {
      name: 'ebook_reading_goals',
      partialize: (state) => ({
        enabled: state.enabled,
        dailyGoalMinutes: state.dailyGoalMinutes,
        dailyRecords: state.dailyRecords,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastGoalMetDate: state.lastGoalMetDate,
        lastMilestoneCelebrated: state.lastMilestoneCelebrated,
      }),
      // Clean up old daily records (keep last 90 days) on rehydration
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        const cutoffStr = toDateStr(cutoff.getTime());
        const cleaned: Record<string, DailyRecord> = {};
        for (const [date, record] of Object.entries(state.dailyRecords)) {
          if (date >= cutoffStr) {
            cleaned[date] = record;
          }
        }
        state.dailyRecords = cleaned;
        // Re-check streak on load
        setTimeout(() => {
          useReadingGoalsStore.getState().checkStreak();
        }, 0);
      },
    }
  )
);
