import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';

interface ReadingHeatmapProps {
  data: Array<{ date: number; time_spent: number }>;
}

const CELL_SIZE = 13;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const LEFT_LABEL_WIDTH = 32;
const TOP_LABEL_HEIGHT = 20;

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
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

function getLevelColor(level: number, emptyColor: string): string {
  switch (level) {
    case 1:
      return '#9be9a8';
    case 2:
      return '#40c463';
    case 3:
      return '#30a14e';
    case 4:
      return '#216e39';
    default:
      return emptyColor;
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

export function ReadingHeatmap({ data }: ReadingHeatmapProps) {
  const { theme } = useTheme();
  const [selectedCell, setSelectedCell] = useState<DayCell | null>(null);

  const { cells, totalCols, monthPositions } = useMemo(() => {
    // Build lookup map
    const dataMap = new Map<string, number>();
    for (const entry of data) {
      const d = new Date(entry.date * 1000);
      const key = startOfDay(d);
      dataMap.set(key, (dataMap.get(key) || 0) + entry.time_spent);
    }

    // Last 365 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    // Adjust to previous Monday
    const startDow = startDate.getDay();
    const isoDow = startDow === 0 ? 7 : startDow;
    startDate.setDate(startDate.getDate() - (isoDow - 1));

    const dayCells: DayCell[] = [];
    let col = 0;
    const current = new Date(startDate);
    const monthPos: Array<{ month: number; col: number }> = [];
    let lastMonth = -1;

    while (current <= today) {
      const dow = current.getDay();
      const row = dow === 0 ? 6 : dow - 1;

      if (row === 0 && dayCells.length > 0) {
        col++;
      }

      const key = startOfDay(current);
      const timeSpent = dataMap.get(key) || 0;

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

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <Svg width={svgWidth} height={svgHeight}>
            {/* Month labels */}
            {monthPositions.map((mp, i) => (
              <SvgText
                key={`month-${i}`}
                x={LEFT_LABEL_WIDTH + mp.col * CELL_STEP}
                y={TOP_LABEL_HEIGHT - 6}
                fontSize={10}
                fill={theme.text}
              >
                {MONTH_LABELS[mp.month]}
              </SvgText>
            ))}

            {/* Day labels */}
            {DAY_LABELS.map((dl) => (
              <SvgText
                key={`day-${dl.label}`}
                x={0}
                y={TOP_LABEL_HEIGHT + dl.row * CELL_STEP + CELL_SIZE - 2}
                fontSize={10}
                fill={theme.text}
              >
                {dl.label}
              </SvgText>
            ))}

            {/* Day cells */}
            {cells.map((cell) => (
              <Rect
                key={cell.dateKey}
                x={LEFT_LABEL_WIDTH + cell.col * CELL_STEP}
                y={TOP_LABEL_HEIGHT + cell.row * CELL_STEP}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                ry={2}
                fill={getLevelColor(cell.level, theme.border)}
                onPress={() =>
                  setSelectedCell(
                    selectedCell?.dateKey === cell.dateKey ? null : cell
                  )
                }
              />
            ))}
          </Svg>

          {/* Tooltip */}
          {selectedCell && (
            <View
              style={[styles.tooltip, { backgroundColor: theme.surface }]}
            >
              <Text style={[styles.tooltipBold, { color: theme.text }]}>
                {formatTime(selectedCell.timeSpent)}
              </Text>
              <Text style={[styles.tooltipDate, { color: theme.textSecondary }]}>
                {selectedCell.date.toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>
          Less
        </Text>
        {[0, 1, 2, 3, 4].map((level) => (
          <View
            key={`legend-${level}`}
            style={[
              styles.legendCell,
              { backgroundColor: getLevelColor(level, theme.border) },
            ]}
          />
        ))}
        <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>
          More
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  tooltipBold: {
    fontSize: 13,
    fontWeight: '700',
  },
  tooltipDate: {
    fontSize: 11,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  legendLabel: {
    fontSize: 11,
  },
  legendCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
});

export default ReadingHeatmap;
