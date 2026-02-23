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
