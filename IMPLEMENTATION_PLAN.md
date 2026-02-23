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

## Codebase Conventions (follow these for ALL new code)

### File & Naming Patterns
- **Components:** PascalCase `.tsx` files in `src/components/readers/` (format readers) or `src/components/reader-ui/` (shared reader UI)
- **Pages:** PascalCase `.tsx` in `src/pages/{PageName}/{PageName}.tsx`, route registered in `src/App.tsx`
- **Hooks:** `use{Name}.ts` in `src/hooks/`, re-exported from `src/hooks/index.ts`
- **Services:** `{name}Service.ts` in `src/services/`, exported as singleton (`export const fooService = new FooService()` or `export const fooService = { ...functions }`)
- **Types:** camelCase interfaces in `src/types/index.ts` (app layer), `src/types/database.ts` (DB-specific)
- **Stores:** `use{Name}Store.ts` in `src/stores/`, plain Zustand `create<State>()` pattern

### ID Generation
```typescript
const id = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
// Examples: 'book-1700000000000-a1b2c3d', 'bookmark-1700000000000-x9y8z7w'
```

### Database Patterns
- All DB operations go through `src/services/database.ts` (the `databaseService` singleton)
- **Web vs. native bifurcation:** Every DB function must check `Capacitor.isNativePlatform()` and provide a localStorage fallback for web
- **snake_case in SQL**, camelCase in TypeScript — manual `mapRowToX(row)` conversion functions per entity
- Timestamps: stored as Unix seconds (`Math.floor(Date.now() / 1000)`), returned as `Date` objects
- Booleans: stored as SQLite integers (0/1), converted to `boolean` on read
- Schema changes: add `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` in `src/services/schema.ts`, seed data uses `INSERT OR IGNORE`
- Schema already includes `dictionary_lookups` and `sync_status` tables (ready for use)

### Store Patterns
- **`useAppStore`** (no persist middleware): async actions follow `set({ isLoading: true })` → `databaseService.X()` → `set({ data, isLoading: false })` → `catch → set({ error })`
- **`useThemeStore`** (Zustand `persist` to localStorage under `'theme-storage'`): thin setters like `setFontSize: (fontSize) => set({ fontSize })`, `partialize` excludes UI-only state
- **`calibreWebStore`** (manual `@capacitor/preferences` persistence): calls `savePersistedState(get())` after each `set()`

### Reader Component Patterns
- **Self-contained readers** (PdfReader, TextReader, HtmlReader, MarkdownReader): full `IonPage` with toolbar, content, footer — used directly by `Reader.tsx`
- **Wrapped readers** (EpubReader): `forwardRef` with `useImperativeHandle` exposing navigation API — wrapped by `EpubReaderContainer.tsx`
- New format readers: create `src/components/readers/{Format}Reader.tsx`, add format case to `Reader.tsx` dispatcher, add format to `Book['format']` union in `src/types/index.ts`

### UI Patterns
- **Sheet modals:** `<IonModal breakpoints={[0, 0.5, 0.85]} initialBreakpoint={0.5}>`
- **Touch input:** `useTapZones` + `useSwipeGesture` handlers on content div
- **Theme application:** read `useThemeStore.getCurrentTheme()` → apply `backgroundColor`/`textColor` as inline CSS vars on `IonContent`
- **Dynamic imports:** heavy libraries (epubjs, pdfjs-dist) imported with `await import('...')` to reduce bundle size

### Adding New npm Packages
```bash
npm install <package>        # production dependency
npm install -D <package>     # dev dependency
```
After installing, import and use. Vite handles bundling automatically. For heavy libraries, prefer dynamic `await import()`.

---

## Phase 1: MVP Core Reader — COMPLETE

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
- [x] TXT / HTML / Markdown rendering (TextReader, HtmlReader, MarkdownReader with DOMPurify)
- [x] Basic file picker integration (HTML5 file input: .epub, .pdf, .mobi, .fb2, .txt)

### 1.3 Bookshelf & Library
- [x] Bookshelf UI (grid and list views with responsive columns)
- [x] Book metadata storage in SQLite
- [x] File import via Capacitor Filesystem (web fallback + native import with metadata extraction)
- [x] Book cover display (grid/list views with placeholder fallback)
- [x] Basic filters (format filter, sort by: dateAdded/title/author/lastRead)

### 1.4 Reading Interface - Core Controls
- [x] Touch screen paging (configurable tap zones — `useTapZones.ts`)
- [x] Swipe gestures (touch event-based — `useSwipeGesture.ts`)
- [x] Page turn animations (slide/fade CSS transitions — `PageTransition.tsx`)
- [x] Bookmarks (save/remove/list with notes — `BookmarksPanel.tsx`)
- [x] Highlights for EPUB (CFI-based, 5 colors, notes — `HighlightsPanel.tsx`)
- [x] Table of contents navigation
- [x] Reading progress indicator (percentage, progress bar, CFI location in DB)

### 1.5 Theming & Display
- [x] Day/Night mode toggle
- [x] 6 base themes (Light, Dark, Sepia, Eye Comfort, Night, Invert)
- [x] Typography controls (font family, size, line height)
- [x] Text alignment options

### 1.6 Search & Navigation
- [x] In-book search (EPUB — spine iteration, PDF — text content extraction)
- [x] Jump to page/location

---

## Phase 2: Feature Rich

### 2.1 Extended Format Support

#### 2.1.1 MOBI/AZW3 Reader
- [ ] **Install:** `npm install mobi.js` (or `kf8-parser` if mobi.js is unavailable — check npm registry first)
- [ ] **Create** `src/services/mobiService.ts`:
  - Export `convertMobiToEpub(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer>` — use mobi.js to parse MOBI/AZW3, extract HTML chapters + metadata + images, repackage as EPUB ArrayBuffer using JSZip (already installed as `jszip`)
  - Follow singleton pattern: `export const mobiService = { convertMobiToEpub }`
- [ ] **Update** `src/pages/Reader/Reader.tsx` format dispatcher:
  - Add cases `'mobi' | 'azw3'` that call `mobiService.convertMobiToEpub(arrayBuffer)` then pass result to `<EpubReaderContainer>` (reuse EPUB reader)
  - Show loading spinner during conversion with text "Converting..."
- [ ] **Update** `src/pages/Library/Library.tsx` file input:
  - Add `.mobi, .azw3` to the `accept` attribute
  - Add metadata extraction for MOBI in import flow (extract title/author from MOBI header)
- [ ] **Update** `src/types/index.ts`: ensure `Book['format']` union includes `'mobi' | 'azw3'` (schema CHECK constraint already allows these)

