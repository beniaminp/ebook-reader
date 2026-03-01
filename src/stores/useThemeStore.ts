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
  CustomMargins,
  ReadingRulerSettings,
  FocusModeSettings,
  RulerColor,
} from '../services/themeService';
import { DEFAULT_SETTINGS, FONT_FAMILIES } from '../services/themeService';
import { fontService, type CustomFont } from '../services/fontService';

export interface ReaderTheme {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

// Re-export CustomFont type from fontService
export type { CustomFont } from '../services/fontService';

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

  // Custom fonts
  customFonts: CustomFont[];

  // Custom background colors/images
  customBackgroundColor?: string;
  customBackgroundImage?: string;

  // Page transition animation
  pageTransitionType: PageTransitionType;

  // UI state
  isSettingsPanelOpen: boolean;

  // Computed helpers
  getCurrentTheme: () => ReaderTheme;
  getAllFontFamilies: () => Array<{
    value: FontFamily | string;
    name: string;
    preview: string;
    isCustom?: boolean;
  }>;

  // Actions
  setTheme: (theme: ThemeType) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setTextAlign: (align: TextAlignment) => void;
  setMarginSize: (size: MarginSize) => void;
  setCustomMargins: (margins: Partial<CustomMargins>) => void;
  setBlueLightFilter: (enabled: boolean) => void;
  setBlueLightIntensity: (intensity: number) => void;
  setReadingRuler: (enabled: boolean) => void;
  setReadingRulerHeight: (height: number) => void;
  setReadingRulerOpacity: (opacity: number) => void;
  setReadingRulerColor: (color: RulerColor) => void;
  setBionicReading: (enabled: boolean) => void;
  setInterlinearMode: (enabled: boolean) => void;
  setInterlinearLanguage: (language: string) => void;
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

  // Custom font management
  addCustomFont: (font: CustomFont) => void;
  removeCustomFont: (fontName: string) => Promise<void>;
  loadCustomFonts: () => Promise<void>;

  // Custom background actions
  setCustomBackgroundColor: (color: string | undefined) => void;
  setCustomBackgroundImage: (imageUri: string | undefined) => void;
  clearCustomBackground: () => void;

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
      customMargins: DEFAULT_SETTINGS.customMargins,
      blueLightFilter: DEFAULT_SETTINGS.blueLightFilter,
      blueLightIntensity: DEFAULT_SETTINGS.blueLightIntensity,
      readingRuler: DEFAULT_SETTINGS.readingRuler,
      readingRulerSettings: DEFAULT_SETTINGS.readingRulerSettings,
      bionicReading: DEFAULT_SETTINGS.bionicReading,
      interlinearMode: DEFAULT_SETTINGS.interlinearMode,
      interlinearLanguage: DEFAULT_SETTINGS.interlinearLanguage,
      focusMode: DEFAULT_SETTINGS.focusMode,
      focusModeSettings: DEFAULT_SETTINGS.focusModeSettings,
      autoScroll: DEFAULT_SETTINGS.autoScroll,
      autoScrollSpeed: DEFAULT_SETTINGS.autoScrollSpeed,
      customThemes: [],
      customFonts: [],
      customBackgroundColor: undefined,
      customBackgroundImage: undefined,
      pageTransitionType: 'none' as PageTransitionType,
      isSettingsPanelOpen: false,

      // Computed helpers
      getCurrentTheme: () => {
        const state = get();
        const customTheme = state.customThemes.find((t) => t.id === state.theme);
        const baseTheme = customTheme || PREDEFINED_THEMES[state.theme] || PREDEFINED_THEMES.light;

        // Merge custom background into theme
        return {
          ...baseTheme,
          backgroundColor: state.customBackgroundColor || baseTheme.backgroundColor,
        };
      },

      getAllFontFamilies: () => {
        const state = get();
        const builtInFonts = FONT_FAMILIES.map((f) => ({ ...f, isCustom: false }));
        const customFonts = state.customFonts.map((f) => ({
          value: `custom-${f.name}`,
          name: f.name,
          preview: f.name,
          isCustom: true,
        }));
        return [...builtInFonts, ...customFonts];
      },

      // Theme actions
      setTheme: (theme) => set({ theme }),

      setFontFamily: (fontFamily) => set({ fontFamily }),

      setFontSize: (fontSize) => set({ fontSize }),

      setLineHeight: (lineHeight) => set({ lineHeight }),

      setTextAlign: (textAlign) => set({ textAlign }),

      setMarginSize: (marginSize) => set({ marginSize }),

      setCustomMargins: (margins) =>
        set((state) => ({
          customMargins: { ...state.customMargins, ...margins },
        })),

