# Copilot Instructions for This Repository

## Build, Test, and Lint Commands

- **Start Dev Server:**
  ```bash
  npm run dev
  ```
- **Production Build:**
  ```bash
  npm run build
  ```
- **Unit Tests (Vitest):**
  ```bash
  npm run test.unit
  # Run a single test file:
  npx vitest run path/to/file.test.tsx
  ```
- **E2E Tests (Cypress):**
  ```bash
  npm run test.e2e
  # Run a single E2E test:
  npx cypress run --spec cypress/e2e/test.cy.ts
  ```
- **Lint:**
  ```bash
  npm run lint
  ```
- **Format:**
  ```bash
  npm run format
  ```

## High-Level Architecture

- **Frontend:** React 19 + Ionic 8, using Capacitor 8 for native features.
- **State Management:** Zustand stores in `src/stores/` for books, bookmarks, highlights, theme, and Calibre-Web sync.
- **Format Readers:**
  - EPUB: epub.js (CFI navigation)
  - PDF: PDF.js (canvas rendering)
  - TXT/HTML/MD: Custom React components
  - Format dispatching in `src/pages/Reader/Reader.tsx`
- **Services Layer (`src/services/`):**
  - `database.ts`: SQLite abstraction (via @capacitor-community/sqlite)
  - `calibreWebService.ts`: Calibre-Web API client
  - `opdsService.ts`: OPDS feed parsing
  - `annotationsService.ts`: Bookmark/highlight persistence
- **Custom Hooks (`src/hooks/`):**
  - `useTapZones.ts`: Configurable tap zone actions
  - `useSwipeGesture.ts`: Touch swipe detection
  - `useTTS.ts`: Web Speech API integration
  - `usePdfLoader.ts`: PDF caching and page loading
- **Data Flow:**
  - User Action → Zustand Store → Service Layer → SQLite/Filesystem/API
  - React Components interact with Capacitor Plugins for native features

## Key Conventions

- **Type Naming:** camelCase in app layer, snake_case in DB layer; conversion handled in database service.
- **Themes:** Uses CSS custom properties for dynamic theming.
- **Database:** 16 SQLite tables with cascading deletes; all DB access via `database.ts` service.
- **EPUB:** Uses iframe-based rendition and CFI for chapter/position tracking.
- **PDF:** Canvas rendering with text layer for search and highlights.
- **Tap Zones:** Default: left third = previous page, right third = next page, center = toggle toolbar (configurable via `useTapZones`).
- **Testing:**
  - Unit tests: Vitest (`*.test.tsx`)
  - E2E tests: Cypress (`cypress/e2e/*.cy.ts`)

## Additional Notes

- **CORS Proxy:** Vite dev server includes a `/api/cors-proxy` endpoint for OPDS feed requests.
- **Calibre-Web:** Sync and settings managed via dedicated Zustand store and service.
- **Cloud Sync:** Implemented in `cloudSyncService.ts` and related store.

---

This file was generated based on project structure and CLAUDE.md. Let me know if you want to adjust anything or add coverage for other areas.