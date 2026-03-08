import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useThemeStore } from '../../../stores/useThemeStore';
import type { ThemeType, FontFamily, TextAlignment, RulerColor } from '../../../services/themeService';
import { FONT_FAMILIES, PREDEFINED_THEMES } from '../../../services/themeService';
import { SUPPORTED_LANGUAGES } from '../../../services/translationService';
import type { PageTransitionType } from '../../../stores/useThemeStore';

type SettingsTab = 'appearance' | 'typography' | 'reading-tools' | 'focus-ruler';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  onFontSizeChange?: (size: number) => void;
}

const FONT_WEIGHT_LABELS: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Normal',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
};

export function SettingsSheet({
  visible,
  onClose,
  onFontSizeChange,
}: SettingsSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const store = useThemeStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [showSaveProfile, setShowSaveProfile] = useState(false);
  const [profileName, setProfileName] = useState('');

  const tabs: { key: SettingsTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'appearance', label: 'Theme', icon: 'contrast' },
    { key: 'typography', label: 'Type', icon: 'text' },
    { key: 'reading-tools', label: 'Tools', icon: 'eye' },
    { key: 'focus-ruler', label: 'Focus', icon: 'ribbon' },
  ];

  const showFontFamilyPicker = () => {
    const allFonts = store.getAllFontFamilies();
    Alert.alert(
      'Font Family',
      undefined,
      [
        ...allFonts.map((f) => ({
          text: f.name,
          onPress: () => store.setFontFamily(f.value as FontFamily),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const showColorVisionPicker = () => {
    const options: { label: string; value: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' }[] = [
      { label: 'None', value: 'none' },
      { label: 'Protanopia', value: 'protanopia' },
      { label: 'Deuteranopia', value: 'deuteranopia' },
      { label: 'Tritanopia', value: 'tritanopia' },
    ];
    Alert.alert(
      'Color Vision Filter',
      undefined,
      [
        ...options.map((o) => ({
          text: o.label,
          onPress: () => store.setColorVisionFilter(o.value),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const showPageAnimationPicker = () => {
    const options: { label: string; value: PageTransitionType }[] = [
      { label: 'None', value: 'none' },
      { label: 'Fade', value: 'fade' },
      { label: 'Slide', value: 'slide' },
      { label: 'Page Curl', value: 'curl' },
    ];
    Alert.alert(
      'Page Animation',
      undefined,
      [
        ...options.map((o) => ({
          text: o.label,
          onPress: () => store.setPageTransitionType(o.value),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const showLanguagePicker = () => {
    const langs = SUPPORTED_LANGUAGES.filter((l) => l.target !== false);
    Alert.alert(
      'Target Language',
      undefined,
      [
        ...langs.map((l) => ({
          text: l.name,
          onPress: () => store.setInterlinearLanguage(l.code),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const showRulerColorPicker = () => {
    const options: { label: string; value: RulerColor }[] = [
      { label: 'Accent', value: 'accent' },
      { label: 'Yellow', value: 'yellow' },
      { label: 'Green', value: 'green' },
      { label: 'Blue', value: 'blue' },
      { label: 'Pink', value: 'pink' },
      { label: 'Red', value: 'red' },
    ];
    Alert.alert(
      'Ruler Color',
      undefined,
      [
        ...options.map((o) => ({
          text: o.label,
          onPress: () => store.setReadingRulerColor(o.value),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const getCurrentFontName = (): string => {
    const allFonts = store.getAllFontFamilies();
    const found = allFonts.find((f) => f.value === store.fontFamily);
    return found?.name || store.fontFamily;
  };

  const getCurrentLanguageName = (): string => {
    const found = SUPPORTED_LANGUAGES.find((l) => l.code === store.interlinearLanguage);
    return found?.name || store.interlinearLanguage;
  };

  // ---- Reusable sub-components ----

  const SectionTitle = ({ children }: { children: string }) => (
    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
      {children}
    </Text>
  );

  const SettingRow = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.settingRow}>
      <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.settingControl}>{children}</View>
    </View>
  );

  const SliderRow = ({
    label,
    value,
    displayValue,
    min,
    max,
    step,
    onValueChange,
  }: {
    label: string;
    value: number;
    displayValue: string;
    min: number;
    max: number;
    step: number;
    onValueChange: (v: number) => void;
  }) => (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.sliderValue, { color: theme.textSecondary }]}>
          {displayValue}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={theme.primary}
        maximumTrackTintColor={theme.border}
        thumbTintColor={theme.primary}
      />
    </View>
  );

  const SwitchRow = ({
    label,
    value,
    onValueChange,
    subtitle,
  }: {
    label: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
    subtitle?: string;
  }) => (
    <View style={[styles.settingRow, subtitle ? { alignItems: 'flex-start' } : undefined]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#fff"
      />
    </View>
  );

  const PickerRow = ({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: string;
    onPress: () => void;
  }) => (
    <Pressable style={styles.settingRow} onPress={onPress}>
      <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[styles.pickerValue, { color: theme.textSecondary }]}>
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </View>
    </Pressable>
  );

  // ---- Tab Content Renderers ----

  const renderAppearanceTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle>THEME</SectionTitle>
      <View style={styles.themeGrid}>
        {PREDEFINED_THEMES.map((t) => {
          const isActive = t.type === store.currentTheme;
          return (
            <Pressable
              key={t.id}
              onPress={() => store.setCurrentTheme(t.type as ThemeType)}
              style={[
                styles.themeChip,
                {
                  backgroundColor: t.backgroundColor,
                  borderColor: isActive ? theme.primary : theme.border,
                  borderWidth: isActive ? 2.5 : 1,
                },
              ]}
            >
              <View
                style={[styles.themeCircle, { backgroundColor: t.textColor }]}
              />
              <Text
                style={[
                  styles.themeChipLabel,
                  { color: t.textColor },
                ]}
                numberOfLines={1}
              >
                {t.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>CUSTOM BACKGROUND COLOR</SectionTitle>
      <View style={styles.settingRow}>
        <TextInput
          style={[
            styles.colorInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.surface,
            },
          ]}
          value={store.customBackgroundColor || ''}
          onChangeText={(text) => {
            if (text === '') {
              store.setCustomBackgroundColor(undefined);
            } else {
              store.setCustomBackgroundColor(text);
            }
          }}
          placeholder="#RRGGBB"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {store.customBackgroundColor ? (
          <View style={styles.colorPreviewRow}>
            <View
              style={[
                styles.colorPreview,
                { backgroundColor: store.customBackgroundColor, borderColor: theme.border },
              ]}
            />
            <Pressable onPress={() => store.clearCustomBackground()}>
              <Ionicons name="close-circle" size={22} color={theme.error} />
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  const renderTypographyTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle>FONT</SectionTitle>

      {/* Font Size Slider */}
      <SliderRow
        label="Font Size"
        value={store.fontSize}
        displayValue={`${store.fontSize}px`}
        min={12}
        max={32}
        step={1}
        onValueChange={(v) => {
          store.setFontSize(v);
          onFontSizeChange?.(v);
        }}
      />

      {/* Font Family Picker */}
      <PickerRow
        label="Font Family"
        value={getCurrentFontName()}
        onPress={showFontFamilyPicker}
      />

      {/* Font Weight Slider */}
      <SliderRow
        label="Font Weight"
        value={store.fontWeight}
        displayValue={FONT_WEIGHT_LABELS[store.fontWeight] || `${store.fontWeight}`}
        min={100}
        max={900}
        step={100}
        onValueChange={(v) => store.setFontWeight(v)}
      />

      <SectionTitle>TEXT LAYOUT</SectionTitle>

      {/* Text Alignment */}
      <View style={styles.settingRow}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>Alignment</Text>
        <View style={styles.alignmentRow}>
          {(['left', 'center', 'right', 'justify'] as TextAlignment[]).map((align) => (
            <Pressable
              key={align}
              onPress={() => store.setTextAlign(align)}
              style={[
                styles.alignButton,
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
      </View>

      {/* Line Height */}
      <SliderRow
        label="Line Height"
        value={store.lineHeight}
        displayValue={`${store.lineHeight.toFixed(1)}x`}
        min={1.0}
        max={2.5}
        step={0.1}
        onValueChange={(v) => store.setLineHeight(parseFloat(v.toFixed(1)))}
      />

      {/* Paragraph Spacing */}
      <SliderRow
        label="Paragraph Spacing"
        value={store.paragraphSpacing}
        displayValue={`${store.paragraphSpacing}em`}
        min={0}
        max={4}
        step={0.25}
        onValueChange={(v) => store.setParagraphSpacing(parseFloat(v.toFixed(2)))}
      />

      {/* Letter Spacing */}
      <SliderRow
        label="Letter Spacing"
        value={store.letterSpacing}
        displayValue={`${store.letterSpacing.toFixed(2)}em`}
        min={0}
        max={0.3}
        step={0.02}
        onValueChange={(v) => store.setLetterSpacing(parseFloat(v.toFixed(2)))}
      />

      {/* Word Spacing */}
      <SliderRow
        label="Word Spacing"
        value={store.wordSpacing}
        displayValue={`${store.wordSpacing.toFixed(2)}em`}
        min={0}
        max={0.5}
        step={0.05}
        onValueChange={(v) => store.setWordSpacing(parseFloat(v.toFixed(2)))}
      />

      {/* Max Line Width */}
      <SliderRow
        label="Max Line Width"
        value={store.maxLineWidth}
        displayValue={store.maxLineWidth === 0 ? 'Auto' : `${store.maxLineWidth} ch`}
        min={0}
        max={120}
        step={5}
        onValueChange={(v) => store.setMaxLineWidth(v)}
      />

      <SectionTitle>LAYOUT OPTIONS</SectionTitle>

      <SwitchRow
        label="Hyphenation"
        value={store.hyphenation}
        onValueChange={store.setHyphenation}
      />
      <SwitchRow
        label="Drop Caps"
        value={store.dropCaps}
        onValueChange={store.setDropCaps}
      />
      <SwitchRow
        label="Two-Column Layout"
        value={store.twoColumnLayout}
        onValueChange={store.setTwoColumnLayout}
      />
      <SwitchRow
        label="Global Bold"
        value={store.globalBold}
        onValueChange={store.setGlobalBold}
      />

      {/* Color Vision Filter */}
      <PickerRow
        label="Color Vision Filter"
        value={store.colorVisionFilter === 'none' ? 'None' : store.colorVisionFilter.charAt(0).toUpperCase() + store.colorVisionFilter.slice(1)}
        onPress={showColorVisionPicker}
      />

      <SectionTitle>TYPOGRAPHY PROFILES</SectionTitle>

      {/* Saved Profiles */}
      {store.typographyProfiles.map((p) => (
        <View key={p.id} style={styles.profileRow}>
          <Pressable
            style={[styles.profileButton, { backgroundColor: theme.surface }]}
            onPress={() => store.loadTypographyProfile(p.id)}
          >
            <Text style={[styles.profileName, { color: theme.text }]}>{p.name}</Text>
            <Text style={[styles.profileDesc, { color: theme.textSecondary }]}>
              {p.settings.fontSize}px, {p.settings.fontFamily}, {p.settings.lineHeight}x
            </Text>
          </Pressable>
          <Pressable onPress={() => store.deleteTypographyProfile(p.id)}>
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </Pressable>
        </View>
      ))}

      {/* Save Profile */}
      {showSaveProfile ? (
        <View style={styles.saveProfileRow}>
          <TextInput
            style={[
              styles.profileInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.surface,
              },
            ]}
            value={profileName}
            onChangeText={setProfileName}
            placeholder="Profile name..."
            placeholderTextColor={theme.textMuted}
            autoFocus
            onSubmitEditing={() => {
              if (profileName.trim()) {
                store.saveTypographyProfile(profileName.trim());
                setProfileName('');
                setShowSaveProfile(false);
              }
            }}
          />
          <Pressable
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              if (profileName.trim()) {
                store.saveTypographyProfile(profileName.trim());
                setProfileName('');
                setShowSaveProfile(false);
              }
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Save</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.surface }]}
          onPress={() => setShowSaveProfile(true)}
        >
          <Ionicons name="save-outline" size={18} color={theme.primary} />
          <Text style={[styles.actionButtonText, { color: theme.text }]}>
            Save Current Settings
          </Text>
        </Pressable>
      )}

      {/* Dyslexia Preset */}
      <View style={{ marginTop: 8 }}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.surface }]}
          onPress={() => store.applyPreset('dyslexia')}
        >
          <Ionicons name="accessibility-outline" size={18} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionButtonText, { color: theme.text }]}>
              Dyslexia-Friendly
            </Text>
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
              OpenDyslexic, wider spacing, left-aligned
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );

  const renderReadingToolsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle>BLUE LIGHT FILTER</SectionTitle>
      <SwitchRow
        label="Blue Light Filter"
        value={store.blueLightFilter}
        onValueChange={store.setBlueLightFilter}
      />
      {store.blueLightFilter && (
        <SliderRow
          label="Intensity"
          value={store.blueLightIntensity}
          displayValue={`${store.blueLightIntensity}%`}
          min={0}
          max={50}
          step={1}
          onValueChange={(v) => store.setBlueLightIntensity(v)}
        />
      )}

      <SectionTitle>READING ENHANCEMENTS</SectionTitle>
      <SwitchRow
        label="Bionic Reading"
        value={store.bionicReading}
        onValueChange={store.setBionicReading}
      />

      <SwitchRow
        label="Interlinear Translation"
        value={store.interlinearMode}
        onValueChange={store.setInterlinearMode}
      />
      {store.interlinearMode && (
        <PickerRow
          label="Target Language"
          value={getCurrentLanguageName()}
          onPress={showLanguagePicker}
        />
      )}

      <SwitchRow
        label="Word Wise"
        value={store.wordWiseEnabled}
        onValueChange={store.setWordWiseEnabled}
      />
      {store.wordWiseEnabled && (
        <SliderRow
          label="Hint Level"
          value={store.wordWiseLevel}
          displayValue={
            store.wordWiseLevel <= 2
              ? `${store.wordWiseLevel} - Fewer`
              : store.wordWiseLevel >= 4
                ? `${store.wordWiseLevel} - More`
                : `${store.wordWiseLevel} - Medium`
          }
          min={1}
          max={5}
          step={1}
          onValueChange={(v) => store.setWordWiseLevel(v)}
        />
      )}

      <SectionTitle>PAGE AND SCROLL</SectionTitle>

      <PickerRow
        label="Page Animation"
        value={
          store.pageTransitionType === 'none'
            ? 'None'
            : store.pageTransitionType === 'curl'
              ? 'Page Curl'
              : store.pageTransitionType.charAt(0).toUpperCase() + store.pageTransitionType.slice(1)
        }
        onPress={showPageAnimationPicker}
      />

      <SwitchRow
        label="Auto Scroll"
        value={store.autoScroll}
        onValueChange={store.setAutoScroll}
      />
      {store.autoScroll && (
        <SliderRow
          label="Speed"
          value={store.autoScrollSpeed}
          displayValue={`${store.autoScrollSpeed.toFixed(1)}x`}
          min={0.5}
          max={3}
          step={0.1}
          onValueChange={(v) => store.setAutoScrollSpeed(parseFloat(v.toFixed(1)))}
        />
      )}

      <SwitchRow
        label="Immersive Mode"
        value={store.immersiveMode}
        onValueChange={store.setImmersiveMode}
        subtitle="Hide all chrome for distraction-free reading"
      />

      <View style={{ marginTop: 16 }}>
        <Pressable
          style={[styles.dangerButton, { borderColor: theme.error }]}
          onPress={() => {
            Alert.alert('Reset Settings', 'Reset all reading settings to defaults?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset',
                style: 'destructive',
                onPress: () => store.resetSettings(),
              },
            ]);
          }}
        >
          <Ionicons name="refresh-outline" size={18} color={theme.error} />
          <Text style={[styles.dangerButtonText, { color: theme.error }]}>
            Reset to Defaults
          </Text>
        </Pressable>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  const renderFocusRulerTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle>READING RULER</SectionTitle>
      <SwitchRow
        label="Reading Ruler"
        value={store.readingRuler}
        onValueChange={store.setReadingRuler}
      />
      {store.readingRuler && (
        <>
          <SliderRow
            label="Height"
            value={store.readingRulerSettings.height}
            displayValue={`${store.readingRulerSettings.height} lines`}
            min={1}
            max={4}
            step={1}
            onValueChange={(v) => store.setReadingRulerHeight(v)}
          />
          <SliderRow
            label="Opacity"
            value={store.readingRulerSettings.opacity}
            displayValue={`${store.readingRulerSettings.opacity}%`}
            min={10}
            max={100}
            step={5}
            onValueChange={(v) => store.setReadingRulerOpacity(v)}
          />
          <PickerRow
            label="Color"
            value={store.readingRulerSettings.color.charAt(0).toUpperCase() + store.readingRulerSettings.color.slice(1)}
            onPress={showRulerColorPicker}
          />
        </>
      )}

      <SectionTitle>FOCUS MODE</SectionTitle>
      <SwitchRow
        label="Focus Mode"
        value={store.focusMode}
        onValueChange={store.setFocusMode}
      />
      {store.focusMode && (
        <SliderRow
          label="Dim Opacity"
          value={store.focusModeSettings.opacity}
          displayValue={`${store.focusModeSettings.opacity}%`}
          min={10}
          max={80}
          step={5}
          onValueChange={(v) => store.setFocusModeOpacity(v)}
        />
      )}

      <View style={{ marginTop: 16 }}>
        <Pressable
          style={[styles.dangerButton, { borderColor: theme.error }]}
          onPress={() => {
            Alert.alert('Reset Settings', 'Reset all reading settings to defaults?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset',
                style: 'destructive',
                onPress: () => store.resetSettings(),
              },
            ]);
          }}
        >
          <Ionicons name="refresh-outline" size={18} color={theme.error} />
          <Text style={[styles.dangerButtonText, { color: theme.error }]}>
            Reset to Defaults
          </Text>
        </Pressable>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'appearance':
        return renderAppearanceTab();
      case 'typography':
        return renderTypographyTab();
      case 'reading-tools':
        return renderReadingToolsTab();
      case 'focus-ruler':
        return renderFocusRulerTab();
    }
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
          {/* Drag Handle */}
          <View style={styles.handle} />

          {/* Tab Bar */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[
                    styles.tab,
                    isActive && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={18}
                    color={isActive ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isActive ? theme.primary : theme.textSecondary },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>{renderTabContent()}</View>
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
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 10,
  },
  // Theme grid
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeChip: {
    width: 72,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  themeCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeChipLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  // Settings rows
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  settingControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Slider rows
  sliderRow: {
    paddingVertical: 6,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 36,
  },
  // Alignment
  alignmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  alignButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  // Picker
  pickerValue: {
    fontSize: 14,
  },
  // Color input
  colorInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  colorPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
  },
  // Profiles
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  profileButton: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  profileDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  profileInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveProfileRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  saveButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  // Action buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
