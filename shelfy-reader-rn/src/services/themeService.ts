/**
 * Theme Service
 * Manages theme types, reading settings, and WebView communication
 * for applying themes to reader engines via postMessage.
 *
 * React Native version:
 * - No DOM manipulation (document.documentElement, etc.)
 * - Theme application happens via postMessage to WebView reader engines
 * - Settings persistence handled by Zustand + AsyncStorage (in useThemeStore)
 */

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// PREDEFINED THEMES
// ============================================================================

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

// ============================================================================
// FONT FAMILIES
// ============================================================================

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

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

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

// ============================================================================
// WEBVIEW MESSAGE TYPES
// ============================================================================

/**
 * Message sent to WebView reader engines to apply theme/typography settings.
 */
export interface ThemeMessage {
  type: 'applyTheme';
  payload: {
    theme: ThemeType;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    textAlign: TextAlignment;
    marginSize: MarginSize;
    customMargins: CustomMargins;
    hyphenation: boolean;
    paragraphSpacing: number;
    letterSpacing: number;
    fontWeight: number;
    wordSpacing: number;
    maxLineWidth: number;
    dropCaps: boolean;
    twoColumnLayout: boolean;
    globalBold: boolean;
    bionicReading: boolean;
  };
}

// ============================================================================
// THEME SERVICE
// ============================================================================

class ThemeServiceClass {
  /**
   * Find a predefined theme by type
   */
  getTheme(themeType: ThemeType): Theme {
    return PREDEFINED_THEMES.find((t) => t.type === themeType) || PREDEFINED_THEMES[0];
  }

  /**
   * Build a postMessage payload for the WebView reader engine.
   * The WebView HTML should listen for 'message' events and apply these styles.
   */
  buildThemeMessage(settings: ReadingSettings): ThemeMessage {
    const theme = this.getTheme(settings.theme);
    return {
      type: 'applyTheme',
      payload: {
        theme: settings.theme,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        accentColor: theme.accentColor,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight,
        textAlign: settings.textAlign,
        marginSize: settings.marginSize,
        customMargins: settings.customMargins,
        hyphenation: settings.hyphenation,
        paragraphSpacing: settings.paragraphSpacing,
        letterSpacing: settings.letterSpacing,
        fontWeight: settings.fontWeight,
        wordSpacing: settings.wordSpacing,
        maxLineWidth: settings.maxLineWidth,
        dropCaps: settings.dropCaps,
        twoColumnLayout: settings.twoColumnLayout,
        globalBold: settings.globalBold,
        bionicReading: settings.bionicReading,
      },
    };
  }

  /**
   * Serialize a theme message for use with WebView.postMessage().
   * The WebView should call `JSON.parse(event.nativeEvent.data)` on the other end.
   */
  serializeThemeMessage(settings: ReadingSettings): string {
    return JSON.stringify(this.buildThemeMessage(settings));
  }

  /**
   * Generate CSS variables string for injection into WebView HTML.
   * Can be used as the initial style when loading the WebView.
   */
  generateCssVariables(settings: ReadingSettings): string {
    const theme = this.getTheme(settings.theme);
    const marginPx = settings.marginSize === 'small' ? 8 : settings.marginSize === 'large' ? 32 : 16;

    return `
      :root {
        --reader-bg: ${theme.backgroundColor};
        --reader-text: ${theme.textColor};
        --reader-accent: ${theme.accentColor};
        --reader-font-family: ${this.resolveFontFamily(settings.fontFamily)};
        --reader-font-size: ${settings.fontSize}px;
        --reader-line-height: ${settings.lineHeight};
        --reader-text-align: ${settings.textAlign};
        --reader-margin: ${marginPx}px;
        --reader-margin-top: ${settings.customMargins.top || marginPx}px;
        --reader-margin-bottom: ${settings.customMargins.bottom || marginPx}px;
        --reader-margin-left: ${settings.customMargins.left || marginPx}px;
        --reader-margin-right: ${settings.customMargins.right || marginPx}px;
        --reader-paragraph-spacing: ${settings.paragraphSpacing}em;
        --reader-letter-spacing: ${settings.letterSpacing}em;
        --reader-word-spacing: ${settings.wordSpacing}em;
        --reader-font-weight: ${settings.globalBold ? 700 : settings.fontWeight};
        --reader-max-line-width: ${settings.maxLineWidth > 0 ? settings.maxLineWidth + 'ch' : 'none'};
      }
      body {
        background-color: var(--reader-bg);
        color: var(--reader-text);
        font-family: var(--reader-font-family);
        font-size: var(--reader-font-size);
        line-height: var(--reader-line-height);
        text-align: var(--reader-text-align);
        font-weight: var(--reader-font-weight);
        letter-spacing: var(--reader-letter-spacing);
        word-spacing: var(--reader-word-spacing);
        padding: var(--reader-margin-top) var(--reader-margin-right) var(--reader-margin-bottom) var(--reader-margin-left);
        max-width: var(--reader-max-line-width);
        margin: 0 auto;
        ${settings.hyphenation ? 'hyphens: auto; -webkit-hyphens: auto;' : ''}
      }
      a { color: var(--reader-accent); }
      img { max-width: 100%; height: auto; }
      p { margin-bottom: var(--reader-paragraph-spacing); }
      ${settings.dropCaps ? 'p:first-of-type::first-letter { font-size: 3em; float: left; line-height: 1; margin-right: 0.1em; }' : ''}
    `.trim();
  }

