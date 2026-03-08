import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import type { Book } from '../types';

/** Threshold in milliseconds for showing the welcome back prompt (24 hours) */
const BREAK_THRESHOLD_MS = 24 * 60 * 60 * 1000;

const LAST_DISMISS_KEY = 'ebook_welcome_back_dismissed_at';
const LAST_VISIT_KEY = 'ebook_last_visit_at';

interface WelcomeBackCardProps {
  books: Book[];
  onContinueReading: (bookId: string) => void;
}

export function WelcomeBackCard({
  books,
  onContinueReading,
}: WelcomeBackCardProps) {
  const { theme } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Find the most recently read book that is in progress
  const lastReadBook = useMemo(() => {
    const inProgressBooks = books
      .filter((b) => b.progress > 0 && b.progress < 1)
      .sort((a, b) => {
        const aTime = a.lastRead instanceof Date ? a.lastRead.getTime() : 0;
        const bTime = b.lastRead instanceof Date ? b.lastRead.getTime() : 0;
        return bTime - aTime;
      });
    return inProgressBooks[0] || null;
  }, [books]);

  // Determine if we should show the welcome back card
  useEffect(() => {
    const checkVisibility = async () => {
      const now = Date.now();

      try {
        const lastVisit = await AsyncStorage.getItem(LAST_VISIT_KEY);
        const lastDismiss = await AsyncStorage.getItem(LAST_DISMISS_KEY);

        // Always update last visit time
        await AsyncStorage.setItem(LAST_VISIT_KEY, String(now));

        if (!lastReadBook) {
          setShouldShow(false);
          return;
        }

        // Check if user has been away long enough
        if (lastVisit) {
          const timeSinceVisit = now - parseInt(lastVisit, 10);
          if (timeSinceVisit < BREAK_THRESHOLD_MS) {
            setShouldShow(false);
            return;
          }
        } else {
          // First visit ever -- don't show welcome back
          setShouldShow(false);
          return;
        }

        // Check if the card was recently dismissed (within last 2 hours)
        if (lastDismiss) {
          const timeSinceDismiss = now - parseInt(lastDismiss, 10);
          if (timeSinceDismiss < 2 * 60 * 60 * 1000) {
            setShouldShow(false);
            return;
          }
        }

        setShouldShow(true);
      } catch {
        // Silently fail
      }
    };

    checkVisibility();
  }, [lastReadBook]);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    try {
      await AsyncStorage.setItem(LAST_DISMISS_KEY, String(Date.now()));
    } catch {
      // Silently fail
    }
  }, []);

  const handleContinueReading = useCallback(() => {
    if (lastReadBook) {
      onContinueReading(lastReadBook.id);
    }
  }, [lastReadBook, onContinueReading]);

  // Format time since last read
  const timeSinceLastRead = useMemo(() => {
    if (!lastReadBook?.lastRead) return '';

    const lastReadTime =
      lastReadBook.lastRead instanceof Date
        ? lastReadBook.lastRead.getTime()
        : 0;
    if (lastReadTime === 0) return '';

    const diffMs = Date.now() - lastReadTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    return 'recently';
  }, [lastReadBook]);

  if (!shouldShow || dismissed || !lastReadBook) {
    return null;
  }

  const progressPercent = Math.min(
    100,
    Math.round(lastReadBook.progress * 100)
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Dismiss button */}
      <Pressable
        onPress={handleDismiss}
        style={styles.dismissBtn}
        hitSlop={8}
      >
        <Ionicons name="close-outline" size={20} color={theme.textMuted} />
      </Pressable>

      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={[styles.greetingTitle, { color: theme.text }]}>
          Welcome back!
        </Text>
        <Text style={[styles.greetingSub, { color: theme.textSecondary }]}>
          You were last reading {timeSinceLastRead}
        </Text>
      </View>

      {/* Book info */}
      <Pressable onPress={handleContinueReading} style={styles.bookRow}>
        <View
          style={[
            styles.cover,
            { backgroundColor: theme.surfaceVariant },
          ]}
        >
          {lastReadBook.coverPath ? (
            <Image
              source={{ uri: lastReadBook.coverPath }}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Ionicons name="book-outline" size={24} color={theme.textMuted} />
          )}
        </View>

        <View style={styles.bookInfo}>
          <Text
            numberOfLines={1}
            style={[styles.bookTitle, { color: theme.text }]}
          >
            {lastReadBook.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.bookAuthor, { color: theme.textSecondary }]}
          >
            {lastReadBook.author}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressRow}>
            <View
              style={[styles.progressBar, { backgroundColor: theme.border }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${progressPercent}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.progressText, { color: theme.textMuted }]}
            >
              {progressPercent}%
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Continue reading button */}
      <Pressable
        onPress={handleContinueReading}
        style={[styles.continueBtn, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.continueBtnText}>Continue Reading</Text>
        <Ionicons name="arrow-forward-outline" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  dismissBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 4,
  },
  greeting: {
    marginBottom: 12,
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  greetingSub: {
    fontSize: 13,
    marginTop: 2,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cover: {
    width: 48,
    height: 64,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  bookAuthor: {
    fontSize: 13,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default WelcomeBackCard;
