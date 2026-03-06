import type { Book } from '../types/index';

export type SmartShelfField =
  | 'format'
  | 'status'
  | 'rating'
  | 'genre'
  | 'author'
  | 'dateAdded'
  | 'progress'
  | 'pages'
  | 'language'
  | 'title';

export type SmartShelfOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'greaterThan'
  | 'lessThan';

export interface SmartShelfRule {
  field: SmartShelfField;
  operator: SmartShelfOperator;
  value: string | number;
}

export interface SmartShelf {
  id: string;
  name: string;
  icon: string;
  rules: SmartShelfRule[];
  matchAll: boolean;
  /** If set, sorts results by this field */
  sortBy?: 'lastRead' | 'dateAdded' | 'title' | 'progress' | 'rating';
  sortOrder?: 'asc' | 'desc';
  /** Max number of results to return (0 = unlimited) */
  limit?: number;
  /** Whether this is a built-in default shelf (cannot be deleted) */
  isDefault?: boolean;
}

/**
 * Derive a reading status string from a Book's progress and readStatus fields.
 */
function getBookStatus(book: Book): string {
  if (book.readStatus === 'dnf') return 'dnf';
  const prog = book.progress ?? 0;
  if (prog >= 0.95) return 'finished';
  if (prog > 0) return 'reading';
  return 'unread';
}

/**
 * Get a comparable numeric value for a given field on a book.
 */
function getFieldValue(book: Book, field: SmartShelfField): string | number {
  switch (field) {
    case 'format':
      return book.format?.toLowerCase() ?? '';
    case 'status':
      return getBookStatus(book);
    case 'rating':
      return book.metadata?.rating ?? 0;
    case 'genre': {
      const genres = [
        book.genre,
        book.metadata?.genre,
        ...(book.metadata?.genres ?? []),
        ...(book.subgenres ?? []),
      ]
        .filter(Boolean)
        .map((g) => (g as string).toLowerCase());
      return genres.join('|');
    }
    case 'author':
      return book.author?.toLowerCase() ?? '';
    case 'title':
      return book.title?.toLowerCase() ?? '';
    case 'dateAdded': {
      if (book.dateAdded instanceof Date) return book.dateAdded.getTime();
      if (typeof book.dateAdded === 'number') return book.dateAdded;
      if (typeof book.dateAdded === 'string') return new Date(book.dateAdded).getTime() || 0;
      return 0;
    }
    case 'progress':
      return book.progress ?? 0;
    case 'pages':
      return book.pageCount ?? book.metadata?.pageCount ?? book.totalPages ?? 0;
    case 'language':
      return book.metadata?.language?.toLowerCase() ?? '';
    default:
      return '';
  }
}

/**
 * Check if a single rule matches a book.
 */
function matchesRule(book: Book, rule: SmartShelfRule): boolean {
  const bookValue = getFieldValue(book, rule.field);
  const ruleValue =
    typeof rule.value === 'string' ? rule.value.toLowerCase() : rule.value;

  switch (rule.operator) {
    case 'equals':
      if (typeof bookValue === 'string' && typeof ruleValue === 'string') {
        // For pipe-delimited fields like genre, check if any segment equals
        if (bookValue.includes('|')) {
          return bookValue.split('|').some((v) => v === ruleValue);
        }
        return bookValue === ruleValue;
      }
      return bookValue === ruleValue;

    case 'notEquals':
      if (typeof bookValue === 'string' && typeof ruleValue === 'string') {
        if (bookValue.includes('|')) {
          return !bookValue.split('|').some((v) => v === ruleValue);
        }
        return bookValue !== ruleValue;
      }
      return bookValue !== ruleValue;

    case 'contains':
      if (typeof bookValue === 'string' && typeof ruleValue === 'string') {
        return bookValue.includes(ruleValue);
      }
      return String(bookValue).includes(String(ruleValue));

    case 'greaterThan': {
      const numBook = typeof bookValue === 'number' ? bookValue : parseFloat(String(bookValue));
      const numRule = typeof ruleValue === 'number' ? ruleValue : parseFloat(String(ruleValue));
      return !isNaN(numBook) && !isNaN(numRule) && numBook > numRule;
    }

    case 'lessThan': {
      const numBook = typeof bookValue === 'number' ? bookValue : parseFloat(String(bookValue));
      const numRule = typeof ruleValue === 'number' ? ruleValue : parseFloat(String(ruleValue));
      return !isNaN(numBook) && !isNaN(numRule) && numBook < numRule;
    }

    default:
      return false;
  }
}

/**
 * Evaluate a smart shelf against a list of books, returning the matched books.
 */
