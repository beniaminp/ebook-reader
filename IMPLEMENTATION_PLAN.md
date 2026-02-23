# Moon+ Reader Clone - Implementation Plan

## Project Overview
Building a cross-platform ebook reader app using React + Ionic + Capacitor that replicates Moon+ Reader's functionality.

**Target Feature Parity:** 70-80% (22 fully achievable, 10 partial/workaround, 4 very difficult)

**Tech Stack:**
- **UI Shell:** React 19 + Ionic 8 + Capacitor 8
- **State Management:** Zustand 5
- **Storage:** SQLite (Capacitor) + Capacitor Filesystem + Capacitor Preferences
- **EPUB Rendering:** epub.js (iframe-based, CFI pagination)
- **PDF Rendering:** PDF.js (canvas + text layer + annotation layer)
- **Cloud Sync:** Dropbox JS SDK, WebDav client (webdav npm), Google Drive API
- **Calibre-Web:** Axios (HTTP client), Calibre-Web REST API
- **Additional Formats:** mammoth.js (DOCX), marked.js (Markdown), JSZip (CBZ), fast-xml-parser (OPDS/FB2)
- **Native Plugins:** Capacitor Filesystem, Screen Brightness, Motion, Biometrics, TTS

---

## Phase 1: MVP Core Reader (8-10 weeks)

### 1.1 Project Setup & Infrastructure
- [x] Initialize React + Ionic project with TypeScript
- [x] Configure Capacitor for Android (iOS later)
- [x] Set up project structure (folders for components, services, stores, types)
- [x] Configure Zustand for state management
- [x] Set up routing with React Router
- [x] Configure SQLite database schema (16 tables, 22 indexes, seed data)
- [x] Set up ESLint, Prettier, testing setup (Vitest + Cypress)

### 1.2 Core Format Rendering
- [x] EPUB rendering with epub.js (iframe rendition, CFI tracking, chapter loading)
- [x] PDF viewing with PDF.js (canvas rendering, zoom modes, rotation, password support, invert colors)
- [x] TXT / HTML / Markdown rendering (TextReader, HtmlReader, MarkdownReader components with theme integration, DOMPurify sanitization)
- [x] Basic file picker integration (HTML5 file input supporting .epub, .pdf, .mobi, .fb2, .txt)

### 1.3 Bookshelf & Library
- [x] Bookshelf UI (grid and list views with responsive columns, toggle button)
- [x] Book metadata storage in SQLite (title, author, format, cover, pages, language, publisher, ISBN, series, rating, tags)
- [x] File import via Capacitor Filesystem (web fallback + native import with metadata extraction for EPUB/PDF)
- [x] Book cover display (covers in grid/list views with placeholder fallback)
- [x] Basic filters (by format filter, sort by: dateAdded/title/author/lastRead)

### 1.4 Reading Interface - Core Controls
- [x] Touch screen paging (configurable tap zones: left/right/center with action mapping — `useTapZones.ts`)
- [x] Swipe gestures for navigation (touch event-based with configurable threshold — `useSwipeGesture.ts`)
- [x] Basic page turn animations (slide and fade CSS transitions — `PageTransition.tsx`)
- [x] Bookmarks (save/remove/list with notes, navigate to bookmark, BookmarksPanel UI)
- [x] Highlights for EPUB (CFI-based, 5 highlight colors, inline notes, add/edit/delete, HighlightsPanel UI)
- [x] Table of contents navigation (TOC loaded from EPUB, chapter navigation via goToChapter)
- [x] Reading progress indicator (percentage display, progress bar, CFI-based location tracking stored in DB)

### 1.5 Theming & Display
- [x] Day/Night mode toggle
- [x] 6 base themes (Light, Dark, Sepia, Eye Comfort, Night, Invert)
- [x] Typography controls (font family, size, line height, custom theme support)
- [x] Text alignment options

### 1.6 Search & Navigation
- [x] In-book search (EPUB) — chapter-level search via epub.js spine iteration with results list and navigation
- [x] In-book search (PDF) — full text search across all pages with result count and navigation
- [x] Jump to page/location (PDF: page input field; EPUB: chapter navigation and CFI goTo)

---

## Phase 2: Feature Rich (8-12 weeks)

