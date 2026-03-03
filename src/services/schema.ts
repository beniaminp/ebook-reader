/**
 * SQLite database schema definitions
 * Contains all SQL statements for table creation and migration
 */

// Schema version
export const DB_SCHEMA_VERSION = 1;

// Database name
export const DB_NAME = 'ebook_reader_db';

// Tables
export const TABLES = {
  BOOKS: 'books',
  READING_PROGRESS: 'reading_progress',
  BOOKMARKS: 'bookmarks',
  HIGHLIGHTS: 'highlights',
  COLLECTIONS: 'collections',
  BOOK_COLLECTIONS: 'book_collections',
  TAGS: 'tags',
  BOOK_TAGS: 'book_tags',
  READING_STATS: 'reading_stats',
  APP_SETTINGS: 'app_settings',
  THEMES: 'themes',
  THEME_PREFERENCES: 'theme_preferences',
  NOTES: 'notes',
  SEARCH_HISTORY: 'search_history',
  DICTIONARY_LOOKUPS: 'dictionary_lookups',
  TRANSLATION_SETTINGS: 'translation_settings',
  TRANSLATION_HISTORY: 'translation_history',
  SYNC_STATUS: 'sync_status',
  MIGRATIONS: 'migrations',
} as const;

// Table creation SQL statements
export const CREATE_TABLES = {
  [TABLES.BOOKS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.BOOKS} (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'Unknown',
      file_path TEXT NOT NULL UNIQUE,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      format TEXT NOT NULL CHECK(format IN ('EPUB', 'PDF', 'TXT', 'HTML', 'MD', 'MOBI', 'AZW3', 'CBZ', 'CBR', 'DOCX', 'ODT', 'FB2', 'CHM')),
      cover_path TEXT,
      total_pages INTEGER,
      language TEXT,
      publisher TEXT,
      publish_date TEXT,
      isbn TEXT,
      description TEXT,
      source TEXT NOT NULL DEFAULT 'local' CHECK(source IN ('local', 'calibre-web', 'opds', 'dropbox', 'webdav', 'gdrive')),
      source_id TEXT,
      source_url TEXT,
      downloaded INTEGER NOT NULL DEFAULT 1,
      series TEXT,
      series_index REAL,
      rating REAL CHECK(rating >= 0 AND rating <= 5),
      tags TEXT,
      genre TEXT,
      subgenres TEXT,
      read_status TEXT DEFAULT 'unread',
      added_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      last_opened_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `,

  [TABLES.READING_PROGRESS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.READING_PROGRESS} (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL UNIQUE,
      current_page INTEGER NOT NULL DEFAULT 0,
      total_pages INTEGER NOT NULL DEFAULT 0,
      percentage REAL NOT NULL DEFAULT 0,
      location TEXT,
      chapter_id TEXT,
      chapter_title TEXT,
      last_read_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.BOOKS}(id) ON DELETE CASCADE
    );
  `,

  [TABLES.BOOKMARKS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.BOOKMARKS} (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      location TEXT NOT NULL,
      page_number INTEGER,
      chapter_id TEXT,
      chapter_title TEXT,
      text_preview TEXT,
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.BOOKS}(id) ON DELETE CASCADE
    );
  `,

  [TABLES.HIGHLIGHTS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.HIGHLIGHTS} (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      location TEXT NOT NULL,
      text TEXT NOT NULL,
      color TEXT DEFAULT '#ffff00',
      note TEXT,
      page_number INTEGER,
      rects TEXT,
      chapter_id TEXT,
      chapter_title TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.BOOKS}(id) ON DELETE CASCADE
    );
  `,

  [TABLES.COLLECTIONS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.COLLECTIONS} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      cover_path TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `,

  [TABLES.BOOK_COLLECTIONS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.BOOK_COLLECTIONS} (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      collection_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      added_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(book_id, collection_id),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.BOOKS}(id) ON DELETE CASCADE,
      FOREIGN KEY (collection_id) REFERENCES ${TABLES.COLLECTIONS}(id) ON DELETE CASCADE
    );
  `,

  [TABLES.TAGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.TAGS} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      color TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `,

  [TABLES.BOOK_TAGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.BOOK_TAGS} (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      added_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(book_id, tag_id),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.BOOKS}(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES ${TABLES.TAGS}(id) ON DELETE CASCADE
    );
  `,

  [TABLES.READING_STATS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.READING_STATS} (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      date INTEGER NOT NULL,
      pages_read INTEGER NOT NULL DEFAULT 0,
      time_spent INTEGER NOT NULL DEFAULT 0,
      session_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(book_id, date),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.BOOKS}(id) ON DELETE CASCADE
    );
  `,

  [TABLES.APP_SETTINGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.APP_SETTINGS} (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      category TEXT,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `,

  [TABLES.THEMES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.THEMES} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      is_default INTEGER NOT NULL DEFAULT 0,
      background_color TEXT NOT NULL,
      text_color TEXT NOT NULL,
      secondary_color TEXT,
      font_family TEXT NOT NULL DEFAULT ' serif',
      font_size INTEGER NOT NULL DEFAULT 16,
      line_height REAL NOT NULL DEFAULT 1.6,
      text_alignment TEXT NOT NULL DEFAULT 'justify' CHECK(text_alignment IN ('left', 'center', 'justify', 'right')),
      margin_size TEXT NOT NULL DEFAULT 'medium' CHECK(margin_size IN ('small', 'medium', 'large')),
      custom_css TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `,

  [TABLES.THEME_PREFERENCES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.THEME_PREFERENCES} (
      id TEXT PRIMARY KEY,
      book_id TEXT,
      theme_id TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.BOOKS}(id) ON DELETE CASCADE,
      FOREIGN KEY (theme_id) REFERENCES ${TABLES.THEMES}(id) ON DELETE CASCADE
    );
  `,

  [TABLES.NOTES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.NOTES} (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      location TEXT NOT NULL,
      page_number INTEGER,
      chapter_id TEXT,
      chapter_title TEXT,
      content TEXT NOT NULL,
      color TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.BOOKS}(id) ON DELETE CASCADE
    );
  `,

  [TABLES.SEARCH_HISTORY]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.SEARCH_HISTORY} (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      query TEXT NOT NULL,
      result_count INTEGER NOT NULL DEFAULT 0,
      searched_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.BOOKS}(id) ON DELETE CASCADE
    );
  `,

  [TABLES.DICTIONARY_LOOKUPS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.DICTIONARY_LOOKUPS} (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL UNIQUE COLLATE NOCASE,
      definition TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      looked_up_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      lookup_count INTEGER NOT NULL DEFAULT 1
    );
  `,

  [TABLES.TRANSLATION_SETTINGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.TRANSLATION_SETTINGS} (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      category TEXT,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `,

  [TABLES.TRANSLATION_HISTORY]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.TRANSLATION_HISTORY} (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      source_text TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      source_lang TEXT NOT NULL,
      target_lang TEXT NOT NULL,
      location TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.BOOKS}(id) ON DELETE CASCADE
    );
  `,

  [TABLES.SYNC_STATUS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.SYNC_STATUS} (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL CHECK(provider IN ('dropbox', 'webdav', 'gdrive')),
      last_sync_at INTEGER NOT NULL DEFAULT 0,
      sync_enabled INTEGER NOT NULL DEFAULT 0,
      conflict_resolution TEXT NOT NULL DEFAULT 'manual' CHECK(conflict_resolution IN ('local', 'remote', 'manual')),
      settings TEXT,
      UNIQUE(provider)
    );
  `,

  [TABLES.MIGRATIONS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.MIGRATIONS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `,
} as const;

// Index creation SQL statements
export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_books_format ON ${TABLES.BOOKS}(format);`,
  `CREATE INDEX IF NOT EXISTS idx_books_added_at ON ${TABLES.BOOKS}(added_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_books_last_opened ON ${TABLES.BOOKS}(last_opened_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_books_title ON ${TABLES.BOOKS}(title COLLATE NOCASE);`,
  `CREATE INDEX IF NOT EXISTS idx_books_author ON ${TABLES.BOOKS}(author COLLATE NOCASE);`,

  `CREATE INDEX IF NOT EXISTS idx_reading_progress_book_id ON ${TABLES.READING_PROGRESS}(book_id);`,
  `CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read ON ${TABLES.READING_PROGRESS}(last_read_at DESC);`,

  `CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON ${TABLES.BOOKMARKS}(book_id);`,
  `CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON ${TABLES.BOOKMARKS}(created_at DESC);`,

  `CREATE INDEX IF NOT EXISTS idx_highlights_book_id ON ${TABLES.HIGHLIGHTS}(book_id);`,
  `CREATE INDEX IF NOT EXISTS idx_highlights_created_at ON ${TABLES.HIGHLIGHTS}(created_at DESC);`,

  `CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON ${TABLES.COLLECTIONS}(sort_order);`,

  `CREATE INDEX IF NOT EXISTS idx_book_collections_book_id ON ${TABLES.BOOK_COLLECTIONS}(book_id);`,
  `CREATE INDEX IF NOT EXISTS idx_book_collections_collection_id ON ${TABLES.BOOK_COLLECTIONS}(collection_id);`,

  `CREATE INDEX IF NOT EXISTS idx_tags_name ON ${TABLES.TAGS}(name COLLATE NOCASE);`,

  `CREATE INDEX IF NOT EXISTS idx_book_tags_book_id ON ${TABLES.BOOK_TAGS}(book_id);`,
  `CREATE INDEX IF NOT EXISTS idx_book_tags_tag_id ON ${TABLES.BOOK_TAGS}(tag_id);`,

  `CREATE INDEX IF NOT EXISTS idx_reading_stats_book_id ON ${TABLES.READING_STATS}(book_id);`,
  `CREATE INDEX IF NOT EXISTS idx_reading_stats_date ON ${TABLES.READING_STATS}(date DESC);`,

  `CREATE INDEX IF NOT EXISTS idx_app_settings_key ON ${TABLES.APP_SETTINGS}(key);`,
  `CREATE INDEX IF NOT EXISTS idx_app_settings_category ON ${TABLES.APP_SETTINGS}(category);`,

  `CREATE INDEX IF NOT EXISTS idx_theme_preferences_book_id ON ${TABLES.THEME_PREFERENCES}(book_id);`,

  `CREATE INDEX IF NOT EXISTS idx_notes_book_id ON ${TABLES.NOTES}(book_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_created_at ON ${TABLES.NOTES}(created_at DESC);`,

  `CREATE INDEX IF NOT EXISTS idx_search_history_book_id ON ${TABLES.SEARCH_HISTORY}(book_id);`,
  `CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON ${TABLES.SEARCH_HISTORY}(searched_at DESC);`,

  `CREATE INDEX IF NOT EXISTS idx_dictionary_word ON ${TABLES.DICTIONARY_LOOKUPS}(word COLLATE NOCASE);`,
  `CREATE INDEX IF NOT EXISTS idx_dictionary_lookup_count ON ${TABLES.DICTIONARY_LOOKUPS}(lookup_count DESC);`,

  `CREATE INDEX IF NOT EXISTS idx_translation_settings_key ON ${TABLES.TRANSLATION_SETTINGS}(key);`,
  `CREATE INDEX IF NOT EXISTS idx_translation_settings_category ON ${TABLES.TRANSLATION_SETTINGS}(category);`,

  `CREATE INDEX IF NOT EXISTS idx_translation_history_book_id ON ${TABLES.TRANSLATION_HISTORY}(book_id);`,
  `CREATE INDEX IF NOT EXISTS idx_translation_history_created_at ON ${TABLES.TRANSLATION_HISTORY}(created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_translation_history_langs ON ${TABLES.TRANSLATION_HISTORY}(source_lang, target_lang);`,
];

