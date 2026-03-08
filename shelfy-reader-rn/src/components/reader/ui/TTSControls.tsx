/**
 * TTSControls - Floating mini-player for Text-to-Speech playback.
 *
 * Renders a bottom bar with play/pause, stop, skip forward/back,
 * and a speed selector. Uses Reanimated for smooth slide-in/out.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

const RATE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

interface TTSControlsProps {
  visible: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  rate: number;
  onRateChange: (rate: number) => void;
}

export function TTSControls({
  visible,
  isPlaying,
  onPlay,
  onPause,
  onStop,
  onPrevious,
  onNext,
  rate,
  onRateChange,
}: TTSControlsProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [showRatePicker, setShowRatePicker] = useState(false);

  const translateY = useSharedValue(visible ? 0 : 120);

  React.useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 120, { duration: 200 });
    if (!visible) {
      setShowRatePicker(false);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const handleRateSelect = (newRate: number) => {
    onRateChange(newRate);
    setShowRatePicker(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          backgroundColor: theme.surface + 'F5',
          borderTopColor: theme.border,
          paddingBottom: insets.bottom + 8,
          shadowColor: theme.text,
        },
      ]}
    >
      {/* Rate picker overlay */}
      {showRatePicker && (
        <View
          style={[
            styles.ratePickerContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.text,
            },
          ]}
        >
          <Text style={[styles.ratePickerTitle, { color: theme.textSecondary }]}>
            Speed
          </Text>
          <View style={styles.ratePickerRow}>
            {RATE_OPTIONS.map((r) => {
              const isActive = Math.abs(rate - r) < 0.01;
              return (
                <Pressable
                  key={r}
                  onPress={() => handleRateSelect(r)}
                  style={[
                    styles.rateOption,
                    {
                      backgroundColor: isActive
                        ? theme.primary
                        : theme.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rateOptionText,
                      {
                        color: isActive ? '#FFFFFF' : theme.text,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {r}x
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* TTS header with icon and rate badge */}
      <View style={styles.headerRow}>
        <Ionicons
          name="volume-high-outline"
          size={16}
          color={theme.primary}
        />
        <Text style={[styles.headerLabel, { color: theme.textSecondary }]}>
          Text-to-Speech
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => setShowRatePicker(!showRatePicker)}
          style={[styles.rateBadge, { backgroundColor: theme.primary + '20' }]}
        >
          <Text style={[styles.rateBadgeText, { color: theme.primary }]}>
            {rate.toFixed(rate % 1 === 0 ? 0 : 2)}x
          </Text>
        </Pressable>
        <Pressable onPress={onStop} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={theme.textMuted} />
        </Pressable>
      </View>

      {/* Playback controls */}
      <View style={styles.controlsRow}>
        <Pressable onPress={onPrevious} style={styles.controlButton}>
          <Ionicons
            name="play-skip-back"
            size={22}
            color={theme.text}
          />
        </Pressable>

        <Pressable
          onPress={handlePlayPause}
          style={[
            styles.playPauseButton,
            { backgroundColor: theme.primary },
          ]}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={26}
            color="#FFFFFF"
          />
        </Pressable>

        <Pressable onPress={onNext} style={styles.controlButton}>
          <Ionicons
            name="play-skip-forward"
            size={22}
            color={theme.text}
          />
        </Pressable>

        <Pressable onPress={onStop} style={styles.controlButton}>
          <Ionicons name="stop" size={22} color={theme.error} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  rateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rateBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
    marginLeft: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 4,
  },
  controlButton: {
    padding: 10,
  },
  playPauseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratePickerContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 16,
    right: 16,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  ratePickerTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  ratePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 6,
  },
  rateOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  rateOptionText: {
    fontSize: 13,
  },
});

export default TTSControls;
