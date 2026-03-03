/**
 * ChapterScrubber
 *
 * A horizontal progress bar with chapter boundary markers for book navigation.
 * Shows chapter boundaries as tick marks on the progress bar.
 * Draggable to scrub through the book with a tooltip showing chapter name
 * and position while scrubbing.
 *
 * Works for EPUB (chapter info from TOC) and other formats (basic progress bar).
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Chapter, ReaderProgress } from '../../types/reader';
import './ChapterScrubber.css';

export interface ChapterScrubberProps {
  /** Current reading progress. */
  progress: ReaderProgress | null;
  /** Array of chapters from the TOC. */
  chapters: Chapter[];
  /** Called when the user scrubs to a new fraction (0-1). */
  onScrub: (fraction: number) => void;
  /** Called when the user taps on a chapter marker. */
  onChapterTap?: (chapterIndex: number) => void;
  /** Optional style override for theme coloring. */
  style?: React.CSSProperties;
  /** Text color for labels. */
  textColor?: string;
  /** Accent color for the progress fill. */
  accentColor?: string;
}

/**
 * Compute chapter boundary positions as fractions (0-1).
 * If section info is available in progress, use it.
 * Otherwise, distribute chapters evenly across the book.
 */
function computeChapterPositions(
  chapters: Chapter[],
  totalSections?: number
): number[] {
  if (chapters.length === 0) return [];

  const count = totalSections && totalSections > 0 ? totalSections : chapters.length;
  // Each chapter boundary is at index / total
  return chapters.map((_, i) => i / count);
}

/**
 * Find which chapter the given fraction falls in.
 */
function findChapterAtFraction(
  fraction: number,
  chapterPositions: number[],
  chapters: Chapter[]
): { index: number; label: string } | null {
  if (chapters.length === 0 || chapterPositions.length === 0) return null;

  let index = 0;
  for (let i = chapterPositions.length - 1; i >= 0; i--) {
    if (fraction >= chapterPositions[i]) {
      index = i;
      break;
    }
  }

  return {
    index,
    label: chapters[index]?.label || `Chapter ${index + 1}`,
  };
}

export const ChapterScrubber: React.FC<ChapterScrubberProps> = ({
  progress,
  chapters,
  onScrub,
  onChapterTap,
  style,
  textColor,
  accentColor,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const [tooltipText, setTooltipText] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const isDraggingRef = useRef(false);

  const fraction = progress?.fraction ?? 0;
  const displayFraction = isDragging && scrubFraction !== null ? scrubFraction : fraction;
  const totalSections = progress?.section?.total;

  const chapterPositions = React.useMemo(
    () => computeChapterPositions(chapters, totalSections),
    [chapters, totalSections]
  );

  const getFractionFromEvent = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      return Math.max(0, Math.min(1, x / rect.width));
    },
    []
  );

  const updateTooltip = useCallback(
    (frac: number) => {
      const chapter = findChapterAtFraction(frac, chapterPositions, chapters);
      const pct = Math.round(frac * 100);

      if (chapter) {
        setTooltipText(`${chapter.label} \u00B7 ${pct}%`);
      } else if (progress?.total && progress.total > 0) {
        const page = Math.round(frac * progress.total);
        setTooltipText(`Page ${page} of ${progress.total}`);
      } else {
        setTooltipText(`${pct}%`);
      }

      setTooltipPosition(frac);
    },
    [chapterPositions, chapters, progress]
  );

  // Mouse/touch drag handlers
  const handleDragStart = useCallback(
    (clientX: number) => {
      setIsDragging(true);
      isDraggingRef.current = true;
      const frac = getFractionFromEvent(clientX);
      setScrubFraction(frac);
      updateTooltip(frac);
    },
    [getFractionFromEvent, updateTooltip]
  );

  const handleDragMove = useCallback(
    (clientX: number) => {
      if (!isDraggingRef.current) return;
      const frac = getFractionFromEvent(clientX);
      setScrubFraction(frac);
      updateTooltip(frac);
    },
    [getFractionFromEvent, updateTooltip]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (scrubFraction !== null) {
      onScrub(scrubFraction);
    }
    // Keep tooltip visible briefly
    setTimeout(() => {
      if (!isDraggingRef.current) {
        setScrubFraction(null);
      }
    }, 800);
  }, [scrubFraction, onScrub]);

  // Touch events on the track
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleDragStart(e.touches[0].clientX);
    },
    [handleDragStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleDragMove(e.touches[0].clientX);
    },
    [handleDragMove]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleDragEnd();
    },
    [handleDragEnd]
  );

  // Mouse events on the track
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleDragStart(e.clientX);
    },
    [handleDragStart]
  );

  // Global mouse move/up listeners when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Handle click on a chapter marker
  const handleChapterMarkerClick = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      onChapterTap?.(index);
    },
    [onChapterTap]
  );

  const fillColor = accentColor || 'var(--ion-color-primary)';
  const labelColor = textColor || 'var(--ion-color-medium)';

  return (
    <div className="chapter-scrubber" style={style}>
      {/* Tooltip */}
      {isDragging && tooltipText && (
        <div
          className="scrubber-tooltip"
          style={{
            left: `${Math.max(10, Math.min(90, tooltipPosition * 100))}%`,
            color: labelColor,
          }}
        >
          {tooltipText}
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        className={`scrubber-track${isDragging ? ' scrubber-dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background track */}
        <div className="scrubber-track-bg" />

        {/* Progress fill */}
        <div
          className="scrubber-track-fill"
          style={{
            width: `${displayFraction * 100}%`,
            backgroundColor: fillColor,
          }}
        />

        {/* Chapter markers */}
        {chapterPositions.map((pos, idx) => {
          // Skip the first chapter marker at 0%
          if (pos === 0 && idx === 0) return null;
          return (
            <div
              key={`ch-${idx}`}
              className="scrubber-chapter-marker"
              style={{ left: `${pos * 100}%` }}
              onClick={(e) => handleChapterMarkerClick(e, idx)}
              title={chapters[idx]?.label || `Chapter ${idx + 1}`}
            />
          );
        })}

        {/* Thumb */}
        <div
          className="scrubber-thumb"
          style={{
            left: `${displayFraction * 100}%`,
            borderColor: fillColor,
            backgroundColor: isDragging ? fillColor : undefined,
          }}
        />
      </div>

      {/* Labels: current chapter name and percentage */}
      <div className="scrubber-labels" style={{ color: labelColor }}>
        <span className="scrubber-chapter-label">
          {progress?.chapterLabel || ''}
        </span>
        <span className="scrubber-percentage">
          {Math.round(fraction * 100)}%
        </span>
      </div>
    </div>
  );
};

export default ChapterScrubber;
