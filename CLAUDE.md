# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A cross-platform ebook reader built with React 19, Ionic 8, and Capacitor 8. Supports EPUB, PDF, MOBI, AZW3, FB2, CBZ/CBR, DOCX, ODT, TXT/HTML/MD formats. Runs as a web app (GitHub Pages) and Android app (APK/AAB).

## Commands

```bash
npm run dev                              # Vite dev server (localhost:5173)
npm run build                            # TypeScript check + Vite production build
npm run test.unit                        # Run all unit tests with Vitest
npx vitest run path/to/file.test.tsx     # Run a single test file
npm run test.e2e                         # Run E2E tests with Cypress
npx cypress run --spec cypress/e2e/test.cy.ts  # Run a single E2E test
npm run lint                             # ESLint
npm run format                           # Prettier (write)
npm run format:check                     # Prettier (check only)
npx cap sync android                     # Sync web assets to Android project
```

## Architecture

### Dual-Platform Database Strategy

`src/services/database.ts` branches on every operation via `Capacitor.isNativePlatform()`:
- **Native (Android)**: Real SQLite via `@capacitor-community/sqlite`. Schema in `src/services/schema.ts` (19 tables). Connection cached in module-level `db` variable; lazy-initialized through `getDb()`.
- **Web**: Falls back to **localStorage** (keys prefixed `ebook_`). Only a subset of features work (no reading stats, no SQL queries). No SQLite on web at all.

The `initDatabase()` function must be **idempotent** — it checks for existing connections via `isConnection()`/`retrieveConnection()` before creating new ones. Never call `createConnection()` without checking first.

### Book File Storage

Book file bytes are stored in **IndexedDB** via `src/services/webFileStorage.ts` on all platforms (including Android). File paths use the scheme `indexeddb://<bookId>/<filename>`. The native Capacitor Filesystem is not used for imported book storage.

### Type System Conversion

- **App layer**: camelCase (`bookId`, `createdAt`)
- **DB layer**: snake_case (`book_id`, `created_at`)
- Conversion happens in `database.ts` service functions
- `Book.format` is lowercase in TypeScript (`'epub' | 'pdf' | ...`) but uppercase in DB CHECK constraint (`'EPUB' | 'PDF' | ...`)
- `ReadingProgress.percentage`: 0–100 in DB, converted to 0–1 decimal when merged onto `Book.progress`

### Data Flow
```
User Action → Zustand Store → Service Layer → SQLite/Filesystem/API
                  ↕                                    ↕
          React Components                    Capacitor Plugins
```

### State Management
Zustand stores in `src/stores/`: `useAppStore.ts` (books, bookmarks, highlights), `useThemeStore.ts` (theme settings), `calibreWebStore.ts` (Calibre-Web sync)

### Format Readers
- `src/components/readers/EpubReader.tsx` - epub.js with iframe-based rendition, CFI for position tracking
- `src/components/readers/PdfReader.tsx` - PDF.js with canvas rendering + text layer for search
- `src/components/readers/TextReader.tsx`, `HtmlReader.tsx`, `MarkdownReader.tsx`
- `src/pages/Reader/Reader.tsx` - Format dispatcher

### Services Layer (`src/services/`)
- `database.ts` - SQLite abstraction (main data layer)
- `calibreWebService.ts` - Calibre-Web API client
- `opdsService.ts` - OPDS feed parsing
- `annotationsService.ts` - Bookmark/highlight persistence
- `torrentService.ts` - WebTorrent P2P sharing (web-only)
- `webFileStorage.ts` - IndexedDB file storage

### Custom Hooks (`src/hooks/`)
- `useTapZones.ts` - Configurable tap zone actions (left=prev, right=next, center=toolbar)
- `useSwipeGesture.ts` - Touch swipe detection
- `useTTS.ts` - Web Speech API integration
- `usePdfLoader.ts` - PDF caching and page loading

## Key Patterns

### WebTorrent / P2P (Web Only)
- WebTorrent is **lazy-loaded** (`import('webtorrent')`) to avoid crashing Android WebView
- `getClient()` throws immediately on native platforms
- `bittorrent-dht` is stubbed out in `vite.config.ts` (DHT needs Node.js UDP sockets)
- `vite-plugin-node-polyfills` provides `events`, `buffer`, `process`, etc. for browser

### Book Import Flow (`Library.tsx`)
1. Determine format from file extension
2. Generate UUID via `crypto.randomUUID()`
3. Read file to `ArrayBuffer`, store in IndexedDB via `webFileStorage`
4. Set `filePath = indexeddb://<bookId>/<filename>`
5. Extract metadata (format-specific extractors, best-effort)
6. `databaseService.addBook()` persists the record
7. Fire-and-forget online metadata enrichment via `metadataLookupService`

### Database Schema
19 tables in `src/services/schema.ts`. All foreign keys cascade on delete from `books`. Schema versioning via `migrations` table (currently 2 migrations). Seed data: 4 themes, default settings, 3 default collections.

## Android Build

- Android project committed to `android/` directory — use `npx cap sync android`, NOT `cap add android`
- `capacitor.config.ts`: `appId: 'com.shelfyreader.app'`, `androidScheme: 'https'`
- Splash screen uses `Theme.SplashScreen` (`androidx.core:core-splashscreen`), hidden manually in `src/main.tsx`
- `android/app/src/main/res/values/` must contain `colors.xml`, `styles.xml`, and `strings.xml`
- Signing driven by env vars: `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
- `minSdkVersion=24`, `compileSdkVersion=36`, `targetSdkVersion=36`

## Build Configuration

- Vite base path: `process.env.VITE_BASE_PATH || '/'`
- GitHub Pages sets `VITE_BASE_PATH=/ebook-reader/`; Android builds leave it unset (defaults to `/`)
- Do NOT use `GITHUB_ACTIONS` env var hack to control base path

## CI/CD

- **`deploy-pages.yml`** — Push to main: builds with `/ebook-reader/` base path, deploys to GitHub Pages
- **`build-apk.yml`** — Push to main: builds debug APK, uploads to `latest` pre-release
- **`build-signed-release.yml`** — Manual: builds signed APK+AAB, creates versioned release tag

All Android workflows: Node 22, Java 21 (temurin), Android SDK 36. Signed release requires 4 GitHub secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

## Routes

- `/library` - Book grid/list, import, filters
- `/reader/:bookId` - Format-specific reader
- `/settings` - App preferences
- `/calibre-web-settings` - Calibre-Web auth & sync
- `/statistics` - Reading stats with charts
- `/opds` - OPDS catalog browser
