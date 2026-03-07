/**
 * Smart Shelves Service - Stub
 * Defines smart shelf types and default shelves.
 */

export interface SmartShelfFilter {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: any;
}

export interface SmartShelf {
  id: string;
  name: string;
  icon?: string;
  filters: SmartShelfFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDefault?: boolean;
}

export const DEFAULT_SMART_SHELVES: SmartShelf[] = [
  {
    id: 'currently-reading',
    name: 'Currently Reading',
    icon: 'book-open',
    filters: [{ field: 'readStatus', operator: 'equals', value: 'reading' }],
    sortBy: 'lastRead',
    sortOrder: 'desc',
    isDefault: true,
  },
  {
    id: 'want-to-read',
    name: 'Want to Read',
    icon: 'bookmark',
    filters: [{ field: 'readStatus', operator: 'equals', value: 'unread' }],
    sortBy: 'dateAdded',
    sortOrder: 'desc',
    isDefault: true,
  },
  {
    id: 'finished',
    name: 'Finished',
    icon: 'check-circle',
    filters: [{ field: 'readStatus', operator: 'equals', value: 'finished' }],
    sortBy: 'lastRead',
    sortOrder: 'desc',
    isDefault: true,
  },
  {
    id: 'recently-added',
    name: 'Recently Added',
    icon: 'clock',
    filters: [],
    sortBy: 'dateAdded',
    sortOrder: 'desc',
    isDefault: true,
  },
];
