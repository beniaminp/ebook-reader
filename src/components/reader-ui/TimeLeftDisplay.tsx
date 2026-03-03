/**
 * TimeLeftDisplay
 *
 * Shows estimated reading time remaining for the current chapter and book.
 * Displays in the reader footer area as "X min left in chapter . X hr left in book".
 * Updates reactively when progress changes.
 */

import React from 'react';
import type { TimeLeftEstimate } from '../../hooks/useReadingSpeed';
import './TimeLeftDisplay.css';

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
  const chapterTime = formatTime(timeLeft.chapterMinutes);
  const bookTime = formatTime(timeLeft.bookMinutes);

  // Don't render if we have no estimates at all
  if (!chapterTime && !bookTime) return null;

  const parts: string[] = [];
  if (chapterTime) {
    parts.push(`${chapterTime} left in chapter`);
  }
  if (bookTime) {
    parts.push(`${bookTime} left`);
  }

  return (
    <span className="time-left-display" style={style}>
      {parts.join(' \u00B7 ')}
    </span>
  );
};

export default TimeLeftDisplay;
