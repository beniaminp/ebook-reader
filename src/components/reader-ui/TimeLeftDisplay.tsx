/**
 * TimeLeftDisplay
 *
 * Shows estimated reading time remaining for the current chapter and book.
 * Tap to cycle through display modes:
 *   1. Chapter time + Book time (default)
 *   2. Chapter time only
 *   3. Book time only
 *   4. Reading speed (WPM)
 *   5. Hidden
 *
 * The selected mode is persisted in localStorage.
 */

import React, { useState, useCallback } from 'react';
import type { TimeLeftEstimate } from '../../hooks/useReadingSpeed';
import './TimeLeftDisplay.css';

/** Display modes the user can cycle through by tapping. */
type TimeLeftMode = 'both' | 'chapter' | 'book' | 'speed' | 'finish-date' | 'hidden';

const MODES: TimeLeftMode[] = ['both', 'chapter', 'book', 'speed', 'finish-date', 'hidden'];
const STORAGE_KEY = 'ebook_time_left_mode';

function loadMode(): TimeLeftMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && MODES.includes(stored as TimeLeftMode)) {
      return stored as TimeLeftMode;
    }
  } catch {
    // ignore
  }
  return 'both';
}

export interface TimeLeftDisplayProps {
  /** The current time-left estimate from useReadingSpeed. */
  timeLeft: TimeLeftEstimate;
  /** Optional inline style override (for theme coloring). */
  style?: React.CSSProperties;
}

/**
 * Format minutes into a human-readable string.
 * - Under 1 min: "< 1 min"
 * - Under 60 min: "X min"
 * - 60+ min: "X hr Y min" or "X hr"
 */
function formatTime(minutes: number | null): string | null {
  if (minutes == null || minutes < 0) return null;

  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);

  if (remaining === 0) return `${hours} hr`;
  return `${hours} hr ${remaining} min`;
}

export const TimeLeftDisplay: React.FC<TimeLeftDisplayProps> = ({ timeLeft, style }) => {
  const [mode, setMode] = useState<TimeLeftMode>(loadMode);

  const handleTap = useCallback(() => {
    setMode((prev) => {
      const idx = MODES.indexOf(prev);
      const next = MODES[(idx + 1) % MODES.length];
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const chapterTime = formatTime(timeLeft.chapterMinutes);
  const bookTime = formatTime(timeLeft.bookMinutes);

  // Don't render anything if we have no data at all, regardless of mode
  if (!chapterTime && !bookTime && timeLeft.averageWpm <= 0) return null;

  // Hidden mode: render a minimal tap target to cycle back
  if (mode === 'hidden') {
    return (
      <span
        className="time-left-display time-left-hidden"
        style={style}
        onClick={handleTap}
        role="button"
        tabIndex={0}
        title="Tap to show reading time"
      >
        {'\u00B7\u00B7\u00B7'}
      </span>
    );
  }

  let displayText = '';

  if (mode === 'both') {
    const parts: string[] = [];
    if (chapterTime) parts.push(`${chapterTime} left in chapter`);
    if (bookTime) parts.push(`${bookTime} left`);
    displayText = parts.join(' \u00B7 ');
  } else if (mode === 'chapter') {
    if (chapterTime) {
      displayText = `${chapterTime} left in chapter`;
    } else if (bookTime) {
      displayText = `${bookTime} left`;
    }
  } else if (mode === 'book') {
    if (bookTime) {
      displayText = `${bookTime} left in book`;
    } else if (chapterTime) {
      displayText = `${chapterTime} left in chapter`;
    }
  } else if (mode === 'speed') {
    const wpm = timeLeft.averageWpm;
    const reliability = timeLeft.isReliable ? '' : ' (calibrating)';
    displayText = `${wpm} WPM${reliability}`;
  } else if (mode === 'finish-date') {
    if (timeLeft.bookMinutes != null && timeLeft.bookMinutes > 0) {
      // Estimate daily reading time: assume ~30 min/day as baseline,
      // or use the session-based average if the user has been reading today
      const avgDailyMinutes = 30;
      const daysRemaining = Math.ceil(timeLeft.bookMinutes / avgDailyMinutes);
      const finishDate = new Date();
      finishDate.setDate(finishDate.getDate() + daysRemaining);

      if (daysRemaining <= 0) {
        displayText = 'Finish today';
      } else if (daysRemaining === 1) {
        displayText = 'Finish tomorrow';
      } else {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        if (finishDate.getFullYear() !== new Date().getFullYear()) {
          options.year = 'numeric';
        }
        displayText = `Finish by ${finishDate.toLocaleDateString(undefined, options)}`;
      }
    } else if (bookTime) {
      displayText = `${bookTime} left in book`;
    }
  }

  if (!displayText) return null;

  return (
    <span
      className="time-left-display"
      style={style}
      onClick={handleTap}
      role="button"
      tabIndex={0}
      title="Tap to change display mode"
    >
      {displayText}
    </span>
  );
};

export default TimeLeftDisplay;
