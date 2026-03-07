/**
 * Cloud Sync Merge Logic
 * Handles merging of bookmarks, highlights, and reading progress between local and remote data.
 */

import { Preferences } from '@capacitor/preferences';
import type {
  SyncData,
  SyncResult,
  BookmarkSync,
  HighlightSync,
  ReadingProgressSync,
  ConflictResolution,
} from '../../types/cloudSync';
import type { Bookmark, Highlight, ReadingProgress } from '../../types/index';

const SYNC_VERSION = 1;

// Generate a unique device ID
let deviceId: string | null = null;

async function getDeviceId(): Promise<string> {
  if (!deviceId) {
    const { value } = await Preferences.get({ key: 'cloudsync_device_id' });
    if (value) {
      deviceId = value;
    } else {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await Preferences.set({ key: 'cloudsync_device_id', value: deviceId });
    }
  }
  return deviceId;
}

/**
 * Merge local and remote sync data
 */
export async function mergeData(
  localBookmarks: Bookmark[],
  localHighlights: Highlight[],
  localProgress: ReadingProgress[],
  remoteData: SyncData | null,
  conflictResolution: ConflictResolution,
  result: SyncResult
): Promise<SyncData> {
  const devId = await getDeviceId();
  const now = Date.now();

  // Convert local data to sync format
  const localBookmarksSync: BookmarkSync[] = localBookmarks.map((b) => ({
    id: b.id,
    bookId: b.bookId,
    location: {
      cfi: b.location.cfi,
      pageNumber: b.location.pageNumber,
      position: b.location.position,
      chapterIndex: b.location.chapterIndex,
    },
    text: b.text,
    chapter: b.chapter,
    timestamp: new Date(b.timestamp).getTime(),
  }));

  const localHighlightsSync: HighlightSync[] = localHighlights.map((h) => ({
    id: h.id,
    bookId: h.bookId,
    location: {
      cfi: h.location.cfi,
      pageNumber: h.location.pageNumber,
      position: h.location.position,
      chapterIndex: h.location.chapterIndex,
    },
    text: h.text,
    color: h.color,
    note: h.note,
    timestamp: new Date(h.timestamp).getTime(),
  }));

  const localProgressSync: ReadingProgressSync[] = localProgress.map((p) => ({
    id: p.id,
    bookId: p.bookId,
    currentPage: p.currentPage,
    totalPages: p.totalPages,
    percentage: p.percentage,
    location: p.location,
    chapterId: p.chapterId,
    chapterTitle: p.chapterTitle,
    lastReadAt: p.lastReadAt,
    timestamp: p.updatedAt,
  }));

  // If no remote data, just return local data
  if (!remoteData) {
    return {
      version: SYNC_VERSION,
      timestamp: now,
      deviceId: devId,
      bookmarks: localBookmarksSync,
      highlights: localHighlightsSync,
      readingProgress: localProgressSync,
    };
  }

  // Merge bookmarks
  const mergedBookmarks = mergeBookmarks(
    localBookmarksSync,
    remoteData.bookmarks,
    conflictResolution,
    result
  );

  // Merge highlights
  const mergedHighlights = mergeHighlights(
    localHighlightsSync,
    remoteData.highlights,
    conflictResolution,
    result
  );

  // Merge progress (always last-write-wins for progress)
  const mergedProgress = mergeProgress(
    localProgressSync,
    remoteData.readingProgress,
    result
  );

  return {
    version: SYNC_VERSION,
    timestamp: now,
    deviceId: devId,
    bookmarks: mergedBookmarks,
    highlights: mergedHighlights,
    readingProgress: mergedProgress,
  };
}

/**
 * Merge bookmarks with conflict resolution
 */
