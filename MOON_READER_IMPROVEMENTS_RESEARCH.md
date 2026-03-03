# Moon+ Reader: User-Requested Improvements & Feature Gaps

> Comprehensive research compiled from Reddit, MobileRead Forums, XDA Developers, Google Play reviews, GitHub issues, Goodreads forums, comparison articles, and other sources. This document identifies what users most want from Moon+ Reader — and what our ebook reader can do better.

---

## Table of Contents

1. [CSS & EPUB Rendering](#1-css--epub-rendering)
2. [Annotation & Highlight Export](#2-annotation--highlight-export)
3. [Library Management & Organization](#3-library-management--organization)
4. [Cross-Device & Cross-Platform Sync](#4-cross-device--cross-platform-sync)
5. [Text-to-Speech (TTS)](#5-text-to-speech-tts)
6. [PDF Support](#6-pdf-support)
7. [Settings & UX Complexity](#7-settings--ux-complexity)
8. [Goodreads / Social Reading Integration](#8-goodreads--social-reading-integration)
9. [Reading Statistics](#9-reading-statistics)
10. [Navigation & Table of Contents](#10-navigation--table-of-contents)
11. [Calibre Integration](#11-calibre-integration)
12. [Typography & Justification](#12-typography--justification)
13. [RTL & Manga Support](#13-rtl--manga-support)
14. [Accessibility & Fonts](#14-accessibility--fonts)
15. [AI Features](#15-ai-features-emerging)
16. [Miscellaneous](#16-miscellaneous)
17. [Priority Ranking](#priority-ranking)
18. [Opportunities for Our Reader](#opportunities-for-our-reader)

---

## 1. CSS & EPUB Rendering

**Demand: VERY HIGH** — Most consistently reported complaint across all sources.

| Issue | Details | Sources |
|-------|---------|---------|
| Publisher CSS override | Moon Reader aggressively overrides publisher CSS when not in "Publisher View" mode. Default behavior replaces embedded styles. Users describe it as "wants to override every bloody thing." | MobileRead t=313546, Reddit |
| Embedded fonts ignored | OTF fonts not supported natively (only TTF). Users must rename font files as workaround. | MobileRead t=313546 |
| Italic/bold rendering bugs | Random chapters appear in bold, italics render incorrectly, scene breaks ignored. | XDA Forums |
| Subscript/superscript broken | Does not render properly even after toggling CSS settings. | MobileRead t=358450 |
| Code syntax colors unreadable | Blue/colored text in programming books becomes invisible in dark mode — only main font color can be overridden. | MobileRead t=358450 |
| Footnote behavior inconsistent | Footnotes sometimes jump to a different section (navigating away), sometimes show as popup. Books with many footnotes become "borderline unreadable." | MobileRead t=336869 |
| Table rendering | Tables in EPUBs render poorly or not at all. | MobileRead t=339752 |
| Image loading failures | Lines display as grey blocks, images between sections fail to load. | MobileRead t=315393 |

**Takeaway:** Faithful EPUB rendering that respects publisher CSS is a massive differentiator.

---

## 2. Annotation & Highlight Export

**Demand: HIGH** — Critical for academic readers, researchers, and knowledge workers.

| Issue | Details | Sources |
|-------|---------|---------|
| No export to note-taking apps | No automated/direct export to Notion, Obsidian, Logseq, Roam Research. Requires multi-step manual workflow. | arq1.vercel.app, MobileRead t=285777 |
| Odd export format | Uses Unicode delimiters (▪ ◆) that must be manually replaced. | arq1.vercel.app |
| No bulk export | Must export highlights one book at a time. | MobileRead t=285777 |
| Location references useless | Export uses chapter titles (not page numbers/CFI) — useless for long books. | christiantietze.de |
| Readwise sync incomplete | Historical highlights don't sync — only new ones after enabling integration. | help.readwise.io |
| Annotations not in EPUB | Stored in proprietary SQLite DB. Invisible in any other reader. | GitHub davidfor/calibre-annotations #19 |
| PDF annotations not embedded | PDF annotations stored internally, not visible to Zotile, Adobe Reader, etc. | Zotero Forum |
| Color metadata lost on export | Highlight colors (yellow=important, red=disagree) lost in plain text export. | arq1.vercel.app |
| No handwriting annotation for EPUB | Pen/stylus markup only available for PDFs, not EPUBs. | XDA, MobileRead t=345158 |

**Takeaway:** Highlight export in Markdown/JSON format and EPUB annotation write-back would be killer features.

---

## 3. Library Management & Organization

**Demand: HIGH** — Repeatedly mentioned across Reddit, MobileRead, XDA, and AlternativeTo.

| Issue | Details | Sources |
|-------|---------|---------|
| No series grouping | Cannot sort/group books by series into sub-folders. | Reddit, Google Play reviews |
| Author sort by first name | Default sort by first name, not last name. No native fix. | MobileRead t=264685 |
| Series metadata inconsistent | Only some books in a series show series tags. | MobileRead t=366918 |
| Tag handling broken | Expects comma-separated tags; breaks with semicolons from Calibre. | Launchpad Bug #2028168 |
| Phantom tags | App creates own tags on import that don't exist in source metadata. | Reddit |
| No mark as read/unread toggle | Must manually drag progress slider to 100% or navigate multiple menus. | MobileRead t=328879 |
| No bulk mark as read | Must update books one at a time. | MobileRead t=328879 |
| Large library crashes | 450+ books with covers causes crashes. | XDA |
| Confusing collection/import flow | Adding a folder of books as a collection is unintuitive. | MobileRead t=283329 |

**Takeaway:** Series grouping, quick read status toggle, and bulk operations are highly wanted.

---

## 4. Cross-Device & Cross-Platform Sync

**Demand: HIGH** — Consistently among the top complaints.

| Issue | Details | Sources |
|-------|---------|---------|
| Multi-device sync unreliable | Users lose reading position when switching phone ↔ tablet. | Reddit, MobileRead t=290579 |
| Google Drive sync broken | Blocked by Google's tightened OAuth requirements on Android 12-14. Persistent "blocked access" errors. | XDA t=4671655, MobileRead t=361158, t=362197 |
| Dropbox sync partial | Syncs positions/bookmarks but not annotations reliably. | MobileRead |
| No iOS version | Cannot sync between iPhone and Android. | AlternativeTo, bookrunch.org |
| No desktop client | Only workaround is Android emulators. | MoonReaderPC.com |
| Proprietary sync format | No other reader can consume Moon Reader's sync files — vendor lock-in. | Multiple sources |
| Annotations not portable | Created on Android, invisible on PC in Calibre or any desktop reader. | MobileRead |

**Takeaway:** Web-based reader (like ours) inherently solves the cross-platform problem. Cloud sync that works is a huge advantage.

---

## 5. Text-to-Speech (TTS)

**Demand: MEDIUM-HIGH** — TTS is a major feature for many users.

| Issue | Details | Sources |
|-------|---------|---------|
| TTS stops randomly | Frequently stops without user input across multiple devices. | MobileRead t=313072, t=340025 |
| Lock screen controls inconsistent | Playback controls appear/disappear randomly on lock screen and notification shade. | MobileRead t=340025 |
| Third-party TTS engine issues | Premium voice engines (Ivona, Acapella) sometimes ignored in favor of default Pico. | MobileRead, slatedroid.com |
| Speed cap at ~550 WPM | Android TTS API limit prevents higher speeds for power listeners. | MobileRead t=345375 |
| No smart skip | Reads chapter headings, footnote numbers, and navigation labels aloud. | Multiple sources |
| No auto-pause on headphone disconnect | Behavior is inconsistent. | MobileRead |

**Takeaway:** Reliable TTS with smart content skipping and consistent controls would differentiate.

---

## 6. PDF Support

**Demand: MEDIUM-HIGH**

| Issue | Details | Sources |
|-------|---------|---------|
| Text reflow "abysmal" | Cannot intelligently reflow multi-column academic papers. | MobileRead t=313546 |
| Sluggish rendering | Slow scrolling/page rendering, especially on older devices. | MobileRead t=227451, t=293653 |
| Annotations not embedded in PDF | Stored internally, invisible to Adobe Reader, Zotfile, etc. | Zotero Forum |
| Annotation garbling | Highlighted text with comments appears garbled. | moonreaderpc.com |
| Zoom lock doesn't persist | Cannot lock zoom level across sessions. | moonreaderpc.com |
| No CBZ/CBR OPDS streaming | Must download entire file before reading. | Ubooquity Forum |

---

## 7. Settings & UX Complexity

**Demand: HIGH** — Possibly the most mentioned theme after rendering issues.

| Issue | Details | Sources |
|-------|---------|---------|
| Overwhelming settings | "Split up into pages that have more to do with history than logic." Multiple threads asking for guides. | MobileRead t=194146 (very long thread), Reddit |
| Search requires 4 steps | Tap screen → three-dot menu → "More Operations" → "Search." Competitors: 1 step. | MobileRead t=315393 |
| Adding favorites takes multiple dialogs | Far more steps than the single-tap star icon competitors use. | MobileRead t=315393 |
| Read filter hard to disable | Accidentally enabling brightness overlay is "extremely frustrating" to undo. | MobileRead t=279864 |
| Poor defaults | Scroll mode enabled by default instead of paginated page-turn. | MobileRead t=320976 |
| Dark mode inconsistent | Reading area goes dark but UI menus remain light — jarring contrast. | MobileRead t=328948 |

**Takeaway:** Intuitive, well-organized settings with good defaults are crucial. Our tabbed settings panel is on the right track.

---

## 8. Goodreads / Social Reading Integration

**Demand: MEDIUM**

| Issue | Details | Sources |
|-------|---------|---------|
| No auto-sync to Goodreads | Must manually update Goodreads "currently reading" and "read" shelves. | Goodreads forum, Reddit |
| No finish notification | No automatic posting when a book is finished. | Goodreads forum |
| No progress sync | Goodreads accepts progress updates via API but Moon Reader doesn't use it. | Multiple sources |
| Pro-only features | TTS, stats, achievements, Goodreads integration behind paywall. | bookrunch.org |

---

## 9. Reading Statistics

**Demand: MEDIUM**

| Issue | Details | Sources |
|-------|---------|---------|
| Per-book only by default | Cannot easily view aggregate statistics (total pages read, total hours, books/month). | MobileRead t=351864 |
| No stats export | Cannot export to CSV or any standard format. | MobileRead t=269113 |
| No cross-device stats sync | KOReader's stats can sync DB between devices. | MobileRead t=351864 |
| Basic reading goals | Users want more granular daily/weekly/monthly targets and streak tracking. | Multiple sources |

**Takeaway:** We already have reading goals/streaks. Adding aggregate stats and export would be differentiating.

---

## 10. Navigation & Table of Contents

**Demand: MEDIUM**

| Issue | Details | Sources |
|-------|---------|---------|
| Chapter-as-separate-book behavior | Default treatment confuses users; prompts at chapter end. | XDA, MobileRead t=211227 |
| TOC broken for converted EPUBs | Poorly structured EPUBs have non-functional TOCs. | MobileRead t=249961 |
| No real page numbers | Moon Reader calculates its own page numbers, not publisher page numbers. Book club members can't reference "page 147." | MobileRead t=315393 |

---

## 11. Calibre Integration

**Demand: MEDIUM-HIGH** (among Calibre power users, a significant fraction of advanced users)

| Issue | Details | Sources |
|-------|---------|---------|
| Tag separator mismatch | Calibre semicolons vs. Moon Reader comma expectation. | Launchpad Bug #2028168, MobileRead t=218198 |
| OPDS auth failures | Android app fails to read OPDS from Calibre-Web (401/404 errors). | GitHub janeczku/calibre-web #1403, booklore-app #1559 |
| Series ordering inconsistent | EPUB2 vs. EPUB3 metadata format differences cause ordering issues. | MobileRead t=366918 |
| Wrong metadata copied | Edge cases cause incorrect metadata import. | MobileRead t=194366 |
| Annotations plugin unsupported | Calibre annotations plugin cannot read Moon Reader's format. | GitHub davidfor/calibre-annotations #19 |

**Takeaway:** We already have Calibre-Web integration. OPDS reliability and proper metadata handling are key.

---

## 12. Typography & Justification

**Demand: MEDIUM**

| Issue | Details | Sources |
|-------|---------|---------|
| Ugly word spacing with justify | Creates rivers of whitespace on narrow phone screens. | XDA |
| Hyphenation imperfect | "Works by no means flawlessly" — over-hyphenates (5 of 12 lines hyphenated). | MobileRead |
| Justification bugs | Rivers of whitespace only when justify is enabled. | XDA |

**Takeaway:** Our new hyphenation control and paragraph spacing features directly address this.

---

## 13. RTL & Manga Support

**Demand: MEDIUM**

| Issue | Details | Sources |
|-------|---------|---------|
| RTL page navigation wrong | Page turn animation and navigation go in wrong direction for RTL languages and manga. | MobileRead t=276919, t=274861 |
| CBZ/CBR limitations | No OPDS streaming, RTL manga requires workarounds. | MobileRead |

---

## 14. Accessibility & Fonts

**Demand: MEDIUM**

| Issue | Details | Sources |
|-------|---------|---------|
| Custom font loading fragile | Sensitive to file location (sdcard/fonts/) and format. | MobileRead t=283257, t=326805 |
| Recurring font loading problems | Dedicated thread on MobileRead for font issues. | MobileRead t=330301 |
| No variable font support | OpenType variable fonts not supported. | Multiple sources |
| Dark mode font color limitation | Cannot change color for embedded/syntax-highlighted text. | MobileRead t=358450 |

**Takeaway:** Our custom font import feature and dyslexia preset address some of these pain points.

---

## 15. AI Features (Emerging)

**Demand: LOW-MEDIUM** (growing)

| Feature | Details | Sources |
|---------|---------|---------|
| Chapter/book summaries | No AI-powered summary feature. | 2024 comparison articles |
| In-app AI translation | Tap-to-translate worse than Google Play Books and Kindle. | HiNative |
| AI reading comprehension | No Q&A about book content. | Emerging competitors (BookWith, Readest) |

---

## 16. Miscellaneous

| Issue | Details | Sources |
|-------|---------|---------|
| Widget cover mismatch | Home screen widget shows wrong covers next to wrong titles. | Google Play review |
| Covers in photo gallery | Moon Reader cover images pollute Android gallery. | XDA t=1794543 |
| Chapter end popup annoying | "Continue to next chapter?" interrupts flow. Disablable but hidden. | MobileRead, XDA |
| Copy-paste limitations | Can't easily copy full chapters. | Google Play review |
| No automatic genre detection | ReadEra has this; Moon Reader does not. | bookrunch.org |
| Statistics export | No CSV export of reading data. | MobileRead t=269113 |
| EPUB3 multimedia limitations | Basic video/audio support but lacks full-screen and consistent audio controls. | The Digital Reader |

---

## Priority Ranking

Based on frequency of complaints across all sources:

| Rank | Feature/Fix | Demand Level |
|------|------------|-------------|
| 1 | CSS/EPUB rendering fidelity | Very High |
| 2 | Annotation export to note-taking apps | High |
| 3 | Google Drive / cloud sync reliability | High |
| 4 | Library organization (series, bulk ops, read status) | High |
| 5 | Multi-device sync reliability | High |
| 6 | UX/settings simplification | High |
| 7 | Calibre integration fixes | Medium-High |
| 8 | TTS reliability and smart features | Medium-High |
| 9 | Goodreads/social integration | Medium |
| 10 | Reading statistics aggregation & export | Medium |
| 11 | PDF improvements (reflow, annotations) | Medium |
| 12 | RTL/manga support | Medium |
| 13 | Handwriting annotations for EPUB | Medium |
| 14 | Real page numbers (not calculated) | Medium |
| 15 | AI features (translate, summarize) | Low-Medium |
| 16 | Cross-platform (iOS, desktop) | Medium |
| 17 | Typography/justification quality | Medium |

---

## Opportunities for Our Reader

Features we **already have** that Moon+ Reader users are begging for:

| Our Feature | Moon+ Reader Gap |
|-------------|-----------------|
| Web-based (cross-platform by default) | Android-only, no iOS/desktop |
| Series grouping in library | No series organization |
| DNF status + read status toggle | Cumbersome mark-as-read workflow |
| Dyslexia-friendly preset | No accessibility preset |
| Hyphenation control | Imperfect hyphenation |
| Paragraph/letter spacing controls | Limited typography controls |
| Calibre-Web integration | OPDS auth failures |
| Reading goals & streaks | Basic goals, Pro-only |
| TTS with word-level highlighting | TTS stops randomly, no highlighting |
| Sleep timer with end-of-chapter | Basic timer only |
| Custom fonts import | Fragile font loading |
| Immersive full-screen mode | Has this |
| WebTorrent P2P sharing | No sharing feature |
| Interlinear translation | No inline translation |
| Bionic reading | No bionic reading |

Features we should **prioritize building** based on this research:

1. **Highlight/annotation export** (Markdown, JSON, Readwise format)
2. **Better PDF text reflow** for academic papers
3. **Goodreads integration** (auto-update shelf, progress sync)
4. **Reading statistics dashboard** with aggregate stats and CSV export
5. **Real page number display** from EPUB page-list
6. **RTL reading support** for Arabic, Hebrew, manga
7. **AI-powered features** (tap-to-translate, chapter summary)
8. **OPDS catalog improvements** (better auth, streaming support)

---

## Sources

- MobileRead Forums: threads t=313546, t=315393, t=366918, t=269113, t=351864, t=285777, t=328879, t=345158, t=328948, t=358450, t=336869, t=264685, t=320976, t=361158, t=362197, t=340025, t=345375, t=313072, t=355339, t=279864, t=194146, t=276919, t=274861, t=283257, t=326805, t=330301, t=249961, t=211227, t=283329
- XDA Forums: threads t=4671655, t=2205876, t=1794543
- Reddit (via crowdfavs.com aggregation): r/ebooks, r/android, r/epub
- GitHub: janeczku/calibre-web #1403, booklore-app/booklore #1559 #1424 #2301, davidfor/calibre-annotations #19
- Bookrunch.org: KOReader vs Moon Reader, Moon Reader vs ReadEra comparisons
- AlternativeTo: Moon+ Reader alternatives page
- Readwise docs: help.readwise.io Moon+ Reader import guide
- Obsidian Forum: MoonReader highlights import thread
- arq1.vercel.app: Moon Reader highlights export workflow
- christiantietze.de: Android ebook annotation exports analysis
- Zotero Forum: Moon Reader PDF annotation compatibility
- Goodreads Community: Moon+ Reader shelf discussions
- Launchpad: Calibre bug #2028168
- Google Play Store: October 2025 reviews
- HiNative: tap-to-translate comparison discussions
