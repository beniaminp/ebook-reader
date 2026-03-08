/**
 * Spaced Repetition Service - SM-2 Algorithm
 *
 * Implements the SuperMemo SM-2 algorithm for scheduling highlight reviews.
 * React Native version: uses AsyncStorage instead of localStorage.
 *
 * Note: This service uses synchronous in-memory cache with async persistence
 * to maintain the same synchronous API as the Ionic version.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReviewCard {
  highlightId: string;
  bookId: string;
  text: string;
  note?: string;
  bookTitle: string;
  author: string;
  color: string;
  // SM-2 fields
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: number;
  lastReviewDate: number;
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

const STORAGE_KEY = 'ebook_spaced_repetition_cards';
const REVIEWED_TODAY_KEY = 'ebook_spaced_repetition_reviewed_today';

const QUALITY_MAP: Record<ReviewRating, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 5,
};

// In-memory cache -- loaded once from AsyncStorage, kept in sync
let _cards: ReviewCard[] | null = null;
let _reviewedToday: { date: string; count: number } | null = null;

/**
 * Initialize the in-memory cache from AsyncStorage.
 * Must be called once at app startup (e.g., in App.tsx).
 */
export async function initSpacedRepetition(): Promise<void> {
  try {
    const [cardsRaw, reviewedRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(REVIEWED_TODAY_KEY),
    ]);
    _cards = cardsRaw ? JSON.parse(cardsRaw) : [];
    _reviewedToday = reviewedRaw ? JSON.parse(reviewedRaw) : null;
  } catch {
    _cards = [];
    _reviewedToday = null;
  }
}

function loadCards(): ReviewCard[] {
  return _cards || [];
}

function saveCards(cards: ReviewCard[]): void {
  _cards = cards;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards)).catch(() => {});
}

function getTodayStart(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function getReviewedToday(): number {
  try {
    if (!_reviewedToday) return 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    return _reviewedToday.date === todayStr ? _reviewedToday.count : 0;
  } catch {
    return 0;
  }
}

function incrementReviewedToday(): void {
  const todayStr = new Date().toISOString().slice(0, 10);
  const current = getReviewedToday();
  _reviewedToday = { date: todayStr, count: current + 1 };
  AsyncStorage.setItem(
    REVIEWED_TODAY_KEY,
    JSON.stringify(_reviewedToday)
  ).catch(() => {});
}

/**
 * Initialize a new review card from a highlight.
 * The card starts with default SM-2 values and is due immediately.
 */
export function initializeCard(highlight: {
  id: string;
  bookId: string;
  text: string;
  note?: string;
  bookTitle: string;
  author: string;
  color: string;
}): ReviewCard {
  const card: ReviewCard = {
    highlightId: highlight.id,
    bookId: highlight.bookId,
    text: highlight.text,
    note: highlight.note,
    bookTitle: highlight.bookTitle,
    author: highlight.author,
    color: highlight.color,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: Date.now(), // due immediately
    lastReviewDate: 0,
  };

  const cards = loadCards();
  // Don't add duplicate
  const existing = cards.findIndex((c) => c.highlightId === highlight.id);
  if (existing >= 0) {
    return cards[existing];
  }

  cards.push(card);
  saveCards(cards);
  return card;
}

/**
 * Get cards that are due for review today, sorted by most overdue first.
 */
export function getCardsForReview(limit?: number): ReviewCard[] {
  const cards = loadCards();
  const todayEnd = getTodayStart() + 24 * 60 * 60 * 1000;

  const due = cards
    .filter((c) => c.nextReviewDate <= todayEnd)
    .sort((a, b) => a.nextReviewDate - b.nextReviewDate); // most overdue first

  if (limit && limit > 0) {
    return due.slice(0, limit);
  }
  return due;
}

/**
 * Apply the SM-2 algorithm to a card based on the user's rating.
 *
 * SM-2 Algorithm:
 * - quality < 3 (again, hard): reset repetitions to 0, interval to 1 day
 * - quality >= 3 (good, easy):
 *   - rep 0 -> interval = 1
 *   - rep 1 -> interval = 3
 *   - rep 2+ -> interval = previous * easeFactor
 *   - Update easeFactor: EF' = max(1.3, EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02)))
 *   - Increment repetitions
 */
export function rateCard(highlightId: string, rating: ReviewRating): void {
  const cards = loadCards();
  const index = cards.findIndex((c) => c.highlightId === highlightId);
  if (index < 0) return;

  const card = cards[index];
  const q = QUALITY_MAP[rating];

  // Update ease factor (applied regardless of quality)
  const newEF =
    card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  card.easeFactor = Math.max(1.3, newEF);

  if (q < 3) {
    // Failed review: reset
    card.repetitions = 0;
    card.interval = 1;
  } else {
    // Successful review
    if (card.repetitions === 0) {
      card.interval = 1;
    } else if (card.repetitions === 1) {
      card.interval = 3;
    } else {
      card.interval = Math.round(card.interval * card.easeFactor);
    }
    card.repetitions += 1;
  }

  card.lastReviewDate = Date.now();
  card.nextReviewDate = getTodayStart() + card.interval * 24 * 60 * 60 * 1000;

  cards[index] = card;
  saveCards(cards);
  incrementReviewedToday();
}

/**
 * Get review statistics.
 */
export function getReviewStats(): {
  totalCards: number;
  dueToday: number;
  reviewed: number;
} {
  const cards = loadCards();
  const todayEnd = getTodayStart() + 24 * 60 * 60 * 1000;
  const dueToday = cards.filter((c) => c.nextReviewDate <= todayEnd).length;

  return {
    totalCards: cards.length,
    dueToday,
    reviewed: getReviewedToday(),
  };
}

/**
 * Remove a card from the review schedule.
 */
export function removeCard(highlightId: string): void {
  const cards = loadCards().filter((c) => c.highlightId !== highlightId);
  saveCards(cards);
}

/**
 * Get all stored cards (for debugging / export).
 */
export function getAllCards(): ReviewCard[] {
  return loadCards();
}
