import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { useAppStore } from '../src/stores/useAppStore';
import type { Book } from '../src/types/index';

// Format color map
const FORMAT_COLORS: Record<string, string> = {
  epub: '#4A90D9',
  pdf: '#D32F2F',
  mobi: '#7B1FA2',
  azw3: '#FF6F00',
  fb2: '#00897B',
  cbz: '#43A047',
  cbr: '#2E7D32',
  txt: '#757575',
  html: '#E65100',
  htm: '#E65100',
  md: '#5C6BC0',
  markdown: '#5C6BC0',
  chm: '#795548',
  docx: '#1565C0',
  odt: '#0277BD',
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function SectionHeader({
  title,
  icon,
  theme,
}: {
  title: string;
  icon: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={18} color={theme.primary} />
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
    </View>
  );
}

export default function YearInReviewScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const books = useAppStore((s) => s.books);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Compute available years from book data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    books.forEach((b) => {
      if (b.dateAdded) {
        years.add(new Date(b.dateAdded).getFullYear());
      }
      if (b.lastRead) {
        years.add(new Date(b.lastRead).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [books, currentYear]);

  const yearStats = useMemo(() => {
    // Filter books relevant to this year
    const booksAddedThisYear = books.filter((b) => {
      if (!b.dateAdded) return false;
      return new Date(b.dateAdded).getFullYear() === selectedYear;
    });

    const booksReadThisYear = books.filter((b) => {
      if (!b.lastRead) return false;
      return new Date(b.lastRead).getFullYear() === selectedYear;
    });

    // Books completed (progress >= 0.99 and last read in this year)
    const booksCompleted = books.filter((b) => {
      const isFinished = (b.progress ?? 0) >= 0.99;
      if (!isFinished) return false;
      // Check if they were finished this year (using lastRead as proxy)
      if (b.lastRead) {
        return new Date(b.lastRead).getFullYear() === selectedYear;
      }
      // Fallback to dateAdded
      if (b.dateAdded) {
        return new Date(b.dateAdded).getFullYear() === selectedYear;
      }
      return false;
    });

    // Books started (any progress, read this year)
    const booksStarted = books.filter((b) => {
      const hasProgress = (b.progress ?? 0) > 0;
      if (!hasProgress) return false;
      if (b.lastRead) {
        return new Date(b.lastRead).getFullYear() === selectedYear;
      }
      if (b.dateAdded) {
        return new Date(b.dateAdded).getFullYear() === selectedYear;
      }
      return false;
    });

    // Pages read estimate
    const pagesRead = booksReadThisYear.reduce((sum, b) => {
      const pages = b.pageCount || b.metadata?.pageCount || b.totalPages || 250;
      const progress = b.progress ?? 0;
      return sum + Math.round(pages * progress);
    }, 0);

    // Top formats
    const formatCounts: Record<string, number> = {};
    booksReadThisYear.forEach((b) => {
      const fmt = b.format || 'unknown';
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
    });
    const topFormats = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]);

    // Top authors
    const authorCounts: Record<string, number> = {};
    booksReadThisYear.forEach((b) => {
      const author = b.author?.trim();
      if (author && author !== 'Unknown' && author !== 'Unknown Author') {
        authorCounts[author] = (authorCounts[author] || 0) + 1;
      }
    });
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Monthly breakdown
    const monthlyCompleted = MONTH_NAMES.map((name, i) => {
      const count = booksCompleted.filter((b) => {
        const d = b.lastRead ? new Date(b.lastRead) : b.dateAdded ? new Date(b.dateAdded) : null;
        return d && d.getMonth() === i;
      }).length;
      return { name, count };
    });

    const monthlyAdded = MONTH_NAMES.map((name, i) => {
      const count = booksAddedThisYear.filter((b) => {
        return new Date(b.dateAdded).getMonth() === i;
      }).length;
      return { name, count };
    });

    const maxMonthlyCompleted = Math.max(...monthlyCompleted.map((m) => m.count), 1);
    const maxMonthlyAdded = Math.max(...monthlyAdded.map((m) => m.count), 1);

    return {
      booksAddedCount: booksAddedThisYear.length,
      booksCompletedCount: booksCompleted.length,
      booksStartedCount: booksStarted.length,
      pagesRead,
      topFormats,
      topAuthors,
      monthlyCompleted,
      monthlyAdded,
      maxMonthlyCompleted,
      maxMonthlyAdded,
    };
  }, [books, selectedYear]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Year in Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Year selector */}
        <View style={styles.yearSelector}>
          <Pressable
            onPress={() => {
              const idx = availableYears.indexOf(selectedYear);
              if (idx < availableYears.length - 1) {
                setSelectedYear(availableYears[idx + 1]);
              }
            }}
            style={[styles.yearArrow, { opacity: availableYears.indexOf(selectedYear) < availableYears.length - 1 ? 1 : 0.3 }]}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.yearText, { color: theme.text }]}>{selectedYear}</Text>
          <Pressable
            onPress={() => {
              const idx = availableYears.indexOf(selectedYear);
              if (idx > 0) {
                setSelectedYear(availableYears[idx - 1]);
              }
            }}
            style={[styles.yearArrow, { opacity: availableYears.indexOf(selectedYear) > 0 ? 1 : 0.3 }]}
          >
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </Pressable>
        </View>

        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.heroYear}>{selectedYear}</Text>
          <Text style={styles.heroLabel}>Your Reading Year</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{yearStats.booksCompletedCount}</Text>
              <Text style={styles.heroStatLabel}>Completed</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{yearStats.booksStartedCount}</Text>
              <Text style={styles.heroStatLabel}>Started</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{yearStats.booksAddedCount}</Text>
              <Text style={styles.heroStatLabel}>Added</Text>
            </View>
          </View>
        </View>

        {/* Key metrics cards */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="document-text" size={22} color={theme.primary} />
            <Text style={[styles.metricValue, { color: theme.text }]}>
              {yearStats.pagesRead > 0 ? yearStats.pagesRead.toLocaleString() : '--'}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
              Pages Read (est.)
            </Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="library" size={22} color={theme.accent} />
            <Text style={[styles.metricValue, { color: theme.text }]}>
              {yearStats.topFormats.length}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
              Formats Read
            </Text>
          </View>
        </View>

        {/* Top Formats */}
        {yearStats.topFormats.length > 0 && (
          <>
            <SectionHeader title="Top Formats" icon="layers" theme={theme} />
            <View style={[styles.formatsCard, { backgroundColor: theme.surface }]}>
              {yearStats.topFormats.map(([format, count], index) => {
                const color = FORMAT_COLORS[format] || '#607D8B';
                const maxCount = yearStats.topFormats[0][1] as number;
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <View key={format} style={styles.formatRow}>
                    <View style={[styles.formatBadge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.formatBadgeText, { color }]}>
                        {format.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.formatBarContainer}>
                      <View
                        style={[
                          styles.formatBar,
                          {
                            width: `${pct}%`,
                            backgroundColor: color,
                            minWidth: 8,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.formatCount, { color: theme.text }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Top Authors */}
        {yearStats.topAuthors.length > 0 && (
          <>
            <SectionHeader title="Top Authors" icon="person" theme={theme} />
            <View style={[styles.authorsCard, { backgroundColor: theme.surface }]}>
              {yearStats.topAuthors.map(([author, count], index) => (
                <View
                  key={author}
                  style={[
                    styles.authorRow,
                    index < yearStats.topAuthors.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <View style={[styles.authorMedal, { backgroundColor: getMedalColor(index) + '20' }]}>
                    <Text style={[styles.authorMedalText, { color: getMedalColor(index) }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text
                    style={[styles.authorName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {author}
                  </Text>
                  <Text style={[styles.authorCount, { color: theme.textSecondary }]}>
                    {count} {count === 1 ? 'book' : 'books'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Monthly Breakdown - Books Completed */}
        <SectionHeader title="Monthly Completed" icon="calendar" theme={theme} />
        <View style={[styles.monthlyCard, { backgroundColor: theme.surface }]}>
          {yearStats.monthlyCompleted.map((month) => (
            <View key={month.name} style={styles.monthRow}>
              <Text style={[styles.monthLabel, { color: theme.textSecondary }]}>
                {month.name}
              </Text>
              <View style={styles.monthBarContainer}>
                <View
                  style={[
                    styles.monthBar,
                    {
                      width: `${yearStats.maxMonthlyCompleted > 0 ? (month.count / yearStats.maxMonthlyCompleted) * 100 : 0}%`,
                      backgroundColor: theme.success,
                      minWidth: month.count > 0 ? 8 : 0,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.monthCount, { color: theme.text }]}>{month.count}</Text>
            </View>
          ))}
        </View>

        {/* Monthly Breakdown - Books Added */}
        <SectionHeader title="Monthly Added" icon="add-circle" theme={theme} />
        <View style={[styles.monthlyCard, { backgroundColor: theme.surface }]}>
          {yearStats.monthlyAdded.map((month) => (
            <View key={month.name} style={styles.monthRow}>
              <Text style={[styles.monthLabel, { color: theme.textSecondary }]}>
                {month.name}
              </Text>
              <View style={styles.monthBarContainer}>
                <View
                  style={[
                    styles.monthBar,
                    {
                      width: `${yearStats.maxMonthlyAdded > 0 ? (month.count / yearStats.maxMonthlyAdded) * 100 : 0}%`,
                      backgroundColor: theme.primary,
                      minWidth: month.count > 0 ? 8 : 0,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.monthCount, { color: theme.text }]}>{month.count}</Text>
            </View>
          ))}
        </View>

        {/* Empty state */}
        {yearStats.booksAddedCount === 0 && yearStats.booksStartedCount === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="book-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No reading activity found for {selectedYear}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              Start reading to see your year in review!
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function getMedalColor(index: number): string {
  switch (index) {
    case 0: return '#FFD700';
    case 1: return '#C0C0C0';
    case 2: return '#CD7F32';
    default: return '#607D8B';
  }
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40 },

  // Year selector
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  yearArrow: { padding: 8 },
  yearText: { fontSize: 28, fontWeight: '800' },

  // Hero card
  heroCard: { borderRadius: 20, padding: 28, alignItems: 'center' },
  heroYear: { fontSize: 48, fontWeight: '800', color: '#fff' },
  heroLabel: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  heroStats: { flexDirection: 'row', marginTop: 24, gap: 0, alignItems: 'center' },
  heroStat: { alignItems: 'center', paddingHorizontal: 20 },
  heroStatValue: { fontSize: 32, fontWeight: '700', color: '#fff' },
  heroStatLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600' },

  // Metrics row
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  metricValue: { fontSize: 24, fontWeight: '700' },
  metricLabel: { fontSize: 12, textAlign: 'center' },

  // Formats
  formatsCard: { borderRadius: 12, padding: 16, gap: 10 },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  formatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  formatBadgeText: { fontSize: 12, fontWeight: '700' },
  formatBarContainer: { flex: 1, height: 12, justifyContent: 'center' },
  formatBar: { height: 8, borderRadius: 4 },
  formatCount: { width: 28, fontSize: 14, fontWeight: '600', textAlign: 'right' },

  // Authors
  authorsCard: { borderRadius: 12, overflow: 'hidden' },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  authorMedal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorMedalText: { fontSize: 14, fontWeight: '700' },
  authorName: { flex: 1, fontSize: 15, fontWeight: '500' },
  authorCount: { fontSize: 13 },

  // Monthly breakdown
  monthlyCard: { borderRadius: 12, padding: 16, gap: 4 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 26 },
  monthLabel: { width: 32, fontSize: 12, textAlign: 'right', fontWeight: '500' },
  monthBarContainer: { flex: 1, height: 14, justifyContent: 'center' },
  monthBar: { height: 10, borderRadius: 5 },
  monthCount: { width: 24, fontSize: 13, fontWeight: '600', textAlign: 'right' },

  // Empty state
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  emptyText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { fontSize: 14, textAlign: 'center' },
});
