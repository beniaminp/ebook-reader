import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';

const ONBOARDING_KEY = 'shelfy_onboarding_done';

interface OnboardingStep {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: 'book-outline',
    title: 'Welcome to Shelfy!',
    description:
      'Import EPUB, PDF, MOBI, and 10+ formats. Tap the + button to get started.',
  },
  {
    icon: 'hand-left-outline',
    title: 'Reading Controls',
    description:
      'Tap left/right edges to turn pages. Tap the center to show the toolbar with themes, fonts, and reading tools.',
  },
  {
    icon: 'color-palette-outline',
    title: 'Customize Your Experience',
    description:
      'Choose from 11 themes, adjust fonts, enable bionic reading, and more in Settings.',
  },
];

export function OnboardingOverlay() {
  const { theme } = useTheme();
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(true); // start hidden until we check storage
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setDismissed(val === 'true');
      setLoading(false);
    });
  }, []);

  const dismiss = useCallback(async () => {
    setDismissed(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // Silently fail
    }
  }, []);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  if (loading || dismissed) return null;

  const current = STEPS[step];

  return (
    <View style={styles.overlay}>
      <View
        style={[styles.card, { backgroundColor: theme.background }]}
      >
        <Ionicons
          name={current.icon}
          size={48}
          color={theme.primary}
          style={styles.icon}
        />

        <Text style={[styles.title, { color: theme.text }]}>
          {current.title}
        </Text>

        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {current.description}
        </Text>

        {/* Step indicators */}
        <View style={styles.indicators}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.indicator,
                {
                  width: i === step ? 24 : 8,
                  backgroundColor:
                    i === step ? theme.primary : theme.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <Pressable onPress={dismiss} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.textMuted }]}>
              Skip
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNext}
            style={[styles.nextBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.nextText}>
              {step < STEPS.length - 1 ? 'Next' : 'Get Started'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 32,
    maxWidth: 340,
    width: '100%',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nextBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OnboardingOverlay;
