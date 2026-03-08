import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../../src/theme/ThemeContext';
import { useThemeStore } from '../../src/stores/useThemeStore';
import { useAppStore } from '../../src/stores/useAppStore';
import { useReadingGoalsStore } from '../../src/stores/useReadingGoalsStore';
import type { ThemeType, FontFamily, TextAlignment } from '../../src/services/themeService';
import { themes, themeNames } from '../../src/theme/themes';

// ── Reusable components ──────────────────────────────────────

function SettingsRow({
  icon,
  label,
  subtitle,
  value,
  onPress,
  rightElement,
}: {
  icon: string;
  label: string;
  subtitle?: string;
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
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        {subtitle ? (
          <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      {rightElement ??
        (value ? (
          <Text style={{ color: theme.textSecondary, fontSize: 15 }}>{value}</Text>
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

// ── Font options ────────────────────────────────────────────

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'mono', label: 'Monospace' },
  { value: 'literata', label: 'Literata' },
];

const ALIGN_OPTIONS: { value: TextAlignment; label: string; icon: string }[] = [
  { value: 'left', label: 'Left', icon: 'reorder-three' },
  { value: 'justify', label: 'Justify', icon: 'menu' },
  { value: 'center', label: 'Center', icon: 'reorder-three' },
  { value: 'right', label: 'Right', icon: 'reorder-three' },
];

// ── Helpers ─────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── Main screen ─────────────────────────────────────────────

export default function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Theme store
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const setThemeFn = useThemeStore((s) => s.setCurrentTheme);
  const fontFamily = useThemeStore((s) => s.fontFamily);
  const setFontFamily = useThemeStore((s) => s.setFontFamily);
  const fontSize = useThemeStore((s) => s.fontSize);
  const setFontSize = useThemeStore((s) => s.setFontSize);
  const lineHeight = useThemeStore((s) => s.lineHeight);
  const setLineHeight = useThemeStore((s) => s.setLineHeight);
  const textAlign = useThemeStore((s) => s.textAlign);
  const setTextAlign = useThemeStore((s) => s.setTextAlign);
  const bionicReading = useThemeStore((s) => s.bionicReading);
  const setBionicReading = useThemeStore((s) => s.setBionicReading);
  const blueLightFilter = useThemeStore((s) => s.blueLightFilter);
  const setBlueLightFilter = useThemeStore((s) => s.setBlueLightFilter);
  const readingRuler = useThemeStore((s) => s.readingRuler);
  const setReadingRuler = useThemeStore((s) => s.setReadingRuler);
  const autoScroll = useThemeStore((s) => s.autoScroll);
  const setAutoScroll = useThemeStore((s) => s.setAutoScroll);
  const autoScrollSpeed = useThemeStore((s) => s.autoScrollSpeed);
  const setAutoScrollSpeed = useThemeStore((s) => s.setAutoScrollSpeed);
  const tapSensitivity = useThemeStore((s) => s.tapSensitivity);
  const setTapSensitivity = useThemeStore((s) => s.setTapSensitivity);
  const swipeThreshold = useThemeStore((s) => s.swipeThreshold);
  const setSwipeThreshold = useThemeStore((s) => s.setSwipeThreshold);
  const resetSettings = useThemeStore((s) => s.resetSettings);

  // App store
  const books = useAppStore((s) => s.books);
  const loadBooks = useAppStore((s) => s.loadBooks);
  const totalStorageBytes = books.reduce((sum, b) => sum + (b.fileSize || 0), 0);

  // Reading goals
  const streakEnabled = useReadingGoalsStore((s) => s.enabled);
  const dailyGoalMinutes = useReadingGoalsStore((s) => s.dailyGoalMinutes);
  const currentStreak = useReadingGoalsStore((s) => s.currentStreak);

  // Local state
  const [isEnriching, setIsEnriching] = useState(false);
  const [isFetchingCovers, setIsFetchingCovers] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // Handlers
  const handleFontSelect = () => {
    Alert.alert('Font Family', undefined, [
      ...FONT_OPTIONS.map((opt) => ({
        text: `${opt.label}${fontFamily === opt.value ? ' ✓' : ''}`,
        onPress: () => setFontFamily(opt.value),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleAlignSelect = () => {
    Alert.alert('Text Alignment', undefined, [
      ...ALIGN_OPTIONS.map((opt) => ({
        text: `${opt.label}${textAlign === opt.value ? ' ✓' : ''}`,
        onPress: () => setTextAlign(opt.value),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleEnrichAll = async () => {
    setIsEnriching(true);
    try {
      const { enrichAllBooks } = await import('../../src/services/metadataLookupService');
      const count = await enrichAllBooks(books);
      if (count > 0) await loadBooks();
      Alert.alert('Done', count > 0 ? `Enriched ${count} books with metadata` : 'All books already have metadata');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Enrichment failed');
    } finally {
      setIsEnriching(false);
    }
  };

  const handleFetchMissingCovers = async () => {
    const booksWithoutCovers = books.filter((b) => !b.coverPath);
    if (booksWithoutCovers.length === 0) {
      Alert.alert('Done', 'All books already have covers');
      return;
    }
    setIsFetchingCovers(true);
    try {
      const { fetchEnrichedMetadata } = await import('../../src/services/metadataLookupService');
      const { updateBook } = await import('../../src/services/database');
      let fetched = 0;
      for (const book of booksWithoutCovers) {
        try {
          const metadata = await fetchEnrichedMetadata(book.title, book.author, book.metadata?.isbn);
          if (metadata?.coverUrl) {
            await updateBook(book.id, { coverPath: metadata.coverUrl });
            fetched++;
          }
        } catch { /* skip */ }
      }
      if (fetched > 0) await loadBooks();
      Alert.alert('Done', fetched > 0 ? `Fetched covers for ${fetched} books` : 'No covers found online');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Cover fetch failed');
    } finally {
      setIsFetchingCovers(false);
    }
  };

  const handleResetSettings = () => {
    Alert.alert('Reset Settings', 'Reset all reading settings to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetSettings },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ─── Appearance ──────────────────────────────── */}
        <SectionHeader title="APPEARANCE" />
        <View style={styles.themeRow}>
          {themeNames.map((name) => {
            const t = themes[name];
            const isActive = name === currentTheme;
            return (
              <Pressable
                key={name}
                onPress={() => setThemeFn(name as ThemeType)}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: t.background,
                    borderColor: isActive ? theme.primary : theme.border,
                    borderWidth: isActive ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.themeCircle, { backgroundColor: t.text }]} />
                <Text style={{ fontSize: 10, color: t.text, marginTop: 4, textTransform: 'capitalize' }}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ─── Typography ──────────────────────────────── */}
        <SectionHeader title="TYPOGRAPHY" />

        {/* Font preview */}
        <View style={[styles.previewBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{
            fontFamily: fontFamily === 'serif' ? 'serif' : fontFamily === 'mono' ? 'monospace' : 'System',
            fontSize,
            lineHeight: fontSize * lineHeight,
            textAlign: textAlign as any,
            color: theme.text,
          }}>
            The quick brown fox jumps over the lazy dog.
          </Text>
        </View>

        <SettingsRow icon="text" label="Font Family" value={fontFamily} onPress={handleFontSelect} />

        {/* Font Size Slider */}
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Ionicons name="resize" size={22} color={theme.primary} />
          <Text style={[styles.rowLabel, { color: theme.text, flex: 0, marginRight: 8 }]}>Font Size</Text>
          <View style={{ flex: 1 }}>
            <Slider
              minimumValue={12}
              maximumValue={32}
              step={1}
              value={fontSize}
              onValueChange={setFontSize}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primary}
            />
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 14, width: 40, textAlign: 'right' }}>{fontSize}px</Text>
        </View>

        {/* Line Height Slider */}
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Ionicons name="reorder-four" size={22} color={theme.primary} />
          <Text style={[styles.rowLabel, { color: theme.text, flex: 0, marginRight: 8 }]}>Line Height</Text>
          <View style={{ flex: 1 }}>
            <Slider
              minimumValue={1}
              maximumValue={2.5}
              step={0.1}
              value={lineHeight}
              onValueChange={setLineHeight}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primary}
            />
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 14, width: 32, textAlign: 'right' }}>{lineHeight.toFixed(1)}</Text>
        </View>

        <SettingsRow icon="menu" label="Text Alignment" value={textAlign} onPress={handleAlignSelect} />

        {/* ─── Reading Features ────────────────────────── */}
        <SectionHeader title="READING FEATURES" />

        <SettingsRow
          icon="sunny"
          label="Blue Light Filter"
          subtitle="Reduce eye strain in low light"
          rightElement={<Switch value={blueLightFilter} onValueChange={setBlueLightFilter} trackColor={{ true: theme.primary }} />}
        />
        <SettingsRow
          icon="remove"
          label="Reading Ruler"
          subtitle="Line guide to keep your place"
          rightElement={<Switch value={readingRuler} onValueChange={setReadingRuler} trackColor={{ true: theme.primary }} />}
        />
        <SettingsRow
          icon="text"
          label="Bionic Reading"
          subtitle="Bold first letters to guide the eye"
          rightElement={<Switch value={bionicReading} onValueChange={setBionicReading} trackColor={{ true: theme.primary }} />}
        />
        <SettingsRow
          icon="play"
          label="Auto Scroll"
          subtitle="Automatically scroll while reading"
          rightElement={<Switch value={autoScroll} onValueChange={setAutoScroll} trackColor={{ true: theme.primary }} />}
        />

        {autoScroll && (
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Ionicons name="speedometer" size={22} color={theme.primary} />
            <Text style={[styles.rowLabel, { color: theme.text, flex: 0, marginRight: 8 }]}>Scroll Speed</Text>
            <View style={{ flex: 1 }}>
              <Slider
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={autoScrollSpeed}
                onValueChange={setAutoScrollSpeed}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={theme.border}
                thumbTintColor={theme.primary}
              />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 14, width: 24, textAlign: 'right' }}>{autoScrollSpeed}</Text>
          </View>
        )}

        {/* Tap Sensitivity */}
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Ionicons name="finger-print" size={22} color={theme.primary} />
          <Text style={[styles.rowLabel, { color: theme.text, flex: 0, marginRight: 8 }]}>Tap Sensitivity</Text>
          <View style={{ flex: 1 }}>
            <Slider
              minimumValue={5}
              maximumValue={30}
              step={1}
              value={tapSensitivity}
              onValueChange={setTapSensitivity}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primary}
            />
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 14, width: 40, textAlign: 'right' }}>{tapSensitivity}px</Text>
        </View>

        {/* Swipe Threshold */}
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Ionicons name="swap-horizontal" size={22} color={theme.primary} />
          <Text style={[styles.rowLabel, { color: theme.text, flex: 0, marginRight: 8 }]}>Swipe Threshold</Text>
          <View style={{ flex: 1 }}>
            <Slider
              minimumValue={20}
              maximumValue={100}
              step={5}
              value={swipeThreshold}
              onValueChange={setSwipeThreshold}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primary}
            />
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 14, width: 40, textAlign: 'right' }}>{swipeThreshold}px</Text>
        </View>

        {/* ─── Reading Goals ───────────────────────────── */}
        <SectionHeader title="READING GOALS" />
        <SettingsRow
          icon="flame"
          label="Goals & Streaks"
          subtitle={streakEnabled ? `${currentStreak} day streak · ${dailyGoalMinutes}m daily goal` : 'Set daily and yearly reading goals'}
          onPress={() => router.push('/reading-goals')}
        />

        {/* ─── Library & Sync ──────────────────────────── */}
        <SectionHeader title="LIBRARY & SYNC" />
        <SettingsRow icon="cloud" label="Cloud Sync" subtitle="Sync progress, bookmarks, and highlights" onPress={() => router.push('/cloud-sync')} />
        <SettingsRow icon="server" label="Calibre-Web" subtitle="Connect to your Calibre-Web server" onPress={() => router.push('/calibre-web')} />
        <SettingsRow icon="stats-chart" label="Reading Statistics" subtitle="View your reading history and progress" onPress={() => router.push('/statistics')} />
        <SettingsRow icon="calendar" label="Year in Review" onPress={() => router.push('/year-in-review')} />
        <SettingsRow icon="library" label="Library Storage" value={`${books.length} books · ${formatFileSize(totalStorageBytes)}`} />

        <SettingsRow
          icon="sparkles"
          label="Enrich All Books"
          subtitle="Fetch descriptions, ratings & covers"
          rightElement={
            isEnriching ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <Pressable
                onPress={handleEnrichAll}
                style={[styles.actionBtn, { borderColor: theme.primary }]}
              >
                <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>Enrich</Text>
              </Pressable>
            )
          }
        />
        <SettingsRow
          icon="image"
          label="Fix Missing Covers"
          subtitle="Download cover art for books without covers"
          rightElement={
            isFetchingCovers ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <Pressable
                onPress={handleFetchMissingCovers}
                style={[styles.actionBtn, { borderColor: theme.primary }]}
              >
                <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>Fetch</Text>
              </Pressable>
            )
          }
        />

        {/* ─── About ───────────────────────────────────── */}
        <SectionHeader title="ABOUT" />
        <SettingsRow icon="information-circle" label="Version" value={appVersion} />
        <SettingsRow icon="logo-github" label="Source Code" onPress={() => Linking.openURL('https://github.com/beniaminp/ebook-reader')} />
        <SettingsRow icon="bug" label="Report Issue" onPress={() => Linking.openURL('https://github.com/beniaminp/ebook-reader/issues')} />
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

        {/* ─── Reset ───────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}>
          <Pressable
            onPress={handleResetSettings}
            style={[styles.resetBtn, { borderColor: theme.error }]}
          >
            <Ionicons name="refresh" size={18} color={theme.error} />
            <Text style={{ color: theme.error, fontWeight: '600', fontSize: 15, marginLeft: 8 }}>
              Reset to Defaults
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 12 },
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
  rowLabel: { flex: 1, fontSize: 16 },
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
  themeCircle: { width: 16, height: 16, borderRadius: 8 },
  previewBox: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