export function evaluateShelf(shelf: SmartShelf, books: Book[]): Book[] {
  let result = books.filter((book) => {
    if (shelf.rules.length === 0) return false;
    if (shelf.matchAll) {
      return shelf.rules.every((rule) => matchesRule(book, rule));
    }
    return shelf.rules.some((rule) => matchesRule(book, rule));
  });

  // Apply sorting
  if (shelf.sortBy) {
    const order = shelf.sortOrder === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      let aVal: number;
      let bVal: number;
      switch (shelf.sortBy) {
        case 'lastRead':
          aVal = a.lastRead instanceof Date ? a.lastRead.getTime() : typeof a.lastRead === 'number' ? a.lastRead : 0;
          bVal = b.lastRead instanceof Date ? b.lastRead.getTime() : typeof b.lastRead === 'number' ? b.lastRead : 0;
          break;
        case 'dateAdded':
          aVal = a.dateAdded instanceof Date ? a.dateAdded.getTime() : typeof a.dateAdded === 'number' ? a.dateAdded : 0;
          bVal = b.dateAdded instanceof Date ? b.dateAdded.getTime() : typeof b.dateAdded === 'number' ? b.dateAdded : 0;
          break;
        case 'progress':
          aVal = a.progress ?? 0;
          bVal = b.progress ?? 0;
          break;
        case 'rating':
          aVal = a.metadata?.rating ?? 0;
          bVal = b.metadata?.rating ?? 0;
          break;
        case 'title':
          return order * (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
      return order * (aVal - bVal);
    });
  }

  // Apply limit
  if (shelf.limit && shelf.limit > 0) {
    result = result.slice(0, shelf.limit);
  }

  return result;
}

/**
 * Labels for fields (used in the editor UI).
 */
export const FIELD_LABELS: Record<SmartShelfField, string> = {
  format: 'Format',
  status: 'Reading Status',
  rating: 'Rating',
  genre: 'Genre',
  author: 'Author',
  dateAdded: 'Date Added',
  progress: 'Progress',
  pages: 'Page Count',
  language: 'Language',
  title: 'Title',
};

/**
 * Labels for operators.
 */
export const OPERATOR_LABELS: Record<SmartShelfOperator, string> = {
  equals: 'is',
  notEquals: 'is not',
  contains: 'contains',
  greaterThan: 'greater than',
  lessThan: 'less than',
};

/**
 * Get valid operators for a given field.
 */
export function getOperatorsForField(field: SmartShelfField): SmartShelfOperator[] {
  switch (field) {
    case 'rating':
    case 'progress':
    case 'pages':
    case 'dateAdded':
      return ['equals', 'greaterThan', 'lessThan'];
    case 'format':
    case 'status':
      return ['equals', 'notEquals'];
    case 'genre':
    case 'author':
    case 'title':
    case 'language':
      return ['equals', 'notEquals', 'contains'];
    default:
      return ['equals', 'contains', 'greaterThan', 'lessThan'];
  }
}

/**
 * Default smart shelves that come pre-configured.
 */
export const DEFAULT_SMART_SHELVES: SmartShelf[] = [
  {
    id: 'smart-recently-finished',
    name: 'Recently Finished',
    icon: 'checkmark-circle-outline',
    rules: [
      { field: 'progress', operator: 'greaterThan', value: 0.94 },
    ],
    matchAll: true,
    sortBy: 'lastRead',
    sortOrder: 'desc',
    limit: 50,
    isDefault: true,
  },
  {
    id: 'smart-currently-reading',
    name: 'Currently Reading',
    icon: 'book-outline',
    rules: [
      { field: 'progress', operator: 'greaterThan', value: 0 },
      { field: 'progress', operator: 'lessThan', value: 0.95 },
    ],
    matchAll: true,
    sortBy: 'lastRead',
    sortOrder: 'desc',
    isDefault: true,
  },
  {
    id: 'smart-unread',
    name: 'Unread',
    icon: 'library-outline',
    rules: [
      { field: 'status', operator: 'equals', value: 'unread' },
    ],
    matchAll: true,
    sortBy: 'dateAdded',
    sortOrder: 'desc',
    isDefault: true,
  },
  {
    id: 'smart-top-rated',
    name: 'Top Rated',
    icon: 'star-outline',
    rules: [
      { field: 'rating', operator: 'greaterThan', value: 3 },
    ],
    matchAll: true,
    sortBy: 'rating',
    sortOrder: 'desc',
    isDefault: true,
  },
  {
    id: 'smart-short-reads',
    name: 'Short Reads',
    icon: 'time-outline',
    rules: [
      { field: 'pages', operator: 'lessThan', value: 200 },
      { field: 'pages', operator: 'greaterThan', value: 0 },
    ],
    matchAll: true,
    sortBy: 'title',
    sortOrder: 'asc',
    isDefault: true,
  },
];
