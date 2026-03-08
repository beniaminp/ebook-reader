/**
 * Firebase Authentication Stub
 *
 * React Native version:
 * - Exports the same interface as the Ionic version
 * - All operations log warnings and return safe defaults
 * - To integrate: install @react-native-firebase/auth and
 *   @react-native-google-signin/google-signin
 *
 * TODO: Replace with real implementation using:
 *   - @react-native-firebase/auth
 *   - @react-native-google-signin/google-signin (for Google Sign-In)
 */

/**
 * Minimal User type matching the Firebase User interface shape.
 * When Firebase is integrated, replace with the real firebase User type.
 */
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Unsubscribe function type for auth state listeners.
 */
export type Unsubscribe = () => void;

/**
 * Sign in with Google.
 * Stub: throws an error until Firebase is configured.
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  console.warn('[Firebase Auth] signInWithGoogle called but Firebase is not configured');
  throw new Error(
    'Firebase is not configured. Install @react-native-firebase/auth and @react-native-google-signin/google-signin to enable Google Sign-In.'
  );
}

/**
 * Sign out the current user.
 * Stub: no-op.
 */
export async function signOutUser(): Promise<void> {
  console.warn('[Firebase Auth] signOutUser called but Firebase is not configured');
}

/**
 * Get the currently signed-in user.
 * Stub: always returns null.
 */
export function getCurrentUser(): FirebaseUser | null {
  return null;
}

/**
 * Listen for auth state changes.
 * Stub: immediately calls callback with null and returns a no-op unsubscribe.
 */
export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void): Unsubscribe {
  // Immediately notify that there's no user
  callback(null);
  return () => {
    // no-op unsubscribe
  };
}
