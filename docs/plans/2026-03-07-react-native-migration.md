# React Native Migration Plan

## Executive Summary

Migrate the Shelfy Reader app from React 19 / Ionic 8 / Capacitor 8 to React Native (Expo), while redesigning the reader component for better performance, native feel, and extensibility. The current app runs as a web app (GitHub Pages) and Android APK. The React Native version targets Android and iOS natively, with optional Expo Web for browser support.

---

## Table of Contents

1. [Motivation](#1-motivation)
2. [Technology Choices](#2-technology-choices)
3. [Migration Strategy](#3-migration-strategy)
4. [Phase 1: Project Scaffolding & Core Infrastructure](#4-phase-1-project-scaffolding--core-infrastructure)
5. [Phase 2: Navigation, Theming & Shell](#5-phase-2-navigation-theming--shell)
6. [Phase 3: Library & Book Management](#6-phase-3-library--book-management)
7. [Phase 4: Reader Engine Redesign](#7-phase-4-reader-engine-redesign)
8. [Phase 5: Reader UI & Features](#8-phase-5-reader-ui--features)
9. [Phase 6: Cloud, Sync & Social Features](#9-phase-6-cloud-sync--social-features)
10. [Phase 7: Platform-Specific & Polish](#10-phase-7-platform-specific--polish)
11. [Phase 8: Testing, CI/CD & Release](#11-phase-8-testing-cicd--release)
12. [Reader Component Improvements](#12-reader-component-improvements)
13. [Component Migration Map](#13-component-migration-map)
14. [Service Layer Migration](#14-service-layer-migration)
15. [Risk Assessment & Mitigations](#15-risk-assessment--mitigations)
16. [Estimated Scope](#16-estimated-scope)

---

## 1. Motivation

### Current Pain Points

- **Ionic WebView overhead**: The entire app runs inside an Android WebView. UI interactions (scrolling, gestures, transitions) feel sluggish compared to native apps.
- **Reader rendering**: EPUB/MOBI rendering uses CSS columns inside iframes within a WebView — three layers of abstraction that limit performance, especially for large books.
- **Platform limitations**: No iOS support (Capacitor iOS is configured but never built). WebTorrent/DHT requires Node.js polyfills. Many features are web-only or native-only with fragile branching.
- **CSS complexity**: 44 CSS files + Ionic's global styles + CSS variables + inline styles = hard to maintain and inconsistent across themes.
- **Bundle size**: WebTorrent, Firebase, PDF.js, epub.js dependencies inflate the web bundle even when unused.

### What React Native Solves

- **True native UI**: Native views, gestures, and animations instead of WebView DOM.
- **Better reader performance**: Direct use of native rendering engines (e.g., `react-native-webview` for HTML content, native PDF renderers).
- **iOS from day one**: Single codebase for Android and iOS.
- **Expo ecosystem**: EAS Build, OTA updates, Expo Router, and a large plugin ecosystem.
- **Smaller runtime**: Tree-shaking and lazy loading are more effective without bundling an entire web framework.

---

## 2. Technology Choices

### Core Stack

| Layer | Current | Target | Rationale |
|---|---|---|---|
| **Framework** | React 19 + Ionic 8 | React Native 0.79+ (New Architecture) | Native performance, Fabric renderer |
| **Meta-framework** | Vite | Expo SDK 53+ | Managed workflow, EAS Build, OTA updates |
| **Router** | React Router 5 + Ionic Router | Expo Router v4 (file-based) | Deep linking, typed routes, native stack |
| **Styling** | CSS files + Ionic classes + CSS vars | NativeWind v4 (Tailwind for RN) | Utility-first, consistent cross-platform |
| **State** | Zustand 5 | Zustand 5 (unchanged) | Already RN-compatible, no migration needed |
| **Database** | `@capacitor-community/sqlite` / localStorage | `expo-sqlite` (Expo SDK 53) | First-party Expo support, synchronous API |
| **File Storage** | IndexedDB (`webFileStorage.ts`) | `expo-file-system` + SQLite BLOBs | Native file I/O, no IndexedDB dependency |
| **Navigation UI** | Ionic Tabs + IonRouterOutlet | `@react-navigation/bottom-tabs` via Expo Router | Native tab bar, platform animations |

### Reader Libraries

| Format | Current | Target | Rationale |
|---|---|---|---|
| **EPUB** | shelfy-reader (formerly foliate-js) | `react-native-webview` + shelfy-reader lib | Keep our own parsing/rendering lib, run inside WebView with native gesture bridge |
| **PDF** | PDF.js (canvas) | `react-native-pdf` or `expo-pdf` (if available) | Native PDF renderer, better performance |
| **MOBI/AZW3** | shelfy-reader lib | shelfy-reader lib inside WebView | Same lib handles MOBI/AZW3 parsing natively |
| **FB2** | shelfy-reader lib | shelfy-reader lib inside WebView | Same lib handles FB2 parsing natively |
| **CBZ/CBR** | shelfy-reader comic-book.ts | Custom `FlatList` + `expo-image` | Native image scrolling, pinch-zoom |
| **TXT/HTML/MD** | ScrollEngine.tsx | `react-native-webview` with sanitized HTML | Simple, already works |
| **DOCX/ODT** | mammoth.js | mammoth.js → HTML → WebView | Keep conversion, change renderer |

### Key Libraries

| Purpose | Library |
|---|---|
| Gestures | `react-native-gesture-handler` (Reanimated-powered) |
| Animations | `react-native-reanimated` 3 |
| Image loading | `expo-image` |
| Haptics | `expo-haptics` |
| Secure storage | `expo-secure-store` |
| Document picker | `expo-document-picker` |
| Status bar | `expo-status-bar` |
| Splash screen | `expo-splash-screen` |
| Screen brightness | `expo-brightness` |
| Firebase | `@react-native-firebase/app` (modular) |
| HTTP | `fetch` (native) or `axios` (already used) |
| Charts | `react-native-chart-kit` or `victory-native` |
| WebView | `react-native-webview` |
| SQLite | `expo-sqlite` |
| Translation | `react-native-mlkit-translate` (community) |

---

## 3. Migration Strategy

### Approach: Parallel Rewrite with Shared Logic

Rather than incrementally migrating the Ionic app (which would require maintaining two UI systems), we'll do a **parallel rewrite**:

1. **New Expo project** in a separate directory (e.g., `rn/` or a new repo).
2. **Copy service layer** — Zustand stores, services, types, and utilities move with minimal changes.
3. **Rewrite UI layer** — Every screen rebuilt with React Native components.
4. **Redesign reader** — New reader architecture optimized for native.
5. **Feature parity gate** — Each phase reaches feature parity before moving to the next.

### What Transfers Directly (Minimal Changes)

- `src/stores/` — All 13 Zustand stores (swap `localStorage` persistence for `AsyncStorage` or `expo-sqlite`)
- `src/types/` — All TypeScript types
- `src/services/` — Most services (adapt Capacitor imports to Expo equivalents)
- `src/libs/shelfy-reader/` (renamed from `foliate-js`) — Our own EPUB/MOBI/FB2/CBZ parsing & rendering library, bundled into the WebView
- Business logic in hooks — Reading speed calculation, sleep timer, etc.

### What Gets Rewritten

- All React components (Ionic → React Native)
- All CSS files (→ NativeWind/StyleSheet)
- Router/navigation setup
- Database connection layer (Capacitor SQLite → expo-sqlite)
- File storage layer (IndexedDB → expo-file-system)
- Reader rendering engines
- Platform-specific branching (`Capacitor.isNativePlatform()` → `Platform.OS`)

---

## 4. Phase 1: Project Scaffolding & Core Infrastructure

### 4.1 Initialize Expo Project

```bash
npx create-expo-app@latest shelfy-reader --template tabs
```

- Configure `app.json` / `app.config.ts`:
  - `slug: "shelfy-reader"`
  - `scheme: "shelfy"` (deep linking)
  - `android.package: "com.shelfyreader.app"` (keep same package name)
  - `ios.bundleIdentifier: "com.shelfyreader.app"`
  - `plugins: ["expo-sqlite", "expo-document-picker", ...]`

### 4.2 Database Layer

Migrate from `@capacitor-community/sqlite` to `expo-sqlite`:

```
Current:                          Target:
src/services/db/connection.ts  →  src/db/connection.ts (expo-sqlite)
src/services/schema.ts         →  src/db/schema.ts (unchanged SQL)
src/services/db/*Repository.ts →  src/db/*Repository.ts (adapt query API)
```

Key differences:
- `expo-sqlite` provides synchronous API in SDK 53+ (no more `async/await` for queries)
- Connection management simpler (no `isConnection`/`retrieveConnection` dance)
- Same SQL schema (19 tables) works as-is
- Migrations table and logic transfer directly

**Remove the web/localStorage fallback entirely** — React Native always has SQLite.

### 4.3 File Storage Layer

Replace IndexedDB with `expo-file-system`:

```typescript
// New: src/services/fileStorage.ts
import * as FileSystem from 'expo-file-system';

const BOOKS_DIR = `${FileSystem.documentDirectory}books/`;

export async function storeBookFile(bookId: string, filename: string, data: ArrayBuffer): Promise<string> {
  const dir = `${BOOKS_DIR}${bookId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const path = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(path, arrayBufferToBase64(data), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}
```

- File paths change from `indexeddb://<bookId>/<filename>` to native filesystem paths
- Migration script for existing users: read from IndexedDB (via WebView bridge), write to filesystem

### 4.4 State Management

Zustand stores transfer with one change — persistence middleware:

```typescript
// Current (Ionic):
persist(storeConfig, { name: 'theme-store' }) // uses localStorage

// Target (React Native):
import AsyncStorage from '@react-native-async-storage/async-storage';

persist(storeConfig, {
  name: 'theme-store',
  storage: createJSONStorage(() => AsyncStorage),
})
```

Alternatively, persist directly to SQLite for better performance with large datasets (book library).

### 4.5 Platform Utilities

Replace Capacitor platform checks:

```typescript
// Current:
import { Capacitor } from '@capacitor/core';
if (Capacitor.isNativePlatform()) { ... }

// Target:
import { Platform } from 'react-native';
if (Platform.OS === 'android' || Platform.OS === 'ios') { ... }
```

---

## 5. Phase 2: Navigation, Theming & Shell

### 5.1 Expo Router Setup

File-based routing structure:

```
app/
├── _layout.tsx          # Root layout (providers, splash screen)
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator layout
│   ├── library.tsx      # Library screen
│   ├── browse.tsx       # Browse/discover
│   ├── catalogs.tsx     # OPDS catalogs
│   └── settings.tsx     # Settings
├── reader/
│   └── [bookId].tsx     # Reader screen (full-screen, no tabs)
├── calibre-web.tsx      # Calibre-Web settings
├── statistics.tsx       # Reading stats
├── cloud-sync.tsx       # Cloud sync settings
├── reading-goals.tsx    # Goals tracking
├── search.tsx           # Global search
└── year-in-review.tsx   # Annual summary
```

### 5.2 Theme System

Replace CSS variables with a React Native-compatible theme:

```typescript
// src/theme/themes.ts
export const themes = {
  light: {
    background: '#FFFFFF',
    text: '#1A1A1A',
    accent: '#2C5F8A',
    cardBg: '#F5F5F5',
    readerBg: '#FFFFFF',
    readerText: '#1A1A1A',
    highlightYellow: '#FFF176',
    highlightGreen: '#A5D6A7',
    highlightBlue: '#90CAF9',
    highlightPink: '#F48FB1',
    // ... all current CSS variable values
  },
  dark: { ... },
  sepia: { ... },
  eyeComfort: { ... },
  night: { ... },
} as const;
```

Use NativeWind for utility-class styling that responds to the active theme:

```tsx
// Example component
<View className="bg-background p-4 rounded-lg shadow-sm">
  <Text className="text-primary text-lg font-medium">{title}</Text>
</View>
```

### 5.3 App Shell

Replace `IonApp` / `IonTabs`:

```tsx
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: theme.accent }}>
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: LibraryIcon }} />
      <Tabs.Screen name="browse" options={{ title: 'Browse', tabBarIcon: BrowseIcon }} />
      <Tabs.Screen name="catalogs" options={{ title: 'Catalogs', tabBarIcon: CatalogsIcon }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: SettingsIcon }} />
    </Tabs>
  );
}
```

---

## 6. Phase 3: Library & Book Management

### 6.1 Library Screen

Replace `IonGrid`/`IonCard` with React Native equivalents:

| Ionic Component | React Native Equivalent |
|---|---|
| `IonPage` + `IonContent` | `SafeAreaView` + `ScrollView` / `FlatList` |
| `IonSearchbar` | Custom `TextInput` with search icon |
| `IonGrid` / `IonRow` / `IonCol` | `FlatList` with `numColumns` |
| `IonCard` | Custom `Pressable` + `View` |
| `IonThumbnail` | `expo-image` `Image` component |
| `IonActionSheet` | `@react-native-community/bottom-sheet` or custom |
| `IonRefresher` | `RefreshControl` on `FlatList` |
| `IonFab` | Custom `Pressable` with absolute positioning |
| `IonModal` | `@gorhom/bottom-sheet` or `Modal` |
| `IonAlert` | `Alert.alert()` |
| `IonToast` | `react-native-toast-message` |

### 6.2 Book Import

Replace web file picker with `expo-document-picker`:

```typescript
import * as DocumentPicker from 'expo-document-picker';

async function importBook() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/epub+zip',
      'application/pdf',
      'application/x-mobipocket-ebook',
      // ... all supported MIME types
    ],
    copyToCacheDirectory: true,
  });

  if (!result.canceled) {
    const file = result.assets[0];
    // Read file, extract metadata, store in DB
  }
}
```

### 6.3 Book Grid/List Views

Use `FlashList` (from Shopify) for high-performance book lists:

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={filteredBooks}
  numColumns={gridMode ? 3 : 1}
  renderItem={({ item }) => <BookCard book={item} />}
  estimatedItemSize={gridMode ? 200 : 80}
  keyExtractor={book => book.id}
/>
```

### 6.4 Book Cover & Metadata

- Cover images cached via `expo-image` (built-in caching, blurhash placeholders)
- Metadata extraction services transfer as-is (they operate on `ArrayBuffer`)
- Online metadata enrichment (`metadataLookupService.ts`) works unchanged

---

## 7. Phase 4: Reader Engine Redesign

This is the most critical phase. The current reader has three engines (FoliateEngine, PdfEngine, ScrollEngine) rendering inside a WebView iframe. The redesigned reader optimizes each format path.

### 7.1 New Reader Architecture

```
┌─────────────────────────────────────────────────┐
│                ReaderScreen                      │
│  (app/reader/[bookId].tsx)                       │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │          ReaderContainer                     │ │
│  │  (gesture handler, toolbar, overlays)        │ │
│  │                                              │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │         Format Engine (swappable)       │  │ │
│  │  │                                        │  │ │
│  │  │  EpubEngine   ← WebView + shelfy-reader│  │ │
│  │  │  PdfEngine    ← native PDF renderer    │  │ │
│  │  │  ComicEngine  ← FlatList + Image       │  │ │
│  │  │  TextEngine   ← WebView + HTML         │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  │                                              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │ │
│  │  │ Toolbar  │ │ Search   │ │ Settings     │ │ │
│  │  │ (top)    │ │ (overlay)│ │ (bottom      │ │ │
│  │  │          │ │          │ │  sheet)      │ │ │
│  │  └──────────┘ └──────────┘ └──────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 7.2 Shelfy-Reader Library (Renamed from foliate-js)

The `src/libs/foliate-js/` directory is **our own code** — a custom fork we maintain and modify freely. As part of the React Native migration, rename it to `src/libs/shelfy-reader/` to reflect project ownership and avoid confusion with upstream foliate-js.

**What gets renamed:**
- Directory: `src/libs/foliate-js/` → `src/libs/shelfy-reader/`
- All import paths updated across the codebase
- Package references in comments and documentation
- No functional changes to the library code itself

**Why keep our own library:**
- We've heavily customized the parsing and rendering code for our needs
- It handles EPUB, MOBI/AZW3, FB2, and CBZ/CBR formats in a unified way
- The paginator, CFI system, highlight overlayer, and search are battle-tested
- Rewriting this from scratch or switching to a third-party lib would be high risk with no clear benefit
- The library's DOM dependencies (`DOMParser`, `document.querySelector`, CSS columns) are satisfied by running inside a WebView

### 7.3 EPUB/MOBI/FB2 Engine (WebView + shelfy-reader)

These formats require HTML/CSS rendering, so a WebView is still needed. The key improvement is **native gesture bridging**:

```
Current flow (Ionic):
  WebView → iframe (Ionic) → iframe (shelfy-reader) → CSS columns → touch events

New flow (React Native):
  react-native-webview → shelfy-reader HTML/CSS → postMessage bridge → RN gesture handler
```

**Key improvements:**
- Remove one iframe layer (no Ionic wrapper)
- Use `react-native-gesture-handler` for page turns (swipe, tap zones) OUTSIDE the WebView
- WebView only handles content rendering, not input
- `onMessage` / `postMessage` bridge for:
  - Text selection events
  - Location/CFI updates
  - Chapter changes
  - Search results
  - Highlight creation
- Preload adjacent pages in offscreen WebViews for instant page turns

```tsx
// Simplified EPUB engine structure using shelfy-reader lib
function EpubEngine({ book, location, onLocationChange }) {
  const webViewRef = useRef<WebView>(null);

  // Gesture handler wraps the WebView
  const swipeGesture = Gesture.Pan()
    .onEnd((e) => {
      if (e.translationX < -50) nextPage();
      if (e.translationX > 50) prevPage();
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      <WebView
        ref={webViewRef}
        source={{ html: shelfyReaderHTML }}
        onMessage={handleBridgeMessage}
        injectedJavaScript={shelfyReaderBootstrap}
        style={{ flex: 1 }}
      />
    </GestureDetector>
  );
}
```

**Shelfy-reader library integration:**
- Keep all parsing code as-is (`epub.ts`, `mobi.ts`, `fb2.ts`)
- Keep the paginator (`paginator.ts`), view (`view.ts`), and overlayer (`overlayer.ts`)
- Bundle the entire `shelfy-reader` lib into a single HTML file loaded by the WebView
- The WebView has a full browser engine (Chrome/Safari), so all DOM APIs the lib depends on work natively
- Communication via `window.ReactNativeWebView.postMessage()`
- Remove all direct DOM event listeners from React side (handle in RN)

**Files in shelfy-reader that run inside WebView (unchanged):**
| File | Purpose | DOM Dependencies |
|---|---|---|
| `epub.ts` | EPUB ZIP/OPF/NCX parsing | `DOMParser`, `querySelector` |
| `mobi.ts` | MOBI/AZW3 binary parsing | `DOMParser` |
| `fb2.ts` | FB2 XML parsing | `DOMParser`, `createElement` |
| `paginator.ts` | CSS column page layout | Heavy DOM (61 usages) |
| `view.ts` | Main rendering view | `createElement`, iframe |
| `overlayer.ts` | Highlight rendering | SVG DOM |
| `epubcfi.ts` | CFI location system | Minimal DOM |
| `search.ts` | Full-text search | Text node walking |
| `tts.ts` | TTS word marking | DOM traversal |
| `page-curl.ts` | Page flip animation | Canvas/CSS |
| `fixed-layout.ts` | Fixed-layout EPUB/comics | Heavy DOM |
| `comic-book.ts` | CBZ/CBR image extraction | Minimal (Blob/URL) |
| `progress.ts` | Reading time estimation | None (pure logic) |

### 7.4 PDF Engine (Native)

Replace PDF.js canvas rendering with a native PDF renderer:

**Option A: `react-native-pdf` (recommended for v1)**
- Uses native Android `PdfRenderer` and iOS `PDFKit`
- Built-in page navigation, zoom, search
- Highlight support via overlay views

**Option B: Custom native module with PSPDFKit**
- Commercial license but best-in-class
- Built-in annotations, search, form filling
- Worth evaluating if the app monetizes

```tsx
function PdfEngine({ filePath, page, onPageChange }) {
  return (
    <Pdf
      source={{ uri: filePath }}
      page={page}
      onPageChanged={(page, total) => onPageChange(page, total)}
      onLoadComplete={(pages) => setTotalPages(pages)}
      enablePaging={true}
      horizontal={true}
      style={{ flex: 1 }}
    />
  );
}
```

**Highlight overlay:**
- PDF highlights stored as `{ page, rects: [{x, y, w, h}], color }` (same schema as current)
- Render highlight rects as absolute-positioned `View` components over the PDF page
- Tap on highlight to show edit/delete menu

### 7.5 Comic Engine (Native Images)

Replace shelfy-reader comic rendering with native image views for better performance:

```tsx
function ComicEngine({ pages, currentPage, onPageChange }) {
  return (
    <FlatList
      data={pages}
      horizontal
      pagingEnabled
      renderItem={({ item }) => (
        <Image
          source={{ uri: item.uri }}
          style={{ width: screenWidth, height: screenHeight }}
          contentFit="contain"
        />
      )}
      onMomentumScrollEnd={(e) => {
        const page = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
        onPageChange(page);
      }}
    />
  );
}
```

- Pinch-to-zoom via `react-native-gesture-handler` + `react-native-reanimated`
- Pre-extract images from CBZ/CBR on import (store as individual files)
- Much better performance than rendering in a WebView

### 7.6 Text/HTML/Markdown Engine

Simple content goes through WebView with sanitized HTML:

```tsx
function TextEngine({ htmlContent, theme }) {
  const styledHTML = wrapWithThemeCSS(htmlContent, theme);
  return (
    <WebView
      source={{ html: styledHTML }}
      onMessage={handleScrollProgress}
      style={{ flex: 1 }}
    />
  );
}
```

### 7.7 Common Reader Interface

All engines implement the same ref interface (simplified from current 40+ method `ReaderEngineRef`):

```typescript
interface ReaderEngineRef {
  // Navigation
  goToNext(): void;
  goToPrev(): void;
  goToLocation(location: string): void;
  goToChapter(href: string): void;

  // State
  getCurrentLocation(): ReaderLocation;
  getProgress(): ReaderProgress;
  getTOC(): Chapter[];

  // Search
  search(query: string): Promise<SearchResult[]>;
  clearSearch(): void;

  // Highlights
  addHighlight(cfi: string, color: string): void;
  removeHighlight(id: string): void;

  // Settings
  applyTheme(theme: ReaderTheme): void;
  setFontSize(size: number): void;
}
```

---

## 8. Phase 5: Reader UI & Features

### 8.1 Reader Toolbar

Replace Ionic toolbar with a custom animated overlay:

```tsx
function ReaderToolbar({ visible, book, progress }) {
  const translateY = useSharedValue(visible ? 0 : -100);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : -100, { duration: 200 });
  }, [visible]);

  return (
    <Animated.View style={[styles.toolbar, { transform: [{ translateY }] }]}>
      <Pressable onPress={goBack}>
        <ChevronLeft />
      </Pressable>
      <Text numberOfLines={1}>{book.title}</Text>
      <BookmarkButton />
    </Animated.View>
  );
}
```

### 8.2 Feature Migration

| Feature | Current Implementation | RN Implementation |
|---|---|---|
| **Tap zones** | Touch events in iframe | `GestureDetector` wrapping engine |
| **Swipe nav** | `useSwipeGesture` hook | `Gesture.Pan()` from RNGH |
| **Text selection** | iframe `selectionchange` event | WebView `onMessage` bridge |
| **Highlights** | CSS overlay in iframe | WebView overlay + native highlight list |
| **Bookmarks** | CFI/page stored in SQLite | Same data, new UI |
| **TTS** | Web Speech API | `expo-speech` or `react-native-tts` |
| **Search** | Format-specific search | Same logic, new results UI |
| **Settings panel** | `IonModal` with breakpoints | `@gorhom/bottom-sheet` |
| **Dictionary** | API call + `IonModal` | API call + bottom sheet |
| **Translation** | ML Kit via Capacitor | `react-native-mlkit-translate` |
| **Sleep timer** | Zustand store + setTimeout | Same logic (transfers directly) |
| **RSVP reader** | Custom modal | Custom RN modal |
| **Reading ruler** | CSS overlay | Animated `View` overlay |
| **Brightness gesture** | Capacitor screen-brightness | `expo-brightness` |
| **Pomodoro timer** | Zustand store + setInterval | Same logic |
| **Page curl animation** | CSS page-curl in shelfy-reader | `react-native-reanimated` or keep in WebView |

### 8.3 Text Selection & Highlights

The text selection flow needs careful handling across the WebView bridge:

```
WebView (shelfy-reader):
  1. User long-presses text
  2. Native selection API activates
  3. JS captures selection range + CFI
  4. postMessage({ type: 'selection', text, cfi, rect })

React Native:
  1. onMessage receives selection data
  2. Show floating menu at rect position (above WebView)
  3. User taps "Highlight" → color picker
  4. postMessage back to WebView to render highlight
  5. Save to SQLite
```

---

## 9. Phase 6: Cloud, Sync & Social Features

### 9.1 Firebase

Replace `firebase` web SDK with `@react-native-firebase`:

```
Current:                                Target:
firebase/auth                        → @react-native-firebase/auth
firebase/firestore                   → @react-native-firebase/firestore
firebase/storage                     → @react-native-firebase/storage
```

Benefits: Native Firebase SDK is faster, supports offline persistence out of the box, and reduces bundle size.

### 9.2 Cloud Sync Services

| Service | Changes Needed |
|---|---|
| Calibre-Web | Replace `CapacitorHttp` with `fetch`. Otherwise unchanged. |
| OPDS | Replace `CapacitorHttp` with `fetch`. XML parsing unchanged. |
| Dropbox | `dropbox` npm package works in RN. Swap auth flow to use `expo-auth-session`. |
| WebDAV | `webdav` npm package may need RN-compatible HTTP adapter. |
| Hardcover | Replace `CapacitorHttp` with `fetch`. |

### 9.3 WebTorrent / P2P

WebTorrent requires Node.js APIs (TCP sockets, UDP for DHT) that don't exist in React Native. Options:

1. **Drop P2P** — Simplest. Few users likely use this.
2. **Web-only via Expo Web** — Keep WebTorrent for the browser build only.
3. **Native torrent library** — Use a native BitTorrent library via a custom native module. High effort.

**Recommendation:** Drop P2P for the initial RN release. Re-evaluate based on user demand.

---

## 10. Phase 7: Platform-Specific & Polish

### 10.1 Android

- Keep `com.shelfyreader.app` package name
- Migrate signing config to EAS Build (`eas.json`)
- App icon: reuse existing `icon.png` assets
- Splash screen: `expo-splash-screen` with same `#2C5F8A` background
- Status bar: `expo-status-bar` (translucent in reader)
- `minSdkVersion: 24` (same as current)

### 10.2 iOS (New)

- Bundle ID: `com.shelfyreader.app`
- App Store assets: icon (1024x1024), screenshots
- Haptics: `expo-haptics` (already cross-platform)
- Safe area handling: `react-native-safe-area-context`
- File import: `UIDocumentPickerViewController` via `expo-document-picker`

### 10.3 Performance Optimization

- **Hermes engine**: Enabled by default in Expo (faster JS execution)
- **FlashList**: For all long lists (library, search results, highlights)
- **Image caching**: `expo-image` with memory + disk cache
- **Lazy screens**: Use `React.lazy()` + `Suspense` for non-tab screens
- **WebView preloading**: Keep reader WebView warm in background

---

## 11. Phase 8: Testing, CI/CD & Release

### 11.1 Testing

| Type | Current | Target |
|---|---|---|
| Unit tests | Vitest | Jest (Expo default) + React Native Testing Library |
| E2E tests | Cypress | Detox (native) or Maestro (simpler) |
| Component tests | None | React Native Testing Library |

Existing test logic (assertions, mocks) transfers. Test harness changes.

### 11.2 CI/CD

Replace current GitHub Actions workflows:

```yaml
# .github/workflows/build.yml
- name: Build Android
  uses: expo/expo-github-action@v8
  with:
    eas-version: latest
    command: eas build --platform android --profile preview

- name: Build iOS
  uses: expo/expo-github-action@v8
  with:
    command: eas build --platform ios --profile preview
```

EAS Build handles:
- Android signing (secrets stored in EAS, not GitHub)
- iOS provisioning profiles
- OTA updates for JS-only changes
- Build artifact hosting

### 11.3 Web Support

If browser support is still needed, use **Expo Web** (`npx expo start --web`):
- Renders to DOM via `react-native-web`
- Most RN components work on web
- WebTorrent can be re-enabled for web only
- Deploy to GitHub Pages as before

---

## 12. Reader Component Improvements

Beyond the migration, these are targeted improvements to the reader experience:

### 12.1 Performance Improvements

1. **Preloaded page transitions**: Keep prev/next pages rendered in offscreen WebViews. Page turns become instant (swap visibility, not re-render).

2. **Background book parsing**: Parse EPUB structure on import, cache chapter HTML in SQLite. Opening a book loads pre-parsed content instead of re-parsing the ZIP.

3. **Progressive loading for large PDFs**: Render current page + 2 adjacent pages. Load more on demand. Current PDF.js loads entire document.

4. **Image optimization for comics**: Resize comic pages to screen resolution on import. Store thumbnails separately for fast grid display.

### 12.2 UX Improvements

1. **Native page turn animations**: Use `react-native-reanimated` for smooth page curl, slide, or fade transitions. Current CSS-based curl is janky.

2. **Proper dual-pane layout**: On tablets, show two pages side-by-side using native split views. Current CSS column approach breaks with some EPUB layouts.

3. **Reading position sync indicator**: Visual feedback when position syncs to cloud. Current sync is silent.

4. **Improved text selection**: Native text selection UX (magnifier loupe on iOS, handles on Android) instead of custom iframe selection.

5. **Vertical scrolling mode**: Option for continuous vertical scroll (like manga readers) for EPUB. Currently EPUB is paginated only.

6. **Quick bookmark gesture**: Swipe down from top-right corner to bookmark (native gesture, not tap zone).

### 12.3 New Reader Features

1. **Reading position heat map**: Show which sections have been re-read most. Store per-paragraph view counts.

2. **Smart page break**: Avoid breaking pages mid-paragraph or mid-sentence. Analyze content boundaries for cleaner pagination.

3. **Annotation export**: Export all highlights and notes as Markdown, JSON, or Readwise-compatible format.

4. **Image viewer**: Tap images in EPUB to view full-screen with pinch-zoom. Currently images are inline-only.

5. **Footnote popup**: Show footnotes as inline popups instead of navigating away. Common in academic books.

6. **Multi-book view**: Split screen with two books open simultaneously (tablet only).

### 12.4 Accessibility Improvements

1. **VoiceOver / TalkBack support**: Ensure all reader controls are accessible. Label buttons, announce page changes.

2. **Dynamic type**: Respect system font size preferences. Scale reader chrome (toolbar, menus) accordingly.

3. **High contrast mode**: Detect system accessibility settings and apply appropriate theme.

4. **Reduced motion**: Disable page turn animations when system prefers reduced motion.

---

## 13. Component Migration Map

### Pages (15 screens)

| Current (Ionic) | Target (React Native) | Complexity |
|---|---|---|
| `Library.tsx` (IonPage, IonGrid, IonFab, IonModal) | `library.tsx` (SafeAreaView, FlashList, FAB, BottomSheet) | High |
| `Reader.tsx` (format dispatcher) | `[bookId].tsx` (same logic, new components) | Critical |
| `Settings.tsx` (IonList, IonToggle, IonSelect) | `settings.tsx` (SectionList, Switch, Picker) | Medium |
| `Browse.tsx` | `browse.tsx` (FlatList, Image) | Medium |
| `Statistics.tsx` (recharts) | `statistics.tsx` (victory-native) | Medium |
| `OPDSBrowser.tsx` | `catalogs.tsx` (FlatList) | Medium |
| `CalibreWebSettings.tsx` | `calibre-web.tsx` (form inputs) | Low |
| `CloudSyncSettings.tsx` | `cloud-sync.tsx` (form inputs) | Low |
| `ReadingGoals.tsx` | `reading-goals.tsx` (charts, inputs) | Medium |
| `SearchBooks.tsx` | `search.tsx` (TextInput, FlatList) | Low |
| `YearInReview.tsx` | `year-in-review.tsx` (charts, animations) | Medium |

### Reader Components (20+ components)

| Component | Migration Approach |
|---|---|
| `UnifiedReaderContainer.tsx` (45KB) | Rewrite as `ReaderContainer.tsx` with RN components |
| `FoliateEngine.tsx` (47KB) | Rewrite as `EpubEngine.tsx` with WebView bridge |
| `PdfEngineWithHighlights.tsx` (23KB) | Rewrite with `react-native-pdf` + highlight overlay |
| `ScrollEngine.tsx` (15KB) | Rewrite as `TextEngine.tsx` with WebView |
| `ReadingSettingsPanel.tsx` | Bottom sheet with RN form controls |
| `TextSelectionMenu.tsx` | Floating `View` positioned via selection rect |
| `ReaderSearch.tsx` | Header search bar + FlatList results |
| `BookmarksPanel.tsx` | Bottom sheet with FlatList |
| `HighlightsPanel.tsx` | Bottom sheet with FlatList |
| `ChapterScrubber.tsx` | Bottom sheet with SectionList (TOC) |
| `TTSControls.tsx` | Floating player bar (like Spotify mini-player) |
| `SleepTimer.tsx` | Modal with countdown display |
| `DictionaryPanel.tsx` | Bottom sheet |
| `TranslationPanel.tsx` | Bottom sheet |
| `TimeLeftDisplay.tsx` | Overlay text (same logic) |
| `RSVPReader.tsx` | Full-screen modal |
| `PomodoroTimer.tsx` | Modal |
| `ReadingRuler.tsx` | Animated View overlay |

---

## 14. Service Layer Migration

### Direct Transfer (No/Minimal Changes)

These services operate on data structures and don't touch the DOM:

- `metadataLookupService.ts` — HTTP calls + data mapping
- `annotationsService.ts` — CRUD wrapper
- `searchService.ts` — Text search algorithms
- `dictionaryService.ts` — API client
- `smartShelvesService.ts` — Filter/sort logic
- `spacedRepetitionService.ts` — Algorithm
- `badgesService.ts` — Achievement logic
- `quoteCardService.ts` — Text extraction
- `bookImportService.ts` — Metadata extraction (needs file read adapter)

### Moderate Changes (Swap Platform APIs)

- `database.ts` — Swap Capacitor SQLite for expo-sqlite
- `webFileStorage.ts` → `fileStorage.ts` — Swap IndexedDB for expo-file-system
- `calibreWebService.ts` — Swap CapacitorHttp for fetch
- `opdsService.ts` — Swap CapacitorHttp for fetch
- `hardcoverService.ts` — Swap CapacitorHttp for fetch
- `translationService.ts` — Swap Capacitor ML Kit for RN ML Kit
- `backupService.ts` — Swap Firebase web SDK for RN Firebase
- `cloudSyncService.ts` — Adapt file operations

### Major Changes / Rewrite

- `torrentService.ts` — Drop or web-only
- `watchFolderService.ts` — Use `expo-file-system` directory watching (if available) or drop
- `themeService.ts` — Complete rewrite for RN styling

### Delete (No Longer Needed)

- Web-specific localStorage fallbacks in `database.ts`
- `Capacitor.isNativePlatform()` branching (always native)
- Vite-specific node polyfills config
- Ionic CSS imports

---

## 15. Risk Assessment & Mitigations

### High Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **EPUB rendering quality** in WebView differs from iframe-in-Ionic | Book layout may break for some EPUBs | Extensive testing with diverse EPUB files. Keep shelfy-reader paginator logic. Test with fixed-layout EPUBs, RTL text, MathML. |
| **WebView ↔ RN communication latency** for text selection, page turns | Perceived lag on interactions | Batch messages, debounce non-critical updates. Handle gestures in RN layer, not WebView. |
| **expo-sqlite migration** from Capacitor SQLite | Data loss or schema incompatibility | Write migration tool. Test with real user databases. Keep schema identical. |
| **Feature parity takes longer than expected** | Delays release | Prioritize core reading experience. Launch with 80% features, add rest incrementally. |

### Medium Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **NativeWind** styling doesn't cover all UI needs | Fall back to StyleSheet | Have StyleSheet as escape hatch. NativeWind covers 90% of cases. |
| **react-native-pdf** lacks features | Missing search, annotations | Evaluate alternatives early. PSPDFKit as fallback (paid). |
| **Expo managed workflow limitations** | Need to eject for custom native modules | Use Expo config plugins first. Eject only if absolutely necessary. |
| **iOS App Store review** | Rejection for content policies (book downloads) | Comply with guidelines. No in-app purchases for free content. |

### Low Risk

| Risk | Impact | Mitigation |
|---|---|---|
| Zustand store migration | Minimal — already RN compatible | Swap persistence adapter only |
| TypeScript types | Zero impact — platform independent | Copy as-is |
| Service layer logic | Low — mostly platform-agnostic | Adapter pattern for platform APIs |

---

## 16. Estimated Scope

### Phase Breakdown

| Phase | Description | Key Deliverables |
|---|---|---|
| **Phase 1** | Scaffolding & infrastructure | Expo project, DB layer, file storage, Zustand stores |
| **Phase 2** | Navigation & theming | Tab navigator, theme system, app shell |
| **Phase 3** | Library & book management | Library grid/list, import, metadata, search |
| **Phase 4** | Reader engine redesign | EPUB, PDF, Comic, Text engines |
| **Phase 5** | Reader UI & features | Toolbar, settings, highlights, bookmarks, TTS, search |
| **Phase 6** | Cloud & sync | Firebase, Calibre-Web, OPDS, Dropbox, WebDAV |
| **Phase 7** | Platform polish | Android/iOS specifics, performance, accessibility |
| **Phase 8** | Testing & release | Jest, Detox/Maestro, EAS Build, CI/CD |

### Feature Priority for Initial Release

**Must Have (v1.0):**
- Library with grid/list view, import, search
- EPUB reader with pagination, bookmarks, highlights
- PDF reader with page navigation
- Reading progress persistence
- Theme switching (light, dark, sepia)
- Basic settings (font size, line height, margins)
- SQLite database with full schema

**Should Have (v1.1):**
- TTS (text-to-speech)
- MOBI/AZW3 support (via EPUB conversion)
- CBZ/CBR comic reader
- Reading statistics
- Collections and tags
- Cloud backup (Firebase)

**Nice to Have (v1.2+):**
- Calibre-Web sync
- OPDS catalog browsing
- Translation
- Dictionary
- Sleep timer, Pomodoro
- Smart shelves
- Reading goals
- Year in review
- RSVP reader
- Hardcover.app integration

**Deferred:**
- WebTorrent P2P sharing
- Watch folder auto-import
- Biometric lock
- Expo Web (browser) support

---

## Appendix: File Structure (Target)

```
shelfy-reader/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── library.tsx
│   │   ├── browse.tsx
│   │   ├── catalogs.tsx
│   │   └── settings.tsx
│   ├── reader/
│   │   └── [bookId].tsx
│   ├── statistics.tsx
│   ├── calibre-web.tsx
│   ├── cloud-sync.tsx
│   ├── reading-goals.tsx
│   ├── search.tsx
│   └── year-in-review.tsx
├── src/
│   ├── components/
│   │   ├── library/              # Library UI components
│   │   ├── reader/               # Reader engines & UI
│   │   │   ├── engines/
│   │   │   │   ├── EpubEngine.tsx
│   │   │   │   ├── PdfEngine.tsx
│   │   │   │   ├── ComicEngine.tsx
│   │   │   │   └── TextEngine.tsx
│   │   │   ├── ui/
│   │   │   │   ├── ReaderContainer.tsx
│   │   │   │   ├── ReaderToolbar.tsx
│   │   │   │   ├── SettingsSheet.tsx
│   │   │   │   ├── SearchOverlay.tsx
│   │   │   │   ├── HighlightMenu.tsx
│   │   │   │   └── ...
│   │   │   └── webview/
│   │   │       ├── reader.html    # WebView HTML bundle
│   │   │       └── bridge.ts      # postMessage protocol
│   │   ├── common/               # Shared UI components
│   │   └── settings/             # Settings screen components
│   ├── db/
│   │   ├── connection.ts         # expo-sqlite setup
│   │   ├── schema.ts             # 19-table schema (unchanged)
│   │   ├── migrations.ts
│   │   └── repositories/        # Domain repositories
│   ├── hooks/                    # Custom hooks (adapted)
│   ├── libs/
│   │   └── shelfy-reader/        # Our own book parsing/rendering lib (bundled into WebView)
│   ├── services/                 # Business logic services
│   ├── stores/                   # Zustand stores (adapted persistence)
│   ├── theme/
│   │   ├── themes.ts             # Theme definitions
│   │   ├── ThemeProvider.tsx
│   │   └── tailwind.config.ts    # NativeWind config
│   ├── types/                    # TypeScript types (unchanged)
│   └── utils/                    # Utility functions
├── assets/                       # Images, fonts, icons
├── android/                      # Native Android project (if ejected)
├── ios/                          # Native iOS project (if ejected)
├── app.config.ts                 # Expo config
├── eas.json                      # EAS Build config
├── tailwind.config.js            # NativeWind/Tailwind
├── tsconfig.json
└── package.json
```