### 2.1 Extended Format Support
- [ ] MOBI/AZW3 conversion to EPUB (`mobi.js` or `kf8-parser` for on-device conversion, then render with epub.js)
- [ ] CBZ/CBR comic reader (`JSZip` for CBZ extraction, `unrar.js` for CBR, swipeable image gallery)
- [ ] DOCX rendering via `mammoth.js` (convert to HTML, apply reader theming)
- [ ] ODT support (XML-based parsing, similar pipeline to DOCX)

### 2.2 Advanced Reading Features
- [x] Auto-scroll (smooth animation with speed control, progress tracking, scroll-to methods — `AutoScrollManager.ts`)
- [x] Text-to-Speech (Web Speech API SpeechSynthesis with play/pause/stop, speed control, voice selection, sentence highlighting — `useTTS.ts` + `TTSControls.tsx`)
- [ ] Dictionary lookup (Free Dictionary API / Wiktionary API for online; bundled SQLite word database for offline)
- [ ] Translation integration (Google Translate API or libre-translate; `@capacitor/share` for sharing selections)
- [x] Reading statistics tracking (Statistics page with total books/pages/time, WPM, charts — `Statistics.tsx` with Recharts)
- [x] Blue light filter (CSS rgba overlay, toggle in store, intensity 0-100 setting)
- [ ] Reading ruler / focus tools (CSS overlay with semi-transparent mask, bionic-reading style via text node post-processing)
- [ ] Brightness gesture (vertical swipe on left edge via touch events + `@capacitor-community/screen-brightness`)

### 2.3 Cloud Sync & Backup
- [ ] Dropbox integration (`dropbox` npm SDK, OAuth2 auth flow)
- [ ] WebDav client (`webdav` npm package, PROPFIND/GET/PUT)
- [ ] Reading position sync (JSON files in cloud folder, triggered on app pause/resume via `@capacitor/app`)
- [ ] Highlights/notes sync (export as JSON, merge strategy for conflict resolution)
- [ ] Full backup/restore (`JSZip` SQLite DB + settings export/import via Capacitor Filesystem)

### 2.4 OPDS Catalog
- [x] OPDS feed parser (`fast-xml-parser` Atom/XML parsing — `opdsService.ts`)
- [x] Catalog browser UI (Ionic list with search, covers, metadata — `OpdsCatalog.tsx`)
- [x] Add custom catalog URLs (add/remove catalog management in OPDS page)
- [x] Download from OPDS (download to device storage, import to library)

### 2.5 Calibre-Web Integration
- [x] Calibre-Web authentication (login with token handling, session persistence via Preferences, connection testing)
- [x] Fetch book library metadata from Calibre-Web API (fetchAllBooks, fetchBookById)
- [x] Sync metadata (title, author, cover, series, tags, rating, isbn, publisher, description)
- [x] Lazy download (download-on-open with progress indicator, file path storage)
- [x] Cache covers locally (cover caching infrastructure with dedicated directory)
- [ ] Sync reading progress back to Calibre-Web
- [ ] Support for Calibre-Web "Get Books" feature
- [x] Multiple Calibre-Web server support (multi-server config, active server switching, per-server settings)

### 2.6 Enhanced Theming
- [x] 10+ themes (11 built-in: light/dark/sepia/eye-comfort/night/invert + ocean/forest/sunset/paper/slate)
- [ ] Custom font loading (load font files from device storage via Capacitor Filesystem + CSS @font-face injection)
- [ ] Custom background colors/images (per-theme background customization)

### 2.7 Security
- [ ] Biometric lock (`capacitor-native-biometric` plugin for fingerprint/face unlock)
- [ ] PIN/password lock (custom modal screen on app resume)

### 2.8 Library Management
- [x] Categories/collections (full schema + CRUD, collections table with name/description/sort_order, default collections seeded)
- [x] Tags (tags table + junction table, full CRUD, color support)
- [x] Advanced filters (multi-tag filter, collection filter, read status filter, combined with search + sort)

---

## Phase 3: Polish & Power User Features (6-8 weeks)

### 3.1 Advanced PDF Features
- [ ] PDF text highlighting (`react-pdf-highlighter` for text + area highlights)
- [ ] PDF annotation saving (`pdf-lib` to write annotations back to PDF binary)
- [ ] PDF form filling (commercial SDK like PSPDFKit for full form support, or basic via `pdf-lib`)

