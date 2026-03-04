/**
 * useReadingSpeed Hook
 *
 * Tracks user reading speed (words per minute) by measuring time spent
 * on pages/sections. Calculates estimated time remaining for the current
 * chapter and the whole book.
 *
 * Reading speed is persisted to localStorage so it improves over time
 * across sessions. The hook pauses tracking when the page is hidden
 * (e.g. user switches apps) or when the toolbar is open.
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import type { ReaderProgress } from '../types/reader';

// localStorage key for persisting reading speed data
const STORAGE_KEY = 'ebook_reading_speed_wpm';

// Default WPM for new users (average adult reading speed)
const DEFAULT_WPM = 250;

// Minimum time (ms) on a page before counting it as a reading sample
const MIN_PAGE_TIME_MS = 3000;

// Maximum time (ms) on a page before discarding (user probably left)
const MAX_PAGE_TIME_MS = 300000; // 5 minutes

// Estimated words per page/location for different formats
const WORDS_PER_PAGE_EPUB = 250;
const WORDS_PER_PAGE_PDF = 300;

// Maximum number of speed samples to keep (rolling window)
const MAX_SAMPLES = 50;

interface SpeedSample {
  wpm: number;
  timestamp: number;
}

interface StoredSpeedData {
  samples: SpeedSample[];
  averageWpm: number;
}

export interface TimeLeftEstimate {
  /** Estimated minutes left in the current chapter. Null if not available. */
  chapterMinutes: number | null;
  /** Estimated minutes left in the whole book. */
  bookMinutes: number | null;
  /** The user's current average WPM. */
  averageWpm: number;
  /** Whether we have enough data for a reliable estimate. */
  isReliable: boolean;
}

export interface UseReadingSpeedOptions {
  /** Whether reading speed tracking is active. Set false when toolbar is open. */
  active?: boolean;
  /** The format of the book being read (affects words-per-page estimate). */
  format?: string;
}

export interface UseReadingSpeedReturn {
  /** Call this when the reader reports progress changes (page turns). */
  onProgressChange: (progress: ReaderProgress) => void;
  /** Get the current time-left estimate. */
  getTimeLeft: () => TimeLeftEstimate;
  /** The current average WPM. */
  averageWpm: number;
  /** Time left estimate that updates on progress changes. */
  timeLeft: TimeLeftEstimate;
}

function loadStoredData(): StoredSpeedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.averageWpm === 'number' && Array.isArray(parsed.samples)) {
        return parsed;
      }
    }
  } catch {
    // Corrupted data, start fresh
  }
  return { samples: [], averageWpm: DEFAULT_WPM };
}

function saveStoredData(data: StoredSpeedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable, ignore
  }
}

