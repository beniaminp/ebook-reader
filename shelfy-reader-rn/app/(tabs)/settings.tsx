import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../../src/theme/ThemeContext';
import { useThemeStore } from '../../src/stores/useThemeStore';
import type { ThemeType } from '../../src/services/themeService';
import { themes, themeNames } from '../../src/theme/themes';

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { borderBottomColor: theme.border }]}
    >
      <Ionicons name={icon as any} size={22} color={theme.primary} />
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      {rightElement ??
        (value ? (
          <Text style={{ color: theme.textSecondary, fontSize: 15 }}>
            {value}
          </Text>
        ) : null)}
      {onPress && !rightElement && (
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      )}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const currentTheme = useThemeStore((s) => s.currentTheme);
  const setTheme = useThemeStore((s) => s.setCurrentTheme);
  const bionicReading = useThemeStore((s) => s.bionicReading);
  const setBionicReading = useThemeStore((s) => s.setBionicReading);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        paddingTop: insets.top,
      }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="APPEARANCE" />
        <View style={styles.themeRow}>
          {themeNames.map((name) => {
            const t = themes[name];
            const isActive = name === currentTheme;
            return (
              <Pressable
                key={name}
                onPress={() => setTheme(name as ThemeType)}
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
                  style={[
                    styles.themeCircle,
                    { backgroundColor: t.text },
                  ]}
                />
                <Text
                  style={{
                    fontSize: 10,
                    color: t.text,
                    marginTop: 4,
                    textTransform: 'capitalize',
                  }}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionHeader title="READING" />
        <SettingsRow
          icon="text"
          label="Bionic Reading"
          rightElement={
            <Switch
              value={bionicReading}
              onValueChange={setBionicReading}
              trackColor={{ true: theme.primary }}
            />
          }
        />

        <SectionHeader title="SYNC & SERVICES" />
        <SettingsRow
          icon="cloud"
          label="Cloud Sync"
          onPress={() => router.push('/cloud-sync')}
        />
        <SettingsRow
          icon="server"
          label="Calibre-Web"
          onPress={() => router.push('/calibre-web')}
        />

        <SectionHeader title="DATA" />
        <SettingsRow
          icon="stats-chart"
          label="Statistics"
          onPress={() => router.push('/statistics')}
        />
        <SettingsRow
          icon="trophy"
          label="Reading Goals"
          onPress={() => router.push('/reading-goals')}
        />
        <SettingsRow
          icon="calendar"
          label="Year in Review"
          onPress={() => router.push('/year-in-review')}
        />

        <SectionHeader title="ABOUT" />
        <SettingsRow icon="information-circle" label="Version" value={appVersion} />
        <SettingsRow
          icon="logo-github"
          label="Source Code"
          onPress={() => Linking.openURL('https://github.com/beniaminp/ebook-reader')}
        />
        <SettingsRow
          icon="bug"
          label="Report Issue"
          onPress={() => Linking.openURL('https://github.com/beniaminp/ebook-reader/issues')}
        />
        <SettingsRow
          icon="heart"
          label="About Shelfy Reader"
          onPress={() =>
            Alert.alert(
              'Shelfy Reader',
              `Version ${appVersion}\n\nA free, open-source ebook reader supporting EPUB, PDF, MOBI, CBZ/CBR, and more.\n\nBuilt with React Native & Expo.`,
              [{ text: 'OK' }]
            )
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 28, fontWeight: '700' },
  content: { paddingBottom: 32 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  themeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    flexWrap: 'wrap',
  },
  themeChip: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