#### 2.1.2 CBZ/CBR Comic Reader
- [ ] **Install:** `npm install jszip` (already present) + `npm install unrar.js` (for CBR)
- [ ] **Create** `src/components/readers/ComicReader.tsx`:
  - Props: `{ book: { id, title }, comicData: ArrayBuffer, format: 'cbz' | 'cbr', onClose?, onProgressChange? }`
  - For CBZ: use `JSZip.loadAsync(arrayBuffer)` → filter `.jpg/.png/.gif/.webp` files → sort by filename → extract as `blob` URLs
  - For CBR: use `unrar.js` to extract → same image pipeline
  - UI: full `IonPage` with `IonHeader` (title, back button, page X/Y), swipeable image gallery using `IonSlides` or manual CSS scroll-snap container
  - Each image rendered as `<img>` filling viewport width, aspect-ratio maintained
  - Pinch-to-zoom: use CSS `transform: scale()` with touch event distance calculation, or `use-gesture` library
  - Attach `useTapZones` for left/right tap navigation, `useSwipeGesture` for swipe between pages
  - Track progress: `currentImageIndex / totalImages` → call `onProgressChange`
  - Apply theme: dark background from `useThemeStore.getCurrentTheme().backgroundColor`
- [ ] **Update** `src/pages/Reader/Reader.tsx`:
  - Add `'cbz' | 'cbr'` case → pass `arrayBuffer` to `<ComicReader>`
- [ ] **Update** `src/pages/Library/Library.tsx`: add `.cbz, .cbr` to file input `accept`, generate cover from first extracted image
- [ ] **Update** `src/types/index.ts`: ensure `Book['format']` includes `'cbz' | 'cbr'`

#### 2.1.3 DOCX Reader
- [ ] **Install:** `npm install mammoth`
- [ ] **Create** `src/services/docxService.ts`:
  - Export `convertDocxToHtml(arrayBuffer: ArrayBuffer): Promise<string>` — call `mammoth.convertToHtml({ arrayBuffer })`, return `result.value` (HTML string)
  - Export `extractDocxMetadata(arrayBuffer: ArrayBuffer): Promise<{ title?: string; author?: string }>` — parse `docProps/core.xml` from the DOCX zip using JSZip + fast-xml-parser (already installed)
  - Singleton: `export const docxService = { convertDocxToHtml, extractDocxMetadata }`
- [ ] **Update** `src/pages/Reader/Reader.tsx`:
  - Add `'docx'` case → call `docxService.convertDocxToHtml(arrayBuffer)` → pass HTML string to `<HtmlReader>` (reuse existing HTML reader)
- [ ] **Update** `src/pages/Library/Library.tsx`: add `.docx` to file input, call `docxService.extractDocxMetadata` during import
- [ ] **Update** `src/types/index.ts`: add `'docx'` to format union

#### 2.1.4 ODT Reader
- [ ] **Create** `src/services/odtService.ts`:
  - Export `convertOdtToHtml(arrayBuffer: ArrayBuffer): Promise<string>` — ODT is a zip file: use JSZip to extract `content.xml`, parse with fast-xml-parser, walk the `<text:p>`, `<text:h>`, `<text:span>` elements converting to HTML `<p>`, `<h1-h6>`, `<span>` with inline styles from `text:style-name` attributes mapped to `styles.xml` definitions
  - Export `extractOdtMetadata(arrayBuffer: ArrayBuffer): Promise<{ title?: string; author?: string }>` — parse `meta.xml` from the ODT zip
  - Singleton: `export const odtService = { convertOdtToHtml, extractOdtMetadata }`
- [ ] **Update** `src/pages/Reader/Reader.tsx`: add `'odt'` case → convert → `<HtmlReader>`
- [ ] **Update** Library import + types as above
- [ ] **Update** `src/services/schema.ts`: add `'ODT'` and `'DOCX'` to the `books.format` CHECK constraint if not already present

### 2.2 Advanced Reading Features

#### 2.2.1 Already Complete
- [x] Auto-scroll (`AutoScrollManager.ts` — rAF loop, speed control)
- [x] Text-to-Speech (`useTTS.ts` + `TTSControls.tsx` — Web Speech API)
- [x] Reading statistics (`Statistics.tsx` — Recharts bar charts)
- [x] Blue light filter (CSS overlay, intensity control in `useThemeStore`)

#### 2.2.2 Dictionary Lookup
- [ ] **Create** `src/services/dictionaryService.ts`:
  - Export `lookupOnline(word: string): Promise<DictionaryResult>` — fetch `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}` using `fetch()` (no axios needed for simple GET), parse response JSON into `DictionaryResult` type
  - Export `lookupOffline(word: string): Promise<DictionaryResult | null>` — query the existing `dictionary_lookups` table in `schema.ts` as a cache: `SELECT * FROM dictionary_lookups WHERE word = ? COLLATE NOCASE`
  - Export `saveLookup(word: string, result: DictionaryResult): Promise<void>` — `INSERT OR REPLACE INTO dictionary_lookups` with `word`, `definition` (JSON-stringified), `language`, `looked_up_at`
  - Export `getRecentLookups(limit: number): Promise<DictionaryLookup[]>` — `SELECT * FROM dictionary_lookups ORDER BY looked_up_at DESC LIMIT ?`
  - Type `DictionaryResult = { word: string; phonetic?: string; meanings: Array<{ partOfSpeech: string; definitions: Array<{ definition: string; example?: string }> }> }`
  - Flow: try `lookupOffline` first → if miss, call `lookupOnline` → `saveLookup` to cache → return result
  - Singleton: `export const dictionaryService = { lookup, lookupOnline, lookupOffline, saveLookup, getRecentLookups }`
- [ ] **Add** `mapRowToDictionaryLookup(row)` function to `src/services/database.ts` — convert `looked_up_at` (Unix seconds) to Date, parse `definition` JSON string
- [ ] **Create** `src/components/reader-ui/DictionaryPopover.tsx`:
  - Props: `{ word: string; isOpen: boolean; onDismiss: () => void }`
  - On open: call `dictionaryService.lookup(word)`, show `IonSpinner` while loading
  - Display: word as `<h3>`, phonetic in `<small>`, iterate `meanings` rendering partOfSpeech as `<IonChip>` and definitions as `<IonList>` items
  - Error state: "No definition found" with option to search online (open browser)
  - Render as `<IonPopover>` positioned near the selected text
- [ ] **Integrate** into `EpubReaderContainer.tsx`:
  - Listen for text selection via `rendition.on('selected', (cfiRange, contents) => { ... })` — get `contents.window.getSelection().toString()`, extract single word (first word if multi-word selection), open `<DictionaryPopover>`
  - Add a "Define" button to the existing selection action menu (alongside highlight/note)
