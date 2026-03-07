import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useThemeStore } from '../../../stores/useThemeStore';
import type { ThemeType, TextAlignment } from '../../../services/themeService';
import { themes, themeNames } from '../../../theme/themes';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  onFontSizeChange?: (size: number) => void;
}

export function SettingsSheet({
  visible,
  onClose,
  onFontSizeChange,
}: SettingsSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const store = useThemeStore();

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(32, store.fontSize + delta));
    store.setFontSize(newSize);
    onFontSizeChange?.(newSize);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.handle} />
          <ScrollView>
            {/* Theme Selection */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              THEME
            </Text>
            <View style={styles.themeRow}>
              {themeNames.map((name) => {
                const t = themes[name];
                const isActive = name === store.currentTheme;
                return (
                  <Pressable
                    key={name}
                    onPress={() => store.setCurrentTheme(name as ThemeType)}
                    style={[
                      styles.themeChip,
                      {
                        backgroundColor: t.background,
                        borderColor: isActive ? theme.primary : theme.border,
                        borderWidth: isActive ? 2 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[styles.themeCircle, { backgroundColor: t.text }]}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Font Size */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              FONT SIZE
            </Text>
            <View style={styles.fontSizeRow}>
              <Pressable
                onPress={() => adjustFontSize(-2)}
                style={[styles.fontButton, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontSize: 14 }}>A-</Text>
              </Pressable>
              <Text style={[styles.fontSizeValue, { color: theme.text }]}>
                {store.fontSize}px
              </Text>
              <Pressable
                onPress={() => adjustFontSize(2)}
                style={[styles.fontButton, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontSize: 20 }}>A+</Text>
              </Pressable>
            </View>

            {/* Line Height */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              LINE HEIGHT
            </Text>
            <View style={styles.fontSizeRow}>
              {[1.2, 1.4, 1.6, 1.8, 2.0].map((lh) => (
                <Pressable
                  key={lh}
                  onPress={() => store.setLineHeight(lh)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor:
                        store.lineHeight === lh ? theme.primary : theme.surface,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: store.lineHeight === lh ? '#fff' : theme.text,
                      fontSize: 13,
                    }}
                  >
                    {lh}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Text Align */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              TEXT ALIGN
            </Text>
            <View style={styles.fontSizeRow}>
              {['left', 'justify', 'center', 'right'].map((align) => (
                <Pressable
                  key={align}
                  onPress={() => store.setTextAlign(align as TextAlignment)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor:
                        store.textAlign === align ? theme.primary : theme.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      align === 'left'
                        ? 'reorder-three'
                        : align === 'justify'
                          ? 'menu'
                          : align === 'center'
                            ? 'reorder-two'
                            : 'reorder-four'
                    }
                    size={18}
                    color={store.textAlign === align ? '#fff' : theme.text}
                  />
                </Pressable>
              ))}
            </View>

            {/* Bionic Reading */}
            <View
              style={[
                styles.switchRow,
                { borderTopColor: theme.border },
              ]}
            >
              <Text style={{ color: theme.text, fontSize: 16 }}>
                Bionic Reading
              </Text>
              <Switch
                value={store.bionicReading}
                onValueChange={store.setBionicReading}
                trackColor={{ true: theme.primary }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  themeChip: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  fontSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  fontButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'center',
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
