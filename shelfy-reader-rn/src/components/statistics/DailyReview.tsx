/**
 * DailyReview Component
 *
 * Spaced repetition flashcard review for book highlights.
 * React Native version using View, Text, Pressable, and Ionicons.
 *
 * This is the *component* version, distinct from the app/daily-review.tsx page
 * which shows reading goals and streaks. This component handles the
 * spaced-repetition highlight review cards.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import {
  getCardsForReview,
  rateCard,
  getReviewStats,
  type ReviewCard,
  type ReviewRating,
} from '../../services/spacedRepetitionService';

const DailyReview: React.FC = () => {
  const { theme } = useTheme();
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [totalReviewed, setTotalReviewed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [totalDue, setTotalDue] = useState(0);

  const loadCards = useCallback(() => {
    const due = getCardsForReview();
    const stats = getReviewStats();
    setCards(due);
    setTotalDue(due.length + stats.reviewed);
    setTotalReviewed(stats.reviewed);
    setCurrentIndex(0);
    setRevealed(false);
    setFinished(due.length === 0 && stats.reviewed > 0);
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const currentCard = cards[currentIndex] ?? null;
  const progress =
    totalDue > 0 ? (totalReviewed + currentIndex) / totalDue : 0;

  const handleRate = (rating: ReviewRating) => {
    if (!currentCard) return;
    rateCard(currentCard.highlightId, rating);
    setRevealed(false);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setTotalReviewed((prev) => prev + currentIndex + 1);
      setFinished(true);
    }
  };

  const handleReveal = () => {
    setRevealed(true);
  };

  // Empty state: no cards at all
  if (cards.length === 0 && !finished) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
          <Ionicons name="book-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No Reviews Due
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Add highlights to your review deck from any book to start building
            your knowledge with spaced repetition.
          </Text>
        </View>
      </View>
    );
  }

  // Finished state: all cards reviewed
  if (finished) {
    const stats = getReviewStats();
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.doneCard, { backgroundColor: theme.surface }]}>
          <Ionicons
            name="checkmark-circle-outline"
            size={56}
            color={theme.success}
          />
          <Text style={[styles.doneTitle, { color: theme.text }]}>
            All Done!
          </Text>
          <Text style={[styles.doneText, { color: theme.textSecondary }]}>
            {stats.reviewed} {stats.reviewed === 1 ? 'card' : 'cards'} reviewed
            today
          </Text>
          <Pressable
            style={[styles.restartButton, { borderColor: theme.primary }]}
            onPress={loadCards}
          >
            <Ionicons name="refresh-outline" size={18} color={theme.primary} />
            <Text style={[styles.restartButtonText, { color: theme.primary }]}>
              Check Again
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const accentColor = currentCard?.color || '#ffd54f';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
          {currentIndex + 1} of {cards.length}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: theme.surfaceVariant }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progress * 100, 100)}%`,
                backgroundColor: theme.primary,
              },
            ]}
          />
        </View>
      </View>

      {/* Flashcard */}
      <Pressable
        style={[styles.flashcard, { backgroundColor: theme.surface }]}
        onPress={!revealed && currentCard?.note ? handleReveal : undefined}
      >
        {/* Accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        {/* Highlight text */}
        <View style={[styles.highlightBg, { backgroundColor: accentColor + '30' }]}>
          <Text style={[styles.highlightText, { color: theme.text }]}>
            &ldquo;{currentCard?.text}&rdquo;
          </Text>
        </View>

        {/* Book info */}
        <View style={styles.bookInfo}>
          <Ionicons name="book-outline" size={16} color={theme.textMuted} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text
              style={[styles.bookTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {currentCard?.bookTitle}
            </Text>
            {currentCard?.author ? (
              <Text
                style={[styles.bookAuthor, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {currentCard.author}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Note section */}
        {currentCard?.note && (
          <View style={styles.noteSection}>
            {!revealed ? (
              <Pressable
                style={[styles.revealButton, { backgroundColor: theme.surfaceVariant }]}
                onPress={handleReveal}
              >
                <Text style={[styles.revealButtonText, { color: theme.textSecondary }]}>
                  Tap to reveal note
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.noteContainer, { borderTopColor: theme.border }]}>
                <Text style={[styles.noteLabel, { color: theme.textMuted }]}>
                  Your note:
                </Text>
                <Text style={[styles.noteText, { color: theme.text }]}>
                  {currentCard.note}
                </Text>
              </View>
            )}
          </View>
        )}
      </Pressable>

      {/* Rating buttons */}
      <View style={styles.ratingRow}>
        <Pressable
          style={[styles.rateButton, { backgroundColor: '#ef5350' }]}
          onPress={() => handleRate('again')}
        >
          <Text style={styles.rateButtonText}>Again</Text>
        </Pressable>
        <Pressable
          style={[styles.rateButton, { backgroundColor: '#ff9800' }]}
          onPress={() => handleRate('hard')}
        >
          <Text style={styles.rateButtonText}>Hard</Text>
        </Pressable>
        <Pressable
          style={[styles.rateButton, { backgroundColor: '#66bb6a' }]}
          onPress={() => handleRate('good')}
        >
          <Text style={styles.rateButtonText}>Good</Text>
        </Pressable>
        <Pressable
          style={[styles.rateButton, { backgroundColor: '#42a5f5' }]}
          onPress={() => handleRate('easy')}
        >
          <Text style={styles.rateButtonText}>Easy</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  // Empty / Done states
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  doneCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  doneText: {
    fontSize: 15,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  restartButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Flashcard
  flashcard: {
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
    marginBottom: 16,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  highlightBg: {
    padding: 20,
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
  },
  highlightText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  bookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  bookAuthor: {
    fontSize: 12,
    marginTop: 2,
  },

  // Note
  noteSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  revealButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  revealButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noteContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Rating buttons
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rateButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default DailyReview;
