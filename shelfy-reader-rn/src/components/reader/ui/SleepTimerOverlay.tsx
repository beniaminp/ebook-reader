/**
 * SleepTimerOverlay Component
 *
 * Displays sleep timer status in the reader:
 * - Small corner overlay showing countdown when timer is active
 * - Full-screen dimming overlay when timer expires
 * - Preset durations: 5, 10, 15, 30, 45, 60 min, or custom
 * - Cancel / extend controls
 *
 * Uses useSleepTimer hook for all timer logic.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useSleepTimer } from '../../../hooks/useSleepTimer';

/** Preset durations in minutes */
const PRESETS = [5, 10, 15, 30, 45, 60] as const;

interface SleepTimerOverlayProps {
  /** Called when the timer expires (e.g. stop TTS, pause reading) */
  onExpire?: () => void;
}

export function SleepTimerOverlay({ onExpire }: SleepTimerOverlayProps) {
  const { theme } = useTheme();
  const {
    isActive,
    mode,
    formattedTime,
    progressFraction,
    hasExpired,
    startTimer,
    startEndOfChapter,
    stopTimer,
    extendTimer,
    dismissExpired,
  } = useSleepTimer({ onExpire });

  const [pickerVisible, setPickerVisible] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');

  // --- Corner countdown badge (shown while timer is active) ---
  const badgeOpacity = useSharedValue(isActive ? 1 : 0);

  React.useEffect(() => {
    badgeOpacity.value = withTiming(isActive ? 1 : 0, { duration: 300 });
  }, [isActive]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
  }));

  const handlePresetPress = (minutes: number) => {
    startTimer(minutes);
    setPickerVisible(false);
  };

  const handleCustomStart = () => {
    const mins = parseInt(customMinutes, 10);
    if (mins > 0 && mins <= 480) {
      startTimer(mins);
      setCustomMinutes('');
      setPickerVisible(false);
    }
  };

  const handleEndOfChapter = () => {
    startEndOfChapter();
    setPickerVisible(false);
  };

  const formatPresetLabel = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hrs} hr`;
    return `${hrs}h ${mins}m`;
  };

  return (
    <>
      {/* Corner countdown badge */}
      {isActive && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[
            styles.badge,
            { backgroundColor: theme.surface + 'E0' },
          ]}
        >
          <Pressable
            onPress={() => setPickerVisible(true)}
            style={styles.badgeContent}
          >
            <Ionicons name="moon-outline" size={14} color={theme.primary} />
            <Text style={[styles.badgeText, { color: theme.text }]}>
              {formattedTime}
            </Text>
          </Pressable>
          <Pressable onPress={stopTimer} style={styles.badgeClose}>
            <Ionicons name="close" size={14} color={theme.textMuted} />
          </Pressable>
        </Animated.View>
      )}

      {/* Expiry full-screen overlay */}
      {hasExpired && (
        <Animated.View
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(400)}
          style={styles.expiryOverlay}
        >
          <Pressable style={styles.expiryBackdrop} onPress={dismissExpired}>
            <View
              style={[styles.expiryCard, { backgroundColor: theme.surface }]}
            >
              <Ionicons
                name="moon-outline"
                size={48}
                color={theme.primary}
                style={styles.expiryIcon}
              />
              <Text style={[styles.expiryTitle, { color: theme.text }]}>
                Sleep Timer Ended
              </Text>
              <Text
                style={[styles.expirySubtitle, { color: theme.textSecondary }]}
              >
                Your reading session has been paused. Sweet dreams!
              </Text>
              <View style={styles.expiryActions}>
                <Pressable
                  onPress={dismissExpired}
                  style={[
                    styles.expiryButton,
                    { borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="close-outline"
                    size={18}
                    color={theme.text}
                  />
                  <Text style={[styles.expiryButtonText, { color: theme.text }]}>
                    Dismiss
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    dismissExpired();
                    extendTimer(15);
                  }}
                  style={[
                    styles.expiryButton,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Ionicons
                    name="timer-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={[styles.expiryButtonText, { color: '#FFFFFF' }]}>
                    +15 min
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    dismissExpired();
                    extendTimer(30);
                  }}
                  style={[
                    styles.expiryButton,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Ionicons
                    name="timer-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={[styles.expiryButtonText, { color: '#FFFFFF' }]}>
                    +30 min
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      )}

      {/* Timer picker modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPickerVisible(false)}
        >
          <View
            style={[styles.pickerCard, { backgroundColor: theme.surface }]}
          >
            <View style={styles.pickerHeader}>
              <Ionicons
                name="timer-outline"
                size={22}
                color={theme.primary}
              />
              <Text style={[styles.pickerTitle, { color: theme.text }]}>
                Sleep Timer
              </Text>
            </View>

            {isActive ? (
              /* Active timer controls */
              <View style={styles.activeSection}>
                <Text style={[styles.activeTime, { color: theme.text }]}>
                  {formattedTime}
                </Text>
                <Text
                  style={[styles.activeLabel, { color: theme.textSecondary }]}
                >
                  {mode === 'end-of-chapter'
                    ? 'Stops at end of chapter'
                    : 'remaining'}
                </Text>
                {mode === 'time' && (
                  <View
                    style={[
                      styles.progressBar,
                      { backgroundColor: theme.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: theme.primary,
                          width: `${progressFraction * 100}%`,
                        },
                      ]}
                    />
                  </View>
                )}
                <View style={styles.activeActions}>
                  {mode === 'time' && (
                    <>
                      <Pressable
                        onPress={() => extendTimer(5)}
                        style={[
                          styles.chipButton,
                          { borderColor: theme.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipButtonText,
                            { color: theme.primary },
                          ]}
                        >
                          +5 min
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => extendTimer(15)}
                        style={[
                          styles.chipButton,
                          { borderColor: theme.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipButtonText,
                            { color: theme.primary },
                          ]}
                        >
                          +15 min
                        </Text>
                      </Pressable>
                    </>
                  )}
                  <Pressable
                    onPress={() => {
                      stopTimer();
                      setPickerVisible(false);
                    }}
                    style={[
                      styles.chipButton,
                      { borderColor: theme.error },
                    ]}
                  >
                    <Text
                      style={[styles.chipButtonText, { color: theme.error }]}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* Preset selection */
              <View style={styles.presetsSection}>
                {/* End of chapter */}
                <Pressable
                  onPress={handleEndOfChapter}
                  style={[
                    styles.presetButton,
                    { borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="book-outline"
                    size={16}
                    color={theme.primary}
                  />
                  <Text
                    style={[
                      styles.presetButtonText,
                      { color: theme.text },
                    ]}
                  >
                    End of chapter
                  </Text>
                </Pressable>

                {/* Time presets */}
                <View style={styles.presetGrid}>
                  {PRESETS.map((mins) => (
                    <Pressable
                      key={mins}
                      onPress={() => handlePresetPress(mins)}
                      style={[
                        styles.presetGridItem,
                        { borderColor: theme.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetGridItemText,
                          { color: theme.text },
                        ]}
                      >
                        {formatPresetLabel(mins)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Custom input */}
                <View style={styles.customRow}>
                  <TextInput
                    style={[
                      styles.customInput,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                      },
                    ]}
                    placeholder="Custom"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                    value={customMinutes}
                    onChangeText={setCustomMinutes}
                    onSubmitEditing={handleCustomStart}
                  />
                  <Text
                    style={[styles.customLabel, { color: theme.textSecondary }]}
                  >
                    min
                  </Text>
                  <Pressable
                    onPress={handleCustomStart}
                    disabled={
                      !customMinutes || parseInt(customMinutes, 10) <= 0
                    }
                    style={[
                      styles.customStartButton,
                      { backgroundColor: theme.primary },
                      (!customMinutes || parseInt(customMinutes, 10) <= 0) &&
                        styles.disabledButton,
                    ]}
                  >
                    <Text style={styles.customStartButtonText}>Start</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  /* Corner badge */
  badge: {
    position: 'absolute',
    top: 60,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    zIndex: 90,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeClose: {
    padding: 4,
    marginLeft: 2,
  },

  /* Expiry overlay */
  expiryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  expiryBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  expiryCard: {
    width: SCREEN_WIDTH * 0.82,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  expiryIcon: {
    marginBottom: 12,
  },
  expiryTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  expirySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  expiryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  expiryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  expiryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* Modal / Picker */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 16,
    padding: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  /* Active timer section */
  activeSection: {
    alignItems: 'center',
  },
  activeTime: {
    fontSize: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  activeLabel: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  activeActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chipButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Preset selection section */
  presetsSection: {},
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
  },
  presetButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  presetGridItem: {
    width: '30%',
    flexGrow: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  presetGridItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  customLabel: {
    fontSize: 14,
  },
  customStartButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  customStartButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.4,
  },
});

export default SleepTimerOverlay;
