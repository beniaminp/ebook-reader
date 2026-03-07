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

interface ReaderToolbarProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSettingsPress: () => void;
  onBookmarkPress: () => void;
}

export function ReaderToolbar({
  visible,
  title,
  onClose,
  onSettingsPress,
  onBookmarkPress,
}: ReaderToolbarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(visible ? 0 : -120);

  React.useEffect(() => {
    translateY.value = withTiming(visible ? 0 : -120, { duration: 200 });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

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
});
