import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Paths, File } from 'expo-file-system';
import { useTheme } from '../src/theme/ThemeContext';
import { Header } from '../src/components/common/Header';
import {
  getAllBooks,
  getBookmarks,
  getHighlights,
  getReadingProgress,
  getAllSettings,
  getAllCollections,
  getTags,
  getBookTags,
  addBook,
  addBookmark,
  addHighlight,
  upsertReadingProgress,
  setSetting,
  createCollection,
  createTag,
  addTagToBook,
} from '../src/services/database';
import { getDb } from '../src/db/connection';
import { TABLES } from '../src/db/schema';
import type { Book, ReadingProgress } from '../src/types/index';

// ============================================================================
// TYPES
// ============================================================================

interface ExportData {
  version: number;
  exportedAt: string;
  app: string;
  books: any[];
  bookmarks: any[];
  highlights: any[];
  readingProgress: any[];
  settings: Record<string, any>;
  collections: any[];
  tags: any[];
  bookTags: any[];
  readingStats: any[];
}

interface DataCounts {
  books: number;
  bookmarks: number;
  highlights: number;
  readingProgress: number;
  settings: number;
  collections: number;
  tags: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function gatherAllBookmarks(books: Book[]): any[] {
  const allBookmarks: any[] = [];
  for (const book of books) {
    const bookmarks = getBookmarks(book.id);
    allBookmarks.push(...bookmarks);
  }
  return allBookmarks;
}

function gatherAllHighlights(books: Book[]): any[] {
  const allHighlights: any[] = [];
  for (const book of books) {
    const highlights = getHighlights(book.id);
    allHighlights.push(...highlights);
  }
  return allHighlights;
}

function gatherAllProgress(books: Book[]): any[] {
  const allProgress: any[] = [];
  for (const book of books) {
    const progress = getReadingProgress(book.id);
    if (progress) {
      allProgress.push(progress);
    }
  }
  return allProgress;
}

function gatherAllBookTags(books: Book[]): any[] {
  const allBookTags: any[] = [];
  for (const book of books) {
    const tags = getBookTags(book.id);
    for (const tag of tags) {
      allBookTags.push({ bookId: book.id, tagId: tag.id, tagName: tag.name });
    }
  }
  return allBookTags;
}

function gatherReadingStats(): any[] {
  try {
    const database = getDb();
    const rows = database.getAllSync(
      `SELECT * FROM ${TABLES.READING_STATS} ORDER BY date DESC;`
    );
    return (rows as any[]).map((row) => ({
      id: row.id,
      bookId: row.book_id,
      date: row.date,
      pagesRead: row.pages_read,
      timeSpent: row.time_spent,
      sessionCount: row.session_count,
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DataBackupScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [counts, setCounts] = useState<DataCounts>({
    books: 0,
    bookmarks: 0,
    highlights: 0,
    readingProgress: 0,
    settings: 0,
    collections: 0,
    tags: 0,
  });
  const [statusMessage, setStatusMessage] = useState('');

  // Load data counts on mount
  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = useCallback(() => {
    try {
      const books = getAllBooks();
      const bookmarks = gatherAllBookmarks(books);
      const highlights = gatherAllHighlights(books);
      const progress = gatherAllProgress(books);
      const settings = getAllSettings();
      const collections = getAllCollections();
      const tags = getTags();

      setCounts({
        books: books.length,
        bookmarks: bookmarks.length,
        highlights: highlights.length,
        readingProgress: progress.length,
        settings: Object.keys(settings).length,
        collections: collections.length,
        tags: tags.length,
      });
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  }, []);

  // ------------------------------------------------------------------
  // EXPORT
  // ------------------------------------------------------------------

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setStatusMessage('Gathering data...');

    try {
      const books = getAllBooks();
      setStatusMessage(`Found ${books.length} books...`);

      const bookmarks = gatherAllBookmarks(books);
      const highlights = gatherAllHighlights(books);
      const progress = gatherAllProgress(books);
      const settings = getAllSettings();
      const collections = getAllCollections();
      const tags = getTags();
      const bookTags = gatherAllBookTags(books);
      const readingStats = gatherReadingStats();

      setStatusMessage('Creating backup file...');

      const exportData: ExportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        app: 'Shelfy Reader',
        books: books.map((b) => ({
          ...b,
          lastRead: b.lastRead?.toISOString(),
          dateAdded: b.dateAdded?.toISOString(),
        })),
        bookmarks: bookmarks.map((bm) => ({
          ...bm,
          timestamp: bm.timestamp?.toISOString?.() ?? bm.timestamp,
        })),
        highlights: highlights.map((h) => ({
          ...h,
          timestamp: h.timestamp?.toISOString?.() ?? h.timestamp,
        })),
        readingProgress: progress,
        settings,
        collections,
        tags,
        bookTags,
        readingStats,
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `shelfy-backup-${timestamp}.json`;

      // Write to cache directory using new expo-file-system v55 API
      const file = new File(Paths.cache, filename);
      file.write(jsonString);

      setStatusMessage('Opening share dialog...');

      // Share the file
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Shelfy Backup',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device.');
      }

      // Clean up temp file
      try {
        if (file.exists) {
          file.delete();
        }
      } catch {
        // Ignore cleanup errors
      }

      setStatusMessage('');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        'Export Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred during export.'
      );
      setStatusMessage('');
    } finally {
      setIsExporting(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // IMPORT
  // ------------------------------------------------------------------

  const handleImport = useCallback(async () => {
    try {
      // Pick a JSON file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const pickedFile = result.assets[0];

      // Confirm before importing
      Alert.alert(
        'Import Data',
        'This will import data from the backup file. Existing data for matching books will be overwritten. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            style: 'destructive',
            onPress: () => performImport(pickedFile.uri),
          },
        ]
      );
    } catch (error) {
      console.error('Import picker error:', error);
      Alert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'Could not open file picker.'
      );
    }
  }, []);

  const performImport = useCallback(
    async (fileUri: string) => {
      setIsImporting(true);
      setStatusMessage('Reading backup file...');

      try {
        // Read the picked file using the new expo-file-system v55 API
        const file = new File(fileUri);
        const jsonString = await file.text();

        const data: ExportData = JSON.parse(jsonString);

        // Validate
        if (!data.version || !data.app || data.app !== 'Shelfy Reader') {
          Alert.alert('Invalid Backup', 'This file does not appear to be a valid Shelfy Reader backup.');
          setIsImporting(false);
          setStatusMessage('');
          return;
        }

        let importedBooks = 0;
        let importedBookmarks = 0;
        let importedHighlights = 0;
        let importedProgress = 0;
        let importedSettings = 0;
        let importedCollections = 0;
        let importedTags = 0;

        // Import books
        if (data.books?.length) {
          setStatusMessage(`Importing ${data.books.length} books...`);
          for (const bookData of data.books) {
            try {
              const existing = getAllBooks().find((b) => b.id === bookData.id);
              if (!existing) {
                const book: Omit<Book, 'dateAdded'> = {
                  id: bookData.id,
                  title: bookData.title,
                  author: bookData.author,
                  filePath: bookData.filePath,
                  coverPath: bookData.coverPath,
                  format: bookData.format,
                  totalPages: bookData.totalPages || 0,
                  currentPage: bookData.currentPage || 0,
                  progress: bookData.progress || 0,
                  lastRead: bookData.lastRead ? new Date(bookData.lastRead) : new Date(),
                  source: bookData.source || 'local',
                  sourceId: bookData.sourceId,
                  sourceUrl: bookData.sourceUrl,
                  downloaded: bookData.downloaded ?? false,
                  genre: bookData.genre,
                  subgenres: bookData.subgenres,
                  series: bookData.series,
                  seriesIndex: bookData.seriesIndex,
                  readStatus: bookData.readStatus,
                  fileHash: bookData.fileHash,
                  metadata: bookData.metadata,
                };
                addBook(book);
                importedBooks++;
              }
            } catch {
              // Skip individual book errors
            }
          }
        }

        // Import bookmarks
        if (data.bookmarks?.length) {
          setStatusMessage(`Importing ${data.bookmarks.length} bookmarks...`);
          for (const bm of data.bookmarks) {
            try {
              addBookmark({
                id: bm.id,
                bookId: bm.bookId,
                location: bm.location?.cfi || bm.location || '',
                pageNumber: bm.location?.pageNumber,
                chapter: bm.chapter,
                text: bm.text,
              });
              importedBookmarks++;
            } catch {
              // Skip individual bookmark errors
            }
          }
        }

        // Import highlights
        if (data.highlights?.length) {
          setStatusMessage(`Importing ${data.highlights.length} highlights...`);
          for (const h of data.highlights) {
            try {
              addHighlight({
                id: h.id,
                bookId: h.bookId,
                location: h.location?.cfi || h.location || '',
                text: h.text,
                color: h.color || '#ffff00',
                note: h.note,
                tags: h.tags ? JSON.stringify(h.tags) : undefined,
                pageNumber: h.pageNumber || h.location?.pageNumber,
                rects: h.rects ? JSON.stringify(h.rects) : undefined,
              });
              importedHighlights++;
            } catch {
              // Skip individual highlight errors
            }
          }
        }

        // Import reading progress
        if (data.readingProgress?.length) {
          setStatusMessage(`Importing ${data.readingProgress.length} progress entries...`);
          for (const p of data.readingProgress) {
            try {
              const progressData: Omit<ReadingProgress, 'id' | 'bookId' | 'createdAt' | 'updatedAt'> = {
                currentPage: p.currentPage || 0,
                totalPages: p.totalPages || 0,
                percentage: p.percentage || 0,
                location: p.location,
                chapterId: p.chapterId,
                chapterTitle: p.chapterTitle,
                lastReadAt: p.lastReadAt || Math.floor(Date.now() / 1000),
              };
              upsertReadingProgress(p.bookId, progressData);
              importedProgress++;
            } catch {
              // Skip individual progress errors
            }
          }
        }

        // Import settings
        if (data.settings && typeof data.settings === 'object') {
          setStatusMessage('Importing settings...');
          for (const [key, value] of Object.entries(data.settings)) {
            try {
              setSetting(key, value);
              importedSettings++;
            } catch {
              // Skip individual setting errors
            }
          }
        }

        // Import collections
        if (data.collections?.length) {
          setStatusMessage(`Importing ${data.collections.length} collections...`);
          for (const col of data.collections) {
            try {
              const existing = getAllCollections().find((c) => c.name === col.name);
              if (!existing) {
                createCollection({
                  name: col.name,
                  description: col.description,
                  sortOrder: col.sortOrder ?? 0,
                });
                importedCollections++;
              }
            } catch {
              // Skip individual collection errors
            }
          }
        }

        // Import tags
        if (data.tags?.length) {
          setStatusMessage(`Importing ${data.tags.length} tags...`);
          const tagIdMap = new Map<string, string>();
          for (const tag of data.tags) {
            try {
              const existing = getTags().find(
                (t) => t.name.toLowerCase() === tag.name.toLowerCase()
              );
              if (existing) {
                tagIdMap.set(tag.id, existing.id);
              } else {
                const created = createTag(tag.name, tag.color);
                if (created) {
                  tagIdMap.set(tag.id, created.id);
                  importedTags++;
                }
              }
            } catch {
              // Skip individual tag errors
            }
          }

          // Import book-tag associations
          if (data.bookTags?.length) {
            for (const bt of data.bookTags) {
              try {
                const newTagId = tagIdMap.get(bt.tagId) || bt.tagId;
                addTagToBook(bt.bookId, newTagId);
              } catch {
                // Skip individual book-tag errors
              }
            }
          }
        }

        // Import reading stats
        if (data.readingStats?.length) {
          setStatusMessage(`Importing ${data.readingStats.length} reading stats...`);
          const database = getDb();
          for (const stat of data.readingStats) {
            try {
              database.runSync(
                `INSERT OR IGNORE INTO ${TABLES.READING_STATS} (
                  id, book_id, date, pages_read, time_spent, session_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                  stat.id,
                  stat.bookId,
                  stat.date,
                  stat.pagesRead || 0,
                  stat.timeSpent || 0,
                  stat.sessionCount || 0,
                  Math.floor(Date.now() / 1000),
                  Math.floor(Date.now() / 1000),
                ]
              );
            } catch {
              // Skip individual stat errors
            }
          }
        }

        setStatusMessage('');
        loadCounts();

        Alert.alert(
          'Import Complete',
          [
            importedBooks > 0 ? `${importedBooks} books` : '',
            importedBookmarks > 0 ? `${importedBookmarks} bookmarks` : '',
            importedHighlights > 0 ? `${importedHighlights} highlights` : '',
            importedProgress > 0 ? `${importedProgress} progress entries` : '',
            importedSettings > 0 ? `${importedSettings} settings` : '',
            importedCollections > 0 ? `${importedCollections} collections` : '',
            importedTags > 0 ? `${importedTags} tags` : '',
          ]
            .filter(Boolean)
            .join('\n') || 'No new data was imported (everything already existed).'
        );
      } catch (error) {
        console.error('Import error:', error);
        Alert.alert(
          'Import Failed',
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred during import.'
        );
        setStatusMessage('');
      } finally {
        setIsImporting(false);
      }
    },
    [loadCounts]
  );

  // ------------------------------------------------------------------
  // DATA SUMMARY ITEMS
  // ------------------------------------------------------------------

  const summaryItems: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    count: number;
  }> = [
    { icon: 'book', label: 'Books', count: counts.books },
    { icon: 'bookmark', label: 'Bookmarks', count: counts.bookmarks },
    { icon: 'color-fill', label: 'Highlights', count: counts.highlights },
    { icon: 'analytics', label: 'Reading Progress', count: counts.readingProgress },
    { icon: 'settings', label: 'Settings', count: counts.settings },
    { icon: 'folder', label: 'Collections', count: counts.collections },
    { icon: 'pricetag', label: 'Tags', count: counts.tags },
  ];

  const isBusy = isExporting || isImporting;

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Data Backup" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
          <Ionicons name="information-circle" size={20} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Export your library data as a JSON file for backup or transfer to another device.
            Book files are not included -- only metadata, progress, and annotations.
          </Text>
        </View>

        {/* Data Summary */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Data</Text>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {summaryItems.map((item) => (
            <View key={item.label} style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <View style={[styles.summaryIconBg, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name={item.icon} size={16} color={theme.primary} />
                </View>
                <Text style={[styles.summaryLabel, { color: theme.text }]}>{item.label}</Text>
              </View>
              <Text style={[styles.summaryCount, { color: theme.textSecondary }]}>
                {item.count}
              </Text>
            </View>
          ))}
        </View>

        {/* Progress / Status */}
        {isBusy && (
          <View style={[styles.progressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              {statusMessage || (isExporting ? 'Exporting...' : 'Importing...')}
            </Text>
          </View>
        )}

        {/* Export Button */}
        <Pressable
          onPress={handleExport}
          disabled={isBusy}
          style={[
            styles.actionButton,
            {
              backgroundColor: theme.primary,
              opacity: isBusy ? 0.5 : 1,
            },
          ]}
        >
          {isExporting ? (
            <>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>Exporting...</Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>Export All Data</Text>
            </>
          )}
        </Pressable>

        {/* Import Button */}
        <Pressable
          onPress={handleImport}
          disabled={isBusy}
          style={[
            styles.actionButton,
            styles.outlineButton,
            {
              borderColor: theme.primary,
              opacity: isBusy ? 0.5 : 1,
            },
          ]}
        >
          {isImporting ? (
            <>
              <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Importing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="push-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Import Data</Text>
            </>
          )}
        </Pressable>

        {/* Disclaimer */}
        <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
          Backup files contain metadata only. To transfer actual book files, use Cloud Sync
          or manually copy them to the new device.
        </Text>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  progressText: {
    flex: 1,
    fontSize: 13,
  },
  actionButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
