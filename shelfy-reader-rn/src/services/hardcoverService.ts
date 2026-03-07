/**
 * Hardcover Service - Stub
 * Placeholder for Hardcover.app integration.
 */

import type { HardcoverConfig, HardcoverUserBook } from '../types/hardcover';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HARDCOVER_CONFIG_KEY = 'hardcover_config';

class HardcoverServiceImpl {
  async testConnection(token: string): Promise<string> {
    console.warn('Hardcover integration not yet implemented');
    // In a real implementation, this would validate the token against the API
    // and return the username. For the stub, return a placeholder.
    throw new Error('Hardcover integration not yet implemented');
  }

  async saveConfig(config: HardcoverConfig): Promise<void> {
    await AsyncStorage.setItem(HARDCOVER_CONFIG_KEY, JSON.stringify(config));
  }

  async clearConfig(): Promise<void> {
    await AsyncStorage.removeItem(HARDCOVER_CONFIG_KEY);
  }

  async loadConfig(): Promise<HardcoverConfig | null> {
    try {
      const value = await AsyncStorage.getItem(HARDCOVER_CONFIG_KEY);
      if (value) return JSON.parse(value);
    } catch { /* ignore */ }
    return null;
  }

  async getUserBooks(): Promise<HardcoverUserBook[]> {
    console.warn('Hardcover integration not yet implemented');
    return [];
  }

  async upsertUserBook(
    _hardcoverId: number,
    _data: { statusId?: number; rating?: number; percentComplete?: number }
  ): Promise<void> {
    console.warn('Hardcover integration not yet implemented');
  }
}

export const hardcoverService = new HardcoverServiceImpl();
export default hardcoverService;