- [ ] **Integrate** into `TextReader.tsx` / `HtmlReader.tsx` / `MarkdownReader.tsx`:
  - Add `onContextMenu` or selection change listener on the content div
  - Use `window.getSelection().toString()` to get selected word, show `<DictionaryPopover>`

#### 2.2.3 Translation Integration
- [ ] **Create** `src/services/translationService.ts`:
  - Export `translate(text: string, targetLang: string, sourceLang?: string): Promise<TranslationResult>` — use LibreTranslate API (free, self-hostable): `POST https://libretranslate.com/translate` with body `{ q: text, source: sourceLang || 'auto', target: targetLang }`
  - Export `getSupportedLanguages(): Promise<Array<{ code: string; name: string }>>` — `GET https://libretranslate.com/languages`
  - Type `TranslationResult = { translatedText: string; detectedLanguage?: string }`
  - Allow configurable API URL in app settings (for self-hosted instances): store in `databaseService.getAppSetting('translation_api_url')` / `setAppSetting()`
  - Singleton: `export const translationService = { translate, getSupportedLanguages }`
- [ ] **Create** `src/components/reader-ui/TranslationPopover.tsx`:
  - Props: `{ text: string; isOpen: boolean; onDismiss: () => void }`
  - State: `targetLang` (default from app setting or `'en'`), `result`, `loading`
  - UI: selected text display, `IonSelect` for target language, translated text, copy button (`navigator.clipboard.writeText`), share button (`Share.share()` from `@capacitor/share` — install if needed)
  - Render as `<IonPopover>` or bottom sheet `<IonModal breakpoints={[0, 0.4]}>`
- [ ] **Integrate** alongside dictionary: add "Translate" button to text selection action menu in all reader components
- [ ] **Add** translation settings to `src/pages/Settings/Settings.tsx`: default target language, API URL field

#### 2.2.4 Reading Ruler / Focus Tools
- [ ] **Create** `src/components/reader-ui/ReadingRuler.tsx`:
  - Render a semi-transparent overlay `<div>` with a transparent horizontal "window" (the readable line) and opaque regions above/below
  - Position controlled by `top` CSS property, follows `onMouseMove` / `onTouchMove` Y coordinate
  - Window height: configurable via `rulerHeight` prop (default 60px, adjustable in settings)
  - Styling: `position: fixed; inset: 0; pointer-events: none; z-index: 9999` — the overlay. Use CSS `clip-path: polygon(...)` or two absolutely positioned dark `<div>`s (top mask + bottom mask) with `background: rgba(0,0,0,0.7)`
  - Show/hide controlled by `useThemeStore.readingRuler` boolean (already exists in store)
- [ ] **Implement bionic reading** in `src/components/reader-ui/BionicText.tsx`:
  - Export `applyBionicReading(htmlContent: string): string` — parse HTML, walk text nodes, for each word bold the first `ceil(word.length * 0.4)` characters by wrapping in `<b>` tags
  - Use DOMParser to parse + serialize (already available in browser)
  - Controlled by `useThemeStore.bionicReading` boolean (already exists)
- [ ] **Integrate** `<ReadingRuler>` into `ReaderContainer.tsx` — render conditionally when `readingRuler` is true
- [ ] **Integrate** bionic reading into `TextReader.tsx`, `HtmlReader.tsx`, `MarkdownReader.tsx` — apply `applyBionicReading()` to content before rendering when `bionicReading` is true
- [ ] **Settings** already exist in `ReadingSettingsPanel.tsx` (toggles for reading ruler and bionic reading are present)

#### 2.2.5 Brightness Gesture
- [ ] **Install:** `npm install @capacitor-community/screen-brightness`
- [ ] **Create** `src/hooks/useBrightnessGesture.ts`:
  - Track vertical touch drags on the left 15% of screen width (`touchX < containerWidth * 0.15`)
  - On `touchstart`: if in left edge zone, capture `startY` and current brightness
  - On `touchmove`: calculate `deltaY / containerHeight` → map to brightness delta (0-1 range)
  - On `touchend`: apply final brightness via `ScreenBrightness.setBrightness({ brightness })` from `@capacitor-community/screen-brightness`
  - Show a vertical brightness indicator overlay (thin bar on left edge with sun icon) during drag
  - Return: `{ onTouchStart, onTouchMove, onTouchEnd, brightnessOverlay: ReactNode }` — attach handlers to reader content div, render overlay in reader
  - Web fallback: use CSS `filter: brightness(X)` on the reader content div
  - Export from `src/hooks/index.ts`
- [ ] **Integrate** into `EpubReaderContainer.tsx`, `PdfReader.tsx`, `TextReader.tsx`: attach touch handlers alongside existing `useTapZones` + `useSwipeGesture`, render brightness overlay
- [ ] **Coordinate** with `useTapZones`: brightness gesture on left edge should take priority — in `useTapZones`, skip left-zone tap action if brightness drag was detected (check if touch moved vertically > 20px)

### 2.3 Cloud Sync & Backup

#### 2.3.1 Dropbox Integration
- [ ] **Install:** `npm install dropbox`
- [ ] **Create** `src/services/cloudSync/dropboxService.ts`:
  - Class `DropboxService` with singleton export `dropboxService`
  - **Auth:** Store Dropbox app key in app settings. Use PKCE OAuth2 flow: `Dropbox.auth.getAuthenticationUrl(redirectUri, state, 'code', 'offline', undefined, 'none', true)` → handle redirect → `Dropbox.auth.getAccessTokenFromCode(redirectUri, code)` → store `access_token` + `refresh_token` in `@capacitor/preferences` under `dropbox_tokens`
  - **Upload:** `dropboxService.uploadFile(localPath: string, remotePath: string): Promise<void>` — read file via `Filesystem.readFile({ path: localPath })` → `dbx.filesUpload({ path: remotePath, contents: data, mode: { '.tag': 'overwrite' } })`
  - **Download:** `dropboxService.downloadFile(remotePath: string, localPath: string): Promise<void>` — `dbx.filesDownload({ path: remotePath })` → write to local via `Filesystem.writeFile()`
  - **List:** `dropboxService.listFolder(path: string): Promise<DropboxEntry[]>` — `dbx.filesListFolder({ path })`
  - Internal folder: `/Apps/EbookReader/` for all synced data
- [ ] **Create** `src/pages/CloudSync/CloudSync.tsx`:
  - Route: `/cloud-sync` — register in `src/App.tsx`
  - UI: list of cloud providers (Dropbox, WebDAV) with connect/disconnect buttons
  - Show connection status, last sync time, sync now button
  - Navigation from Settings page: add `IonItem` with `routerLink="/cloud-sync"`