      setBlueLightFilter: (blueLightFilter) => set({ blueLightFilter }),

      setBlueLightIntensity: (blueLightIntensity) => set({ blueLightIntensity }),

      setReadingRuler: (readingRuler) => set({ readingRuler }),

      setReadingRulerHeight: (height) =>
        set((state) => ({
          readingRulerSettings: { ...state.readingRulerSettings, height },
        })),

      setReadingRulerOpacity: (opacity) =>
        set((state) => ({
          readingRulerSettings: { ...state.readingRulerSettings, opacity },
        })),

      setReadingRulerColor: (color) =>
        set((state) => ({
          readingRulerSettings: { ...state.readingRulerSettings, color },
        })),

      setBionicReading: (bionicReading) => set({ bionicReading }),

      setInterlinearMode: (interlinearMode) => set({ interlinearMode }),

      setInterlinearLanguage: (interlinearLanguage) => set({ interlinearLanguage }),

      setFocusMode: (focusMode) => set({ focusMode }),

      setFocusModeOpacity: (opacity) =>
        set((state) => ({
          focusModeSettings: { ...state.focusModeSettings, opacity },
        })),

      setAutoScroll: (autoScroll) => set({ autoScroll }),

      setAutoScrollSpeed: (autoScrollSpeed) => set({ autoScrollSpeed }),

      setPageTransitionType: (pageTransitionType) => set({ pageTransitionType }),

      // Bulk actions
      updateSettings: (settings) => set(settings),

      resetSettings: () =>
        set({
          theme: DEFAULT_SETTINGS.theme,
          fontFamily: DEFAULT_SETTINGS.fontFamily,
          fontSize: DEFAULT_SETTINGS.fontSize,
          lineHeight: DEFAULT_SETTINGS.lineHeight,
          textAlign: DEFAULT_SETTINGS.textAlign,
          marginSize: DEFAULT_SETTINGS.marginSize,
          customMargins: DEFAULT_SETTINGS.customMargins,
          blueLightFilter: DEFAULT_SETTINGS.blueLightFilter,
          blueLightIntensity: DEFAULT_SETTINGS.blueLightIntensity,
          readingRuler: DEFAULT_SETTINGS.readingRuler,
          readingRulerSettings: DEFAULT_SETTINGS.readingRulerSettings,
          bionicReading: DEFAULT_SETTINGS.bionicReading,
          interlinearMode: DEFAULT_SETTINGS.interlinearMode,
          interlinearLanguage: DEFAULT_SETTINGS.interlinearLanguage,
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

      // Custom font management
      addCustomFont: (font) =>
        set((state) => ({
          customFonts: [...state.customFonts, font],
        })),

      removeCustomFont: async (fontName) => {
        await fontService.deleteCustomFont(fontName);
        set((state) => ({
          customFonts: state.customFonts.filter((f) => f.name !== fontName),
          fontFamily: state.fontFamily === `custom-${fontName}` ? 'serif' : state.fontFamily,
        }));
      },

      loadCustomFonts: async () => {
        await fontService.loadAllCustomFonts();
        const fonts = await fontService.getCustomFonts();
        set({ customFonts: fonts });
      },

      // Custom background actions
      setCustomBackgroundColor: (color) => set({ customBackgroundColor: color }),

      setCustomBackgroundImage: (imageUri) => set({ customBackgroundImage: imageUri }),

      clearCustomBackground: () =>
        set({ customBackgroundColor: undefined, customBackgroundImage: undefined }),

      // UI actions
      toggleSettingsPanel: () =>
        set((state) => ({ isSettingsPanelOpen: !state.isSettingsPanelOpen })),

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
        customMargins: state.customMargins,
        blueLightFilter: state.blueLightFilter,
        blueLightIntensity: state.blueLightIntensity,
        readingRuler: state.readingRuler,
        readingRulerSettings: state.readingRulerSettings,
        bionicReading: state.bionicReading,
        interlinearMode: state.interlinearMode,
        interlinearLanguage: state.interlinearLanguage,
        focusMode: state.focusMode,
        focusModeSettings: state.focusModeSettings,
        autoScroll: state.autoScroll,
        autoScrollSpeed: state.autoScrollSpeed,
        customThemes: state.customThemes,
        customFonts: state.customFonts,
        customBackgroundColor: state.customBackgroundColor,
        customBackgroundImage: state.customBackgroundImage,
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
  CustomMargins,
  ReadingRulerSettings,
  FocusModeSettings,
  RulerColor,
} from '../services/themeService';
export { PREDEFINED_THEMES, DEFAULT_SETTINGS };
