/**
 * Services Index
 * Exports all services
 */

// Database
export * from './database';

// Theme
export { themeService, ThemeService } from './themeService';
export type {
  ThemeType,
  FontFamily,
  TextAlignment,
  MarginSize,
  HighlightColor,
  ReadingSettings,
  Theme,
} from './themeService';

// Calibre-Web
export { calibreWebService, CalibreWebService } from './calibreWebService';
export { calibreWebDbService } from './calibreWebDbService';
export type {
  CalibreWebServerConfig,
  CalibreWebBook,
  CalibreWebFormat,
  CalibreWebBooksResponse,
  CalibreWebAuthResponse,
  CalibreWebSyncStatus,
  DownloadProgress,
  CalibreWebSyncOptions,
  CalibreWebSyncResult,
  CalibreWebConnectionTest,
  CalibreWebLocalBook,
} from '../types/calibreWeb';

// Format services
export { fb2Service } from './fb2Service';
export type { Fb2Metadata, Fb2TocEntry, Fb2ParsedContent } from './fb2Service';

export { chmService } from './chmService';
export type { ChmMetadata, ChmParsedContent } from './chmService';

// Translation
export { translationService, TranslationService, TranslationServiceError } from './translationService';
export type {
  TranslationServiceConfig,
  LanguageCode,
  TranslationRequest,
  TranslationResponse,
  LanguageDetectionResponse,
} from './translationService';
// Note: TranslationError is available through TranslationServiceError class

// Dictionary
export { dictionaryService } from './dictionaryService';
export type {
  Phonetic,
  Definition,
  Meaning,
  DefinitionResult,
  VocabularyWord,
} from '../types';

// Cloud Sync
export { cloudSyncService, CloudSyncService } from './cloudSyncService';
export type {
  CloudProviderType,
  SyncStatus,
  ConflictResolution,
  CloudCredentials,
  ConnectResult,
  CloudBookFile,
  SyncData,
  SyncProgress,
  SyncResult,
  SyncConflict,
} from '../types/cloudSync';