#### 2.3.2 WebDAV Client
- [ ] **Install:** `npm install webdav`
- [ ] **Create** `src/services/cloudSync/webdavService.ts`:
  - Class `WebDavService` with singleton export `webdavService`
  - **Connect:** `connect(url: string, username: string, password: string): Promise<boolean>` — create client with `createClient(url, { username, password })`, test with `client.exists('/')`, store config in `@capacitor/preferences` under `webdav_config`
  - **Upload:** `uploadFile(localPath, remotePath)` — `client.putFileContents(remotePath, data, { overwrite: true })`
  - **Download:** `downloadFile(remotePath, localPath)` — `client.getFileContents(remotePath, { format: 'binary' })` → write locally
  - **List:** `listFolder(path)` — `client.getDirectoryContents(path)`
  - Internal folder: `/EbookReader/` on the WebDAV server
- [ ] **Add** WebDAV settings UI to `CloudSync.tsx`: URL, username, password fields, test connection button

#### 2.3.3 Reading Position Sync
- [ ] **Create** `src/services/cloudSync/syncService.ts`:
  - Export `syncReadingProgress(provider: 'dropbox' | 'webdav'): Promise<void>`
  - **Export flow:** gather all reading progress from `databaseService.getAllReadingProgress()` → serialize to JSON `{ version: 1, deviceId, timestamp, positions: [...] }` → upload to `/{provider_folder}/sync/reading_progress.json`
  - **Import flow:** download remote JSON → compare timestamps per book (last-write-wins) → update local DB with `databaseService.updateReadingProgress()` for any newer remote positions
  - **Trigger:** call on `App.addListener('appStateChange', ({ isActive }) => { if (!isActive) syncReadingProgress() })` — sync when app goes to background. Import `App` from `@capacitor/app` (already installed)
  - `deviceId`: generate once, store in `@capacitor/preferences` under `device_id`
  - Singleton: `export const syncService = { syncReadingProgress, syncHighlights, fullBackup, restoreBackup }`

#### 2.3.4 Highlights/Notes Sync
- [ ] **Add** to `syncService.ts`:
  - Export `syncHighlights(provider: 'dropbox' | 'webdav'): Promise<void>`
  - Same pattern as positions: export all highlights/bookmarks as JSON → upload → download remote → merge with last-write-wins per annotation ID (use `updated_at` timestamp)
  - File: `/{provider_folder}/sync/annotations.json`

#### 2.3.5 Full Backup/Restore
- [ ] **Install:** `npm install jszip` (already present)
- [ ] **Add** to `syncService.ts`:
  - Export `fullBackup(provider: 'dropbox' | 'webdav'): Promise<void>`:
    1. Export SQLite DB: `databaseService.exportDatabase()` → get DB as ArrayBuffer (via `@capacitor-community/sqlite` export or raw file read from `Filesystem`)
    2. Export theme settings: `JSON.stringify(useThemeStore.getState())`
    3. Export app settings: `databaseService.getAllAppSettings()`
    4. Pack into ZIP: `const zip = new JSZip(); zip.file('database.db', dbData); zip.file('settings.json', settingsJson); zip.file('app_settings.json', appSettingsJson)`
    5. Upload ZIP to `/{provider_folder}/backups/backup_{timestamp}.zip`
  - Export `restoreBackup(provider: 'dropbox' | 'webdav', backupPath: string): Promise<void>`:
    1. Download ZIP → `JSZip.loadAsync(data)`
    2. Extract and import DB (close current connection → write file → re-initialize)
    3. Import settings JSON → `useThemeStore.setState(parsed)`
    4. Import app settings → `databaseService.setAppSetting()` per key
  - Export `listBackups(provider): Promise<BackupInfo[]>` — list files in `/{provider_folder}/backups/`
- [ ] **Add** backup UI to `CloudSync.tsx`: "Create Backup" button, list of existing backups with restore/delete actions

### 2.4 OPDS Catalog — COMPLETE
- [x] OPDS feed parser (`opdsService.ts`)
- [x] Catalog browser UI (`OpdsCatalog.tsx`)
- [x] Custom catalog URLs
- [x] Download from OPDS

### 2.5 Calibre-Web Integration

#### 2.5.1 Already Complete
- [x] Authentication, metadata fetch, sync, lazy download, cover caching, multi-server

#### 2.5.2 Sync Reading Progress Back to Calibre-Web
- [ ] **Add** to `src/services/calibreWebService.ts`:
  - Method `syncProgressToServer(calibreBookId: number, progress: number, currentPage?: number): Promise<boolean>`
  - Calibre-Web API: `PUT /api/book/{id}` or `POST /api/book/{id}/read` (check Calibre-Web API docs for exact endpoint — may need to use `kobo_reading_state` endpoint or custom bookmark sync)
  - Alternative: if no direct API exists, use `POST /kobo/{auth_token}/v1/library/{book_id}/state` (Kobo sync protocol that Calibre-Web supports)
  - Call this from `Reader.tsx` in the `recordSession()` cleanup function (when leaving reader), passing current progress percentage
- [ ] **Add** to `calibreWebStore.ts`:
  - Action `syncProgressForBook(bookId: string): Promise<void>` — get local progress from `databaseService.getReadingProgress(bookId)` → find matching Calibre-Web book ID → call `calibreWebService.syncProgressToServer()`
  - Track sync status per book in `bookStatuses` map

#### 2.5.3 "Get Books" Feature (Calibre-Web Search & Browse)
- [ ] **Add** to `src/services/calibreWebService.ts`:
  - Method `searchBooks(query: string): Promise<CalibreWebBook[]>` — `GET /api/search?query={query}` or use the existing `fetchAllBooks` with server-side filtering if supported
  - Method `getBooksByCategory(category: string, value: string): Promise<CalibreWebBook[]>` — browse by author/tag/series: `GET /api/books?author={value}` (check actual API)
  - Method `getCategories(): Promise<{ authors: string[]; tags: string[]; series: string[] }>` — fetch available filter values
- [ ] **Create** `src/pages/CalibreWebBrowse/CalibreWebBrowse.tsx`:
  - Route: `/calibre-web-browse` — register in `src/App.tsx`
  - UI: search bar at top, category tabs (All, Authors, Tags, Series), book grid/list matching Library.tsx style
  - Each book: show cover, title, author, format chips, download button
  - Download button: calls `calibreWebService.downloadBook()` → adds to local library via `useAppStore.addBook()`
  - Navigation from `CalibreWebSettings.tsx`: add "Browse Library" button

### 2.6 Enhanced Theming

