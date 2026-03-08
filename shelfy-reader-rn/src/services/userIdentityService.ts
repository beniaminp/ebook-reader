/**
 * User Identity Service
 *
 * Generates and persists a unique user identity for P2P features.
 * React Native version: uses expo-crypto for UUID generation
 * and AsyncStorage for persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const STORAGE_KEY = 'p2p_user_id';

let userId: string | null = null;

/**
 * Get the persistent user ID, creating one if it does not exist.
 */
export async function getUserId(): Promise<string> {
  if (!userId) {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      userId = stored;
    } else {
      userId = `user_${Date.now()}_${Crypto.randomUUID().replace(/-/g, '').substring(0, 15)}`;
      await AsyncStorage.setItem(STORAGE_KEY, userId);
    }
  }
  return userId;
}

/**
 * Reset the user ID (useful for testing or account reset).
 */
export async function resetUserId(): Promise<void> {
  userId = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
}
