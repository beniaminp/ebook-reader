/**
 * RSVPReader Component
 *
 * Rapid Serial Visual Presentation - shows one word at a time for speed reading.
 * Highlights the "Optimal Recognition Point" (ORP) at ~1/3 of each word.
 *
 * Controls: play/pause, stop, speed adjustment (WPM).
 * Speed options: 200, 300, 400, 500, 600, 800 WPM.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

const WPM_OPTIONS = [200, 300, 400, 500, 600, 800] as const;

interface RSVPReaderProps {
  /** Whether the RSVP overlay is visible */
  visible: boolean;
  /** The text to display word by word */
  text: string;
  /** Close the overlay */
  onClose: () => void;
  /** Called when all words have been displayed */
  onComplete?: () => void;
}

/**
 * Calculate the Optimal Recognition Point for a word.
 * Approximately 1/3 of the way into the word.
 */
function getORP(word: string): number {
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 3) return 1;
  if (len <= 5) return 2;
  return Math.floor(len * 0.33);
}

/**
 * Calculate display delay for a word based on length and punctuation.
 * Longer words and sentence-ending punctuation get extra time.
 */
function getWordDelay(word: string, baseMs: number): number {
  let multiplier = 1;
  if (word.length > 8) multiplier += 0.3;
  if (/[.!?]$/.test(word)) multiplier += 0.8;
  if (/[,;:]$/.test(word)) multiplier += 0.4;
  return baseMs * multiplier;
}

export const RSVPReader: React.FC<RSVPReaderProps> = ({
  visible,
  text,
  onClose,
  onComplete,
}) => {
  const { theme } = useTheme();

  const [wpm, setWpm] = useState(300);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const words = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse text into words
  useEffect(() => {
    words.current = text.split(/\s+/).filter((w) => w.length > 0);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [text]);

  // Reset when overlay closes
  useEffect(() => {
    if (!visible) {
      setIsPlaying(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [visible]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const scheduleNext = useCallback(() => {
    const baseMs = 60000 / wpm;
    const word = words.current[currentIndex] || '';
    const delay = getWordDelay(word, baseMs);

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= words.current.length) {
          setIsPlaying(false);
          onComplete?.();
          return prev;
        }
        return next;
      });
    }, delay);
  }, [wpm, currentIndex, onComplete]);

  useEffect(() => {
    if (isPlaying && currentIndex < words.current.length) {
      scheduleNext();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, scheduleNext]);

  const togglePlay = () => {
    if (currentIndex >= words.current.length) {
      setCurrentIndex(0);
    }
    setIsPlaying((p) => !p);
  };

  const handleStop = () => {
    stop();
    setCurrentIndex(0);
  };

  const currentWord = words.current[currentIndex] || '';
  const orp = getORP(currentWord);
  const beforeORP = currentWord.slice(0, orp);
  const orpChar = currentWord[orp] || '';
  const afterORP = currentWord.slice(orp + 1);

  const totalWords = words.current.length;
  const progress = totalWords > 0 ? ((currentIndex + 1) / totalWords) * 100 : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.background + 'F5' }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="speedometer-outline" size={22} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>
              Speed Reading
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={theme.textMuted} />
          </Pressable>
        </View>

        {/* Word display area */}
        <View style={styles.displayArea}>
          {/* Guide line */}
          <View style={[styles.guideLine, { backgroundColor: theme.error }]} />

          {/* Word */}
          <View style={styles.wordContainer}>
            <Text style={styles.wordRow}>
              <Text style={[styles.wordBefore, { color: theme.text }]}>
                {beforeORP}
              </Text>
              <Text style={[styles.wordORP, { color: theme.error }]}>
                {orpChar}
              </Text>
              <Text style={[styles.wordAfter, { color: theme.text }]}>
                {afterORP}
              </Text>
            </Text>
          </View>

          {/* Guide line */}
          <View style={[styles.guideLine, { backgroundColor: theme.error }]} />
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.primary,
                width: `${progress}%`,
              },
            ]}
          />
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            {currentIndex + 1} / {totalWords}
          </Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            {wpm} WPM
          </Text>
        </View>

        {/* Playback controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={handleStop}
            disabled={!isPlaying && currentIndex === 0}
            style={[
              styles.controlButtonOutline,
              { borderColor: theme.border },
              !isPlaying && currentIndex === 0 && styles.disabled,
            ]}
          >
            <Ionicons name="stop" size={22} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={togglePlay}
            style={[styles.playButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={30}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* WPM selector */}
        <View style={styles.speedSection}>
          <Text style={[styles.speedLabel, { color: theme.textSecondary }]}>
            Speed (WPM)
          </Text>
          <View style={styles.speedRow}>
            {WPM_OPTIONS.map((w) => (
              <Pressable
                key={w}
                onPress={() => {
                  if (!isPlaying) setWpm(w);
                }}
                disabled={isPlaying}
                style={[
                  styles.speedChip,
                  { borderColor: theme.border },
                  wpm === w && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                  isPlaying && styles.disabled,
                ]}
              >
                <Text
                  style={[
                    styles.speedChipText,
                    { color: theme.text },
                    wpm === w && { color: '#FFFFFF' },
                  ]}
                >
                  {w}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },

  /* Word display */
  displayArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginBottom: 20,
  },
  guideLine: {
    width: 2,
    height: 20,
    alignSelf: 'center',
  },
  wordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    paddingVertical: 8,
  },
  wordRow: {
    fontSize: 40,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  wordBefore: {
    fontSize: 40,
    fontWeight: '400',
  },
  wordORP: {
    fontSize: 40,
    fontWeight: '700',
  },
  wordAfter: {
    fontSize: 40,
    fontWeight: '400',
  },

  /* Progress */
  progressBar: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  /* Info */
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  infoText: {
    fontSize: 13,
  },

  /* Controls */
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 32,
  },
  controlButtonOutline: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Speed selector */
  speedSection: {
    alignItems: 'center',
  },
  speedLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  speedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  speedChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  speedChipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  disabled: {
    opacity: 0.4,
  },
});

export default RSVPReader;
