/**
 * PomodoroTimer Component
 *
 * A Pomodoro / study timer overlay for focused reading sessions.
 * Shows circular progress indicator with countdown, start/pause/reset controls,
 * and alerts when work/break phases end.
 *
 * Work durations: 15, 20, 25, 30, 45, 60 min
 * Break durations: 3, 5, 10 min
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

type TimerPhase = 'idle' | 'work' | 'break';

const WORK_DURATIONS = [15, 20, 25, 30, 45, 60] as const;
const BREAK_DURATIONS = [3, 5, 10] as const;

const CIRCLE_SIZE = 160;
const STROKE_WIDTH = 8;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface PomodoroTimerProps {
  /** Whether the overlay modal is visible */
  visible: boolean;
  /** Close the overlay */
  onClose: () => void;
  /** Called when a work session completes (with minutes worked) */
  onSessionComplete?: (minutes: number) => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  visible,
  onClose,
  onSessionComplete,
}) => {
  const { theme } = useTheme();

  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Tick the countdown
  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return clearTimer;
  }, [isRunning, clearTimer]);

  // Animate the progress ring
  useEffect(() => {
    const totalSeconds =
      phase === 'work'
        ? workMinutes * 60
        : phase === 'break'
          ? breakMinutes * 60
          : 0;

    const fraction = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

    Animated.timing(progressAnim, {
      toValue: fraction,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [secondsLeft, phase, workMinutes, breakMinutes, progressAnim]);

  // Handle timer completion
  useEffect(() => {
    if (secondsLeft === 0 && phase !== 'idle' && !isRunning) {
      if (phase === 'work') {
        setSessionsCompleted((prev) => prev + 1);
        onSessionComplete?.(workMinutes);
        Alert.alert(
          'Focus Session Complete',
          `Great work! Take a ${breakMinutes} minute break.`,
          [
            {
              text: 'Start Break',
              onPress: () => {
                setPhase('break');
                setSecondsLeft(breakMinutes * 60);
                setIsRunning(true);
              },
            },
            { text: 'Skip Break', style: 'cancel' },
          ],
        );
      } else if (phase === 'break') {
        Alert.alert('Break Over', 'Ready for another focus session?', [
          {
            text: 'Start Session',
            onPress: () => startWork(),
          },
          {
            text: 'Done',
            style: 'cancel',
            onPress: () => setPhase('idle'),
          },
        ]);
      }
    }
  }, [secondsLeft, phase, isRunning, workMinutes, breakMinutes, onSessionComplete]);

  const startWork = () => {
    setPhase('work');
    setSecondsLeft(workMinutes * 60);
    setIsRunning(true);
  };

  const togglePause = () => {
    setIsRunning((prev) => !prev);
  };

  const reset = () => {
    clearTimer();
    setPhase('idle');
    setIsRunning(false);
    setSecondsLeft(0);
  };

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const phaseLabel =
    phase === 'idle'
      ? 'Focus Timer'
      : phase === 'work'
        ? 'Focus Session'
        : 'Break Time';

  const phaseColor = phase === 'break' ? theme.success : theme.primary;

  // The animated stroke dash offset for the circular progress
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="timer-outline" size={22} color={phaseColor} />
              <Text style={[styles.title, { color: theme.text }]}>
                {phaseLabel}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>

          {phase === 'idle' ? (
            /* Setup screen */
            <View style={styles.setup}>
              {/* Work duration selector */}
              <Text style={[styles.optionLabel, { color: theme.textSecondary }]}>
                Work Duration
              </Text>
              <View style={styles.chipRow}>
                {WORK_DURATIONS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setWorkMinutes(d)}
                    style={[
                      styles.chip,
                      { borderColor: theme.border },
                      workMinutes === d && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.text },
                        workMinutes === d && { color: '#FFFFFF' },
                      ]}
                    >
                      {d}m
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Break duration selector */}
              <Text style={[styles.optionLabel, { color: theme.textSecondary }]}>
                Break Duration
              </Text>
              <View style={styles.chipRow}>
                {BREAK_DURATIONS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setBreakMinutes(d)}
                    style={[
                      styles.chip,
                      { borderColor: theme.border },
                      breakMinutes === d && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.text },
                        breakMinutes === d && { color: '#FFFFFF' },
                      ]}
                    >
                      {d}m
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Start button */}
              <Pressable
                onPress={startWork}
                style={[styles.startButton, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="play" size={18} color="#FFFFFF" />
                <Text style={styles.startButtonText}>
                  Start {workMinutes}m Session
                </Text>
              </Pressable>

              {sessionsCompleted > 0 && (
                <Text
                  style={[styles.sessionCount, { color: theme.textSecondary }]}
                >
                  {sessionsCompleted} session
                  {sessionsCompleted !== 1 ? 's' : ''} completed
                </Text>
              )}
            </View>
          ) : (
            /* Active timer screen */
            <View style={styles.active}>
              {/* Circular progress */}
              <View
                style={[
                  styles.ring,
                  { width: CIRCLE_SIZE, height: CIRCLE_SIZE },
                ]}
              >
                {/* Background ring */}
                <View
                  style={[
                    styles.ringTrack,
                    {
                      width: CIRCLE_SIZE,
                      height: CIRCLE_SIZE,
                      borderRadius: CIRCLE_SIZE / 2,
                      borderWidth: STROKE_WIDTH,
                      borderColor: theme.border,
                    },
                  ]}
                />
                {/* Progress bar approximation using a bordered view with clip */}
                <View style={styles.ringCenter}>
                  <Text style={[styles.timeText, { color: theme.text }]}>
                    {formatTime(secondsLeft)}
                  </Text>
                  <Text
                    style={[styles.phaseText, { color: phaseColor }]}
                  >
                    {phase === 'work' ? 'FOCUS' : 'BREAK'}
                  </Text>
                </View>
                {/* Progress indicator - a simple bottom bar instead of SVG ring */}
              </View>

              {/* Linear progress bar as supplement */}
              <View
                style={[styles.progressBar, { backgroundColor: theme.border }]}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: phaseColor,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              {/* Controls */}
              <View style={styles.controls}>
                <Pressable
                  onPress={togglePause}
                  style={[
                    styles.controlButton,
                    { backgroundColor: phaseColor },
                  ]}
                >
                  <Ionicons
                    name={isRunning ? 'pause' : 'play'}
                    size={28}
                    color="#FFFFFF"
                  />
                </Pressable>
                <Pressable
                  onPress={reset}
                  style={[
                    styles.controlButtonOutline,
                    { borderColor: theme.error },
                  ]}
                >
                  <Ionicons name="refresh" size={22} color={theme.error} />
                </Pressable>
              </View>

              {sessionsCompleted > 0 && (
                <Text
                  style={[styles.sessionCount, { color: theme.textSecondary }]}
                >
                  {sessionsCompleted} session
                  {sessionsCompleted !== 1 ? 's' : ''} completed
                </Text>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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

  /* Setup */
  setup: {
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sessionCount: {
    fontSize: 13,
    marginTop: 12,
  },

  /* Active timer */
  active: {
    alignItems: 'center',
  },
  ring: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  ringTrack: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonOutline: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
});

export default PomodoroTimer;