#### 2.6.1 Already Complete
- [x] 11 built-in themes

#### 2.6.2 Custom Font Loading
- [ ] **Create** `src/services/fontService.ts`:
  - Export `loadCustomFont(fontName: string, fontFileUri: string): Promise<void>`:
    1. Read font file: `Filesystem.readFile({ path: fontFileUri })` → get base64 data
    2. Create `@font-face` CSS: `` `@font-face { font-family: '${fontName}'; src: url(data:font/truetype;base64,${base64}) format('truetype'); }` ``
    3. Inject into DOM: `const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style)`
    4. Track loaded fonts in module-level `Set<string>`
  - Export `getCustomFonts(): Promise<Array<{ name: string; path: string }>>` — list font files from `Filesystem` directory `custom_fonts/` (on native) or from `databaseService.getAppSetting('custom_fonts')` (JSON array)
  - Export `importFontFile(file: File): Promise<{ name: string; path: string }>` — save to `custom_fonts/` directory, extract font name from file name (strip extension), return font info
  - Singleton: `export const fontService = { loadCustomFont, getCustomFonts, importFontFile }`
- [ ] **Update** `src/stores/useThemeStore.ts`:
  - Add `customFonts: Array<{ name: string; path: string }>` to state
  - Add `addCustomFont(font)` / `removeCustomFont(name)` actions
  - Update `FONT_FAMILIES` to include custom fonts (compute from state)
- [ ] **Update** `src/components/reader-ui/ReadingSettingsPanel.tsx` Typography tab:
  - Add "Import Font" button below font family selector — triggers hidden `<input type="file" accept=".ttf,.otf,.woff,.woff2">`, calls `fontService.importFontFile()`
  - Show custom fonts in the `IonSelect` alongside built-in fonts
  - Add delete (swipe-to-delete) for custom fonts
- [ ] **Load** custom fonts on app startup: in `src/App.tsx` `useEffect`, call `fontService.getCustomFonts()` → `fontService.loadCustomFont()` for each

#### 2.6.3 Custom Background Colors/Images
- [ ] **Update** `src/stores/useThemeStore.ts`:
  - Add to state: `customBackgroundColor?: string`, `customBackgroundImage?: string` (base64 data URI or file URI)
  - Add actions: `setCustomBackgroundColor(color)`, `setCustomBackgroundImage(imageUri)`, `clearCustomBackground()`
  - Update `getCurrentTheme()` to merge custom background into returned theme
- [ ] **Update** `src/components/reader-ui/ReadingSettingsPanel.tsx` Appearance tab:
  - Add "Custom Background" section below theme grid
  - Color picker: `<input type="color">` bound to `customBackgroundColor`
  - Image picker: `<input type="file" accept="image/*">` → read as data URI → `setCustomBackgroundImage()`
  - Clear button to reset to theme default
- [ ] **Update** `src/components/reader-ui/ReaderContainer.tsx`:
  - Apply custom background: if `customBackgroundImage` set, use `backgroundImage: url(${image}); background-size: cover;` — else if `customBackgroundColor` set, use it — else use theme default
  - Ensure text remains readable: if custom background is dark and text color is dark, add semi-transparent overlay

### 2.7 Security

#### 2.7.1 Biometric Lock
- [ ] **Install:** `npm install capacitor-native-biometric`
- [ ] **Create** `src/services/authService.ts`:
  - Export `isBiometricAvailable(): Promise<boolean>` — `NativeBiometric.isAvailable()`, return `result.isAvailable`
  - Export `authenticate(): Promise<boolean>` — `NativeBiometric.verifyIdentity({ reason: 'Access your library', title: 'Authentication Required' })`, return true on success, false on error
  - Export `isLockEnabled(): Promise<boolean>` — read from `databaseService.getAppSetting('lock_enabled')` (returns `'biometric'` | `'pin'` | `'none'`)
  - Export `setLockMode(mode: 'biometric' | 'pin' | 'none'): Promise<void>` — `databaseService.setAppSetting('lock_enabled', mode)`
  - Singleton: `export const authService = { isBiometricAvailable, authenticate, isLockEnabled, setLockMode }`
- [ ] **Create** `src/components/common/LockScreen.tsx`:
  - Full-screen overlay (`position: fixed; inset: 0; z-index: 99999; background: var(--ion-background-color)`)
  - Shows app icon/name, "Unlock" button that calls `authService.authenticate()`
  - On success: hide overlay. On failure: show error toast, keep overlay
  - For PIN mode: show numeric keypad (4-6 digit PIN input)
- [ ] **Integrate** in `src/App.tsx`:
  - Add state `isLocked: boolean` (default `true` if lock enabled)
  - On mount: check `authService.isLockEnabled()` → if enabled, show `<LockScreen>`
  - Listen for `App.addListener('appStateChange', ({ isActive }) => { if (isActive && lockEnabled) setIsLocked(true) })` — re-lock when app returns from background

#### 2.7.2 PIN/Password Lock
- [ ] **Extend** `src/services/authService.ts`:
  - Export `setPIN(pin: string): Promise<void>` — hash with `crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + salt))` → store hash in `@capacitor/preferences` under `pin_hash`, store random salt under `pin_salt`
  - Export `verifyPIN(pin: string): Promise<boolean>` — hash input with stored salt → compare to stored hash
  - Export `hasPIN(): Promise<boolean>` — check if `pin_hash` exists in preferences
- [ ] **Update** `<LockScreen>`:
  - When lock mode is `'pin'`: show `IonInput type="number" maxlength={6}` with numeric keypad, call `authService.verifyPIN()` on submit
  - Show "Forgot PIN" option that requires biometric auth to reset (if available)
- [ ] **Add** security settings to `src/pages/Settings/Settings.tsx`:
  - New "Security" section with `IonSelect` for lock mode (None, Biometric, PIN)
  - If selecting Biometric: check availability first, show error if not supported
  - If selecting PIN: prompt to set new PIN via modal dialog

### 2.8 Library Management — COMPLETE
- [x] Categories/collections (CRUD, default collections seeded)
- [x] Tags (junction table, CRUD, color support)
- [x] Advanced filters (multi-tag, collection, read status, combined with search + sort)

---

## Phase 3: Polish & Power User Features

### 3.1 Advanced PDF Features

