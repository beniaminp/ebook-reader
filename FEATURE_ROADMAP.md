# Feature Roadmap — Ebook Reader App

> Compiled from competitive research across Kindle, Apple Books, Kobo, Moon+ Reader, Google Play Books, Libby, Readwise, Fable, StoryGraph, KOReader, Calibre, Speechify, and more.
>
> Date: 2026-02-28

---

## Table of Contents

1. [Reading Experience](#1-reading-experience)
2. [Annotations & Knowledge Management](#2-annotations--knowledge-management)
3. [Library Management & Organization](#3-library-management--organization)
4. [Productivity, AI & Advanced Features](#4-productivity-ai--advanced-features)

---

## 1. Reading Experience

### 1.1 Typography & Layout

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Hyphenation Control** | Automatic word hyphenation at line breaks to prevent wide gaps in justified text ("rivers" effect) | Kobo, Kindle Enhanced Typesetting, Apple Books |
| **Kerning & Letter Spacing** | Fine-grained control over character spacing via a slider in the typography panel | Kindle Enhanced Typesetting, Apple Books, Kobo TypeGenius |
| **Word Spacing Control** | Dedicated slider for adjusting inter-word spacing, separate from letter spacing. Helpful for dyslexic readers | Apple Books, Libby, Kindle |
| **Paragraph Spacing Control** | Independent control of space above/below paragraphs (currently only line height is exposed) | Apple Books, Kobo, Kindle |
| **Two-Column Layout** | In landscape/tablet mode, render text in two columns to reduce excessive line length | Apple Books (iPad), Kindle Scribe, Google Play Books |
| **Column Width / Max Line Length** | Cap the maximum readable column width (60-75 chars/line) on large screens | Kobo, Readwise Reader |
| **Drop Caps** | Render decorative enlarged first letter of chapters from EPUB metadata | Kindle Enhanced Typesetting, Apple Books |
| **Font Weight / Bold Intensity** ✅ | Slider (100-900) to increase/decrease font weight without switching font families | Moon+ Reader Pro, Kobo TypeGenius |
| **Typography Presets / Profiles** | Named, saveable profiles (e.g., "Night Comfort", "Speed Reading", "Dyslexia Friendly") that bundle font, spacing, and color settings | Kobo, Apple Books (page themes) |
| **Custom CSS Injection** ✅ | Allow advanced users to inject custom CSS to override EPUB rendering | KOReader, Moon+ Reader Pro |

### 1.2 Reading Modes

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Page Curl Animation** ✅ | Realistic 3D page-curl effect as a transition option (interactive drag + animated tap) | Apple Books, Kindle Paperwhite 5, Moon+ Reader Pro |
| **Scroll with Snap-to-Paragraph** | In scroll mode, snap to the nearest paragraph boundary when the user lifts their finger | Readest, Google Play Books |
| **Immersive Full-Screen Mode** ✅ | Hide all OS chrome (status bar, nav bar, header/footer), leaving only text. Single tap to reveal UI | Moon+ Reader Pro, Google Play Books, Apple Books |
| **Sleep Timer** ✅ | Auto-stop reading session and TTS after a set duration (15/30/45/60 min) | Kindle (2024), Libby, Moon+ Reader Pro |
| **Scheduled Blue Light Shift** | Auto-adjust blue-light filter intensity based on time of day (cool→warm), like f.lux | Kobo ComfortLight PRO, Apple Night Shift, Google Play Books |
| **RSVP Speed Reading Mode** | Display one word at a time at configurable WPM for rapid reading without eye movement | Reedy, Outread, Glance, Librera |

### 1.3 Navigation

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Time Left in Chapter/Book** ✅ | Display estimated reading time remaining, calculated from user's measured reading speed | Kindle, Kobo, Apple Books |
| **Reading Speed Calibration** | Explicit calibration step or auto-calibrate over first pages to measure user's WPM | Kindle, Kobo |
| **Chapter Thumbnail Navigation** | Visual grid/strip of chapter thumbnails for quick visual scanning | Apple Books, Google Play Books |
| **Smart Return-to-Reading** | "Welcome back" prompt with context snippet after an extended break, showing last paragraph read | Kindle |
| **Scrubber with Chapter Markers** | Horizontal progress bar showing chapter boundaries as draggable markers | Apple Books, Kindle, Kobo |
| **Cross-Device Position Sync** | Cloud sync for reading position, bookmarks, and highlights across devices | Kindle Whispersync, Kobo Sync, Apple Books iCloud |
| **Furthest-Read Tracking** | Track both current position AND furthest page reached; prevent accidental progress overwrite | Kindle, Kobo |
| **Estimated Completion Date** | "At your current pace, you'll finish this book on [date]" | Kindle, Kobo Reading Life |

### 1.4 Accessibility

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **TTS Word-Level Highlighting** | Highlight the current word being spoken in the rendered text, synchronized with TTS audio | Kindle Assistive Reader (2025), Apple Books, Libby |
| **TTS Auto-Scroll** | Automatically scroll the page to keep the currently spoken sentence visible | Apple Books, Kindle Assistive Reader |
| **Dyslexia Layout Preset** | One-tap preset: OpenDyslexic + increased letter/word/line spacing + left-align + short column | Libby, Kobo |
| **Line Focus / Active Line Highlight** ✅ | Highlight the current line being read while dimming adjacent content, moving as user reads | Microsoft Immersive Reader, Readest |
| **Color Vision Deficiency Filters** | Protanopia, deuteranopia, tritanopia color filters for the reading surface | Apple Books, KOReader |
| **Global Bold Toggle** | Apply `font-weight: bold` globally independent of font family for low-vision users | Kindle, Kobo TypeGenius, Moon+ Reader |
| **AI Voices for TTS** | Supplement Web Speech API with AI neural voices (ElevenLabs/OpenAI TTS) for natural narration | Speechify (200+ voices, 60+ languages) |

---

## 2. Annotations & Knowledge Management

### 2.1 Enhanced Annotations

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Semantic Highlight Labels** | Map each highlight color to a user-defined meaning (e.g., yellow="important", red="disagree") with filtering | Kindle Colorsoft, Kobo Colour, Readwise Reader |
| **Inline Margin Notes** ✅ | Margin icons for notes anchored to highlights; tap to expand without leaving the page | Kindle, Moon+ Reader Pro, Apple Books |
| **Freehand Drawing Layer** | Finger/stylus sketching, circling, underlining over pages (EPUB and PDF) | Kindle Scribe, Moon+ Reader Pro, GoodNotes |
| **Annotation Tags** | Custom reusable tags (`#metaphor`, `#research`, `#to-review`) filterable in a global annotation view | Readwise Reader, Hypothesis |
| **Highlight Importance Rating** | 1-5 star rating per highlight to feed into spaced repetition review | Readwise |
| **Rich Text / Markdown Notes** | Support bold, italic, bullet lists, headings, and inline links in annotation notes | Readwise Reader, Notability |
| **Page Region Screenshot** | Select a rectangular region (diagram, chart) and save as an image annotation | Moon+ Reader Pro, GoodNotes, Xodo |
| **Quote Sharing Cards** | Generate styled image cards from highlights (cover + quote + author) for social media sharing | Kindle, Moon+ Reader, Fable |

### 2.2 Dictionary & Translation

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Wikipedia Inline Lookup** | Long-press proper nouns to show Wikipedia summary panel alongside dictionary definition | Kindle, Kobo, Moon+ Reader Pro |
| **X-Ray Character/Entity Index** | Auto-generated index of all characters, places, and terms with all occurrences and descriptions | Kindle X-Ray |
| **Bilingual / Interlinear Mode** ✅ | Side-by-side or interleaved original + translated text for language learners | Google Play Books, Beelinguapp, LingQ |
| **Offline Dictionary Bundles** | Downloadable StarDict/Wiktionary packs for offline word lookup without internet | Moon+ Reader Pro, Kobo, KOReader |
| **Context-Aware Vocabulary Quizzes** | Quiz with the original book sentence as context: fill-in-the-blank with the looked-up word | LingQ, Kindle Vocabulary Builder, Readwise |

### 2.3 Knowledge Management

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Spaced Repetition Daily Review** | Surface a configurable number of past highlights daily using SM-2 algorithm; dedicated "Daily Review" screen | Readwise |
| **Flashcard Generation** | Convert highlights to cloze-deletion flashcards; exportable to Anki (`.apkg`) format | Readwise, Kindle Vocabulary Builder |
| **Vocabulary Quiz / Review Mode** | Quiz mode for saved dictionary words (definition→word, word→definition, fill-in-sentence) | Kindle Vocabulary Builder, Kobo, LingQ |
| **Global Annotation Search** | Search highlight text, notes, and bookmarks across ALL books simultaneously | Readwise, Moon+ Reader Pro, Kindle |
| **Note Linking / Cross-Book References** | `[[wiki-style links]]` in notes to reference other highlights, books, or notes; builds knowledge graph | Readwise Reader, Obsidian |
| **AI "Ask This Book"** | Natural-language Q&A about book content, spoiler-aware (uses only content already read) | Kindle (2025), Readwise |
| **AI Reading Recaps / "Story So Far"** | Spoiler-free AI summary of events up to current position for re-orientation after a break | Kindle Scribe (2025) |

### 2.4 Export Integrations

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Readwise Integration** | Export highlights/bookmarks directly to Readwise via API for automated review pipeline | Kobo (official), Kindle (via scraper) |
| **Obsidian Export** | Markdown files formatted for Obsidian vault (book title heading, highlights as bullets, tags) | Readwise Obsidian plugin, BookFusion |
| **Notion Database Export** | Push book metadata, progress, highlights to a Notion database via API | Readwise |
| **Annotation Export to Markdown/CSV** ✅ | Per-book or whole-library export in Markdown, CSV, or Anki format | KOReader, Kobo (2025), Kindle |

---

## 3. Library Management & Organization

### 3.1 Organization

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Smart / Dynamic Shelves** | Rules-based shelves that auto-populate by format, status, rating, genre, date added, or author | BookShelves, BookLore, Libby |
| **Series Grouping & Browse** | Dedicated "Series" view grouping multi-book series under a single cover with progress tracking | Kobo, Calibre, Moon+ Reader |
| **Author Browse View** | Browsable "Authors" list with book counts and grouped books per author | Calibre, Google Play Books, Apple Books |
| **Genre / Subject Browse** | Browse-by-genre view derived from metadata genres with auto-grouped sub-shelves | Calibre, Google Play Books, Kindle |
| **"Did Not Finish" (DNF) Status** | Dedicated read status beyond unread/reading/finished for abandoned books | StoryStack, Bookly, Goodreads, Moon+ Reader |
| **Drag-and-Drop Manual Ordering** | Manually reorder books within a collection by long-press-and-drag | Apple Books, Kindle Collections, Kobo |
| **"Want to Read" Wishlist** | Wishlist for books not yet imported (title, author, ISBN/URL); auto-matched when imported | Libby, Goodreads, Apple Books, Google Play Books |

### 3.2 Metadata Management

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Auto Cover Art Fetch** | Bulk auto-fetch covers for newly imported books; "Fix missing covers" batch action | Calibre, Kobo, BookLore |
| **Bulk Metadata Edit** | Multi-select books and apply shared metadata (genre, rating, series, language) in one step | Calibre, Google Play Books |
| **Star Ratings in Library View** ✅ | Visible 1-5 star rating widget on book cards/list items with "sort by rating" option | Calibre, Moon+ Reader, Google Play Books |
| **ISBN Barcode Scanner** | Camera-based ISBN scan to auto-populate metadata for sideloaded books | Bookshelf, Bookmory |
| **Custom Metadata Fields** | User-defined key-value pairs (e.g., "Location: Box 3", "Lent to: John") | Calibre (custom columns), BookLore |
| **Metadata Conflict Resolution** | Side-by-side comparison when fetched metadata differs from embedded EPUB metadata | Calibre |

### 3.3 Search & Discovery

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Full-Text Search Across Library** | Search for words/phrases inside all book contents, not just title/author metadata | Calibre (plugin), Google Play Books |
| **Advanced Composable Filters** | Combine multiple filters simultaneously (format AND status AND genre AND rating) | Calibre, Libby, Moon+ Reader |
| **Search Within Collection** | Scope search bar to the current collection/tag rather than the whole library | Apple Books, Kindle Collections, Kobo |
| **"Recently Finished" View** | Virtual smart view surfacing books finished in the last 30/90 days | Google Play Books, Kobo Reading Life, Libby |
| **"Similar Books" Suggestions** ✅ | "Find similar" action that opens OPDS pre-filtered by same author/genre | Kindle, Google Play Books, Kobo |

### 3.4 File Management

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Duplicate Detection** ✅ | Warn when importing a book that matches an existing title+author or file hash | Calibre, ReadEra |
| **Storage Size Display** | Show file size per book; add storage management screen with total usage and cleanup tools | Calibre, Moon+ Reader, Google Play Books |
| **Client-Side Format Conversion** | Basic in-app conversion (TXT→EPUB, EPUB→PDF) using existing parsers | Calibre, Moon+ Reader, Koodo Reader |
| **WebDAV / Nextcloud Sync** | Generic WebDAV source for browsing and importing books from self-hosted cloud | Moon+ Reader, KOReader, Koodo Reader |
| **Watch Folder / Auto-Import** | Monitor a local folder and auto-import new files dropped there | KOReader, Moon+ Reader, Calibre |
| **Selective Backup & Restore** | Backup only progress/annotations, only specific collections, or preview before restoring | Moon+ Reader, Calibre |

### 3.5 Import & Export

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Share Sheet / Intent Handler** | Register as handler for EPUB/PDF MIME types so files open from Downloads/email/browser | Moon+ Reader, KOReader, ReadEra |
| **"Send to Reader" via WiFi** | Companion mechanism to wirelessly send files (browser extension, email address, WiFi server) | Kindle Send-to-Kindle, Calibre content server |
| **Calibre WiFi Transfer Protocol** | Support Calibre's wireless device protocol for direct push from desktop Calibre | KOReader, Moon+ Reader |
| **Google Drive / Dropbox Import** | Native cloud storage picker to browse and import books from Google Drive, Dropbox, OneDrive | Moon+ Reader, Koodo Reader |
| **Goodreads / StoryGraph Sync** | Import Goodreads CSV for ratings/read dates/wishlist; export reading history | Kobo, Bookly, StoryGraph |
| **OPDS Server Mode** | Expose local library as a read-only OPDS feed on local network for other devices | Calibre, KOReader, Koodo Reader |

---

## 4. Productivity, AI & Advanced Features

### 4.1 AI-Powered Features

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **AI Chapter & Book Summaries** | AI-generated summaries at chapter end or on demand; spoiler-free "Story So Far" catch-up | Kindle "Story So Far" (2025), Blinkist |
| **Contextual Q&A ("Ask This Book")** | Highlight any passage and ask natural-language questions; answers cite relevant passages | Kindle "Ask This Book" (2025), Readwise |
| **AI-Generated Flashcards** | Auto-generate Q&A flashcard pairs from highlights for spaced repetition review | Readwise, RemNote, Voovo |
| **AI Highlight Suggestions** | ML-based auto-identification of passages worth highlighting as user reads | Readwise Reader |
| **AI Content Summarization on Import** | Auto-generate structured summary with key points when importing PDFs/articles | Blinkist AI, Readwise Reader |

### 4.2 Reading Productivity

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Pomodoro / Focus Timer** | Built-in 25-min focus blocks with break reminders; reading session timer | BookTrack |
| **Reading Goals & Annual Challenge** ✅ | Yearly book goal (e.g., "30 books in 2026") and daily minute goal with progress tracking | Apple Books, Goodreads Challenge, StoryGraph |
| **Reading Streaks** ✅ | Consecutive-day reading tracker with streak shields, milestones, and notifications | Apple Books, Kobo Reading Life, Bookly |
| **Reading Speed Calculator** ✅ | Real-time WPM measurement by tracking time elapsed vs. words scrolled | Speechify, Outread |
| **Comprehension Breaks / Quizzes** | Post-chapter comprehension questions (AI-generated or manual) | StreamRead |
| **Reading Badges / Achievements** | Visual badges for milestones ("First book", "100 hours", "Night Owl") | Kobo Reading Life Awards, Bookly |

### 4.3 Advanced Statistics

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Reading Heatmap (GitHub-style)** | Full-year calendar heatmap showing daily reading activity intensity | StoryGraph |
| **Per-Book Speed Analytics** | Average WPM, total sessions, fastest/slowest days, reading timeline per book | StoryGraph, BookTrack |
| **Mood & Genre Analytics** | Tag books by mood/genre; visualize reading patterns over time | StoryGraph |
| **Time-of-Day Distribution** | 24-hour chart showing when during the day the user reads most | Bookmory |
| **Vocabulary Growth Chart** | Cumulative words saved over time, correlated with books read | — |
| **Annual Year in Review** | Shareable year-end summary: total books, hours, top genre, longest streak, etc. | Apple Books (2025), Spotify Wrapped-style |
| **Reading History Timeline** ✅ | Chronological log of every session: book, date, duration, pages, start/end position | Kobo Reading Life, Libby Timeline |

### 4.4 Social Features

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Book Clubs / Shared Reading Groups** | Create/join groups for a book; see members' highlights, notes, and progress | Fable, Libby Reads |
| **Public / Popular Highlights** | Mark highlights as public; other readers see crowd-sourced underlines with reader counts | Kindle Popular Highlights |
| **Goodreads Integration** | OAuth login; auto-post reading status, ratings, and reviews to Goodreads | Kindle, Moon+ Reader Pro, Kobo |
| **Activity Feed** | Social feed showing friends' finished books, milestones, and shared quotes | Goodreads, Fable |
| **In-App Book Reviews & Ratings** ✅ | Post-finish prompt for star rating and written review, visible on library card | Google Play Books, Goodreads, Kobo |

### 4.5 Platform & Integration

| Feature | Description | Reference Apps |
|---------|-------------|----------------|
| **Home Screen Widgets** | Widget showing current book cover, progress %, daily goal ring, streak, or random highlight | BookTrack, BookFusion |
| **iOS Live Activity / Dynamic Island** | Show reading timer on lock screen and Dynamic Island | BookTrack |
| **Siri Shortcuts / Android App Shortcuts** | Voice commands: "Continue reading [book]", "Start a reading session" | Apple Books, Kindle |
| **"Continue Reading" Notification** | Daily scheduled reminder if daily reading goal not met, with deep link to current book | Apple Books, Kindle, Moon+ Reader |
| **RSS-to-Ebook / Read-It-Later Inbox** | Subscribe to RSS feeds or save web articles; convert to readable format in library | Readwise Reader, Wallabag, Matter |
| **Webhook / Zapier Integration** | Fire webhooks on events (finished book, added highlight) for automation pipelines | — (high community demand) |
| **Calibre-Web Annotation Sync** | Push highlights/bookmarks back to Calibre-Web server (currently read-only sync) | — |
| **Multi-Profile Support** | Multiple user profiles per app installation with separate libraries and settings | Moon+ Reader Pro |

---

## Priority Recommendations

### High Impact, Moderate Effort
1. ~~**Time Left in Chapter/Book**~~ ✅ — baseline user expectation from Kindle/Kobo
2. ~~**Reading Goals & Streaks**~~ ✅ — strong retention/engagement driver
3. ~~**Immersive Full-Screen Mode**~~ ✅ — key for focused reading
4. ~~**Sleep Timer**~~ ✅ — essential for bedtime reading with TTS
5. **TTS Word-Level Highlighting** — major accessibility improvement
6. **Series Grouping** — metadata fields already exist, just needs UI
7. **Smart Return-to-Reading** — reduces friction for casual readers
8. **Scrubber with Chapter Markers** — improves navigation significantly

### High Impact, Higher Effort
9. **Cross-Device Position Sync** — table-stakes for multi-device users
10. **AI "Ask This Book" / Summaries** — differentiating modern feature
11. **Spaced Repetition Review** — Readwise's core value proposition
12. **Readwise / Obsidian Integration** — appeals to PKM power users
13. **Full-Text Search Across Library** — requires content indexing
14. **Annual Year in Review** — shareable viral feature

### Quick Wins
15. **Hyphenation Control** — CSS `hyphens: auto` for EPUB
16. **Paragraph Spacing Control** — single CSS property
17. **Dyslexia Layout Preset** — bundle existing settings
18. **DNF Status** — minor DB/UI addition
19. **Duplicate Detection** — check on import
20. **Star Ratings in Library View** — metadata field already exists (DB field ✅, UI widget pending)

---

## Sources

- [Kindle Enhanced Typesetting](https://kdp.amazon.com/en_US/help/topic/G202087570)
- [Kindle Assistive Reader Update](https://www.pocket-lint.com/amazon-kindle-update-assistive-reader/)
- [Apple Books Features](https://support.apple.com/guide/books/)
- [Kobo eReader Features](https://help.kobo.com/hc/en-us/articles/360019127093)
- [Kobo ComfortLight PRO](https://help.kobo.com/hc/en-us/articles/360017481174)
- [Moon+ Reader Pro Guide](https://geekchamp.com/moon-reader-pro-the-complete-guide/)
- [Google Play Books Deep Dive](https://expertbeacon.com/google-play-books-in-2023-an-expert-deep-dive/)
- [Libby Features](https://resources.overdrive.com/library/libby-features/)
- [Kindle Sleep Timer](https://blog.the-ebook-reader.com/2024/04/03/kindle-ereaders-get-sleep-timer-with-latest-software-update/)
- [Kindle X-Ray](https://methodshop.com/amazon-kindle-x-ray/)
- [Kindle AI Features 2025](https://goodereader.com/blog/kindle/new-kindle-scribe-2025-has-useful-ai-features)
- [Kindle "Ask This Book"](https://writerbeware.blog/2025/12/12/kindles-new-gen-ai-powered-ask-this-book-feature-raises-rights-concerns/)
- [Kindle AI Recaps 2026](https://www.androidpolice.com/amazon-kindle-new-ai-catch-up-tools/)
- [Readwise](https://readwise.io/)
- [Readwise Obsidian Integration](https://docs.readwise.io/readwise/docs/exporting-highlights/obsidian)
- [Readwise Notion Integration](https://docs.readwise.io/readwise/docs/exporting-highlights/notion)
- [Readwise Reader AI](https://tutorialswithai.com/tools/readwise-reader/)
- [Kobo Annotation Export](https://blog.the-ebook-reader.com/2025/09/18/kobo-now-supports-exporting-annotations/)
- [Kobo Readwise Integration](https://help.kobo.com/hc/en-us/articles/10789206247703)
- [Fable Book Club App](https://bookriot.com/fable-book-club-app-review/)
- [BookFusion Obsidian Plugin](https://www.blog.bookfusion.com/introducing-the-bookfusion-obsidian-plugin-sync-epub-pdf-cbz-cbr-mobi-highlights-annotations-to-your-vault/)
- [Speechify Review](https://aifounderkit.com/ai-tools/speechify-review-features-pricing-alternatives/)
- [Apple Books Reading Goals](https://support.apple.com/guide/iphone/set-reading-goals-iph6013e96f4/ios)
- [Apple Books Year in Review](https://www.macobserver.com/news/apple-books-rolls-out-its-2025-year-in-review-with-reading-highlights/)
- [StoryGraph AI](https://skywork.ai/skypage/en/The-StoryGraph-An-AI-Powered-Deep-Dive-for-the-Modern-Reader/)
- [Calibre Documentation](https://manual.calibre-ebook.com/)
- [KOReader](https://github.com/koreader/koreader)
- [Blinkist AI](https://www.blinkist.com/magazine/posts/blinkist-pro)
- [Wallabag](https://openalternative.co/wallabag)
- [Libby Reads](https://company.overdrive.com/2025/09/25/introducing-libby-reads/)
- [Kindle Vocabulary Builder](https://www.pocket-lint.com/how-to-use-kindle-vocabulary-builder/)
- [BookLore](https://github.com/booklore-app/booklore)
