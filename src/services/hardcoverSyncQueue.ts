/**
 * Hardcover Sync Queue
 *
 * Offline-resilient queue for Hardcover mutations.
 * Queues mutations when offline and replays them when connectivity returns.
 */

import { databaseService } from './database';
import { hardcoverService } from './hardcoverService';
import type { HardcoverStatusId } from '../types/hardcover';

const MAX_RETRIES = 5;

export async function enqueueSync(
  bookId: string,
  action: 'status' | 'rating' | 'progress',
  payload: Record<string, any>
): Promise<void> {
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  await databaseService.addToSyncQueue({
    id,
    bookId,
    action,
    payload: JSON.stringify(payload),
  });
}

export async function processQueue(): Promise<{ processed: number; failed: number }> {
  const queue = await databaseService.getSyncQueue();
  let processed = 0;
  let failed = 0;

  for (const item of queue) {
    if (item.retryCount >= MAX_RETRIES) {
      // Permanent failure — remove from queue
      await databaseService.removeSyncQueueItem(item.id);
      failed++;
      continue;
    }

    try {
      const payload = JSON.parse(item.payload);
      const hardcoverId = payload.hardcoverId as number;

      if (!hardcoverId) {
        // No hardcover mapping — remove
        await databaseService.removeSyncQueueItem(item.id);
        failed++;
        continue;
      }

      switch (item.action) {
        case 'status':
          await hardcoverService.upsertUserBook(hardcoverId, {
            statusId: payload.statusId as HardcoverStatusId,
          });
          break;
        case 'rating':
          await hardcoverService.upsertUserBook(hardcoverId, {
            rating: payload.rating as number,
          });
          break;
        case 'progress':
          await hardcoverService.upsertUserBook(hardcoverId, {
            percentageRead: payload.percentage as number,
          });
          break;
      }

      await databaseService.removeSyncQueueItem(item.id);
      processed++;
    } catch (error: any) {
      const status = error?.status || error?.message?.match(/(\d{3})/)?.[1];
      if (status && parseInt(status) >= 400 && parseInt(status) < 500) {
        // Client error — permanent failure, remove
        await databaseService.removeSyncQueueItem(item.id);
        failed++;
      } else {
        // Network error — retry later
        await databaseService.updateSyncQueueRetry(item.id);
        failed++;
      }
    }
  }

  return { processed, failed };
}

export async function getQueueCount(): Promise<number> {
  const queue = await databaseService.getSyncQueue();
  return queue.length;
}

export const hardcoverSyncQueue = {
  enqueueSync,
  processQueue,
  getQueueCount,
};
