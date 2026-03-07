/**
 * Reading Goals & Streaks Store
 *
 * Tracks daily reading goals, yearly book goals, reading minutes per day,
 * books finished per year, and consecutive-day reading streaks.
 *
 * React Native version: persists to AsyncStorage via Zustand persist middleware.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Get date string in YYYY-MM-DD format for a given timestamp (local timezone). */
function toDateStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Get the current year as a number. */
function currentYear(): number {
  return new Date().getFullYear();
}

export interface DailyRecord {
  /** Reading minutes logged for the day */
  minutes: number;
  /** Whether the goal was met for the day */
  goalMet: boolean;
}

/** Record of a book finished in a given year. */
export interface FinishedBook {
  bookId: string;
  title: string;
  author: string;
  finishedDate: string; // YYYY-MM-DD
}

/** Per-year book goal and completion data. */
export interface YearlyGoalData {
  /** Target number of books to read this year */
  targetBooks: number;
  /** Books finished this year */
  booksFinished: FinishedBook[];
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

  /** Whether yearly book goal is enabled */
  yearlyGoalEnabled: boolean;
  /** Map of year (e.g. "2026") to yearly goal data */
  yearlyGoals: Record<string, YearlyGoalData>;

  // Daily goal / streak actions
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

  // Yearly book goal actions
  setYearlyGoalEnabled: (enabled: boolean) => void;
  setYearlyBookTarget: (year: number, target: number) => void;
  markBookFinished: (bookId: string, title: string, author: string) => void;
  removeFinishedBook: (bookId: string, year: number) => void;
  getYearlyGoalData: (year?: number) => YearlyGoalData;
  getYearlyProgress: (year?: number) => number;

  // Utility getters
  getWeekRecords: () => { date: string; record: DailyRecord | null }[];
  getMonthRecords: (year: number, month: number) => { date: string; record: DailyRecord | null }[];
  getDaysWithGoalMet: (days: number) => number;
  getTotalMinutesThisWeek: () => number;
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
      yearlyGoalEnabled: false,
      yearlyGoals: {},

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

      // Yearly Book Goal Actions

      setYearlyGoalEnabled: (enabled: boolean) => {
        set({ yearlyGoalEnabled: enabled });
        // Ensure current year has a goal entry
        if (enabled) {
          const year = String(currentYear());
          const state = get();
          if (!state.yearlyGoals[year]) {
            set({
              yearlyGoals: {
                ...state.yearlyGoals,
                [year]: { targetBooks: 12, booksFinished: [] },
              },
            });
          }
        }
      },

      setYearlyBookTarget: (year: number, target: number) => {
        const clampedTarget = Math.max(1, Math.min(500, target));
        const yearStr = String(year);
        const state = get();
        const existing = state.yearlyGoals[yearStr] || { targetBooks: 12, booksFinished: [] };
        set({
          yearlyGoals: {
            ...state.yearlyGoals,
            [yearStr]: { ...existing, targetBooks: clampedTarget },
          },
        });
      },

      markBookFinished: (bookId: string, title: string, author: string) => {
        const year = String(currentYear());
        const today = toDateStr(Date.now());
        const state = get();
        const existing = state.yearlyGoals[year] || { targetBooks: 12, booksFinished: [] };

        // Prevent duplicates
        if (existing.booksFinished.some((b) => b.bookId === bookId)) return;

        set({
          yearlyGoals: {
            ...state.yearlyGoals,
            [year]: {
              ...existing,
              booksFinished: [
                ...existing.booksFinished,
                { bookId, title, author, finishedDate: today },
              ],
            },
          },
        });
      },

      removeFinishedBook: (bookId: string, year: number) => {
        const yearStr = String(year);
        const state = get();
        const existing = state.yearlyGoals[yearStr];
        if (!existing) return;

        set({
          yearlyGoals: {
            ...state.yearlyGoals,
            [yearStr]: {
              ...existing,
              booksFinished: existing.booksFinished.filter((b) => b.bookId !== bookId),
            },
          },
        });
      },

      getYearlyGoalData: (year?: number) => {
        const yearStr = String(year ?? currentYear());
        const state = get();
        return state.yearlyGoals[yearStr] || { targetBooks: 12, booksFinished: [] };
      },

      getYearlyProgress: (year?: number) => {
        const data = get().getYearlyGoalData(year);
        if (data.targetBooks <= 0) return 0;
        return Math.min(1, data.booksFinished.length / data.targetBooks);
      },

      // Utility Getters

      getWeekRecords: () => {
        const state = get();
        const result: { date: string; record: DailyRecord | null }[] = [];
        const today = new Date();
        // Start from Monday of current week
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);

        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          const dateStr = toDateStr(d.getTime());
          result.push({
            date: dateStr,
            record: state.dailyRecords[dateStr] || null,
          });
        }
        return result;
      },

      getMonthRecords: (year: number, month: number) => {
        const state = get();
        const result: { date: string; record: DailyRecord | null }[] = [];
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
          const d = new Date(year, month - 1, day);
          const dateStr = toDateStr(d.getTime());
          result.push({
            date: dateStr,
            record: state.dailyRecords[dateStr] || null,
          });
        }
        return result;
      },

      getDaysWithGoalMet: (days: number) => {
        const state = get();
        let count = 0;
        const checkDate = new Date();
        for (let i = 0; i < days; i++) {
          const dateStr = toDateStr(checkDate.getTime());
          if (state.dailyRecords[dateStr]?.goalMet) {
            count++;
          }
          checkDate.setDate(checkDate.getDate() - 1);
        }
        return count;
      },

      getTotalMinutesThisWeek: () => {
        const state = get();
        let total = 0;
        const today = new Date();
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);

        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          const dateStr = toDateStr(d.getTime());
          total += state.dailyRecords[dateStr]?.minutes || 0;
        }
        return total;
      },
    }),
    {
      name: 'ebook_reading_goals',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        dailyGoalMinutes: state.dailyGoalMinutes,
        dailyRecords: state.dailyRecords,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastGoalMetDate: state.lastGoalMetDate,
        lastMilestoneCelebrated: state.lastMilestoneCelebrated,
        yearlyGoalEnabled: state.yearlyGoalEnabled,
        yearlyGoals: state.yearlyGoals,
      }),
      // Clean up old daily records (keep last 400 days for yearly view) on rehydration
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 400);
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
