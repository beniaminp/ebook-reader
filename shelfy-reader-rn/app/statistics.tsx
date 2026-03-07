import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { useAppStore } from '../src/stores/useAppStore';
import type { Book } from '../src/types/index';

// --- Helper components ---

function StatCard({
  label,
  value,
  icon,
  color,
  theme,
}: {
  label: string;
  value: string;
  icon: string;
  color?: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <Ionicons name={icon as any} size={24} color={color || theme.primary} />
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

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
      <Ionicons name={icon as any} size={20} color={theme.primary} />
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
    </View>
  );
}

function FormatPill({
  format,
  count,
  color,
  theme,
}: {
  format: string;
  count: number;
  color: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={[styles.formatPill, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[styles.formatPillText, { color }]}>
        {format.toUpperCase()}
      </Text>
      <View style={[styles.formatPillBadge, { backgroundColor: color }]}>
        <Text style={styles.formatPillCount}>{count}</Text>
      </View>
    </View>
  );
}

function ProgressBar({
  label,
  count,
  total,
  color,
  theme,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.progressBarRow}>
      <View style={styles.progressBarLabelRow}>
        <Text style={[styles.progressBarLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.progressBarCount, { color: theme.textSecondary }]}>
          {count} {count === 1 ? 'book' : 'books'}
        </Text>
      </View>
      <View style={[styles.progressBarTrack, { backgroundColor: theme.surfaceVariant }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.max(pct, 0.5)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

// --- Color palette for formats ---
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

const PROGRESS_COLORS = ['#9E9E9E', '#EF5350', '#FF9800', '#FFC107', '#8BC34A', '#4CAF50'];

// --- Main screen ---

export default function StatisticsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const books = useAppStore((s) => s.books);

  const stats = useMemo(() => {
    const totalBooks = books.length;
    const finishedBooks = books.filter((b) => (b.progress ?? 0) >= 0.99).length;
    const inProgressBooks = books.filter(
      (b) => (b.progress ?? 0) > 0 && (b.progress ?? 0) < 0.99
    ).length;
    const unreadBooks = totalBooks - finishedBooks - inProgressBooks;

    // Format distribution
    const formatCounts: Record<string, number> = {};
    books.forEach((b) => {
      const fmt = b.format || 'unknown';
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
    });
    const formatEntries = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]);

    // Top authors
    const authorCounts: Record<string, number> = {};
    books.forEach((b) => {
      const author = b.author?.trim();
      if (author && author !== 'Unknown' && author !== 'Unknown Author') {
        authorCounts[author] = (authorCounts[author] || 0) + 1;
      }
    });
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Progress distribution
    const progressBuckets = [
      { label: 'Not started (0%)', min: 0, max: 0 },
      { label: '1% - 25%', min: 0.001, max: 0.25 },
      { label: '26% - 50%', min: 0.251, max: 0.50 },
      { label: '51% - 75%', min: 0.501, max: 0.75 },
      { label: '76% - 99%', min: 0.751, max: 0.989 },
      { label: 'Completed (100%)', min: 0.99, max: 1.0 },
    ];
    const progressCounts = progressBuckets.map((bucket) => {
      const count = books.filter((b) => {
        const p = b.progress ?? 0;
        if (bucket.min === 0 && bucket.max === 0) return p === 0;
        return p >= bucket.min && p <= bucket.max;
      }).length;
      return { ...bucket, count };
    });

    // Library growth by month (last 12 months)
    const now = new Date();
    const monthlyGrowth: { label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const count = books.filter((b) => {
        if (!b.dateAdded) return false;
        const added = new Date(b.dateAdded);
        return added.getFullYear() === year && added.getMonth() === month;
      }).length;
      monthlyGrowth.push({ label, count });
    }
    const maxMonthly = Math.max(...monthlyGrowth.map((m) => m.count), 1);

    // Total pages estimate
    const totalPages = books.reduce((sum, b) => {
      const pages = b.pageCount || b.metadata?.pageCount || b.totalPages || 0;
      return sum + pages;
    }, 0);

    // Average progress
    const avgProgress =
      totalBooks > 0
        ? books.reduce((sum, b) => sum + (b.progress ?? 0), 0) / totalBooks
        : 0;

    return {
      totalBooks,
      finishedBooks,
      inProgressBooks,
      unreadBooks,
      formatEntries,
      topAuthors,
      progressCounts,
      monthlyGrowth,
      maxMonthly,
      totalPages,
      avgProgress,
    };
  }, [books]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Statistics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Overview Cards */}
        <SectionHeader title="Overview" icon="analytics" theme={theme} />
        <View style={styles.statsGrid}>
          <StatCard label="Total Books" value={stats.totalBooks.toString()} icon="library" theme={theme} />
          <StatCard
            label="Finished"
            value={stats.finishedBooks.toString()}
            icon="checkmark-circle"
            color={theme.success}
            theme={theme}
          />
          <StatCard
            label="In Progress"
            value={stats.inProgressBooks.toString()}
            icon="book"
            color={theme.warning}
            theme={theme}
          />
          <StatCard
            label="Unread"
            value={stats.unreadBooks.toString()}
            icon="eye-off"
            color={theme.textMuted}
            theme={theme}
          />
        </View>

        {/* Extra stats row */}
        <View style={[styles.extraStatsRow, { backgroundColor: theme.surface }]}>
          <View style={styles.extraStatItem}>
            <Text style={[styles.extraStatValue, { color: theme.primary }]}>
              {stats.totalPages > 0 ? stats.totalPages.toLocaleString() : '--'}
            </Text>
            <Text style={[styles.extraStatLabel, { color: theme.textSecondary }]}>
              Total Pages
            </Text>
          </View>
          <View style={[styles.extraStatDivider, { backgroundColor: theme.border }]} />
          <View style={styles.extraStatItem}>
            <Text style={[styles.extraStatValue, { color: theme.primary }]}>
              {Math.round(stats.avgProgress * 100)}%
            </Text>
            <Text style={[styles.extraStatLabel, { color: theme.textSecondary }]}>
              Avg. Progress
            </Text>
          </View>
          <View style={[styles.extraStatDivider, { backgroundColor: theme.border }]} />
          <View style={styles.extraStatItem}>
            <Text style={[styles.extraStatValue, { color: theme.primary }]}>
              {stats.formatEntries.length}
            </Text>
            <Text style={[styles.extraStatLabel, { color: theme.textSecondary }]}>
              Formats
            </Text>
          </View>
        </View>

        {/* Reading by Format */}
        {stats.formatEntries.length > 0 && (
          <>
            <SectionHeader title="Books by Format" icon="document-text" theme={theme} />
            <View style={[styles.formatContainer, { backgroundColor: theme.surface }]}>
              <View style={styles.formatPillsWrap}>
                {stats.formatEntries.map(([format, count]) => (
                  <FormatPill
                    key={format}
                    format={format}
                    count={count}
                    color={FORMAT_COLORS[format] || '#607D8B'}
                    theme={theme}
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {/* Reading Progress Distribution */}
        <SectionHeader title="Progress Distribution" icon="bar-chart" theme={theme} />
        <View style={[styles.progressSection, { backgroundColor: theme.surface }]}>
          {stats.progressCounts.map((bucket, i) => (
            <ProgressBar
              key={bucket.label}
              label={bucket.label}
              count={bucket.count}
              total={stats.totalBooks}
              color={PROGRESS_COLORS[i] || '#9E9E9E'}
              theme={theme}
            />
          ))}
        </View>

        {/* Top Authors */}
        {stats.topAuthors.length > 0 && (
          <>
            <SectionHeader title="Top Authors" icon="person" theme={theme} />
            <View style={[styles.authorsSection, { backgroundColor: theme.surface }]}>
              {stats.topAuthors.map(([author, count], index) => (
                <View
                  key={author}
                  style={[
                    styles.authorRow,
                    index < stats.topAuthors.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <View style={[styles.authorRank, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.authorRankText, { color: theme.primary }]}>
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

        {/* Library Growth */}
        <SectionHeader title="Library Growth (Last 12 Months)" icon="trending-up" theme={theme} />
        <View style={[styles.growthSection, { backgroundColor: theme.surface }]}>
          {stats.monthlyGrowth.map((month) => (
            <View key={month.label} style={styles.growthRow}>
              <Text style={[styles.growthLabel, { color: theme.textSecondary }]}>
                {month.label}
              </Text>
              <View style={styles.growthBarContainer}>
                <View
                  style={[
                    styles.growthBar,
                    {
                      width: `${stats.maxMonthly > 0 ? (month.count / stats.maxMonthly) * 100 : 0}%`,
                      backgroundColor: theme.primary,
                      minWidth: month.count > 0 ? 8 : 0,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.growthCount, { color: theme.text }]}>{month.count}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 13 },

  // Extra stats row
  extraStatsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  extraStatItem: { flex: 1, alignItems: 'center' },
  extraStatValue: { fontSize: 20, fontWeight: '700' },
  extraStatLabel: { fontSize: 12, marginTop: 4 },
  extraStatDivider: { width: 1, height: 32 },

  // Format pills
  formatContainer: { borderRadius: 12, padding: 16 },
  formatPillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  formatPillText: { fontSize: 13, fontWeight: '600' },
  formatPillBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  formatPillCount: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Progress bars
  progressSection: { borderRadius: 12, padding: 16, gap: 12 },
  progressBarRow: { gap: 6 },
  progressBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarLabel: { fontSize: 13, fontWeight: '500' },
  progressBarCount: { fontSize: 12 },
  progressBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  // Authors
  authorsSection: { borderRadius: 12, overflow: 'hidden' },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  authorRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorRankText: { fontSize: 14, fontWeight: '700' },
  authorName: { flex: 1, fontSize: 15, fontWeight: '500' },
  authorCount: { fontSize: 13 },

  // Library growth
  growthSection: { borderRadius: 12, padding: 16, gap: 6 },
  growthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 24 },
  growthLabel: { width: 56, fontSize: 11, textAlign: 'right' },
  growthBarContainer: { flex: 1, height: 12, justifyContent: 'center' },
  growthBar: { height: 8, borderRadius: 4 },
  growthCount: { width: 28, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});
