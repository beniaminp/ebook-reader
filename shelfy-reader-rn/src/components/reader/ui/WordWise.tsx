import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

interface WordWiseProps {
  enabled: boolean;
  level: number; // 1-5, higher = more words get hints
  word: string;
  definition?: string;
}

/**
 * WordWise - Displays simple definitions above difficult words in the reader text.
 *
 * Renders a compact ruby-annotation-style hint above the word. When disabled or
 * when no definition is available, it renders just the word without annotation.
 *
 * The `level` prop (1-5) controls how many words receive hints in the reader.
 * This component itself simply renders the annotation; the parent is responsible
 * for deciding which words get definitions based on the level.
 *
 * Styling inspired by the Ionic CSS version: small, semi-transparent superscript
 * text that doesn't break text flow.
 */
export function WordWise({ enabled, level: _level, word, definition }: WordWiseProps) {
  const { theme } = useTheme();

  // When disabled or no definition, render the word inline without annotation
  if (!enabled || !definition) {
    return <Text style={{ color: theme.readerText }}>{word}</Text>;
  }

  return (
    <View style={styles.container}>
      {/* Hint text above the word (ruby rt equivalent) */}
      <Text
        style={[
          styles.hint,
          { color: theme.readerAccent },
        ]}
        numberOfLines={1}
      >
        {definition}
      </Text>
      {/* The actual word */}
      <Text style={[styles.word, { color: theme.readerText }]}>{word}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    // Inline-style: the container should not break text flow.
    // Use flexShrink to allow wrapping alongside other inline elements.
    flexShrink: 0,
  },
  hint: {
    fontSize: 9,
    fontWeight: '400',
    fontStyle: 'normal',
    opacity: 0.65,
    lineHeight: 11,
    textAlign: 'center',
    letterSpacing: 0,
    // Prevent hint text from being selectable
    // (matches user-select: none in CSS version)
  },
  word: {
    fontSize: 16,
    lineHeight: 22,
  },
});

export default WordWise;
