# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A cross-platform ebook reader built with React 19, Ionic 8, and Capacitor 8. Replicates Moon+ Reader functionality with EPUB, PDF, TXT/HTML/MD support.

## Commands

```bash
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # TypeScript check + Vite production build
npm run test.unit    # Run unit tests with Vitest
npm run test.e2e     # Run E2E tests with Cypress
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## Architecture

### State Management
- **Zustand stores** in `src/stores/`: `useAppStore.ts` (books, bookmarks, highlights), `useThemeStore.ts` (theme settings), `calibreWebStore.ts` (Calibre-Web sync)

### Format Readers
- `src/components/readers/EpubReader.tsx` - epub.js with CFI-based navigation
- `src/components/readers/PdfReader.tsx` - PDF.js with canvas rendering
- `src/components/readers/TextReader.tsx`, `HtmlReader.tsx`, `MarkdownReader.tsx`
- `src/pages/Reader/Reader.tsx` - Format dispatcher

### Services Layer (`src/services/`)
- `database.ts` - SQLite abstraction (main data layer)
- `calibreWebService.ts` - Calibre-Web API client
- `opdsService.ts` - OPDS feed parsing
- `annotationsService.ts` - Bookmark/highlight persistence

### Custom Hooks (`src/hooks/`)
- `useTapZones.ts` - Configurable tap zone actions
- `useSwipeGesture.ts` - Touch swipe detection
- `useTTS.ts` - Web Speech API integration
- `usePdfLoader.ts` - PDF caching and page loading

### Data Flow
```
User Action → Zustand Store → Service Layer → SQLite/Filesystem/API
                  ↕                                    ↕
          React Components                    Capacitor Plugins
```

## Key Patterns

- **Type system**: camelCase in app layer, snake_case in DB layer, conversion in database service
- **EPUB**: epub.js with iframe-based rendition, CFI for chapter/position tracking
- **PDF**: PDF.js canvas rendering with text layer for search
- **Themes**: CSS custom properties for dynamic theming
- **Database**: SQLite via @capacitor-community/sqlite, 16 tables with cascading deletes

## Routes

- `/library` - Book grid/list, import, filters
- `/reader/:bookId` - Format-specific reader
- `/settings` - App preferences
- `/calibre-web-settings` - Calibre-Web auth & sync
- `/statistics` - Reading stats with charts
- `/opds` - OPDS catalog browser

## CI/CD

GitHub Actions deploys to GitHub Pages on push to main. Base path: `/ebook-reader/`
