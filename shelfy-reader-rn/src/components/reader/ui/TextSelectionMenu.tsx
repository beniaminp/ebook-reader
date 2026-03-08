/**
 * TextSelectionMenu - Floating action bar for text selection in the reader.
 *
 * Appears near the selected text with actions: Highlight (with color picker),
 * Copy, Define, Translate, and Note. Uses Reanimated for smooth fade-in/out.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  type LayoutChangeEvent,
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

const HIGHLIGHT_COLORS = [
  { key: 'yellow', label: 'Yellow' },
  { key: 'green', label: 'Green' },
  { key: 'blue', label: 'Blue' },
  { key: 'pink', label: 'Pink' },
] as const;

type HighlightColorKey = (typeof HIGHLIGHT_COLORS)[number]['key'];

/** Map highlight color keys to theme color fields. */
const HIGHLIGHT_THEME_MAP: Record<HighlightColorKey, string> = {
  yellow: 'highlightYellow',
  green: 'highlightGreen',
  blue: 'highlightBlue',
  pink: 'highlightPink',
};

interface TextSelectionMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  selectedText: string;
  onHighlight: (color: string) => void;
  onCopy: () => void;
  onDefine: () => void;
  onTranslate: () => void;
  onNote: () => void;
  onDismiss: () => void;
}

export function TextSelectionMenu({
  visible,
  position,
  selectedText,
  onHighlight,
  onCopy,
  onDefine,
  onTranslate,
  onNote,
  onDismiss,
}: TextSelectionMenuProps) {
  const { theme } = useTheme();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [menuWidth, setMenuWidth] = useState(0);
  const [menuHeight, setMenuHeight] = useState(0);

  const opacity = useSharedValue(visible ? 1 : 0);

  React.useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 150 });
    if (!visible) {
      setShowColorPicker(false);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMenuWidth(width);
    setMenuHeight(height);
  };

  const handleHighlightPress = () => {
    setShowColorPicker(!showColorPicker);
  };

  const handleColorSelect = (colorKey: string) => {
    onHighlight(colorKey);
    setShowColorPicker(false);
  };

  if (!visible || !selectedText) {
    return null;
  }

  // Clamp menu position so it stays on screen
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const MARGIN = 8;

  let left = position.x - menuWidth / 2;
  let top = position.y - menuHeight - 12;

  // Keep within horizontal bounds
  if (left < MARGIN) left = MARGIN;
  if (left + menuWidth > screenWidth - MARGIN) {
    left = screenWidth - MARGIN - menuWidth;
  }

  // If it would go above the screen, place below the selection instead
  if (top < MARGIN) {
    top = position.y + 12;
  }

  // If it would go below the screen, clamp to bottom
  if (top + menuHeight > screenHeight - MARGIN) {
    top = screenHeight - MARGIN - menuHeight;
  }

  const previewText =
    selectedText.length > 60
      ? `\u201C${selectedText.slice(0, 60)}...\u201D`
      : `\u201C${selectedText}\u201D`;

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          top,
          left,
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.text,
        },
      ]}
      onLayout={handleLayout}
    >
      {/* Selected text preview */}
      <Text
        numberOfLines={1}
        style={[styles.previewText, { color: theme.textSecondary }]}
      >
        {previewText}
      </Text>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={handleHighlightPress}
          style={[
            styles.actionButton,
            showColorPicker && {
              backgroundColor: theme.warning + '20',
            },
          ]}
        >
          <Ionicons name="bookmark" size={18} color={theme.warning} />
          <Text style={[styles.actionLabel, { color: theme.text }]}>
            Highlight
          </Text>
        </Pressable>

        <Pressable onPress={onCopy} style={styles.actionButton}>
          <Ionicons name="copy-outline" size={18} color={theme.textSecondary} />
          <Text style={[styles.actionLabel, { color: theme.text }]}>Copy</Text>
        </Pressable>

        <Pressable onPress={onDefine} style={styles.actionButton}>
          <Ionicons
            name="glasses-outline"
            size={18}
            color={theme.success}
          />
          <Text style={[styles.actionLabel, { color: theme.text }]}>
            Define
          </Text>
        </Pressable>

        <Pressable onPress={onTranslate} style={styles.actionButton}>
          <Ionicons name="language-outline" size={18} color={theme.primary} />
          <Text style={[styles.actionLabel, { color: theme.text }]}>
            Translate
          </Text>
        </Pressable>

        <Pressable onPress={onNote} style={styles.actionButton}>
          <Ionicons name="create-outline" size={18} color={theme.accent} />
          <Text style={[styles.actionLabel, { color: theme.text }]}>Note</Text>
        </Pressable>

        <Pressable onPress={onDismiss} style={styles.actionButton}>
          <Ionicons
            name="close-outline"
            size={18}
            color={theme.textMuted}
          />
        </Pressable>
      </View>

      {/* Color picker row (shown when Highlight is tapped) */}
      {showColorPicker && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={styles.colorPickerRow}
        >
          {HIGHLIGHT_COLORS.map((c) => {
            const themeKey = HIGHLIGHT_THEME_MAP[c.key] as keyof typeof theme;
            const color = theme[themeKey] as string;
            return (
              <Pressable
                key={c.key}
                onPress={() => handleColorSelect(c.key)}
                style={[styles.colorSwatch, { backgroundColor: color }]}
              >
                <Text style={styles.colorSwatchLabel}>{c.label}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 200,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 200,
    maxWidth: 340,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  previewText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000020',
  },
  colorSwatch: {
    width: 56,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
});

export default TextSelectionMenu;
