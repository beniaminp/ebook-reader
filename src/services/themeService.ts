/**
 * Theme Service
 * Manages theme switching, persistence, and application
 */

export type ThemeType =
  | 'light'
  | 'dark'
  | 'sepia'
  | 'eye-comfort'
  | 'night'
  | 'invert'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'paper'
  | 'slate';
export type BuiltInFontFamily =
  | 'serif'
  | 'sans-serif'
  | 'mono'
  | 'bookerly'
  | 'literata'
  | 'open-dyslexic'
  | 'roboto'
  | 'lora'
  | 'merriweather'
  | 'inconsolata'
  | 'nunito';
export type FontFamily = BuiltInFontFamily | `custom-${string}`;
export type TextAlignment = 'left' | 'center' | 'justify' | 'right';
export type MarginSize = 'small' | 'medium' | 'large';
export interface CustomMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';
export type RulerColor = 'accent' | 'yellow' | 'green' | 'blue' | 'pink' | 'red';

export interface ReadingRulerSettings {
  enabled: boolean;
  height: number; // 1-4 lines
  opacity: number; // 0-100
  color: RulerColor;
}

export interface FocusModeSettings {
  enabled: boolean;
  opacity: number; // 0-100 for dimmed content
}

export interface ReadingSettings {
  theme: ThemeType;
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  textAlign: TextAlignment;
  marginSize: MarginSize;
  customMargins: CustomMargins;
  blueLightFilter: boolean;
  blueLightIntensity: number;
  readingRuler: boolean;
  readingRulerSettings: ReadingRulerSettings;
  bionicReading: boolean;
  interlinearMode: boolean;
  interlinearLanguage: string;
  wordWiseEnabled: boolean;
  wordWiseLevel: number;
  focusMode: boolean;
  focusModeSettings: FocusModeSettings;
  autoScroll: boolean;
  autoScrollSpeed: number;
  immersiveMode: boolean;
  hyphenation: boolean;
  paragraphSpacing: number;
  letterSpacing: number;
  fontWeight: number;
  wordSpacing: number;
  maxLineWidth: number; // 0 = no limit, otherwise chars per line
  dropCaps: boolean;
  twoColumnLayout: boolean;
  globalBold: boolean;
  colorVisionFilter: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export interface Theme {
  id: string;
  name: string;
  type: ThemeType;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

const THEME_STORAGE_KEY = 'reading_settings';
const CUSTOM_THEME_KEY = 'custom_themes';

// Predefined themes
export const PREDEFINED_THEMES: Theme[] = [
  {
    id: 'light',
    name: 'Light',
    type: 'light',
    backgroundColor: '#ffffff',
    textColor: '#1a1a1a',
    accentColor: '#007bff',
  },
  {
    id: 'dark',
    name: 'Dark',
    type: 'dark',
    backgroundColor: '#1a1a1a',
    textColor: '#e0e0e0',
    accentColor: '#4da3ff',
  },
  {
    id: 'sepia',
    name: 'Sepia',
    type: 'sepia',
    backgroundColor: '#f4ecd8',
    textColor: '#5c4b37',
    accentColor: '#8b4513',
  },
  {
    id: 'eye-comfort',
    name: 'Eye Comfort',
    type: 'eye-comfort',
    backgroundColor: '#214e34',
    textColor: '#d4e4d4',
    accentColor: '#7dc8a8',
  },
  {
    id: 'night',
    name: 'Night',
    type: 'night',
    backgroundColor: '#0d0d0d',
    textColor: '#c0c0c0',
    accentColor: '#4080ff',
  },
  {
    id: 'invert',
    name: 'Inverted',
    type: 'invert',
    backgroundColor: '#000000',
    textColor: '#ffffff',
    accentColor: '#ff9500',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    type: 'ocean',
    backgroundColor: '#1a2332',
    textColor: '#c8dce8',
    accentColor: '#4da8d8',
  },
  {
    id: 'forest',
    name: 'Forest',
    type: 'forest',
    backgroundColor: '#1a2b1a',
    textColor: '#c8dcc8',
    accentColor: '#7dc87d',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    type: 'sunset',
    backgroundColor: '#2b1f1a',
    textColor: '#e8d8c8',
    accentColor: '#e89060',
  },
  {
    id: 'paper',
    name: 'Paper',
    type: 'paper',
    backgroundColor: '#f5f0e8',
    textColor: '#3d3529',
    accentColor: '#8b6d4a',
  },
  {
    id: 'slate',
    name: 'Slate',
    type: 'slate',
    backgroundColor: '#2d3035',
    textColor: '#c8ccd0',
    accentColor: '#6090c0',
  },
];

// Font family options
export const FONT_FAMILIES: { value: FontFamily; name: string; preview: string }[] = [
  { value: 'serif', name: 'Serif', preview: 'Georgia' },
  { value: 'sans-serif', name: 'Sans Serif', preview: 'System UI' },
  { value: 'mono', name: 'Monospace', preview: 'Courier New' },
  { value: 'bookerly', name: 'Bookerly', preview: 'Bookerly' },
  { value: 'literata', name: 'Literata', preview: 'Literata' },
  { value: 'open-dyslexic', name: 'Open Dyslexic', preview: 'Accessible' },
  { value: 'roboto', name: 'Roboto', preview: 'Roboto' },
  { value: 'lora', name: 'Lora', preview: 'Lora' },
  { value: 'merriweather', name: 'Merriweather', preview: 'Merriweather' },
  { value: 'inconsolata', name: 'Inconsolata', preview: 'Inconsolata' },
  { value: 'nunito', name: 'Nunito', preview: 'Nunito' },
];

// Default settings
export const DEFAULT_SETTINGS: ReadingSettings = {
  theme: 'light',
  fontFamily: 'serif',
  fontSize: 16,
  lineHeight: 1.6,
  textAlign: 'justify',
  marginSize: 'medium',
  customMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  blueLightFilter: false,
  blueLightIntensity: 15,
  readingRuler: false,
  readingRulerSettings: {
    enabled: false,
    height: 2,
    opacity: 30,
    color: 'accent',
  },
  bionicReading: false,
  interlinearMode: false,
  interlinearLanguage: 'en',
  wordWiseEnabled: false,
  wordWiseLevel: 3,
  focusMode: false,
  focusModeSettings: {
    enabled: false,
    opacity: 30,
  },
  autoScroll: false,
  autoScrollSpeed: 1,
  immersiveMode: false,
  hyphenation: false,
  paragraphSpacing: 1,
  letterSpacing: 0,
  fontWeight: 400,
  wordSpacing: 0,
  maxLineWidth: 0,
  dropCaps: false,
  twoColumnLayout: false,
  globalBold: false,
  colorVisionFilter: 'none',
};

class ThemeServiceClass {
  /**
   * Load settings from localStorage
   */
  loadSettings(): ReadingSettings {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Save settings to localStorage
   */
  saveSettings(settings: ReadingSettings): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save theme settings:', error);
    }
  }

  /**
   * Apply theme to document
   */
  applyTheme(theme: ThemeType): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
  }

  /**
   * Apply font family
   */
  applyFontFamily(fontFamily: FontFamily): void {
    const root = document.documentElement;
    root.setAttribute('data-font', fontFamily);
  }

  /**
   * Apply font size
   */
  applyFontSize(fontSize: number): void {
    const root = document.documentElement;
    root.style.setProperty('--reader-font-size', `${fontSize}px`);
  }

  /**
   * Apply line height
   */
  applyLineHeight(lineHeight: number): void {
    const root = document.documentElement;
    root.style.setProperty('--reader-line-height', lineHeight.toString());
  }

  /**
   * Apply text alignment
   */
  applyTextAlign(textAlign: TextAlignment): void {
    const root = document.documentElement;
    root.setAttribute('data-align', textAlign);
    root.style.setProperty('--reader-text-align', textAlign);
  }

  /**
   * Apply margin size
   */
  applyMarginSize(marginSize: MarginSize): void {
    const root = document.documentElement;
    root.setAttribute('data-margin', marginSize);
  }
}

// Export singleton instance
export const themeService = new ThemeServiceClass();

// Legacy export
export { ThemeServiceClass as ThemeService };
