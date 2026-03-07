/**
 * useReaderSettings Hook
 * Custom hook for managing reading settings.
 *
 * React Native version: imports from the RN useThemeStore.
 * No Ionic or Capacitor dependencies.
 */

import { useCallback } from 'react';
import { useThemeStore } from '../stores/useThemeStore';
import type {
  ReadingSettings,
  ThemeType,
  FontFamily,
  TextAlignment,
  MarginSize,
} from '../services/themeService';

export interface UseReaderSettingsOptions {
  autoSave?: boolean;
  bookId?: string;
}

export interface UseReaderSettingsReturn extends ReadingSettings {
  // Individual setters
  setTheme: (theme: ThemeType) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setFontSize: (fontSize: number) => void;
  setLineHeight: (lineHeight: number) => void;
  setTextAlign: (textAlign: TextAlignment) => void;
  setMarginSize: (marginSize: MarginSize) => void;
  setBlueLightFilter: (enabled: boolean) => void;
  setBlueLightIntensity: (intensity: number) => void;
  setReadingRuler: (enabled: boolean) => void;
  setBionicReading: (enabled: boolean) => void;
  setAutoScroll: (enabled: boolean) => void;
  setAutoScrollSpeed: (speed: number) => void;

  // Bulk actions
  updateSettings: (settings: Partial<ReadingSettings>) => void;
  resetSettings: () => void;
  applyPreset: (preset: 'comfortable' | 'compact' | 'large-print') => void;

  // Font size shortcuts
  increaseFontSize: (step?: number) => void;
  decreaseFontSize: (step?: number) => void;

  // Toggle helpers
  toggleBlueLightFilter: () => void;
  toggleReadingRuler: () => void;
  toggleBionicReading: () => void;
  toggleAutoScroll: () => void;

  // Theme shortcuts
  cycleTheme: () => void;
  setLightTheme: () => void;
  setDarkTheme: () => void;
  setSepiaTheme: () => void;
}

const THEME_CYCLE: ThemeType[] = ['light', 'sepia', 'dark', 'eye-comfort', 'night'];

/**
 * Hook for managing reader settings
 */
export const useReaderSettings = (
  options: UseReaderSettingsOptions = {}
): UseReaderSettingsReturn => {
  const { autoSave = true, bookId } = options;

  const themeStore = useThemeStore();

  // Toggle helpers
  const toggleBlueLightFilter = useCallback(() => {
    themeStore.setBlueLightFilter(!themeStore.blueLightFilter);
  }, [themeStore]);

  const toggleReadingRuler = useCallback(() => {
    themeStore.setReadingRuler(!themeStore.readingRuler);
  }, [themeStore]);

  const toggleBionicReading = useCallback(() => {
    themeStore.setBionicReading(!themeStore.bionicReading);
  }, [themeStore]);

  const toggleAutoScroll = useCallback(() => {
    themeStore.setAutoScroll(!themeStore.autoScroll);
  }, [themeStore]);

  // Font size shortcuts
  const increaseFontSize = useCallback(
    (step = 2) => {
      const newSize = Math.min(32, themeStore.fontSize + step);
      themeStore.setFontSize(newSize);
    },
    [themeStore]
  );

  const decreaseFontSize = useCallback(
    (step = 2) => {
      const newSize = Math.max(12, themeStore.fontSize - step);
      themeStore.setFontSize(newSize);
    },
    [themeStore]
  );

  // Theme shortcuts
  const cycleTheme = useCallback(() => {
    const currentIndex = THEME_CYCLE.indexOf(themeStore.theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    themeStore.setTheme(THEME_CYCLE[nextIndex]);
  }, [themeStore]);

  const setLightTheme = useCallback(() => {
    themeStore.setTheme('light');
  }, [themeStore]);

  const setDarkTheme = useCallback(() => {
    themeStore.setTheme('dark');
  }, [themeStore]);

  const setSepiaTheme = useCallback(() => {
    themeStore.setTheme('sepia');
  }, [themeStore]);

  return {
    ...themeStore,

    // Individual setters
    setTheme: themeStore.setTheme,
    setFontFamily: themeStore.setFontFamily,
    setFontSize: themeStore.setFontSize,
    setLineHeight: themeStore.setLineHeight,
    setTextAlign: themeStore.setTextAlign,
    setMarginSize: themeStore.setMarginSize,
    setBlueLightFilter: themeStore.setBlueLightFilter,
    setBlueLightIntensity: themeStore.setBlueLightIntensity,
    setReadingRuler: themeStore.setReadingRuler,
    setBionicReading: themeStore.setBionicReading,
    setAutoScroll: themeStore.setAutoScroll,
    setAutoScrollSpeed: themeStore.setAutoScrollSpeed,

    // Bulk actions
    updateSettings: themeStore.updateSettings,
    resetSettings: themeStore.resetSettings,
    applyPreset: themeStore.applyPreset,

    // Font size shortcuts
    increaseFontSize,
    decreaseFontSize,

    // Toggle helpers
    toggleBlueLightFilter,
    toggleReadingRuler,
    toggleBionicReading,
    toggleAutoScroll,

    // Theme shortcuts
    cycleTheme,
    setLightTheme,
    setDarkTheme,
    setSepiaTheme,
  };
};

export default useReaderSettings;
