export interface HardcoverConfig {
  token: string;
  username?: string;
  autoSync: boolean;
}

export interface HardcoverBook {
  id: number;
  title: string;
  contributions: Array<{ author: { name: string } }>;
  isbn_13?: string;
  isbn_10?: string;
  description?: string;
  pages?: number;
  image?: { url: string };
  rating?: number;
  ratings_count?: number;
}

export interface HardcoverUserBook {
  id: number;
  book_id: number;
  status_id: number; // 1=want_to_read, 2=reading, 3=finished, 4=dnf
  rating?: number;
  review?: string;
  percent_complete?: number;
  book: HardcoverBook;
}

export interface HardcoverSyncResult {
  matched: number;
  pulled: number;
  pushed: number;
  errors: string[];
}

export interface HardcoverQueueItem {
  id: string;
  bookId: string;
  action: 'status' | 'rating' | 'progress';
  payload: string; // JSON
  createdAt: number;
  retryCount: number;
}

export type HardcoverStatusId = 1 | 2 | 3 | 4;

export const HARDCOVER_STATUS_MAP: Record<string, HardcoverStatusId> = {
  unread: 1,
  reading: 2,
  finished: 3,
  dnf: 4,
};

export const HARDCOVER_STATUS_REVERSE: Record<HardcoverStatusId, string> = {
  1: 'unread',
  2: 'reading',
  3: 'finished',
  4: 'dnf',
};
