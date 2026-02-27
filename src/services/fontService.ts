/**
 * Font Service
 * Manages custom font loading and persistence
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

const CUSTOM_FONTS_KEY = 'custom_fonts';
const CUSTOM_FONTS_DIR = 'custom_fonts';

export interface CustomFont {
  name: string;
  path: string;
  filename: string;
}

/**
 * Load a custom font by creating a @font-face CSS rule and injecting it into the DOM
 */
async function loadCustomFont(fontName: string, fontFileUri: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Sanitize font family name to prevent CSS injection
      const fontFamily = `Custom-${fontName.replace(/[^a-zA-Z0-9-]/g, '-')}`;

      // Check if this font is already loaded — prevent duplicate style tags
      const existingStyle = document.head.querySelector(`style[data-font="${fontFamily}"]`);
      if (existingStyle) {
        resolve();
        return;
      }

      // Create @font-face rule
      const style = document.createElement('style');
      style.dataset.font = fontFamily;
      style.textContent = `
        @font-face {
          font-family: '${fontFamily}';
          src: url('${fontFileUri}') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `;

      // Inject into document head
      document.head.appendChild(style);

      // Create a test element to trigger font loading
      const testElement = document.createElement('div');
      testElement.style.fontFamily = `'${fontFamily}', sans-serif`;
      testElement.style.position = 'absolute';
      testElement.style.visibility = 'hidden';
      testElement.textContent = 'Test';
      document.body.appendChild(testElement);

      // Use document.fonts API to check if font is loaded
      if ('fonts' in document) {
        document.fonts
          .load(`16px '${fontFamily}'`)
          .then(() => {
            document.body.removeChild(testElement);
            resolve();
          })
          .catch((error) => {
            document.body.removeChild(testElement);
            reject(error);
          });
      } else {
        // Fallback: wait a bit for the font to load
        setTimeout(() => {
          document.body.removeChild(testElement);
          resolve();
        }, 100);
      }
    } catch (error) {
      // Clean up injected style on failure
      const fontFamily = `Custom-${fontName.replace(/[^a-zA-Z0-9-]/g, '-')}`;
      document.head.querySelector(`style[data-font="${fontFamily}"]`)?.remove();
      reject(error);
    }
  });
}

/**
 * Get list of custom fonts from storage
 */
async function getCustomFonts(): Promise<CustomFont[]> {
  try {
    const { value } = await Preferences.get({ key: CUSTOM_FONTS_KEY });
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
    await Preferences.set({
      key: CUSTOM_FONTS_KEY,
      value: JSON.stringify(fonts),
    });
  } catch (error) {
    console.error('Failed to save custom fonts list:', error);
    throw error;
  }
}

/**
 * Import a font file from a File object
 */
async function importFontFile(file: File): Promise<CustomFont> {
  try {
    // Validate file type
    const validExtensions = ['ttf', 'otf', 'woff', 'woff2'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(extension)) {
      throw new Error(`Invalid font file format. Supported formats: ${validExtensions.join(', ')}`);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `font_${timestamp}_${file.name}`;
    const fontPath = `${CUSTOM_FONTS_DIR}/${filename}`;

    // Convert file to base64
    const base64 = await fileToBase64(file);
    const base64Data = base64.split(',')[1]; // Remove data URL prefix

    // Save to Capacitor filesystem
    await Filesystem.writeFile({
      path: fontPath,
      data: base64Data,
      directory: Directory.Data,
      recursive: true,
    });

    // Get the file URI for loading
    const fileUri = await Filesystem.getUri({
      path: fontPath,
      directory: Directory.Data,
    });

    // Extract font name from filename (remove extension)
    const fontName = file.name.replace(/\.[^/.]+$/, '');

    // Create font info object
    const fontInfo: CustomFont = {
      name: fontName,
      path: fileUri.uri,
      filename: filename,
    };

    // Update fonts list
    const existingFonts = await getCustomFonts();
    const updatedFonts = [...existingFonts, fontInfo];
    await saveCustomFontsList(updatedFonts);

    // Load the font immediately
    await loadCustomFont(fontName, fileUri.uri);

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

    // Delete file from filesystem
    try {
      await Filesystem.deleteFile({
        path: `${CUSTOM_FONTS_DIR}/${fontToDelete.filename}`,
        directory: Directory.Data,
      });
    } catch (error) {
      console.warn('Failed to delete font file from filesystem:', error);
    }

    // Update fonts list
    const updatedFonts = fonts.filter((f) => f.name !== fontName);
    await saveCustomFontsList(updatedFonts);

    // Remove @font-face rule from DOM using data attribute for reliable matching
    const fontFamily = `Custom-${fontName.replace(/[^a-zA-Z0-9-]/g, '-')}`;
    document.head.querySelector(`style[data-font="${fontFamily}"]`)?.remove();
  } catch (error) {
    console.error('Failed to delete custom font:', error);
    throw error;
  }
}

/**
 * Load all custom fonts from storage on app startup
 */
async function loadAllCustomFonts(): Promise<void> {
  try {
    const fonts = await getCustomFonts();

    await Promise.allSettled(
      fonts.map((font) =>
        loadCustomFont(font.name, font.path).catch((error) =>
          console.warn(`Failed to load font '${font.name}':`, error)
        )
      )
    );
  } catch (error) {
    console.error('Failed to load custom fonts:', error);
  }
}

/**
 * Helper function to convert File to base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get the CSS font-family name for a custom font
 */
function getFontFamilyName(fontName: string): string {
  return `Custom-${fontName.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

/**
 * Load a web font from Google Fonts or other URL
 * Injects @font-face rule if not already present
 */
async function loadWebFont(fontName: string, url: string, weight: string = 'normal', style: string = 'normal'): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const fontFamily = fontName.replace(/[^a-zA-Z0-9-]/g, '-');
      const existingStyle = document.head.querySelector(`style[data-webfont="${fontFamily}"]`);
      if (existingStyle) {
        resolve();
        return;
      }
      const styleEl = document.createElement('style');
      styleEl.dataset.webfont = fontFamily;
      styleEl.textContent = `
        @font-face {
          font-family: '${fontFamily}';
          src: url('${url}');
          font-weight: ${weight};
          font-style: ${style};
          font-display: swap;
        }
      `;
      document.head.appendChild(styleEl);
      if ('fonts' in document) {
        document.fonts.load(`16px '${fontFamily}'`).then(() => resolve(), reject);
      } else {
        setTimeout(resolve, 100);
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Export singleton instance
export const fontService = {
  loadCustomFont,
  getCustomFonts,
  importFontFile,
  deleteCustomFont,
  loadAllCustomFonts,
  getFontFamilyName,
  loadWebFont,
};