function mergeBookmarks(
  local: BookmarkSync[],
  remote: BookmarkSync[],
  resolution: ConflictResolution,
  result: SyncResult
): BookmarkSync[] {
  const mergedMap = new Map<string, BookmarkSync>();
  const localMap = new Map(local.map((b) => [b.id, b]));
  const remoteMap = new Map(remote.map((b) => [b.id, b]));

  // Add all local bookmarks
  for (const [id, bookmark] of localMap) {
    mergedMap.set(id, bookmark);
  }

  // Merge remote bookmarks
  for (const [id, remoteBookmark] of remoteMap) {
    const localBookmark = localMap.get(id);

    if (!localBookmark) {
      // Remote bookmark doesn't exist locally
      if (remoteBookmark.deleted) {
        // Skip deleted bookmarks
        continue;
      }
      mergedMap.set(id, remoteBookmark);
      result.bookmarksAdded++;
    } else {
      // Conflict: bookmark exists on both sides
      const resolutionResult = resolveConflict(
        localBookmark,
        remoteBookmark,
        resolution,
        result
      );

      if (resolutionResult === 'remote') {
        mergedMap.set(id, remoteBookmark);
        result.bookmarksUpdated++;
      } else if (resolutionResult === 'local') {
        result.bookmarksUpdated++;
      }
    }
  }

  // Handle deleted bookmarks — only count if actually removed from merged set
  for (const [id, remoteBookmark] of remoteMap) {
    if (remoteBookmark.deleted && mergedMap.has(id)) {
      mergedMap.delete(id);
      result.bookmarksRemoved++;
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Merge highlights with conflict resolution
 */
function mergeHighlights(
  local: HighlightSync[],
  remote: HighlightSync[],
  resolution: ConflictResolution,
  result: SyncResult
): HighlightSync[] {
  const mergedMap = new Map<string, HighlightSync>();
  const localMap = new Map(local.map((h) => [h.id, h]));
  const remoteMap = new Map(remote.map((h) => [h.id, h]));

  // Add all local highlights
  for (const [id, highlight] of localMap) {
    mergedMap.set(id, highlight);
  }

  // Merge remote highlights
  for (const [id, remoteHighlight] of remoteMap) {
    const localHighlight = localMap.get(id);

    if (!localHighlight) {
      // Remote highlight doesn't exist locally
      if (remoteHighlight.deleted) {
        continue;
      }
      mergedMap.set(id, remoteHighlight);
      result.highlightsAdded++;
    } else {
      // Conflict: highlight exists on both sides
      const resolutionResult = resolveConflict(
        localHighlight,
        remoteHighlight,
        resolution,
        result,
        'highlight'
      );

      if (resolutionResult === 'remote') {
        mergedMap.set(id, remoteHighlight);
        result.highlightsUpdated++;
      } else if (resolutionResult === 'local') {
        result.highlightsUpdated++;
      }
    }
  }

  // Handle deleted highlights — only count if actually removed from merged set
  for (const [id, remoteHighlight] of remoteMap) {
    if (remoteHighlight.deleted && mergedMap.has(id)) {
      mergedMap.delete(id);
      result.highlightsRemoved++;
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Merge reading progress (last-write-wins)
 */
function mergeProgress(
  local: ReadingProgressSync[],
  remote: ReadingProgressSync[],
  result: SyncResult
): ReadingProgressSync[] {
  const mergedMap = new Map<string, ReadingProgressSync>();
  const localMap = new Map(local.map((p) => [p.bookId, p]));
  const remoteMap = new Map(remote.map((p) => [p.bookId, p]));

  // Add all local progress
  for (const [bookId, progress] of localMap) {
    mergedMap.set(bookId, progress);
  }

  // Merge remote progress (last-write-wins based on timestamp)
  for (const [bookId, remoteProgress] of remoteMap) {
    const localProgress = localMap.get(bookId);

    if (!localProgress) {
      // Remote progress doesn't exist locally
      if (!remoteProgress.deleted) {
        mergedMap.set(bookId, remoteProgress);
        result.progressUpdated++;
      }
    } else {
      // Use the one with the most recent timestamp
      if (remoteProgress.timestamp > localProgress.timestamp) {
        mergedMap.set(bookId, remoteProgress);
        result.progressUpdated++;
      }
    }
  }

  // Handle deleted progress
  for (const [bookId, remoteProgress] of remoteMap) {
    if (remoteProgress.deleted && !localMap.has(bookId)) {
      mergedMap.delete(bookId);
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Resolve a single conflict
 */
function resolveConflict(
  local: any,
  remote: any,
  resolution: ConflictResolution,
  result: SyncResult,
  conflictType: 'bookmark' | 'highlight' | 'progress' = 'bookmark'
): 'local' | 'remote' {
  const localTime = local.timestamp || 0;
  const remoteTime = remote.timestamp || 0;

  switch (resolution) {
    case 'client-wins':
      return 'local';
    case 'server-wins':
      return 'remote';
    case 'last-write-wins':
      return remoteTime > localTime ? 'remote' : 'local';
    case 'manual':
      // For now, use last-write-wins
      result.conflicts.push({
        type: conflictType,
        id: local.id,
        bookId: local.bookId,
        localData: local,
        remoteData: remote,
        resolution: remoteTime > localTime ? 'remote' : 'local',
      });
      return remoteTime > localTime ? 'remote' : 'local';
    default:
      return 'local';
  }
}
