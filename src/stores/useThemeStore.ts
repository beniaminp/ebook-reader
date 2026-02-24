/**
 * Theme Store - Manages reading theme settings
 * Extended version with full reading controls support
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ReadingSettings,
  ThemeType,
  FontFamily,
  TextAlignment,
  MarginSize,
  ReadingRulerSettings,
  FocusModeSettings,
  RulerColor
} from '../services/themeService';
import { DEFAULT_SETTINGS } from '../services/themeService';

export interface ReaderTheme {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

const PREDEFINED_THEMES: Record<string, ReaderTheme> = {
  light: {
    id: 'light',
    name: 'Light',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    backgroundColor: '#1a1a1a',
    textColor: '#e0e0e0',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  sepia: {
    id: 'sepia',
    name: 'Sepia',
    backgroundColor: '#f4ecd8',
    textColor: '#5b4636',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  'eye-comfort': {
    id: 'eye-comfort',
    name: 'Eye Comfort',
    backgroundColor: '#214e34',
    textColor: '#d4e4d4',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  night: {
    id: 'night',
    name: 'Night',
    backgroundColor: '#0d0d0d',
    textColor: '#c0c0c0',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  invert: {
    id: 'invert',
    name: 'Inverted',
    backgroundColor: '#000000',
    textColor: '#ffffff',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    backgroundColor: '#1a2332',
    textColor: '#c8dce8',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    backgroundColor: '#1a2b1a',
    textColor: '#c8dcc8',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    backgroundColor: '#2b1f1a',
    textColor: '#e8d8c8',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  paper: {
    id: 'paper',
    name: 'Paper',
    backgroundColor: '#f5f0e8',
    textColor: '#3d3529',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    backgroundColor: '#2d3035',
    textColor: '#c8ccd0',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.6,
  },
};

export type PageTransitionType = 'none' | 'fade' | 'slide';

interface ThemeState extends ReadingSettings {
  // Custom themes
  customThemes: ReaderTheme[];

  // Page transition animation
  pageTransitionType: PageTransitionType;

  // UI state
  isSettingsPanelOpen: boolean;

  // Computed helpers
  getCurrentTheme: () => ReaderTheme;

  // Actions
  setTheme: (theme: ThemeType) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setTextAlign: (align: TextAlignment) => void;
  setMarginSize: (size: MarginSize) => void;
  setBlueLightFilter: (enabled: boolean) => void;
  setBlueLightIntensity: (intensity: number) => void;
  setReadingRuler: (enabled: boolean) => void;
  setReadingRulerHeight: (height: number) => void;
  setReadingRulerOpacity: (opacity: number) => void;
  setReadingRulerColor: (color: RulerColor) => void;
  setBionicReading: (enabled: boolean) => void;
  setFocusMode: (enabled: boolean) => void;
  setFocusModeOpacity: (opacity: number) => void;
  setAutoScroll: (enabled: boolean) => void;
  setAutoScrollSpeed: (speed: number) => void;
  setPageTransitionType: (type: PageTransitionType) => void;

  // Bulk actions
  updateSettings: (settings: Partial<ReadingSettings>) => void;
  resetSettings: () => void;
  applyPreset: (preset: 'comfortable' | 'compact' | 'large-print') => void;

  // Custom theme management
  addCustomTheme: (theme: ReaderTheme) => void;
  removeCustomTheme: (themeId: string) => void;

  // UI actions
  toggleSettingsPanel: () => void;
  openSettingsPanel: () => void;
  closeSettingsPanel: () => void;
}

const presets: Record<'comfortable' | 'compact' | 'large-print', Partial<ReadingSettings>> = {
  comfortable: {
    fontSize: 18,
    lineHeight: 1.8,
    marginSize: 'large',
  },
  compact: {
    fontSize: 14,
    lineHeight: 1.4,
    marginSize: 'small',
  },
  'large-print': {
    fontSize: 24,
    lineHeight: 2,
    marginSize: 'large',
  },
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Initial state from defaults
      theme: DEFAULT_SETTINGS.theme,
      fontFamily: DEFAULT_SETTINGS.fontFamily,
      fontSize: DEFAULT_SETTINGS.fontSize,
      lineHeight: DEFAULT_SETTINGS.lineHeight,
      textAlign: DEFAULT_SETTINGS.textAlign,
      marginSize: DEFAULT_SETTINGS.marginSize,
      blueLightFilter: DEFAULT_SETTINGS.blueLightFilter,
      blueLightIntensity: DEFAULT_SETTINGS.blueLightIntensity,
      readingRuler: DEFAULT_SETTINGS.readingRuler,
      readingRulerSettings: DEFAULT_SETTINGS.readingRulerSettings,
      bionicReading: DEFAULT_SETTINGS.bionicReading,
      focusMode: DEFAULT_SETTINGS.focusMode,
      focusModeSettings: DEFAULT_SETTINGS.focusModeSettings,
      autoScroll: DEFAULT_SETTINGS.autoScroll,
      autoScrollSpeed: DEFAULT_SETTINGS.autoScrollSpeed,
      customThemes: [],
      pageTransitionType: 'none' as PageTransitionType,
      isSettingsPanelOpen: false,

      // Computed helpers
      getCurrentTheme: () => {
        const state = get();
        const customTheme = state.customThemes.find((t) => t.id === state.theme);
        if (customTheme) return customTheme;
        return PREDEFINED_THEMES[state.theme] || PREDEFINED_THEMES.light;
      },

      // Theme actions
      setTheme: (theme) => set({ theme }),

      setFontFamily: (fontFamily) => set({ fontFamily }),

      setFontSize: (fontSize) => set({ fontSize }),

      setLineHeight: (lineHeight) => set({ lineHeight }),

      setTextAlign: (textAlign) => set({ textAlign }),

      setMarginSize: (marginSize) => set({ marginSize }),

      setBlueLightFilter: (blueLightFilter) => set({ blueLightFilter }),

      setBlueLightIntensity: (blueLightIntensity) => set({ blueLightIntensity }),

      setReadingRuler: (readingRuler) => set({ readingRuler }),

      setReadingRulerHeight: (height) => set((state) => ({
        readingRulerSettings: { ...state.readingRulerSettings, height }
      })),

      setReadingRulerOpacity: (opacity) => set((state) => ({
        readingRulerSettings: { ...state.readingRulerSettings, opacity }
      })),

      setReadingRulerColor: (color) => set((state) => ({
        readingRulerSettings: { ...state.readingRulerSettings, color }
      })),

      setBionicReading: (bionicReading) => set({ bionicReading }),

      setFocusMode: (focusMode) => set({ focusMode }),

      setFocusModeOpacity: (opacity) => set((state) => ({
        focusModeSettings: { ...state.focusModeSettings, opacity }
      })),

      setAutoScroll: (autoScroll) => set({ autoScroll }),

      setAutoScrollSpeed: (autoScrollSpeed) => set({ autoScrollSpeed }),

      setPageTransitionType: (pageTransitionType) => set({ pageTransitionType }),

      // Bulk actions
      updateSettings: (settings) => set(settings),

      resetSettings: () => set({
        theme: DEFAULT_SETTINGS.theme,
        fontFamily: DEFAULT_SETTINGS.fontFamily,
        fontSize: DEFAULT_SETTINGS.fontSize,
        lineHeight: DEFAULT_SETTINGS.lineHeight,
        textAlign: DEFAULT_SETTINGS.textAlign,
        marginSize: DEFAULT_SETTINGS.marginSize,
        blueLightFilter: DEFAULT_SETTINGS.blueLightFilter,
        blueLightIntensity: DEFAULT_SETTINGS.blueLightIntensity,
        readingRuler: DEFAULT_SETTINGS.readingRuler,
        readingRulerSettings: DEFAULT_SETTINGS.readingRulerSettings,
        bionicReading: DEFAULT_SETTINGS.bionicReading,
        focusMode: DEFAULT_SETTINGS.focusMode,
        focusModeSettings: DEFAULT_SETTINGS.focusModeSettings,
        autoScroll: DEFAULT_SETTINGS.autoScroll,
        autoScrollSpeed: DEFAULT_SETTINGS.autoScrollSpeed,
      }),

      applyPreset: (preset) => set(presets[preset]),

      // Custom theme management
      addCustomTheme: (theme) =>
        set((state) => ({
          customThemes: [...state.customThemes, theme],
        })),

      removeCustomTheme: (themeId) =>
        set((state) => ({
          customThemes: state.customThemes.filter((t) => t.id !== themeId),
          theme: state.theme === themeId ? 'light' : state.theme,
        })),

      // UI actions
      toggleSettingsPanel: () => set((state) => ({ isSettingsPanelOpen: !state.isSettingsPanelOpen })),

      openSettingsPanel: () => set({ isSettingsPanelOpen: true }),

      closeSettingsPanel: () => set({ isSettingsPanelOpen: false }),
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({
        theme: state.theme,
        fontFamily: state.fontFamily,
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        textAlign: state.textAlign,
        marginSize: state.marginSize,
        blueLightFilter: state.blueLightFilter,
        blueLightIntensity: state.blueLightIntensity,
        readingRuler: state.readingRuler,
        readingRulerSettings: state.readingRulerSettings,
        bionicReading: state.bionicReading,
        focusMode: state.focusMode,
        focusModeSettings: state.focusModeSettings,
        autoScroll: state.autoScroll,
        autoScrollSpeed: state.autoScrollSpeed,
        customThemes: state.customThemes,
        pageTransitionType: state.pageTransitionType,
      }),
    }
  )
);

// Re-export types
export type {
  ReadingSettings,
  ThemeType,
  FontFamily,
  TextAlignment,
  MarginSize,
  ReadingRulerSettings,
  FocusModeSettings,
  RulerColor
} from '../services/themeService';
export { PREDEFINED_THEMES, DEFAULT_SETTINGS };
