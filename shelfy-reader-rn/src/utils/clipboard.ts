/**
 * Clipboard utility
 * Uses react-native's deprecated but available Clipboard API as a fallback
 * until expo-clipboard or @react-native-clipboard/clipboard is installed.
 */

import { Platform } from 'react-native';

/**
 * Copy text to the system clipboard.
 * Uses a basic approach compatible with React Native without extra packages.
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    // Try the expo-clipboard or @react-native-clipboard/clipboard if available
    // For now, use the legacy RN Clipboard (available on older RN, or via polyfill)
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: Clipboard } = require('@react-native-clipboard/clipboard');
      Clipboard.setString(text);
    }
  } catch {
    // Fallback: silently fail if no clipboard API available
    console.warn('Clipboard not available');
  }
}
