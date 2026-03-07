import { databaseService } from './database';
import { markDirty } from './firebase/autoBackup';

export interface ProgressUpdate {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  locationString?: string;
  chapterTitle?: string;
}

export interface BookInfo {
  title?: string;
  author?: string;
  previousProgress: number;
  furthestProgress: number;
}

/**
 * Handle side effects of progress updates: furthest progress tracking,
 * streak/goal updates, external sync (Hardcover).
 *
 * Called by useAppStore.updateProgress after DB write and local state update.
 */
export async function handleProgressSideEffects(
  update: ProgressUpdate,
  bookInfo: BookInfo
): Promise<void> {
  // Update furthest progress if new position exceeds the stored maximum
  if (update.percentage > bookInfo.furthestProgress) {
    databaseService
      .updateFurthestProgress(update.bookId, update.percentage * 100)
      .catch(() => {});
  }

  // Check if book just reached completion (>= 95%) for yearly book goal
  const wasFinished = bookInfo.previousProgress >= 0.95;
  const isNowFinished = update.percentage >= 0.95;

  if (isNowFinished && !wasFinished) {
    try {
      const { useReadingGoalsStore } = await import('../stores/useReadingGoalsStore');
      const goalsStore = useReadingGoalsStore.getState();
      if (goalsStore.yearlyGoalEnabled) {
        goalsStore.markBookFinished(
          update.bookId,
          bookInfo.title || 'Unknown Title',
          bookInfo.author || 'Unknown Author'
        );
      }
    } catch {
      /* ignore goals store failure */
    }
  }

  markDirty();

  // Auto-push progress to Hardcover if book is matched
  try {
    const { useHardcoverStore } = await import('../stores/hardcoverStore');
    const hcState = useHardcoverStore.getState();
    if (hcState.isConnected && hcState.matchedBooks[update.bookId]) {
      hcState.pushBookProgress(update.bookId, update.percentage * 100);
    }
  } catch {
    /* ignore hardcover push failure */
  }
}
