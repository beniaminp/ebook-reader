/* ─── Reading Badges / Achievements ─────────────────── */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'time' | 'streak' | 'special';
  requirement: number;
  unit: string;
}

export interface EarnedBadge extends Badge {
  earnedAt: Date;
  progress: number; // 0-1
}

export interface BadgeStats {
  totalBooks: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  genres: string[];
  sessions: Array<{ startTime: number }>; // unix timestamps in seconds
}

const BADGES: Badge[] = [
  // ─── Reading milestones ───────────────────────────
  {
    id: 'first_book',
    name: 'First Book',
    description: 'Finish your first book',
    icon: '\u{1F4D6}',
    category: 'milestone',
    requirement: 1,
    unit: 'books',
  },
  {
    id: 'bookworm',
    name: 'Bookworm',
    description: 'Finish 10 books',
    icon: '\u{1F41B}',
    category: 'milestone',
    requirement: 10,
    unit: 'books',
  },
  {
    id: 'bibliophile',
    name: 'Bibliophile',
    description: 'Finish 25 books',
    icon: '\u{1F4DA}',
    category: 'milestone',
    requirement: 25,
    unit: 'books',
  },
  {
    id: 'century_reader',
    name: 'Century Reader',
    description: 'Finish 100 books',
    icon: '\u{1F3C6}',
    category: 'milestone',
    requirement: 100,
    unit: 'books',
  },

  // ─── Time milestones ──────────────────────────────
  {
    id: 'first_hour',
    name: 'First Hour',
    description: 'Read for a total of 1 hour',
    icon: '\u{23F0}',
    category: 'time',
    requirement: 60,
    unit: 'minutes',
  },
  {
    id: 'dedicated_reader',
    name: 'Dedicated Reader',
    description: 'Read for a total of 24 hours',
    icon: '\u{1F4D6}',
    category: 'time',
    requirement: 1440,
    unit: 'minutes',
  },
  {
    id: 'reading_marathon',
    name: 'Reading Marathon',
    description: 'Read for a total of 100 hours',
    icon: '\u{1F3C3}',
    category: 'time',
    requirement: 6000,
    unit: 'minutes',
  },
  {
    id: 'thousand_hours',
    name: 'Thousand Hours',
    description: 'Read for a total of 1,000 hours',
    icon: '\u{2B50}',
    category: 'time',
    requirement: 60000,
    unit: 'minutes',
  },

  // ─── Streak milestones ────────────────────────────
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Maintain a 3-day reading streak',
    icon: '\u{1F525}',
    category: 'streak',
    requirement: 3,
    unit: 'days',
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day reading streak',
    icon: '\u{2694}\u{FE0F}',
    category: 'streak',
    requirement: 7,
    unit: 'days',
  },
  {
    id: 'monthly_master',
    name: 'Monthly Master',
    description: 'Maintain a 30-day reading streak',
    icon: '\u{1F451}',
    category: 'streak',
    requirement: 30,
    unit: 'days',
  },
  {
    id: 'year_legend',
    name: 'Year Legend',
    description: 'Maintain a 365-day reading streak',
    icon: '\u{1F30D}',
    category: 'streak',
    requirement: 365,
    unit: 'days',
  },

  // ─── Special ──────────────────────────────────────
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Read after 10 PM',
    icon: '\u{1F989}',
    category: 'special',
    requirement: 1,
    unit: 'sessions',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Read before 7 AM',
    icon: '\u{1F426}',
    category: 'special',
    requirement: 1,
    unit: 'sessions',
  },
  {
    id: 'genre_explorer',
    name: 'Genre Explorer',
    description: 'Read books in 5 or more genres',
    icon: '\u{1F9ED}',
    category: 'special',
    requirement: 5,
    unit: 'genres',
  },
];

/**
 * Returns all defined badges (useful for listing them).
 */
export function getAllBadges(): Badge[] {
  return BADGES;
}

/**
 * Evaluate every badge against the supplied stats.
 * Returns all badges decorated with progress and an earnedAt date
 * (set to epoch-start for unearned badges).
 */
export function evaluateBadges(stats: BadgeStats): EarnedBadge[] {
  const now = new Date();

  // Pre-compute special-badge inputs
  const hasNightSession = stats.sessions.some((s) => {
    const hour = new Date(s.startTime * 1000).getHours();
    return hour >= 22; // 10 PM or later
  });

  const hasEarlySession = stats.sessions.some((s) => {
    const hour = new Date(s.startTime * 1000).getHours();
    return hour < 7; // before 7 AM
  });

  const uniqueGenres = new Set(
    stats.genres.map((g) => g.trim().toLowerCase()).filter(Boolean),
  ).size;

  // Use the longest streak (historical best) for streak badges
  const bestStreak = Math.max(stats.currentStreak, stats.longestStreak);

  return BADGES.map((badge): EarnedBadge => {
    let current: number;

    switch (badge.id) {
      // Milestone badges
      case 'first_book':
      case 'bookworm':
      case 'bibliophile':
      case 'century_reader':
        current = stats.totalBooks;
        break;

      // Time badges
      case 'first_hour':
      case 'dedicated_reader':
      case 'reading_marathon':
      case 'thousand_hours':
        current = stats.totalMinutes;
        break;

      // Streak badges
      case 'getting_started':
      case 'week_warrior':
      case 'monthly_master':
      case 'year_legend':
        current = bestStreak;
        break;

      // Special badges
      case 'night_owl':
        current = hasNightSession ? 1 : 0;
        break;
      case 'early_bird':
        current = hasEarlySession ? 1 : 0;
        break;
      case 'genre_explorer':
        current = uniqueGenres;
        break;

      default:
        current = 0;
    }

    const progress = Math.min(current / badge.requirement, 1);

    return {
      ...badge,
      progress,
      earnedAt: progress >= 1 ? now : new Date(0),
    };
  });
}
