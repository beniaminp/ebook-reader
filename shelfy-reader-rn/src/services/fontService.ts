/**
 * Font Service
 * Manages custom font loading and persistence for React Native.
 *
 * React Native version:
 * - Uses AsyncStorage instead of Capacitor Preferences
 * - Uses expo-file-system instead of Capacitor Filesystem
 * - Font loading in RN is handled via expo-font / react-native font APIs
 *   rather than DOM @font-face injection
 * - Google Fonts loaded via WebView CSS injection (for reader engines only)
 */

import { Paths, File, Directory } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_FONTS_KEY = 'custom_fonts';
const CUSTOM_FONTS_DIR = new Directory(Paths.document, 'custom_fonts');

export interface CustomFont {
  name: string;
  path: string;
  filename: string;
  source?: 'file' | 'google-fonts';
}

/**
 * Get list of custom fonts from storage
 */
async function getCustomFonts(): Promise<CustomFont[]> {
  try {
    const value = await AsyncStorage.getItem(CUSTOM_FONTS_KEY);
    if (value) {
      return JSON.parse(value);
    }
    return [];
  } catch (error) {
    console.error('Failed to get custom fonts:', error);
    return [];
  }
}

/**
 * Save custom fonts list to storage
 */
async function saveCustomFontsList(fonts: CustomFont[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(fonts));
  } catch (error) {
    console.error('Failed to save custom fonts list:', error);
    throw error;
  }
}

/**
 * Import a font file from a local URI (e.g., from document picker)
 */
async function importFontFromUri(uri: string, originalName: string): Promise<CustomFont> {
  try {
    // Validate file type
    const validExtensions = ['ttf', 'otf', 'woff', 'woff2'];
    const extension = originalName.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(extension)) {
      throw new Error(`Invalid font file format. Supported formats: ${validExtensions.join(', ')}`);
    }

    // Ensure fonts directory exists
    if (!CUSTOM_FONTS_DIR.exists) {
      CUSTOM_FONTS_DIR.create({ intermediates: true });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `font_${timestamp}_${originalName}`;
    const fontPath = new File(CUSTOM_FONTS_DIR, filename);

    // Copy file to app's fonts directory
    const srcFile = new File(uri);
    srcFile.copy(fontPath);

    // Extract font name from filename (remove extension)
    const fontName = originalName.replace(/\.[^/.]+$/, '');

    // Create font info object
    const fontInfo: CustomFont = {
      name: fontName,
      path: fontPath.uri,
      filename: filename,
      source: 'file',
    };

    // Update fonts list
    const existingFonts = await getCustomFonts();
    const updatedFonts = [...existingFonts, fontInfo];
    await saveCustomFontsList(updatedFonts);

    return fontInfo;
  } catch (error) {
    console.error('Failed to import font file:', error);
    throw error;
  }
}

/**
 * Delete a custom font
 */
async function deleteCustomFont(fontName: string): Promise<void> {
  try {
    const fonts = await getCustomFonts();
    const fontToDelete = fonts.find((f) => f.name === fontName);

    if (!fontToDelete) {
      throw new Error(`Font '${fontName}' not found`);
    }

    if (fontToDelete.source !== 'google-fonts' && fontToDelete.path) {
      // Delete file from filesystem
      try {
        const file = new File(fontToDelete.path);
        if (file.exists) {
          file.delete();
        }
      } catch (error) {
        console.warn('Failed to delete font file from filesystem:', error);
      }
    }

    // Update fonts list
    const updatedFonts = fonts.filter((f) => f.name !== fontName);
    await saveCustomFontsList(updatedFonts);
  } catch (error) {
    console.error('Failed to delete custom font:', error);
    throw error;
  }
}

/**
 * Load all custom fonts from storage on app startup.
 * In React Native, file-based font loading requires expo-font.
 * Google Fonts are loaded via CSS injection in WebView reader engines.
 */
async function loadAllCustomFonts(): Promise<void> {
  try {
    const fonts = await getCustomFonts();

    const fileFonts = fonts.filter((f) => f.source !== 'google-fonts');

    // In React Native, loading file-based custom fonts requires expo-font.
    // This is a no-op placeholder -- actual font loading should happen
    // at app startup using expo-font's loadAsync.
    for (const font of fileFonts) {
      try {
        const file = new File(font.path);
        if (!file.exists) {
          console.warn(`Font file not found: ${font.name} at ${font.path}`);
        }
      } catch (error) {
        console.warn(`Failed to verify font '${font.name}':`, error);
      }
    }
  } catch (error) {
    console.error('Failed to load custom fonts:', error);
  }
}

/**
 * Get the CSS font-family name for a custom font
 */
function getFontFamilyName(fontName: string): string {
  return `Custom-${fontName.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

/**
 * Get Google Fonts CSS2 API URL for a font family.
 * Used for injecting into WebView reader engines.
 */
function getGoogleFontCssUrl(family: string): string {
  const encoded = family.replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;700&display=swap`;
}

/**
 * Load a Google Font - in RN this is a no-op for the native side.
 * Google Fonts are loaded via CSS <link> tags injected into WebView HTML.
 */
function loadGoogleFont(family: string): void {
  // No-op in React Native native context.
  // WebView reader engines include the font via CSS link tag.
  console.log(`Google Font '${family}' registered for WebView use`);
}

/**
 * Remove a Google Font reference
 */
function removeGoogleFont(family: string): void {
  // No-op in React Native native context.
  console.log(`Google Font '${family}' removed`);
}

/**
 * Generate a CSS <link> tag for a Google Font (for WebView injection)
 */
function getGoogleFontLinkTag(family: string): string {
  return `<link rel="stylesheet" href="${getGoogleFontCssUrl(family)}" />`;
}

// Export singleton instance
export const fontService = {
  getCustomFonts,
  saveCustomFontsList,
  importFontFromUri,
  deleteCustomFont,
  loadAllCustomFonts,
  getFontFamilyName,
  getGoogleFontCssUrl,
  getGoogleFontLinkTag,
  loadGoogleFont,
  removeGoogleFont,
};