function calculateAverageWpm(samples: SpeedSample[]): number {
  if (samples.length === 0) return DEFAULT_WPM;

  // Use weighted average favoring recent samples
  let totalWeight = 0;
  let weightedSum = 0;
  const now = Date.now();

  for (const sample of samples) {
    // More recent samples get higher weight (exponential decay over 7 days)
    const ageMs = now - sample.timestamp;
    const weight = Math.exp(-ageMs / (7 * 24 * 60 * 60 * 1000));
    weightedSum += sample.wpm * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return DEFAULT_WPM;

  const avg = weightedSum / totalWeight;
  // Clamp to reasonable range (50-1500 WPM)
  return Math.max(50, Math.min(1500, Math.round(avg)));
}

export function useReadingSpeed(options: UseReadingSpeedOptions = {}): UseReadingSpeedReturn {
  const { active = true, format = 'epub' } = options;

  const storedDataRef = useRef<StoredSpeedData>(loadStoredData());
  const [averageWpm, setAverageWpm] = useState(storedDataRef.current.averageWpm);
  const [timeLeft, setTimeLeft] = useState<TimeLeftEstimate>({
    chapterMinutes: null,
    bookMinutes: null,
    averageWpm: storedDataRef.current.averageWpm,
    isReliable: storedDataRef.current.samples.length >= 3,
  });

  // Track when the current page was started
  const pageStartTimeRef = useRef<number>(Date.now());
  const lastProgressRef = useRef<ReaderProgress | null>(null);
  const isPausedRef = useRef(!active);

  // Pause/resume based on active prop and page visibility
  useEffect(() => {
    isPausedRef.current = !active;
    if (active) {
      // Reset page start time when becoming active
      pageStartTimeRef.current = Date.now();
    }
  }, [active]);

  // Pause when page is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isPausedRef.current = true;
      } else if (active) {
        isPausedRef.current = false;
        pageStartTimeRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [active]);

  const addSpeedSample = useCallback((wpm: number) => {
    const data = storedDataRef.current;
    const sample: SpeedSample = { wpm, timestamp: Date.now() };
    data.samples.push(sample);

    // Keep only the most recent samples
    if (data.samples.length > MAX_SAMPLES) {
      data.samples = data.samples.slice(-MAX_SAMPLES);
    }

    data.averageWpm = calculateAverageWpm(data.samples);
    storedDataRef.current = data;
    setAverageWpm(data.averageWpm);
    saveStoredData(data);
  }, []);

  const getWordsPerPage = useCallback((): number => {
    if (format === 'pdf') return WORDS_PER_PAGE_PDF;
    return WORDS_PER_PAGE_EPUB;
  }, [format]);

  const calculateTimeLeft = useCallback(
    (progress: ReaderProgress): TimeLeftEstimate => {
      const wpm = storedDataRef.current.averageWpm;
      const isReliable = storedDataRef.current.samples.length >= 3;

      // Calculate book time remaining
      let bookMinutes: number | null = null;
      if (progress.total > 0 && progress.fraction < 1) {
        const remainingFraction = 1 - progress.fraction;

        // If the engine provides time estimates (foliate-js), use them
        if (progress.timeInBook != null && progress.timeInBook > 0) {
          // foliate-js time values are in estimated minutes remaining
          // (calculated as remaining bytes / sizePerTimeUnit where sizePerTimeUnit ≈ 1600 bytes/min)
          bookMinutes = Math.ceil(progress.timeInBook);
        } else {
          // Estimate based on total pages and WPM
          const totalWords = progress.total * getWordsPerPage();
          const remainingWords = totalWords * remainingFraction;
          bookMinutes = Math.ceil(remainingWords / wpm);
        }
      }

      // Calculate chapter time remaining
      let chapterMinutes: number | null = null;
      if (progress.timeInSection != null && progress.timeInSection > 0) {
        // foliate-js provides section time estimate (already in minutes)
        chapterMinutes = Math.ceil(progress.timeInSection);
      } else if (progress.section && progress.section.total > 0) {
        // Estimate: assume sections are roughly equal sized
        // Use the book fraction to estimate where we are in the current section
        const sectionSize = 1 / progress.section.total;
        const sectionStart = progress.section.current * sectionSize;
        const posInSection = progress.fraction - sectionStart;
        const sectionFraction = Math.max(0, Math.min(1, posInSection / sectionSize));
        const remainingSectionFraction = 1 - sectionFraction;

        const wordsPerSection = (progress.total * getWordsPerPage()) / progress.section.total;
        const remainingWords = wordsPerSection * remainingSectionFraction;
        chapterMinutes = Math.ceil(remainingWords / wpm);
      }

      return {
        chapterMinutes,
        bookMinutes,
        averageWpm: wpm,
        isReliable,
      };
    },
    [getWordsPerPage]
  );

  const getTimeLeft = useCallback((): TimeLeftEstimate => {
    if (!lastProgressRef.current) {
      return {
        chapterMinutes: null,
        bookMinutes: null,
        averageWpm: storedDataRef.current.averageWpm,
        isReliable: storedDataRef.current.samples.length >= 3,
      };
    }
    return calculateTimeLeft(lastProgressRef.current);
  }, [calculateTimeLeft]);

  const onProgressChange = useCallback(
    (progress: ReaderProgress) => {
      const prevProgress = lastProgressRef.current;

      // Record a speed sample when a page changes
      if (prevProgress && !isPausedRef.current) {
        const timeOnPage = Date.now() - pageStartTimeRef.current;

        // Only record if the user spent a reasonable amount of time
        if (timeOnPage >= MIN_PAGE_TIME_MS && timeOnPage <= MAX_PAGE_TIME_MS) {
          const wordsRead = getWordsPerPage();
          const minutesSpent = timeOnPage / 60000;
          const wpm = Math.round(wordsRead / minutesSpent);

          // Only record if WPM is in reasonable range
          if (wpm >= 50 && wpm <= 1500) {
            addSpeedSample(wpm);
          }
        }
      }

      // Reset page timer
      pageStartTimeRef.current = Date.now();
      lastProgressRef.current = progress;

      // Update time-left estimate
      setTimeLeft(calculateTimeLeft(progress));
    },
    [addSpeedSample, getWordsPerPage, calculateTimeLeft]
  );

  return {
    onProgressChange,
    getTimeLeft,
    averageWpm,
    timeLeft,
  };
}