#### 3.1.1 PDF Text Highlighting
- [ ] **Install:** `npm install react-pdf-highlighter` (or implement manually if the library doesn't fit)
- [ ] **Manual approach** (preferred — more control):
  - In `PdfReader.tsx`, add a text layer overlay on each canvas using `pdfPage.getTextContent()` → render `<span>` elements absolutely positioned to match text coordinates
  - On text selection in the overlay layer: capture `window.getSelection()` range → compute bounding rects → store highlight as `{ bookId, pageNumber, rects: Array<{x,y,w,h}>, text, color, note?, createdAt }`
  - Render highlights as colored `<div>`s with `position: absolute; background: rgba(color, 0.3); pointer-events: none` overlaid on the text layer
  - Store highlights via `databaseService.addHighlight()` (existing function — add `pageNumber` and `rects` fields to highlight type)
- [ ] **Update** `src/types/index.ts`: extend `Highlight` type with optional `pageNumber?: number` and `rects?: Array<{ x: number; y: number; width: number; height: number }>`
- [ ] **Add** highlight panel to PdfReader: reuse `<HighlightsPanel>` component, filter by current book

#### 3.1.2 PDF Annotation Saving
- [ ] **Install:** `npm install pdf-lib`
- [ ] **Add** to `src/services/pdfService.ts`:
  - Export `saveAnnotationsToPdf(pdfArrayBuffer: ArrayBuffer, highlights: PdfHighlight[]): Promise<ArrayBuffer>` — use `PDFDocument.load(arrayBuffer)` → for each highlight, add `page.drawRectangle({ ...rect, color: rgb(), opacity: 0.3, borderColor: rgb() })` → `pdfDoc.save()` returns modified ArrayBuffer
  - Export `exportAnnotatedPdf(bookId: string): Promise<void>` — load original PDF + highlights → `saveAnnotationsToPdf()` → write to filesystem with `_annotated` suffix via `Filesystem.writeFile()`
- [ ] **Add** "Export Annotated PDF" button in PdfReader toolbar menu

#### 3.1.3 PDF Form Filling
- [ ] **Add** basic form support to `PdfReader.tsx` using `pdf-lib`:
  - On PDF load: check `pdfDoc.getForm()` for form fields
  - If form fields exist: render HTML `<input>` overlays positioned over form field locations
  - On save: `form.getTextField('fieldName').setText(value)` for each field → `pdfDoc.save()`
  - Support: text fields, checkboxes, radio buttons, dropdowns (the 4 types `pdf-lib` handles natively)
  - Complex forms (signatures, calculations): show "This form requires a full PDF editor" message

### 3.2 Advanced Gestures & Controls

#### 3.2.1 Hardware Key Mapping
- [ ] **Create** native Capacitor plugin `android/app/src/main/java/io/ionic/starter/plugins/HardwareKeysPlugin.java`:
  - Override `dispatchKeyEvent(KeyEvent event)` in the main Activity
  - Capture `KEYCODE_VOLUME_UP`, `KEYCODE_VOLUME_DOWN`, `KEYCODE_CAMERA`, `KEYCODE_HEADSETHOOK`
  - Forward to WebView via `bridge.triggerJSEvent("hardwareKey", "window", "{ key: 'volume_up' }")`
- [ ] **Create** `src/hooks/useHardwareKeys.ts`:
  - Listen for custom `hardwareKey` events on `window`
  - Map keys to reader actions: `{ volume_up: 'prev', volume_down: 'next', camera: 'bookmark' }` — configurable via app settings
  - Return: `{ registerAction(key, callback), unregisterAction(key) }`
- [ ] **Register** Capacitor plugin in `capacitor.config.ts` and `android/app/src/main/java/.../MainActivity.java`
- [ ] **Integrate** in reader components: call `useHardwareKeys` with `prev`/`next` callbacks

#### 3.2.2 Tilt-to-Turn Page
- [ ] **Install:** `@capacitor/motion` (check if already in package.json)
- [ ] **Create** `src/hooks/useTiltNavigation.ts`:
  - Use `Motion.addListener('accel', (event) => { ... })` to read accelerometer
  - Track device tilt angle: `Math.atan2(event.acceleration.x, event.acceleration.z) * (180 / Math.PI)`
  - When tilt exceeds threshold (configurable, default ±15°): trigger page turn
  - Debounce: ignore repeated tilts within 800ms to prevent rapid page flipping
  - Return: `{ isEnabled, setEnabled, setThreshold }`
  - Enable/disable via `useThemeStore` setting (add `tiltNavigation: boolean` and `tiltThreshold: number`)
- [ ] **Integrate** in reader components alongside other navigation hooks

#### 3.2.3 Headset/Bluetooth Controls
- [ ] **Implement** using Media Session API in `src/hooks/useMediaControls.ts`:
  - `navigator.mediaSession.setActionHandler('play', () => tts.speak())` (connect to TTS)
  - `navigator.mediaSession.setActionHandler('pause', () => tts.pause())`
  - `navigator.mediaSession.setActionHandler('nexttrack', () => reader.next())`
  - `navigator.mediaSession.setActionHandler('previoustrack', () => reader.prev())`
  - Set `navigator.mediaSession.metadata` with book title/author/cover
  - Works with Bluetooth headset play/pause buttons and notification controls
  - Return: `{ registerCallbacks(play, pause, next, prev) }`
- [ ] **Integrate** in reader components: call `useMediaControls` with reader navigation + TTS callbacks

#### 3.2.4 Shake-to-Speak
- [ ] **Add** to `src/hooks/useTiltNavigation.ts` (or create separate `useShakeDetection.ts`):
  - Track accelerometer magnitude: `Math.sqrt(x² + y² + z²)`
  - Detect shake: magnitude spike > threshold (default 15 m/s²) within 500ms window
  - On shake: trigger TTS `speak()` on current page text
  - Cooldown: 2 seconds between shake detections
  - Return: `{ isShakeEnabled, onShake(callback) }`
- [ ] **Integrate** in reader components: connect shake to TTS start/stop toggle

### 3.3 Visual Polish

#### 3.3.1 Page Curl Animation
- [ ] **Install:** `npm install turn.js` (or implement CSS-only curl)
- [ ] **CSS-only approach** (preferred for performance):
  - Update `src/components/reader-ui/PageTransition.tsx`: add `'curl'` animation type
  - Use CSS `perspective`, `transform-origin`, `rotateY` with `backface-visibility: hidden` to create a folding page effect
  - Keyframes: page rotates from 0° to -180° around the right edge, revealing the next page behind
  - Add shadow gradient during animation to simulate depth
  - Touch-driven curl: track touch X position → map to rotation angle for interactive curl
- [ ] **Update** `useThemeStore`: add `'curl'` to `PageTransitionType` union
- [ ] **Update** `ReadingSettingsPanel.tsx`: add curl option in page animation selector

#### 3.3.2 Dual-Page Mode (Landscape)
- [ ] **Install:** `npm install @capacitor/screen-orientation`
- [ ] **Create** `src/hooks/useOrientation.ts`:
  - Track orientation via `ScreenOrientation.addListener('screenOrientationChange', ...)` on native, `window.matchMedia('(orientation: landscape)')` on web
  - Return: `{ isLandscape: boolean, orientation: 'portrait' | 'landscape' }`
- [ ] **Update** `EpubReader.tsx`:
  - When landscape: set `rendition.spread('always')` — epub.js natively supports dual-page
  - When portrait: set `rendition.spread('none')` — single page
- [ ] **Update** `PdfReader.tsx`:
  - When landscape: render two canvases side by side (pages N and N+1) in a `display: flex` container
  - Double the viewport width calculation for zoom fitting
  - Page navigation advances by 2 in landscape mode
- [ ] **Add** toggle in `ReadingSettingsPanel.tsx`: "Auto dual-page in landscape" toggle, stored in `useThemeStore`

#### 3.3.3 More Page Turn Animations
- [ ] **Update** `src/components/reader-ui/PageTransition.tsx`:
  - Add animation types: `'flip'` (3D card flip via `rotateY(180deg)`), `'zoom'` (scale down old page while scaling up new), `'cover'` (new page slides over old page which stays stationary)
  - Each animation: define CSS `@keyframes` in component-level `<style>` or in `src/theme/variables.css`
  - `flip`: `perspective: 1000px; transform: rotateY(0deg) → rotateY(-180deg)`
  - `zoom`: outgoing `scale(1) → scale(0.8) + opacity(0)`, incoming `scale(1.2) + opacity(0) → scale(1) + opacity(1)`
  - `cover`: incoming `translateX(100%) → translateX(0)`, outgoing stays at `translateX(0)` (no movement)
- [ ] **Update** `useThemeStore`: extend `PageTransitionType` to include `'flip' | 'zoom' | 'cover' | 'curl'`
- [ ] **Update** `ReadingSettingsPanel.tsx`: show all animation options in a selector

### 3.4 Niche Formats

#### 3.4.1 FB2 Support
- [ ] **Create** `src/services/fb2Service.ts`:
  - Export `convertFb2ToHtml(xmlContent: string): string` — parse FB2 XML with `fast-xml-parser` (already installed)
  - FB2 structure: `<FictionBook><body><section><p>...</p></section></body></FictionBook>`
  - Map: `<section>` → `<div class="chapter">`, `<p>` → `<p>`, `<emphasis>` → `<em>`, `<strong>` → `<strong>`, `<image>` → `<img>` with base64 from `<binary>` elements
  - Extract metadata from `<description><title-info>`: `<book-title>`, `<author><first-name> <last-name>`, `<genre>`, `<lang>`, `<coverpage><image>`
  - Export `extractFb2Metadata(xmlContent: string): { title, author, genre, language, coverBase64 }`
  - Singleton: `export const fb2Service = { convertFb2ToHtml, extractFb2Metadata }`
- [ ] **Update** `Reader.tsx`: add `'fb2'` case → `fb2Service.convertFb2ToHtml(textContent)` → `<HtmlReader>`
- [ ] **Update** Library import: add `.fb2` to accept, extract FB2 metadata
- [ ] **Update** types + schema CHECK constraint if needed

#### 3.4.2 CHM Support
- [ ] **Install:** `npm install chm-lib` (or `chmlib-wasm` if available)
- [ ] **Create** `src/services/chmService.ts`:
  - Export `extractChmContent(arrayBuffer: ArrayBuffer): Promise<{ html: string; toc: ChapterInfo[] }>` — decompress CHM archive → extract HTML files → concatenate in TOC order → resolve internal links
  - CHM files contain compiled HTML — extract and stitch together
  - Singleton: `export const chmService = { extractChmContent }`
- [ ] **Update** `Reader.tsx`: add `'chm'` case → `<HtmlReader>` with extracted content
- [ ] **Note:** CHM library availability in npm is limited — may need to use a WASM-compiled `chmlib` or skip if no reliable package exists

#### 3.4.3 DJVU Support
- [ ] **Install:** `npm install djvu.js` (~2MB — use dynamic import)
- [ ] **Create** `src/components/readers/DjvuReader.tsx`:
  - Pattern: similar to `PdfReader.tsx` — canvas-based rendering
  - Dynamic import: `const DjVu = await import('djvu.js')` — only load when needed
  - Use DjVu.js to decode pages → render each page to canvas
  - Navigation: page-by-page with tap zones and swipe gestures
  - Zoom: same pattern as PdfReader (fit-width, fit-page, custom)
- [ ] **Update** `Reader.tsx`: add `'djvu'` case with dynamic import loading spinner
- [ ] **Note:** Bundle size concern — ensure tree-shaking or lazy chunk via Vite dynamic import

### 3.5 Internationalization

#### 3.5.1 i18n Setup
- [ ] **Install:** `npm install react-i18next i18next i18next-browser-languagedetector`
- [ ] **Create** `src/i18n/`:
  - `src/i18n/index.ts` — initialize i18next with `LanguageDetector`, `initReactI18next`, default namespace `'common'`
  - `src/i18n/locales/en.json` — English translations (extract all hardcoded strings from existing components)
  - Config: `fallbackLng: 'en'`, `interpolation: { escapeValue: false }` (React handles escaping)
- [ ] **Import** `src/i18n/index.ts` in `src/main.tsx` (before App render)
- [ ] **Wrap** existing strings: replace hardcoded strings in all components with `const { t } = useTranslation(); ... t('library.title')`, `t('reader.bookmarks')`, etc.
- [ ] **Key organization** in JSON: `{ "library": { "title": "Library", ... }, "reader": { "bookmarks": "Bookmarks", ... }, "settings": { ... } }`

#### 3.5.2 Language Translations
- [ ] **Create** `src/i18n/locales/{lang}.json` for each language
- [ ] Priority languages (match Moon+ Reader): `es, fr, de, it, pt, ru, zh, ja, ko, ar, tr, pl, nl, uk, cs, sv, da, fi, no, ro, hu, el, th, vi, id, ms, hi, bn, ta, te`
- [ ] Use an LLM or professional translation service — do NOT machine-translate and ship without review
- [ ] **Add** language selector to `Settings.tsx`: `IonSelect` with all available languages, calls `i18n.changeLanguage(lang)`
- [ ] Store language preference: `databaseService.setAppSetting('language', lang)`

#### 3.5.3 RTL Support
- [ ] **Update** `src/App.tsx`: when language is RTL (`ar`, `he`, `fa`, `ur`), set `document.documentElement.dir = 'rtl'`
- [ ] **Update** CSS in `src/theme/variables.css`: use CSS logical properties where possible (`margin-inline-start` instead of `margin-left`, `padding-inline-end` instead of `padding-right`)
- [ ] **Update** `EpubReader.tsx`: set `rendition.direction('rtl')` when RTL language detected
- [ ] **Update** `useTapZones.ts`: swap left/right zone actions when RTL (tap on right = prev, tap on left = next)
- [ ] **Update** `useSwipeGesture.ts`: swap swipe direction interpretation in RTL mode

### 3.6 Advanced Features

#### 3.6.1 Auto-Scan Folders
- [ ] **Create** `src/services/folderScanService.ts`:
  - Export `scanFolder(path: string): Promise<FoundFile[]>` — use `Filesystem.readdir({ path, directory: Directory.ExternalStorage })` → filter by supported extensions (`.epub, .pdf, .txt, .mobi, .docx, .fb2, .cbz, .cbr, .html, .md, .odt`)
  - Export `getWatchedFolders(): Promise<string[]>` — read from `databaseService.getAppSetting('watched_folders')` (JSON array)
  - Export `addWatchedFolder(path: string): Promise<void>` / `removeWatchedFolder(path: string): Promise<void>`
  - Export `scanAllWatchedFolders(): Promise<NewBookInfo[]>` — scan all folders → diff against existing `books` in DB by `filePath` → return only new files
  - Export `autoImportNewBooks(newFiles: NewBookInfo[]): Promise<void>` — for each new file, extract metadata + create Book entry via `useAppStore.addBook()`
  - Singleton: `export const folderScanService = { scanFolder, getWatchedFolders, addWatchedFolder, removeWatchedFolder, scanAllWatchedFolders, autoImportNewBooks }`
- [ ] **Trigger:** on app launch in `src/App.tsx` useEffect → `folderScanService.scanAllWatchedFolders()` → if new books found, show toast "Found X new books"
- [ ] **Add** folder management UI to `Settings.tsx`: "Watched Folders" section with list + add/remove buttons, manual "Scan Now" button

#### 3.6.2 Home Screen Widget (Android Native)
- [ ] **Create** `android/app/src/main/java/io/ionic/starter/widgets/ReadingWidget.java`:
  - Extends `AppWidgetProvider`
  - Reads current book info from `SharedPreferences` (synced from WebView via custom Capacitor plugin)
  - Displays: book cover thumbnail, title, progress bar, "Continue Reading" button
  - `onUpdate()`: refresh widget views from SharedPreferences
  - Click handler: launches app to `/reader/${bookId}`
- [ ] **Create** `android/app/src/main/res/layout/reading_widget.xml`: widget layout with ImageView (cover), TextView (title), ProgressBar, Button
- [ ] **Create** `android/app/src/main/res/xml/reading_widget_info.xml`: widget metadata (min size 250x110dp, resizable, update period 1800000ms)
- [ ] **Register** in `android/app/src/main/AndroidManifest.xml`: `<receiver>` for `ReadingWidget` with `APPWIDGET_UPDATE` intent filter
- [ ] **Create** Capacitor plugin `src/plugins/widgetBridge.ts` to sync current book data to SharedPreferences from the web layer
- [ ] **Note:** This is Android-only. Requires Android Studio and native Kotlin/Java development.

#### 3.6.3 Name Replacement / Role Reversal
- [ ] **Create** `src/services/textReplacementService.ts`:
  - Export `applyReplacements(text: string, rules: ReplacementRule[]): string` — iterate rules, apply `text.replaceAll(rule.from, rule.to)` for each (case-sensitive by default, configurable)
  - Type `ReplacementRule = { id: string; from: string; to: string; caseSensitive: boolean; enabled: boolean; bookId?: string }` — optional bookId for per-book rules
  - Export `getRules(bookId?: string): Promise<ReplacementRule[]>` — load from `databaseService.getAppSetting('replacement_rules')` (JSON array), filter by bookId if provided
  - Export `saveRule(rule: ReplacementRule): Promise<void>` / `deleteRule(id: string): Promise<void>`
  - Singleton: `export const textReplacementService = { applyReplacements, getRules, saveRule, deleteRule }`
- [ ] **Integrate** into text-based readers (`TextReader`, `HtmlReader`, `MarkdownReader`):
  - Before rendering content: `const processed = textReplacementService.applyReplacements(content, rules)`
  - Load rules in useEffect on mount
- [ ] **Integrate** into EPUB reader:
  - Use epub.js hook: `rendition.hooks.content.register((contents) => { /* walk DOM text nodes and apply replacements */ })`
- [ ] **Add** replacement rules UI: accessible from reader toolbar menu → `IonModal` with list of rules, add/edit/delete per rule

#### 3.6.4 Softkey Backlight Control
- [ ] **Create** native Capacitor plugin (Android only):
  - `android/app/src/main/java/io/ionic/starter/plugins/SoftkeyPlugin.java`
  - Use `WindowManager.LayoutParams.buttonBrightness` to control navigation bar button brightness
  - Methods: `setBrightness(float)`, `getBrightness()`, `setAutoOff(boolean, timeoutMs)`
- [ ] **Create** `src/plugins/softkeyPlugin.ts` — TypeScript wrapper using `@capacitor/core` registerPlugin
- [ ] **Note:** Low priority — most modern devices use gesture navigation (no softkeys). Only implement if users specifically request it.

---

## Progress Tracking

**Legend:**
- [x] Complete
- [ ] Not started

### Current Status Summary
- **Phase 1 (MVP):** 26/26 tasks complete (100%)
- **Phase 2 (Feature Rich):** 21/37 tasks complete (57%)
- **Phase 3 (Polish):** 0/17 tasks (0%)

**Overall Progress:** 47/80 tasks (59%)

### Phase 1 — COMPLETE
All MVP features are implemented: EPUB + PDF + TXT/HTML/MD reading, library with grid/list views and filters, bookmarks/highlights, tap zones, swipe gestures, page animations, search, theming, and progress tracking.

### Remaining Phase 2 items (next sprint):
1. Dictionary lookup (API + offline cache)
2. Translation integration (LibreTranslate)
3. Reading ruler / focus tools + bionic reading
4. Brightness gesture (left-edge vertical swipe)
5. Cloud sync (Dropbox + WebDAV)
6. Backup/restore (JSZip export)
7. Custom font loading (@font-face injection)
8. Custom background colors/images
9. Biometric + PIN lock
10. Calibre-Web: sync progress back, "Get Books" browse page
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
- **Services as singletons** — module-level instances or function collections exported as objects
- **Sheet-style modals** — Ionic `breakpoints` for settings panels and action sheets
- **Dynamic imports** — heavy libraries loaded on demand to reduce initial bundle

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