// Default data seeding
export const SEED_DATA = {
  themes: [
    {
      id: 'theme-light',
      name: 'Light',
      is_default: 1,
      background_color: '#ffffff',
      text_color: '#000000',
      secondary_color: '#333333',
      font_family: 'serif',
      font_size: 16,
      line_height: 1.6,
      text_alignment: 'justify',
      margin_size: 'medium',
    },
    {
      id: 'theme-dark',
      name: 'Dark',
      is_default: 1,
      background_color: '#1a1a1a',
      text_color: '#e0e0e0',
      secondary_color: '#b0b0b0',
      font_family: 'serif',
      font_size: 16,
      line_height: 1.6,
      text_alignment: 'justify',
      margin_size: 'medium',
    },
    {
      id: 'theme-sepia',
      name: 'Sepia',
      is_default: 1,
      background_color: '#f4ecd8',
      text_color: '#5b4636',
      secondary_color: '#3d2e22',
      font_family: 'serif',
      font_size: 16,
      line_height: 1.6,
      text_alignment: 'justify',
      margin_size: 'medium',
    },
    {
      id: 'theme-eye-comfort',
      name: 'Eye Comfort',
      is_default: 1,
      background_color: '#0d3b3b',
      text_color: '#c8e0e0',
      secondary_color: '#88b0b0',
      font_family: 'serif',
      font_size: 16,
      line_height: 1.6,
      text_alignment: 'justify',
      margin_size: 'medium',
    },
  ],
  settings: [
    {
      id: 'setting-theme-global',
      key: 'global.theme',
      value: '"theme-light"',
      category: 'display',
    },
    {
      id: 'setting-auto-scroll',
      key: 'reader.autoScroll.enabled',
      value: 'false',
      category: 'reader',
    },
    {
      id: 'setting-tts-enabled',
      key: 'reader.tts.enabled',
      value: 'false',
      category: 'reader',
    },
    {
      id: 'setting-fullscreen',
      key: 'reader.fullscreen.enabled',
      value: 'false',
      category: 'reader',
    },
    {
      id: 'setting-keep-screen-on',
      key: 'reader.keepScreenOn',
      value: 'true',
      category: 'reader',
    },
    {
      id: 'setting-orientation',
      key: 'reader.orientation',
      value: '"auto"',
      category: 'reader',
    },
    {
      id: 'setting-translation-target-lang',
      key: 'translation.targetLanguage',
      value: '"en"',
      category: 'translation',
    },
    {
      id: 'setting-translation-auto-detect',
      key: 'translation.autoDetect',
      value: 'true',
      category: 'translation',
    },
    {
      id: 'setting-translation-save-history',
      key: 'translation.saveHistory',
      value: 'true',
      category: 'translation',
    },
  ],
  collections: [
    {
      id: 'collection-favorites',
      name: 'Favorites',
      description: 'Your favorite books',
      sort_order: 0,
    },
    {
      id: 'collection-reading',
      name: 'Currently Reading',
      description: 'Books you are currently reading',
      sort_order: 1,
    },
    {
      id: 'collection-to-read',
      name: 'To Read',
      description: 'Books you plan to read',
      sort_order: 2,
    },
  ],
};

