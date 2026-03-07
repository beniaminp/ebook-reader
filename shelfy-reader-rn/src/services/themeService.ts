import { themes, ThemeName, ThemeColors } from '../theme/themes';
import type { ReaderTheme } from '../components/reader/engines/types';

/**
 * Convert app theme + reader settings into a ReaderTheme
 * that can be sent to the WebView reader engine.
 */
export function buildReaderTheme(
  themeName: ThemeName,
  settings: {
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: string;
    marginSize?: number;
  }
): ReaderTheme {
  const t = themes[themeName] || themes.light;

  return {
    backgroundColor: t.readerBg,
    textColor: t.readerText,
    linkColor: t.readerLink,
    fontSize: settings.fontSize ?? 16,
    fontFamily: settings.fontFamily ?? 'system-ui, sans-serif',
    lineHeight: settings.lineHeight ?? 1.6,
    letterSpacing: settings.letterSpacing ?? 0,
    textAlign: (settings.textAlign as ReaderTheme['textAlign']) ?? 'left',
    marginSize: settings.marginSize ?? 16,
  };
}

/**
 * Generate CSS for injecting into WebView content
 */
export function generateReaderCSS(theme: ReaderTheme): string {
  return `
    body {
      background-color: ${theme.backgroundColor} !important;
      color: ${theme.textColor} !important;
      font-size: ${theme.fontSize}px !important;
      font-family: ${theme.fontFamily} !important;
      line-height: ${theme.lineHeight} !important;
      letter-spacing: ${theme.letterSpacing}px !important;
      text-align: ${theme.textAlign} !important;
      padding: ${theme.marginSize}px !important;
    }
    a { color: ${theme.linkColor} !important; }
    img { max-width: 100% !important; height: auto !important; }
  `.trim();
}

export function getHighlightColors(themeName: ThemeName): Record<string, string> {
  const t = themes[themeName] || themes.light;
  return {
    yellow: t.highlightYellow,
    green: t.highlightGreen,
    blue: t.highlightBlue,
    pink: t.highlightPink,
  };
}
