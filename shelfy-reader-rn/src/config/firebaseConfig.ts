/**
 * Firebase Configuration Stub
 *
 * React Native version:
 * - Firebase is not yet integrated; this stub exports null placeholders
 *   so that other modules can import without crashing.
 * - To integrate Firebase, install @react-native-firebase/* packages and
 *   replace these stubs with real initialization.
 *
 * TODO: Install and configure:
 *   - @react-native-firebase/app
 *   - @react-native-firebase/auth
 *   - @react-native-firebase/firestore
 *   - @react-native-firebase/storage
 */

export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  measurementId: '',
};

// Stub exports - these are null/undefined until Firebase is properly configured
export const app = null;
export const db = null;
export const storage = null;
export const auth = null;

/**
 * Check if Firebase is configured and initialized.
 */
export function isFirebaseConfigured(): boolean {
  return false;
}