  /**
   * Generate a complete HTML wrapper for WebView content.
   * Includes a message listener that applies theme updates at runtime.
   */
  generateWebViewHtml(bodyContent: string, settings: ReadingSettings): string {
    const css = this.generateCssVariables(settings);
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>${css}</style>
  <script>
    // Listen for theme updates from React Native
    window.addEventListener('message', function(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'applyTheme') {
          var p = msg.payload;
          var root = document.documentElement;
          root.style.setProperty('--reader-bg', p.backgroundColor);
          root.style.setProperty('--reader-text', p.textColor);
          root.style.setProperty('--reader-accent', p.accentColor);
          root.style.setProperty('--reader-font-size', p.fontSize + 'px');
          root.style.setProperty('--reader-line-height', String(p.lineHeight));
          root.style.setProperty('--reader-text-align', p.textAlign);
          root.style.setProperty('--reader-font-weight', p.globalBold ? '700' : String(p.fontWeight));
          root.style.setProperty('--reader-letter-spacing', p.letterSpacing + 'em');
          root.style.setProperty('--reader-word-spacing', p.wordSpacing + 'em');
          root.style.setProperty('--reader-paragraph-spacing', p.paragraphSpacing + 'em');
          root.style.setProperty('--reader-max-line-width', p.maxLineWidth > 0 ? p.maxLineWidth + 'ch' : 'none');
          document.body.style.hyphens = p.hyphenation ? 'auto' : 'manual';
        }
      } catch(e) {}
    });

    // Also handle ReactNativeWebView message channel
    document.addEventListener('message', function(event) {
      window.dispatchEvent(new MessageEvent('message', { data: event.data }));
    });
  </script>
</head>
<body>${bodyContent}</body>
</html>`.trim();
  }

  /**
   * Get highlight colors for a given theme
   */
  getHighlightColors(themeType: ThemeType): Record<string, string> {
    // Highlight colors are consistent across themes
    return {
      yellow: '#ffff00',
      green: '#00ff00',
      blue: '#00ffff',
      pink: '#ff00ff',
    };
  }

  /**
   * Resolve a FontFamily value to a CSS font-family string
   */
  private resolveFontFamily(fontFamily: FontFamily): string {
    switch (fontFamily) {
      case 'serif':
        return 'Georgia, "Times New Roman", serif';
      case 'sans-serif':
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case 'mono':
        return '"Courier New", Courier, monospace';
      case 'bookerly':
        return '"Bookerly", Georgia, serif';
      case 'literata':
        return '"Literata", Georgia, serif';
      case 'open-dyslexic':
        return '"OpenDyslexic", "Comic Sans MS", sans-serif';
      case 'roboto':
        return '"Roboto", sans-serif';
      case 'lora':
        return '"Lora", Georgia, serif';
      case 'merriweather':
        return '"Merriweather", Georgia, serif';
      case 'inconsolata':
        return '"Inconsolata", "Courier New", monospace';
      case 'nunito':
        return '"Nunito", sans-serif';
      default:
        if (fontFamily.startsWith('custom-')) {
          const name = fontFamily.replace('custom-', '');
          return `"Custom-${name}", serif`;
        }
        return 'serif';
    }
  }
}

// Export singleton instance
export const themeService = new ThemeServiceClass();

// Legacy export
export { ThemeServiceClass as ThemeService };