### 3.2 Advanced Gestures & Controls
- [ ] Hardware key mapping (custom Capacitor plugin — native Kotlin `dispatchKeyEvent` override to forward volume/camera keys to WebView)
- [ ] Tilt-to-turn page (`@capacitor/motion` accelerometer with configurable tilt threshold)
- [ ] Headset/Bluetooth controls (`Media Session API` for play/pause; custom native plugin for full key mapping)
- [ ] Shake-to-speak (`@capacitor/motion` accelerometer spike detection, trigger TTS)

### 3.3 Visual Polish
- [ ] Page curl animations (`turn.js` or WebGL shader — note: won't match native performance on mid-range devices)
- [ ] Dual-page mode in landscape (epub.js `spread: "always"`, PDF side-by-side rendering, auto-toggle via `@capacitor/screen-orientation`)
- [ ] More page turn animation types (additional CSS transitions: flip, zoom, cover)

### 3.4 Niche Formats
- [ ] FB2 support (XML-based, parse with `fast-xml-parser`, convert to themed HTML)
- [ ] CHM support (`chm-lib` decompression, render HTML content)
- [ ] DJVU support (`djvu.js` — heavy ~2MB, consider lazy loading)

### 3.5 Internationalization
- [ ] i18n setup (`react-i18next` or `react-intl`, translation JSON bundles)
- [ ] 40+ language translations
- [ ] RTL support (CSS `direction: rtl`, epub.js RTL rendering)

### 3.6 Advanced Features
- [ ] Auto-scan folders (Capacitor Filesystem directory scanning, periodic foreground check or `@capacitor/background-task`)
- [ ] Home screen widget (native Android Kotlin/Java widget with shared storage — requires dedicated native development)
- [ ] Name replacement / role reversal (text post-processing with configurable replacement rules)
- [ ] Softkey backlight control (custom native Capacitor plugin — low priority, most devices use gesture navigation)

---

## Progress Tracking

**Legend:**
- [x] Complete
- [~] Partially complete
- [ ] Not started

### Current Status Summary
- **Phase 1 (MVP):** 26/26 tasks complete (100%) !!!
- **Phase 2 (Feature Rich):** 21/37 tasks complete (57%)
- **Phase 3 (Polish):** 0/17 tasks (0%)

**Overall Progress:** 47/80 tasks (59%)

### Phase 1 — COMPLETE
All MVP features are implemented: EPUB + PDF + TXT/HTML/MD reading, library with grid/list views and filters, bookmarks/highlights, tap zones, swipe gestures, page animations, search, theming, and progress tracking.

### Remaining Phase 2 items (next sprint):
1. Dictionary lookup (API + offline)
2. Translation integration
3. Reading ruler / focus tools
4. Brightness gesture
5. Cloud sync (Dropbox / WebDav)
6. Backup/restore
7. Custom font loading
8. Custom background colors/images
9. Biometric / PIN lock
10. Calibre-Web: sync progress back, "Get Books" feature
11. MOBI/AZW3, CBZ/CBR, DOCX, ODT format support

---

## Architecture Notes

### Data Flow
```
User Action → Zustand Store → Service Layer → SQLite / Filesystem / API
                  ↕                                    ↕
          React Components                    Capacitor Plugins
```

### Key Architectural Decisions
- **Zustand over Redux** — simpler API, less boilerplate, built-in persistence
- **SQLite + localStorage fallback** — native perf on device, web compatibility for development
- **epub.js direct** (not react-reader wrapper) — more control over rendition, annotations, and theming
- **PDF.js canvas rendering** — direct canvas control for zoom/rotation rather than wrapper abstraction
- **Type system** — camelCase in app layer, snake_case in DB layer, conversion functions in database service

### Hard Limits (WebView constraints)
- Android home screen widgets require pure native Kotlin/Java
- Volume/hardware key interception requires native Capacitor plugin
- Native-quality page curl requires WebGL or canvas (won't match native perf on low-end devices)
- PDF handwriting/freeform annotation requires commercial SDK or significant custom work

---

## Notes
- Phase 1 delivers a shippable MVP with EPUB + PDF reading, library management, theming, and annotations
- Phase 2 adds ecosystem integration (cloud, Calibre-Web, OPDS) and advanced reading tools
- Phase 3 items should be prioritized based on user feedback
- Native Android development required for: home screen widget, hardware key mapping, softkey backlight
- Cross-platform bonus: unlike Moon+ (Android-only), this app works on iOS, Android, and as a PWA