// SQL statements for seeding
export const SEED_SQL = {
  themes: `
    INSERT OR IGNORE INTO ${TABLES.THEMES}
    (id, name, is_default, background_color, text_color, secondary_color, font_family, font_size, line_height, text_alignment, margin_size)
    VALUES
    ('theme-light', 'Light', 1, '#ffffff', '#000000', '#333333', 'serif', 16, 1.6, 'justify', 'medium'),
    ('theme-dark', 'Dark', 1, '#1a1a1a', '#e0e0e0', '#b0b0b0', 'serif', 16, 1.6, 'justify', 'medium'),
    ('theme-sepia', 'Sepia', 1, '#f4ecd8', '#5b4636', '#3d2e22', 'serif', 16, 1.6, 'justify', 'medium'),
    ('theme-eye-comfort', 'Eye Comfort', 1, '#0d3b3b', '#c8e0e0', '#88b0b0', 'serif', 16, 1.6, 'justify', 'medium');
  `,
  settings: `
    INSERT OR IGNORE INTO ${TABLES.APP_SETTINGS} (id, key, value, category)
    VALUES
    ('setting-theme-global', 'global.theme', '"theme-light"', 'display'),
    ('setting-auto-scroll', 'reader.autoScroll.enabled', 'false', 'reader'),
    ('setting-tts-enabled', 'reader.tts.enabled', 'false', 'reader'),
    ('setting-fullscreen', 'reader.fullscreen.enabled', 'false', 'reader'),
    ('setting-keep-screen-on', 'reader.keepScreenOn', 'true', 'reader'),
    ('setting-orientation', 'reader.orientation', '"auto"', 'reader');
  `,
  translationSettings: `
    INSERT OR IGNORE INTO ${TABLES.TRANSLATION_SETTINGS} (id, key, value, category)
    VALUES
    ('setting-translation-target-lang', 'translation.targetLanguage', '"en"', 'translation'),
    ('setting-translation-auto-detect', 'translation.autoDetect', 'true', 'translation'),
    ('setting-translation-save-history', 'translation.saveHistory', 'true', 'translation');
  `,
  collections: `
    INSERT OR IGNORE INTO ${TABLES.COLLECTIONS} (id, name, description, sort_order)
    VALUES
    ('collection-favorites', 'Favorites', 'Your favorite books', 0),
    ('collection-reading', 'Currently Reading', 'Books you are currently reading', 1),
    ('collection-to-read', 'To Read', 'Books you plan to read', 2);
  `,
};

// Migration files
export const MIGRATIONS: Record<number, string> = {
  1: 'Initial database schema',
  2: 'Add rects column to highlights table for PDF bounding rectangles',
  3: 'Add genre and subgenres columns to books table',
  4: 'Add read_status column to books table',
};

// SQL statements for migrations
export const MIGRATION_SQL: Record<number, string> = {
  2: `
    ALTER TABLE ${TABLES.HIGHLIGHTS} ADD COLUMN rects TEXT;
  `,
  3: `
    ALTER TABLE ${TABLES.BOOKS} ADD COLUMN genre TEXT;
    ALTER TABLE ${TABLES.BOOKS} ADD COLUMN subgenres TEXT;
  `,
  4: `
    ALTER TABLE ${TABLES.BOOKS} ADD COLUMN read_status TEXT DEFAULT 'unread';
  `,
};

// Helper function to get all table creation statements
export function getAllCreateStatements(): string[] {
  return Object.values(CREATE_TABLES);
}

// Helper function to get all index creation statements
export function getAllIndexStatements(): string[] {
  return CREATE_INDEXES;
}

// Helper function to get all seed statements
export function getAllSeedStatements(): string[] {
  return Object.values(SEED_SQL);
}
