import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useThemeStore } from '../../../stores/useThemeStore';
import type { ThemeType } from '../../../services/themeService';

const THEME_CYCLE: ThemeType[] = ['light', 'sepia', 'dark'];
const THEME_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  light: 'sunny-outline',
  sepia: 'book-outline',
  dark: 'moon-outline',
};

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 36;
const FONT_SIZE_STEP = 1;

interface ReaderToolbarProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSettingsPress: () => void;
  onBookmarkPress: () => void;
  onToggleTTS?: () => void;
  ttsActive?: boolean;
}

export function ReaderToolbar({
  visible,
  title,
  onClose,
  onSettingsPress,
  onBookmarkPress,
  onToggleTTS,
  ttsActive = false,
}: ReaderToolbarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(visible ? 0 : -120);
  const { fontSize, setFontSize, theme: currentThemeType, setTheme } = useThemeStore();

  React.useEffect(() => {
    translateY.value = withTiming(visible ? 0 : -120, { duration: 200 });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleFontDecrease = () => {
    const newSize = Math.max(MIN_FONT_SIZE, fontSize - FONT_SIZE_STEP);
    setFontSize(newSize);
  };

  const handleFontIncrease = () => {
    const newSize = Math.min(MAX_FONT_SIZE, fontSize + FONT_SIZE_STEP);
    setFontSize(newSize);
  };

  const handleCycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(currentThemeType as ThemeType);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  };

  const themeIcon = THEME_ICONS[currentThemeType] || 'contrast-outline';

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          backgroundColor: theme.background + 'F0',
          paddingTop: insets.top + 8,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <Pressable onPress={onClose} style={styles.iconButton}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>
      <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>

      {/* Font size decrease */}
      <Pressable onPress={handleFontDecrease} style={styles.smallButton}>
        <Text style={[styles.fontSizeLabel, { color: theme.text, fontSize: 13 }]}>A-</Text>
      </Pressable>

      {/* Font size increase */}
      <Pressable onPress={handleFontIncrease} style={styles.smallButton}>
        <Text style={[styles.fontSizeLabel, { color: theme.text, fontSize: 17 }]}>A+</Text>
      </Pressable>

      {/* Quick theme cycle */}
      <Pressable onPress={handleCycleTheme} style={styles.iconButton}>
        <Ionicons name={themeIcon} size={20} color={theme.text} />
      </Pressable>

      {/* TTS toggle */}
      {onToggleTTS && (
        <Pressable onPress={onToggleTTS} style={styles.iconButton}>
          <Ionicons
            name={ttsActive ? 'volume-high' : 'volume-high-outline'}
            size={20}
            color={ttsActive ? theme.primary : theme.text}
          />
        </Pressable>
      )}

      <Pressable onPress={onBookmarkPress} style={styles.iconButton}>
        <Ionicons name="bookmark-outline" size={22} color={theme.text} />
      </Pressable>
      <Pressable onPress={onSettingsPress} style={styles.iconButton}>
        <Ionicons name="settings-outline" size={22} color={theme.text} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  iconButton: {
    padding: 8,
  },
  smallButton: {
    padding: 4,
    paddingHorizontal: 6,
  },
  fontSizeLabel: {
    fontWeight: '700',
  },
});
