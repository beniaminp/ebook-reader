import React, { useMemo, useState } from 'react';
import './ReadingHeatmap.css';

interface ReadingHeatmapProps {
  data: Array<{ date: number; time_spent: number }>;
}

const CELL_SIZE = 13;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const LEFT_LABEL_WIDTH = 32;
const TOP_LABEL_HEIGHT = 20;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS: Array<{ label: string; row: number }> = [
  { label: 'Mon', row: 0 },
  { label: 'Wed', row: 2 },
  { label: 'Fri', row: 4 },
];

function getLevel(timeSpentSeconds: number): number {
  if (timeSpentSeconds <= 0) return 0;
  const minutes = timeSpentSeconds / 60;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 60) return 3;
  return 4;
}

function getLevelColor(level: number): string {
  switch (level) {
    case 1: return '#9be9a8';
    case 2: return '#40c463';
    case 3: return '#30a14e';
    case 4: return '#216e39';
    default: return 'var(--ion-color-light-shade, #e0e0e0)';
  }
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return 'No reading';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

function startOfDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DayCell {
  date: Date;
  dateKey: string;
  col: number;
  row: number;
  timeSpent: number;
  level: number;
}

const ReadingHeatmap: React.FC<ReadingHeatmapProps> = ({ data }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: Date; timeSpent: number } | null>(null);

  const { cells, totalCols, monthPositions } = useMemo(() => {
    // Build lookup map from date key to total time spent
    const dataMap = new Map<string, number>();
    for (const entry of data) {
      const d = new Date(entry.date * 1000);
      const key = startOfDay(d);
      dataMap.set(key, (dataMap.get(key) || 0) + entry.time_spent);
    }

    // Calculate date range: last 365 days ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    // Adjust startDate back to the previous Monday (ISO weekday: Mon=1)
    const startDow = startDate.getDay();
    // Convert Sunday=0 to 7 for ISO-style
    const isoDow = startDow === 0 ? 7 : startDow;
    startDate.setDate(startDate.getDate() - (isoDow - 1));

    const dayCells: DayCell[] = [];
    let col = 0;
    const current = new Date(startDate);
    const monthPos: Array<{ month: number; col: number }> = [];
    let lastMonth = -1;

    while (current <= today) {
      // ISO row: Monday=0, Tuesday=1, ..., Sunday=6
      const dow = current.getDay();
      const row = dow === 0 ? 6 : dow - 1;

      if (row === 0 && dayCells.length > 0) {
        col++;
      }

      const key = startOfDay(current);
      const timeSpent = dataMap.get(key) || 0;

      // Track month label positions
      const currentMonth = current.getMonth();
      if (currentMonth !== lastMonth) {
        monthPos.push({ month: currentMonth, col });
        lastMonth = currentMonth;
      }

      dayCells.push({
        date: new Date(current),
        dateKey: key,
        col,
        row,
        timeSpent,
        level: getLevel(timeSpent),
      });

      current.setDate(current.getDate() + 1);
    }

    return { cells: dayCells, totalCols: col + 1, monthPositions: monthPos };
  }, [data]);

  const svgWidth = LEFT_LABEL_WIDTH + totalCols * CELL_STEP;
  const svgHeight = TOP_LABEL_HEIGHT + 7 * CELL_STEP;

  const handleCellInteraction = (cell: DayCell, event: React.MouseEvent | React.TouchEvent) => {
    const rect = (event.currentTarget as SVGRectElement).getBoundingClientRect();
    const parentRect = (event.currentTarget as SVGRectElement).closest('svg')?.getBoundingClientRect();
    if (parentRect) {
      setTooltip({
        x: rect.left - parentRect.left + CELL_SIZE / 2,
        y: rect.top - parentRect.top - 8,
        date: cell.date,
        timeSpent: cell.timeSpent,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className="reading-heatmap-container">
      <div className="reading-heatmap-scroll">
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ display: 'block' }}
          onMouseLeave={handleMouseLeave}
        >
          {/* Month labels */}
          {monthPositions.map((mp, i) => (
            <text
              key={`month-${i}`}
              x={LEFT_LABEL_WIDTH + mp.col * CELL_STEP}
              y={TOP_LABEL_HEIGHT - 6}
              style={{
                fontSize: '10px',
                fill: 'var(--ion-text-color, #333)',
                fontFamily: 'var(--ion-font-family, system-ui)',
              }}
            >
              {MONTH_LABELS[mp.month]}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((dl) => (
            <text
              key={`day-${dl.label}`}
              x={0}
              y={TOP_LABEL_HEIGHT + dl.row * CELL_STEP + CELL_SIZE - 2}
              style={{
                fontSize: '10px',
                fill: 'var(--ion-text-color, #333)',
                fontFamily: 'var(--ion-font-family, system-ui)',
              }}
            >
              {dl.label}
            </text>
          ))}

          {/* Day cells */}
          {cells.map((cell) => (
            <rect
              key={cell.dateKey}
              x={LEFT_LABEL_WIDTH + cell.col * CELL_STEP}
              y={TOP_LABEL_HEIGHT + cell.row * CELL_STEP}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={2}
              ry={2}
              fill={getLevelColor(cell.level)}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => handleCellInteraction(cell, e)}
              onTouchStart={(e) => handleCellInteraction(cell, e)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="reading-heatmap-tooltip"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
            }}
          >
            <strong>{formatTime(tooltip.timeSpent)}</strong>
            <br />
            {formatDate(tooltip.date)}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="reading-heatmap-legend">
        <span
          style={{
            fontSize: '11px',
            color: 'var(--ion-text-color, #333)',
            fontFamily: 'var(--ion-font-family, system-ui)',
          }}
        >
          Less
        </span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={`legend-${level}`}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              borderRadius: 2,
              backgroundColor: getLevelColor(level),
              display: 'inline-block',
            }}
          />
        ))}
        <span
          style={{
            fontSize: '11px',
            color: 'var(--ion-text-color, #333)',
            fontFamily: 'var(--ion-font-family, system-ui)',
          }}
        >
          More
        </span>
      </div>
    </div>
  );
};

export default ReadingHeatmap;
