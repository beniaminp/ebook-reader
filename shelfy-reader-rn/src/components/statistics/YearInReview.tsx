/**
 * YearInReview Component
 *
 * Year-end reading statistics visualization.
 * React Native version using View, Text, ScrollView, and Ionicons.
 */

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface YearInReviewStats {
  totalBooks: number;
  totalPages: number;
  totalMinutes: number;
  longestStreak: number;
  booksPerMonth: number[]; // 12 elements, jan-dec
  topGenres: Array<{ genre: string; count: number }>;
  topAuthors: Array<{ author: string; count: number }>;
  averageRating: number;
  fastestBook?: { title: string; days: number };
}

interface YearInReviewProps {
  year: number;
  stats: YearInReviewStats;
  onClose: () => void;
  onShare: () => void;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}k`;
  }
  return hours.toLocaleString();
}

function StarRating({ rating, color }: { rating: number; color: string }) {
  const stars: React.ReactNode[] = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const totalFull = hasHalf ? fullStars : Math.round(rating);

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Ionicons key={i} name="star" size={20} color="#FFD700" />,
      );
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <Ionicons key={i} name="star-half" size={20} color="#FFD700" />,
      );
    } else if (i < totalFull) {
      stars.push(
        <Ionicons key={i} name="star" size={20} color="#FFD700" />,
      );
    } else {
      stars.push(
        <Ionicons key={i} name="star-outline" size={20} color={color} />,
      );
    }
  }

  return <View style={styles.starsRow}>{stars}</View>;
}

const YearInReview: React.FC<YearInReviewProps> = ({
  year,
  stats,
  onClose,
  onShare,
}) => {
  const { theme } = useTheme();
  const maxBooksInMonth = Math.max(...stats.booksPerMonth, 1);
  const maxGenreCount =
    stats.topGenres.length > 0
      ? Math.max(...stats.topGenres.map((g) => g.count), 1)
      : 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close-outline" size={28} color={theme.text} />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {year} Year in Review
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Your reading journey this year
          </Text>
        </View>

        {/* Total Books - Hero Card */}
        <View style={[styles.card, styles.highlightCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.heroCardTitle}>Books Completed</Text>
          <Text style={styles.heroBigNumber}>{stats.totalBooks}</Text>
          <Text style={styles.heroLabel}>
            {stats.totalBooks === 1 ? 'book' : 'books'} read
          </Text>
        </View>

        {/* Pages and Hours */}
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: theme.surface }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stats.totalPages.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Pages
            </Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: theme.surface }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {formatHours(stats.totalMinutes)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Hours
            </Text>
          </View>
        </View>

        {/* Reading Streak */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
            Longest Reading Streak
          </Text>
          <View style={styles.streakRow}>
            <Ionicons name="flame-outline" size={32} color="#FF6B35" />
            <Text style={[styles.statValue, { color: theme.text, marginLeft: 8 }]}>
              {stats.longestStreak}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {stats.longestStreak === 1 ? 'day' : 'days'} in a row
          </Text>
        </View>

        {/* Monthly Chart */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
            Books Per Month
          </Text>
          <View style={styles.chart}>
            {stats.booksPerMonth.map((count, index) => {
              const heightPercent = (count / maxBooksInMonth) * 100;
              return (
                <View key={index} style={styles.chartBarWrapper}>
                  {count > 0 && (
                    <Text style={[styles.chartCount, { color: theme.text }]}>
                      {count}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: `${Math.max(heightPercent, 4)}%`,
                        backgroundColor:
                          count === 0 ? theme.surfaceVariant : theme.primary,
                      },
                    ]}
                  />
                  <Text style={[styles.chartLabel, { color: theme.textMuted }]}>
                    {MONTH_LABELS[index]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top Genres */}
        {stats.topGenres.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
              Top Genres
            </Text>
            {stats.topGenres.map((genre, index) => (
              <View key={index} style={styles.genreItem}>
                <View style={styles.genreInfo}>
                  <Text style={[styles.genreName, { color: theme.text }]}>
                    {genre.genre}
                  </Text>
                  <Text style={[styles.genreCount, { color: theme.textSecondary }]}>
                    {genre.count} {genre.count === 1 ? 'book' : 'books'}
                  </Text>
                </View>
                <View style={[styles.genreBarBg, { backgroundColor: theme.surfaceVariant }]}>
                  <View
                    style={[
                      styles.genreBarFill,
                      {
                        width: `${(genre.count / maxGenreCount) * 100}%`,
                        backgroundColor: theme.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Top Authors */}
        {stats.topAuthors.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
              Top Authors
            </Text>
            {stats.topAuthors.map((author, index) => (
              <View key={index} style={styles.authorItem}>
                <View style={[styles.authorRank, { backgroundColor: theme.surfaceVariant }]}>
                  <Text style={[styles.authorRankText, { color: theme.text }]}>
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={[styles.authorName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {author.author}
                </Text>
                <Text style={[styles.authorCount, { color: theme.textSecondary }]}>
                  {author.count} {author.count === 1 ? 'book' : 'books'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Average Rating */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
            Average Rating
          </Text>
          <View style={styles.ratingRow}>
            <StarRating rating={stats.averageRating} color={theme.textMuted} />
            <Text style={[styles.ratingValue, { color: theme.text }]}>
              {stats.averageRating.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Fastest Book */}
        {stats.fastestBook && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
              Fastest Read
            </Text>
            <View style={styles.fastestRow}>
              <Ionicons name="rocket-outline" size={28} color={theme.accent} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.fastestTitle, { color: theme.text }]}>
                  {stats.fastestBook.title}
                </Text>
                <Text style={[styles.fastestDays, { color: theme.textSecondary }]}>
                  Finished in {stats.fastestBook.days}{' '}
                  {stats.fastestBook.days === 1 ? 'day' : 'days'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Share Button */}
        <Pressable
          style={[styles.shareButton, { backgroundColor: theme.primary }]}
          onPress={onShare}
        >
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={styles.shareButtonText}>Share Your Year in Review</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },

  // Cards
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  highlightCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Hero card
  heroCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroBigNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: '#fff',
    marginVertical: 4,
  },
  heroLabel: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },

  // Streak
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  // Chart
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartCount: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  chartBar: {
    width: '60%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 10,
    marginTop: 4,
  },

  // Genres
  genreItem: {
    marginBottom: 12,
  },
  genreInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  genreName: {
    fontSize: 15,
    fontWeight: '500',
  },
  genreCount: {
    fontSize: 13,
  },
  genreBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  genreBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Authors
  authorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  authorRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorRankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  authorName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  authorCount: {
    fontSize: 13,
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Fastest book
  fastestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fastestTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  fastestDays: {
    fontSize: 14,
    marginTop: 2,
  },

  // Share button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default YearInReview;
