import { performBackup } from './backup';

const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let dirty = false;
let activeUserId: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastBackupTime = 0;

async function executeBackup(): Promise<void> {
  if (!activeUserId || !dirty) return;

  const now = Date.now();
  if (now - lastBackupTime < MIN_INTERVAL_MS) {
    // Too soon — reschedule
    scheduleBackup();
    return;
  }

  dirty = false;
  try {
    await performBackup(activeUserId);
    lastBackupTime = Date.now();
  } catch (err) {
    console.error('Auto-backup failed:', err);
    // Re-mark as dirty so it retries next time
    dirty = true;
  }
}

function scheduleBackup(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  const timeSinceLast = Date.now() - lastBackupTime;
  const delay = Math.max(MIN_INTERVAL_MS - timeSinceLast, MIN_INTERVAL_MS);

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    executeBackup();
  }, delay);
}

/**
 * Mark data as changed. If auto-backup is active, schedules a debounced backup.
 * Safe to call frequently — it's a no-op when not signed in.
 */
export function markDirty(): void {
  if (!activeUserId) return;
  dirty = true;
  scheduleBackup();
}

/**
 * Start auto-backup for the given user. Called when user signs in.
 */
export function startAutoBackup(userId: string): void {
  activeUserId = userId;
  dirty = false;
  lastBackupTime = 0;
}

/**
 * Stop auto-backup. Called when user signs out.
 */
export function stopAutoBackup(): void {
  activeUserId = null;
  dirty = false;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
