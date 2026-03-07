/**
 * Hardcover Sync Queue - Stub
 * Placeholder for queuing Hardcover.app sync operations.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'hardcover_sync_queue';

export interface SyncQueueItem {
  id: string;
  bookId: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

export const hardcoverSyncQueue = {
  async enqueueSync(
    bookId: string,
    type: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      const queue = await this._getQueue();
      const item: SyncQueueItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        bookId,
        type,
        data,
        createdAt: Date.now(),
        retryCount: 0,
      };
      queue.push(item);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to enqueue sync item:', error);
    }
  },

  async processQueue(): Promise<void> {
    // No-op stub - in real implementation, would process queued items
    console.warn('Hardcover sync queue processing not yet implemented');
  },

  async getQueueCount(): Promise<number> {
    const queue = await this._getQueue();
    return queue.length;
  },

  async clearQueue(): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  },

  async _getQueue(): Promise<SyncQueueItem[]> {
    try {
      const value = await AsyncStorage.getItem(QUEUE_KEY);
      if (value) return JSON.parse(value);
    } catch { /* ignore */ }
    return [];
  },
};

export default hardcoverSyncQueue;
