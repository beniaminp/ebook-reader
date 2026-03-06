/**
 * FoliateEngine — headless foliate-js wrapper for EPUB, MOBI, FB2, CBZ, CBR.
 *
 * Implements ReaderEngineRef so UnifiedReaderContainer can drive it.
 * No UI chrome — just the <foliate-view> element.
 *
 * For CBR files, converts to CBZ format first using comicService.
 */

import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';
import type { View as FoliateView, FoliateLocation, FoliateTocItem } from '../../libs/foliate-js/view';
import type { EpubTheme } from '../../types/epub';
import type { ReaderEngineRef, Chapter, SearchResult, ReaderProgress } from '../../types/reader';
import { comicService } from '../../services/comicService';

import { Capacitor } from '@capacitor/core';
import { translateParagraph, clearInterlinearCache } from '../../services/interlinearTranslationService';
import { applyWordWise, removeWordWise, clearWordWiseCache } from '../../services/wordWiseService';
import './EpubReader.css';

export interface FoliateHighlight {
  /** CFI value identifying the highlight location. */
  value: string;
  /** CSS color string. */
  color: string;
  /** Optional note. */
  note?: string;
}

/** Info captured from a text selection in the EPUB iframe. */
export interface CapturedSelection {
  text: string;
  cfi?: string;
}

export interface FoliateEngineProps {
  /** Raw book bytes. */
  arrayBuffer: ArrayBuffer;
  /** Book ID used to avoid reloading the same book. */
  bookId: string;
  /** File format hint — determines MIME type for foliate-js. */
  format: string;
  /** Initial location to restore (CFI or fraction string). */
  initialLocation?: string;
  /** Existing highlights to render. */
  highlights?: FoliateHighlight[];
  /** Called on every relocation (page turn, chapter change, etc.). */
  onRelocate?: (progress: ReaderProgress) => void;
  /** Called after the book is successfully loaded. */
  onLoadComplete?: (metadata: { title: string; author: string }) => void;
  /** Called on error. */
  onError?: (error: string) => void;
  /** Called when user taps an existing highlight. */
  onHighlightTap?: (value: string) => void;
  /** Called when user taps content (for tap-zone navigation). relX is 0–1 horizontal position. */
  onContentTap?: (relX: number, relY: number) => void;
  /**
   * Called when user selects text in the EPUB content. The native selection
   * is cleared immediately after capturing to hide Android's Chrome handles.
   * A temporary visual highlight is shown instead.
   * Pass null when the selection is cleared (e.g. tap elsewhere).
   */
  onSelectionCaptured?: (selection: CapturedSelection | null) => void;
}

// ─── Bionic Reading helpers ───────────────────────────────────

const BIONIC_SKIP_TAGS = new Set([
  'script', 'style', 'code', 'pre', 'samp', 'kbd', 'var', 'math', 'svg',
  'canvas', 'video', 'audio', 'iframe', 'rt', 'ruby',
]);

function applyBionicToDoc(doc: Document): void {
  const root = doc.body;
  if (!root || root.getAttribute('data-bionic-applied') === 'true') return;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      let parent = node.parentElement;
      while (parent && parent !== root) {
        if (BIONIC_SKIP_TAGS.has(parent.tagName.toLowerCase())) return NodeFilter.FILTER_REJECT;
        if (parent.classList.contains('bionic-word')) return NodeFilter.FILTER_REJECT;
        parent = parent.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) textNodes.push(n as Text);

  for (const textNode of textNodes) {
    const text = textNode.textContent || '';
    if (!text.trim()) continue;
    const frag = doc.createDocumentFragment();
    // Split into word and non-word segments
    const parts = text.match(/[\w\u00C0-\u024F\u1E00-\u1EFF]+|[^\w\u00C0-\u024F\u1E00-\u1EFF]+/g);
    if (!parts) continue;
    for (const part of parts) {
      if (!/[\w\u00C0-\u024F]/.test(part)) {
        frag.appendChild(doc.createTextNode(part));
        continue;
      }
      if (part.length <= 1) {
        frag.appendChild(doc.createTextNode(part));
        continue;
      }
      const boldLen = part.length <= 3 ? 1 : Math.ceil(part.length * 0.5);
      const span = doc.createElement('span');
      span.className = 'bionic-word';
      const b = doc.createElement('b');
      b.textContent = part.substring(0, boldLen);
      span.appendChild(b);
      span.appendChild(doc.createTextNode(part.substring(boldLen)));
      frag.appendChild(span);
    }
    textNode.parentNode?.replaceChild(frag, textNode);
  }
  root.setAttribute('data-bionic-applied', 'true');
}

function removeBionicFromDoc(doc: Document): void {
  const root = doc.body;
  if (!root) return;
  root.removeAttribute('data-bionic-applied');
  const bionicWords = root.querySelectorAll('.bionic-word');
  for (const el of bionicWords) {
    const text = el.textContent || '';
    el.parentNode?.replaceChild(doc.createTextNode(text), el);
  }
}

/** Map format string to MIME type for foliate-js. */
function formatToMime(format: string): string {
  switch (format) {
    case 'epub':
      return 'application/epub+zip';
    case 'mobi':
    case 'azw3':
      return 'application/x-mobipocket-ebook';
    case 'fb2':
      return 'application/x-fictionbook+xml';
    case 'cbz':
    case 'cbr':
      return 'application/vnd.comicbook+zip';
    default:
      return 'application/epub+zip';
  }
}

/** Extract a plain string from foliate-js metadata fields. */
function metaString(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    const values = Object.values(val as Record<string, string>);
    return values[0] ?? '';
  }
  return String(val);
}

/** Extract author name from foliate-js metadata. */
function metaAuthor(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val
      .map((item) => metaString(item?.name ?? item))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof val === 'object' && val !== null && 'name' in val) {
    return metaString((val as { name: unknown }).name);
  }
  return metaString(val);
}

/** Convert foliate-js TOC tree to our Chapter type. */
function tocToChapters(toc: FoliateTocItem[] | undefined | null): Chapter[] {
  if (!toc) return [];
  return toc.map((item, idx) => ({
    id: String(item.id ?? idx),
    label: item.label?.trim() || `Chapter ${idx + 1}`,
    href: item.href || '',
    subitems: item.subitems ? tocToChapters(item.subitems) : undefined,
  }));
}

export const FoliateEngine = forwardRef<ReaderEngineRef, FoliateEngineProps>((props, ref) => {
  const {
    arrayBuffer,
    bookId,
    format,
    initialLocation,
    highlights,
    onRelocate,
    onLoadComplete,
    onError,
    onHighlightTap,
    onContentTap,
    onSelectionCaptured,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const loadedBookIdRef = useRef<string | null>(null);

  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Keep a ref to initialLocation so the load effect can read the latest value
  // without re-running when it changes after the initial mount.
  const initialLocationRef = useRef(initialLocation);
  initialLocationRef.current = initialLocation;

  // Track current position
  const currentCfiRef = useRef<string>('');
  const currentFractionRef = useRef<number>(0);
  const currentPageRef = useRef<number>(0);
  const totalPagesRef = useRef<number>(0);

  // Track style settings for injection
  const themeRef = useRef<{ backgroundColor: string; textColor: string } | null>(null);
  const fontSizeRef = useRef<number>(16);
  const fontFamilyRef = useRef<string>('serif');
  const lineHeightRef = useRef<number>(1.6);
  const textAlignRef = useRef<string>('left');
  const marginSizeRef = useRef<string>('medium');
  const customMarginsRef = useRef<{ top: number; bottom: number; left: number; right: number }>({ top: 16, bottom: 16, left: 24, right: 24 });
  const customBackgroundImageRef = useRef<string | undefined>(undefined);
  const bionicReadingRef = useRef<boolean>(false);
  const interlinearEnabledRef = useRef<boolean>(false);
  const interlinearLanguageRef = useRef<string>('en');
  const bookLanguageRef = useRef<string>('auto');
  const wordWiseEnabledRef = useRef<boolean>(false);
  const wordWiseLevelRef = useRef<number>(3);
  const wordWiseTargetLangRef = useRef<string | undefined>(undefined);
  const hyphenationRef = useRef<boolean>(false);
  const paragraphSpacingRef = useRef<number>(1);
  const letterSpacingRef = useRef<number>(0);
  const fontWeightRef = useRef<number>(400);
  const wordSpacingRef = useRef<number>(0);
  const maxLineWidthRef = useRef<number>(0);
  const dropCapsRef = useRef<boolean>(false);
  const twoColumnRef = useRef<boolean>(false);
  const globalBoldRef = useRef<boolean>(false);
  const loadedDocsRef = useRef<Set<Document>>(new Set());

  // Track highlight annotations applied to the view
  const highlightsRef = useRef<FoliateHighlight[]>(highlights || []);
  highlightsRef.current = highlights || [];

  // Cached selection info — tracks the currently selected text for the menu
  const cachedSelectionRef = useRef<CapturedSelection | null>(null);

  // Stable callback refs
  const onRelocateRef = useRef(onRelocate);
  const onLoadCompleteRef = useRef(onLoadComplete);
  const onErrorRef = useRef(onError);
  const onHighlightTapRef = useRef(onHighlightTap);
  const onContentTapRef = useRef(onContentTap);
  const onSelectionCapturedRef = useRef(onSelectionCaptured);
  onRelocateRef.current = onRelocate;
  onLoadCompleteRef.current = onLoadComplete;
  onErrorRef.current = onError;
  onHighlightTapRef.current = onHighlightTap;
  onContentTapRef.current = onContentTap;
  onSelectionCapturedRef.current = onSelectionCaptured;

  const injectStyles = useCallback((doc: Document) => {
    const existingStyle = doc.getElementById('foliate-reader-style');
    if (existingStyle) existingStyle.remove();

    const style = doc.createElement('style');
    style.id = 'foliate-reader-style';

    const rules: string[] = [];
    const theme = themeRef.current;
    if (theme) {
      if (customBackgroundImageRef.current) {
        // Make body semi-transparent so outer container's background image shows through
        rules.push(
          `body { background: rgba(0,0,0,0.5) !important; color: ${theme.textColor} !important; }`
        );
      } else {
        rules.push(
          `body { background: ${theme.backgroundColor} !important; color: ${theme.textColor} !important; }`
        );
      }
    }
    // Resolve font family: Google Fonts use their actual name, file-imported use Custom- prefix
    let resolvedFontFamily = fontFamilyRef.current;
    if (resolvedFontFamily.startsWith('gfont-')) {
      const googleFamily = resolvedFontFamily.slice(6);
      resolvedFontFamily = `'${googleFamily}'`;
      // Inject Google Font <link> into the iframe doc so the font is available
      const linkId = `gfont-link-${googleFamily.replace(/[^a-zA-Z0-9]/g, '-')}`;
      if (!doc.head.querySelector(`link[data-gfont-link="${linkId}"]`)) {
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${googleFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
        link.dataset.gfontLink = linkId;
        doc.head.appendChild(link);
      }
    }
    rules.push(
      `body { font-size: ${fontSizeRef.current}px !important; font-family: ${resolvedFontFamily} !important; }`
    );
    // Suppress native context menu / text selection callout so the custom
    // TextSelectionMenu bottom bar is the only UI that appears.
    rules.push(`body { -webkit-touch-callout: none !important; -webkit-tap-highlight-color: transparent !important; }`);
    // Style native selection (visible briefly before we capture and clear it)
    rules.push(`::selection { background-color: rgba(255, 213, 79, 0.45) !important; }`);
    rules.push(`body, p { line-height: ${lineHeightRef.current} !important; }`);
    rules.push(`body, p, div { text-align: ${textAlignRef.current} !important; }`);
    const cm = customMarginsRef.current;
    rules.push(`body { padding: ${cm.top}px ${cm.right}px ${cm.bottom}px ${cm.left}px !important; }`);
    if (hyphenationRef.current) {
      rules.push(`body, p { hyphens: auto !important; -webkit-hyphens: auto !important; }`);
    }
    if (paragraphSpacingRef.current !== 1) {
      rules.push(`p { margin-bottom: ${paragraphSpacingRef.current}em !important; }`);
    }
    if (letterSpacingRef.current) {
      rules.push(`body { letter-spacing: ${letterSpacingRef.current}em !important; }`);
    }
    if (fontWeightRef.current !== 400) {
      rules.push(`body, p, div, span, li, td, th, dd, dt, blockquote { font-weight: ${fontWeightRef.current} !important; }`);
    }
    if (wordSpacingRef.current) {
      rules.push(`body { word-spacing: ${wordSpacingRef.current}em !important; }`);
    }
    if (maxLineWidthRef.current > 0) {
      rules.push(`body { max-width: ${maxLineWidthRef.current}ch !important; margin-left: auto !important; margin-right: auto !important; }`);
    }
    if (dropCapsRef.current) {
      rules.push(`p:first-of-type::first-letter, .chapter p:first-of-type::first-letter, section > p:first-child::first-letter { float: left !important; font-size: 3.2em !important; line-height: 0.8 !important; padding-right: 0.08em !important; font-weight: bold !important; }`);
    }
    if (twoColumnRef.current) {
      rules.push(`body { column-count: 2 !important; column-gap: 2em !important; }`);
    }
    if (globalBoldRef.current) {
      rules.push(`body, p, div, span, li, td, th, dd, dt, blockquote, a { font-weight: bold !important; }`);
    }
    if (bionicReadingRef.current) {
      rules.push(`
        .bionic-word b { font-weight: 700 !important; }
      `);
    }
    if (interlinearEnabledRef.current) {
      rules.push(`
        .interlinear-translation {
          font-size: 0.78em;
          font-style: italic;
          opacity: 0.6;
          margin: 2px 0 10px 0;
          padding-left: 6px;
          border-left: 2px solid currentColor;
          line-height: 1.3;
        }
      `);
    }
    if (wordWiseEnabledRef.current) {
      rules.push(`
        ruby.word-wise-annotation {
          ruby-position: over;
        }
        ruby.word-wise-annotation rt {
          font-size: 0.55em;
          font-weight: normal;
          font-style: normal;
          opacity: 0.65;
          color: inherit;
          letter-spacing: 0;
          line-height: 1;
          text-align: center;
          user-select: none;
        }
      `);
    }

    style.textContent = rules.join('\n');
    doc.head.appendChild(style);
  }, []);

  const applyInterlinear = useCallback(async (doc: Document) => {
    if (!interlinearEnabledRef.current) return;
    const targetLang = interlinearLanguageRef.current;
    // On Android, use the detected book language so MLKit gets a concrete
    // source language instead of 'auto' (which it doesn't support).
    const sourceLang = Capacitor.isNativePlatform() && bookLanguageRef.current !== 'auto'
      ? bookLanguageRef.current
      : 'auto';
    const elements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    console.log(`[Interlinear] Applying to ${elements.length} elements, source: ${sourceLang}, target: ${targetLang}`);
    let translated_count = 0;
    for (const el of elements) {
      if (el.getAttribute('data-interlinear-processed')) continue;
      const text = (el.textContent || '').trim();
      if (!text || text.length < 2) continue;
      el.setAttribute('data-interlinear-processed', 'true');
      try {
        const translated = await translateParagraph(text, sourceLang, targetLang);
        if (translated && translated !== text) {
          const div = doc.createElement('div');
          div.className = 'interlinear-translation';
          div.textContent = translated;
          el.insertAdjacentElement('afterend', div);
          translated_count++;
        }
      } catch (err) {
        console.error('[Interlinear] Translation failed for paragraph:', err);
      }
    }
    console.log(`[Interlinear] Inserted ${translated_count} translations`);
  }, []);

  const removeInterlinear = useCallback((doc: Document) => {
    doc.querySelectorAll('.interlinear-translation').forEach((el) => el.remove());
    doc.querySelectorAll('[data-interlinear-processed]').forEach((el) =>
      el.removeAttribute('data-interlinear-processed')
    );
  }, []);

  const applyWordWiseToDoc = useCallback(async (doc: Document) => {
    if (!wordWiseEnabledRef.current) return;
    const level = wordWiseLevelRef.current;
    const targetLang = wordWiseTargetLangRef.current;
    console.log(`[WordWise] Applying to doc, level: ${level}, targetLang: ${targetLang}`);
    await applyWordWise(doc, level, targetLang);
  }, []);

  const removeWordWiseFromDoc = useCallback((doc: Document) => {
    removeWordWise(doc);
  }, []);

  const reapplyStyles = useCallback(() => {
    for (const doc of loadedDocsRef.current) {
      try {
        injectStyles(doc);
      } catch {
        /* detached doc */
      }
    }
  }, [injectStyles]);

  // Initialize foliate-view
  useEffect(() => {
    if (loadedBookIdRef.current === bookId && viewRef.current) return;

    // Cleanup previous view
    if (viewRef.current) {
      try {
        viewRef.current.close();
      } catch {
        /* ignore */
      }
      viewRef.current.remove();
      viewRef.current = null;
    }
    loadedDocsRef.current.clear();

    let destroyed = false;

    const loadBook = async () => {
      try {
        // Convert CBR to CBZ if needed
        let bufferToLoad = arrayBuffer;
        let formatToUse = format;

        if (format === 'cbr') {
          try {
            bufferToLoad = await comicService.convertCbrToCbz(arrayBuffer);
            formatToUse = 'cbz';
          } catch (err) {
            if (destroyed) return;
            console.error('Failed to convert CBR to CBZ:', err);
            onErrorRef.current?.(err instanceof Error ? err.message : 'Failed to convert CBR file');
            return;
          }
        }

        const { View } = await import('../../libs/foliate-js/view.js');
        if (destroyed) return;

        const view = new View() as FoliateView;
        viewRef.current = view;
        loadedBookIdRef.current = bookId;

        if (!containerRef.current) return;
        containerRef.current.appendChild(view);

        view.addEventListener('load', ((e: CustomEvent<{ doc: Document; index: number }>) => {
          if (destroyed) return;
          // Clear stale docs from previous sections (their iframes have been destroyed)
          loadedDocsRef.current.clear();
          loadedDocsRef.current.add(e.detail.doc);

          // Inject tap-zone handler FIRST so tapping always works even if
          // style/bionic/interlinear processing throws an error.
          const doc = e.detail.doc;
          let touchStart: { x: number; y: number; time: number } | null = null;
          let touchHandledTap = false;

          // Helper: convert an X coordinate from the iframe document space
          // to a 0–1 relative position across the full screen width.
          // clientX inside the iframe is relative to the iframe viewport.
          // We need to account for any offset the iframe has from the
          // left edge of the screen.
          const toRelativeX = (clientX: number): number => {
            const iframeWin = doc.defaultView;
            if (iframeWin && iframeWin.frameElement) {
              const rect = iframeWin.frameElement.getBoundingClientRect();
              return (rect.left + clientX) / window.innerWidth;
            }
            const viewportWidth = iframeWin?.innerWidth || window.innerWidth;
            return clientX / viewportWidth;
          };
          const toRelativeY = (clientY: number): number => {
            const iframeWin = doc.defaultView;
            if (iframeWin && iframeWin.frameElement) {
              const rect = iframeWin.frameElement.getBoundingClientRect();
              return (rect.top + clientY) / window.innerHeight;
            }
            const viewportHeight = iframeWin?.innerHeight || window.innerHeight;
            return clientY / viewportHeight;
          };

          // ─── Selection notification (keeps native selection alive for extending) ───
          let selectionNotifyDebounce: ReturnType<typeof setTimeout> | null = null;
          let longPressTimer: ReturnType<typeof setTimeout> | null = null;
          let longPressDetected = false;
          const LONG_PRESS_MS = 400;

          doc.addEventListener('touchstart', (ev: TouchEvent) => {
            const t = ev.touches[0];
            touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
            longPressDetected = false;
            if (longPressTimer) clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => { longPressDetected = true; }, LONG_PRESS_MS);
          }, { passive: true });
          doc.addEventListener('touchend', (ev: TouchEvent) => {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            if (!touchStart) return;
            const t = ev.changedTouches[0];
            const dx = Math.abs(t.clientX - touchStart.x);
            const dy = Math.abs(t.clientY - touchStart.y);
            const elapsed = Date.now() - touchStart.time;
            touchStart = null;
            // Only treat as tap if short duration and no significant movement
            if (dx > 10 || dy > 10 || elapsed > 300) return;
            // If there's an active native selection, tap clears it and dismisses menu
            const sel = doc.getSelection?.();
            if (sel && !sel.isCollapsed) {
              sel.removeAllRanges();
              cachedSelectionRef.current = null;
              onSelectionCapturedRef.current?.(null);
              return;
            }
            // If there's a cached selection (from a previous capture), clear it
            if (cachedSelectionRef.current) {
              cachedSelectionRef.current = null;
              onSelectionCapturedRef.current?.(null);
              return;
            }
            // Clear any accidental selection created by the tap
            const tapSel = doc.getSelection?.();
            if (tapSel && !tapSel.isCollapsed) tapSel.removeAllRanges();
            touchHandledTap = true;
            const relX = toRelativeX(t.clientX);
            const relY = toRelativeY(t.clientY);
            onContentTapRef.current?.(relX, relY);
          }, { passive: true });
          doc.addEventListener('click', (ev: MouseEvent) => {
            // On touch devices, touchend already handled the tap
            if (touchHandledTap) { touchHandledTap = false; return; }
            // If there's an active native selection, click clears it
            const sel = doc.getSelection?.();
            if (sel && !sel.isCollapsed) {
              sel.removeAllRanges();
              cachedSelectionRef.current = null;
              onSelectionCapturedRef.current?.(null);
              return;
            }
            if (cachedSelectionRef.current) {
              cachedSelectionRef.current = null;
              onSelectionCapturedRef.current?.(null);
              return;
            }
            // Clear any accidental selection from the click
            if (sel) sel.removeAllRanges();
            const relX = toRelativeX(ev.clientX);
            const relY = toRelativeY(ev.clientY);
            onContentTapRef.current?.(relX, relY);
          });

          // Notify parent of selection changes so the menu shows/hides.
          // Native selection stays alive — user can still extend with handles.
          // Only activate on long press (touch held >= LONG_PRESS_MS) to prevent
          // the highlight menu from appearing on accidental short taps.
          doc.addEventListener('selectionchange', () => {
            if (selectionNotifyDebounce) clearTimeout(selectionNotifyDebounce);
            const sel = doc.getSelection?.();
            if (!sel || sel.isCollapsed) {
              // Selection collapsed — notify parent to hide menu
              if (cachedSelectionRef.current) {
                cachedSelectionRef.current = null;
                onSelectionCapturedRef.current?.(null);
              }
              return;
            }
            // For touch: only show selection menu on long press, not short taps.
            // Mouse selections (touchStart is null) are always allowed.
            if (touchStart && !longPressDetected) return;
            // Debounce to let user finish adjusting selection handles
            selectionNotifyDebounce = setTimeout(() => {
              const text = sel.toString().trim();
              if (text) {
                cachedSelectionRef.current = { text };
                onSelectionCapturedRef.current?.({ text });
              }
            }, 200);
          });

          // Suppress native context menu (long-press on Android/iOS) so the
          // custom TextSelectionMenu bottom bar is the only UI shown.
          doc.addEventListener('contextmenu', (ev: Event) => {
            ev.preventDefault();
          });

          // Apply styles and content transformations after tap handlers are
          // registered so a failure here never breaks navigation.
          try {
            injectStyles(doc);
            if (bionicReadingRef.current) applyBionicToDoc(doc);
            applyInterlinear(doc);
            applyWordWiseToDoc(doc);
          } catch (err) {
            console.warn('Failed to apply styles/transformations to loaded section:', err);
          }
        }) as EventListener);

        // Annotation support: draw highlights when foliate creates overlayers
        view.addEventListener('draw-annotation', ((
          e: CustomEvent<{
            draw: (func: any, opts: any) => void;
            annotation: { value: string; color?: string };
            doc: Document;
            range: Range;
          }>
        ) => {
          if (destroyed) return;
          const { draw, annotation } = e.detail;
          const color = annotation.color || '#ffff00';
          // Import Overlayer.highlight statically — it's already loaded
          draw(
            (rects: any[], opts: any) => {
              // Create SVG highlight rects
              const ns = 'http://www.w3.org/2000/svg';
              const g = document.createElementNS(ns, 'g');
              g.setAttribute('fill', color);
              g.style.opacity = '0.3';
              g.style.mixBlendMode = 'multiply';
              for (const { left, top, height, width } of rects) {
                const el = document.createElementNS(ns, 'rect');
                el.setAttribute('x', String(left));
                el.setAttribute('y', String(top));
                el.setAttribute('height', String(height));
                el.setAttribute('width', String(width));
                g.append(el);
              }
              return g;
            },
            { color }
          );
        }) as EventListener);

        // When user taps an existing highlight
        view.addEventListener('show-annotation', ((
          e: CustomEvent<{ value: string; index: number; range: Range }>
        ) => {
          if (destroyed) return;
          onHighlightTapRef.current?.(e.detail.value);
        }) as EventListener);

        // When a new overlayer is created (section loaded), re-add all highlights
        view.addEventListener('create-overlay', ((e: CustomEvent<{ index: number }>) => {
          if (destroyed) return;
          for (const hl of highlightsRef.current) {
            view.addAnnotation?.({ value: hl.value, color: hl.color } as any);
          }
        }) as EventListener);

        view.addEventListener('relocate', ((e: CustomEvent<FoliateLocation>) => {
          if (destroyed) return;
          const loc = e.detail;
          const cfi = loc.cfi || '';
          const fraction = loc.fraction ?? 0;
          const current = loc.location?.current ?? 0;
          const total = loc.location?.total ?? 0;

          currentCfiRef.current = cfi;
          currentFractionRef.current = fraction;
          currentPageRef.current = Math.max(1, current);
          totalPagesRef.current = total;

          onRelocateRef.current?.({
            current: Math.max(1, current),
            total,
            fraction,
            label:
              total > 0 ? `${Math.max(1, current)} / ${total}` : `${Math.round(fraction * 100)}%`,
            locationString: cfi,
            section: loc.section
              ? { current: loc.section.current, total: loc.section.total }
              : undefined,
            chapterLabel: loc.tocItem?.label || undefined,
            timeInSection: loc.time?.section,
            timeInBook: loc.time?.total,
          });
        }) as EventListener);

        const file = new File([bufferToLoad], `book.${formatToUse}`, {
          type: formatToMime(formatToUse),
        });
        if (destroyed) return;

        await view.open(file);
        if (destroyed) return;

        // Remove the paginator's built-in gap/margin so only the body
        // padding (from customMargins) controls content spacing.
        const renderer = (view as any)?.renderer;
        if (renderer) {
          renderer.setAttribute('margin', '0px');
          renderer.setAttribute('gap', '0%');
        }

        if (initialLocationRef.current) {
          await view.goTo(initialLocationRef.current);
        } else {
          await view.next();
        }
        if (destroyed) return;

        // Extract metadata
        const meta = view.book?.metadata;
        // Extract book language for interlinear translation (e.g. ["en"] → "en")
        const bookLangs = (meta as any)?.language;
        if (Array.isArray(bookLangs) && bookLangs.length > 0 && bookLangs[0]) {
          // Normalize to 2-letter code (e.g. "en-US" → "en")
          bookLanguageRef.current = bookLangs[0].split('-')[0].toLowerCase();
          console.log(`[Interlinear] Detected book language: ${bookLanguageRef.current}`);
        }
        onLoadCompleteRef.current?.({
          title: metaString(meta?.title) || 'Unknown Title',
          author: metaAuthor(meta?.author),
        });

        // Extract TOC
        const tocChapters = tocToChapters(view.book?.toc);
        setChapters(tocChapters);
      } catch (error) {
        if (destroyed) return;
        console.error('Failed to load book:', error);
        onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to load book');
      }
    };

    loadBook();

    return () => {
      destroyed = true;
      if (viewRef.current) {
        try {
          viewRef.current.close();
        } catch {
          /* ignore */
        }
        viewRef.current.remove();
        viewRef.current = null;
        loadedBookIdRef.current = null;
      }
      loadedDocsRef.current.clear();
    };
  }, [bookId, arrayBuffer, format]);

  useImperativeHandle(
    ref,
    () => ({
      next: async () => {
        // Clear text selection inside iframe docs to prevent accidental selection during page turns
        loadedDocsRef.current.forEach((doc) => {
          try { doc.getSelection?.()?.removeAllRanges(); } catch { /* doc may be detached */ }
        });
        await viewRef.current?.next();
      },
      prev: async () => {
        loadedDocsRef.current.forEach((doc) => {
          try { doc.getSelection?.()?.removeAllRanges(); } catch { /* doc may be detached */ }
        });
        await viewRef.current?.prev();
      },
      goToLocation: (location: string) => {
        viewRef.current?.goTo(location);
      },
      goToFraction: (fraction: number) => {
        viewRef.current?.goToFraction(fraction);
      },
      goToChapter: (index: number) => {
        if (chapters[index]) {
          viewRef.current?.goTo(chapters[index].href);
        }
      },
      getChapters: () => chapters,
      getProgress: () => ({
        current: currentPageRef.current,
        total: totalPagesRef.current,
        fraction: currentFractionRef.current,
        label:
          totalPagesRef.current > 0
            ? `${currentPageRef.current} / ${totalPagesRef.current}`
            : `${Math.round(currentFractionRef.current * 100)}%`,
        locationString: currentCfiRef.current,
      }),
      search: async (query: string): Promise<SearchResult[]> => {
        if (!viewRef.current || !query.trim()) return [];
        const results: SearchResult[] = [];
        try {
          const iter = viewRef.current.search({ query });
          for await (const result of iter) {
            if (result === 'done') break;
            if (typeof result === 'string') continue;
            if (result.subitems) {
              const chapterLabel = result.label || '';
              for (const sub of result.subitems) {
                results.push({
                  location: sub.cfi,
                  excerpt: sub.excerpt || '',
                  label: chapterLabel,
                });
              }
            } else if (result.cfi) {
              results.push({
                location: result.cfi,
                excerpt: result.excerpt || '',
                label: '',
              });
            }
          }
        } catch (err) {
          console.error('Search failed:', err);
        }
        return results;
      },
      setTheme: (theme: { backgroundColor: string; textColor: string }) => {
        themeRef.current = theme;
        reapplyStyles();
      },
      setCustomBackgroundImage: (imageUri: string | undefined) => {
        customBackgroundImageRef.current = imageUri;
        reapplyStyles();
      },
      setFontSize: (size: number) => {
        fontSizeRef.current = size;
        reapplyStyles();
      },
      setFontFamily: (family: string) => {
        fontFamilyRef.current = family;
        reapplyStyles();
      },
      setLineHeight: (height: number) => {
        lineHeightRef.current = height;
        reapplyStyles();
      },
      setTextAlign: (align: string) => {
        textAlignRef.current = align;
        reapplyStyles();
      },
      setMarginSize: (size: string) => {
        marginSizeRef.current = size;
        reapplyStyles();
      },
      setCustomMargins: (margins: { top: number; bottom: number; left: number; right: number }) => {
        customMarginsRef.current = margins;
        // Update the paginator's outer gap/margin to match.
        // The body padding inside the iframe handles content spacing,
        // so set paginator gap/margin to 0 to avoid double spacing.
        const renderer = (viewRef.current as any)?.renderer;
        if (renderer) {
          renderer.setAttribute('margin', '0px');
          renderer.setAttribute('gap', '0%');
        }
        reapplyStyles();
      },
      setHyphenation: (enabled: boolean) => {
        hyphenationRef.current = enabled;
        reapplyStyles();
      },
      setParagraphSpacing: (spacing: number) => {
        paragraphSpacingRef.current = spacing;
        reapplyStyles();
      },
      setLetterSpacing: (spacing: number) => {
        letterSpacingRef.current = spacing;
        reapplyStyles();
      },
      setFontWeight: (weight: number) => {
        fontWeightRef.current = weight;
        reapplyStyles();
      },
      setWordSpacing: (spacing: number) => {
        wordSpacingRef.current = spacing;
        reapplyStyles();
      },
      setMaxLineWidth: (chars: number) => {
        maxLineWidthRef.current = chars;
        reapplyStyles();
      },
      setDropCaps: (enabled: boolean) => {
        dropCapsRef.current = enabled;
        reapplyStyles();
      },
      setTwoColumnLayout: (enabled: boolean) => {
        twoColumnRef.current = enabled;
        reapplyStyles();
      },
      setGlobalBold: (enabled: boolean) => {
        globalBoldRef.current = enabled;
        reapplyStyles();
      },
      setBionicReading: (enabled: boolean) => {
        bionicReadingRef.current = enabled;
        reapplyStyles();

        // Apply or remove bionic text transformation on active docs
        const activeDocs: Document[] = [];
        try {
          const contents = (viewRef.current as any)?.renderer?.getContents?.() || [];
          for (const c of contents) {
            if (c.doc) activeDocs.push(c.doc);
          }
        } catch { /* renderer not ready */ }
        if (activeDocs.length === 0) {
          for (const doc of loadedDocsRef.current) activeDocs.push(doc);
        }
        for (const doc of activeDocs) {
          try {
            if (enabled) applyBionicToDoc(doc);
            else removeBionicFromDoc(doc);
          } catch { /* detached doc */ }
        }
      },
      setInterlinearMode: (enabled: boolean, targetLanguage: string) => {
        const langChanged = interlinearLanguageRef.current !== targetLanguage;
        interlinearEnabledRef.current = enabled;
        interlinearLanguageRef.current = targetLanguage;

        // Get the currently visible document(s) from the foliate renderer
        // instead of relying on loadedDocsRef which may contain stale/detached docs
        const activeDocs: Document[] = [];
        try {
          const contents = (viewRef.current as any)?.renderer?.getContents?.() || [];
          for (const c of contents) {
            if (c.doc) activeDocs.push(c.doc);
          }
        } catch { /* renderer not ready */ }
        // Fallback to loadedDocsRef if renderer isn't available
        if (activeDocs.length === 0) {
          for (const doc of loadedDocsRef.current) {
            activeDocs.push(doc);
          }
        }

        if (enabled) {
          if (langChanged) {
            clearInterlinearCache();
            for (const doc of activeDocs) {
              try { removeInterlinear(doc); } catch { /* detached doc */ }
            }
          }
          reapplyStyles();
          for (const doc of activeDocs) {
            try {
              applyInterlinear(doc).catch((err) =>
                console.error('[Interlinear] Failed to apply translations:', err)
              );
            } catch { /* detached doc */ }
          }
        } else {
          for (const doc of activeDocs) {
            try { removeInterlinear(doc); } catch { /* detached doc */ }
          }
          reapplyStyles();
        }
      },
      setWordWise: (enabled: boolean, level: number, targetLang?: string) => {
        const changed = wordWiseEnabledRef.current !== enabled
          || wordWiseLevelRef.current !== level
          || wordWiseTargetLangRef.current !== targetLang;
        wordWiseEnabledRef.current = enabled;
        wordWiseLevelRef.current = level;
        wordWiseTargetLangRef.current = targetLang;

        if (!changed) return;

        // Get active docs
        const activeDocs: Document[] = [];
        try {
          const contents = (viewRef.current as any)?.renderer?.getContents?.() || [];
          for (const c of contents) {
            if (c.doc) activeDocs.push(c.doc);
          }
        } catch { /* renderer not ready */ }
        if (activeDocs.length === 0) {
          for (const doc of loadedDocsRef.current) {
            activeDocs.push(doc);
          }
        }

        // Always remove existing annotations first
        clearWordWiseCache();
        for (const doc of activeDocs) {
          try { removeWordWiseFromDoc(doc); } catch { /* detached doc */ }
        }

        reapplyStyles();

        if (enabled) {
          for (const doc of activeDocs) {
            try {
              applyWordWiseToDoc(doc).catch((err) =>
                console.error('[WordWise] Failed to apply annotations:', err)
              );
            } catch { /* detached doc */ }
          }
        }
      },
      getSelectionInfo: () => {
        const view = viewRef.current;
        if (!view) return null;
        // First check for live native selection
        try {
          const contents = (view as any).renderer?.getContents?.() || [];
          for (const { doc, index } of contents) {
            const sel = doc?.defaultView?.getSelection?.();
            if (!sel || sel.isCollapsed) continue;
            const text = sel.toString().trim();
            if (!text) continue;
            const range = sel.getRangeAt(0);
            const cfi = (view as any).getCFI(index, range);
            return { cfi, text };
          }
        } catch (err) {
          console.error('Failed to get selection info:', err);
        }
        // Fall back to cached selection (captured eagerly, native cleared)
        if (cachedSelectionRef.current) {
          return {
            cfi: cachedSelectionRef.current.cfi,
            text: cachedSelectionRef.current.text,
          };
        }
        return null;
      },
      addHighlightAnnotation: (cfi: string, color: string) => {
        viewRef.current?.addAnnotation?.({ value: cfi, color } as any);
      },
      removeHighlightAnnotation: (cfi: string) => {
        viewRef.current?.deleteAnnotation?.({ value: cfi });
      },
      getVisibleText: (): string => {
        // Use the paginator's getVisibleText() which returns only the text
        // from the current page/column, not the entire chapter.
        try {
          const renderer = (viewRef.current as any)?.renderer;
          if (renderer?.getVisibleText) {
            const text = renderer.getVisibleText();
            if (text) return text;
          }
        } catch { /* renderer not ready */ }
        // Fallback: extract from loaded docs (entire section)
        const activeDocs: Document[] = [];
        try {
          const contents = (viewRef.current as any)?.renderer?.getContents?.() || [];
          for (const c of contents) {
            if (c.doc) activeDocs.push(c.doc);
          }
        } catch { /* renderer not ready */ }
        if (activeDocs.length === 0) {
          for (const doc of loadedDocsRef.current) {
            activeDocs.push(doc);
          }
        }
        const texts: string[] = [];
        for (const doc of activeDocs) {
          try {
            const body = doc.body;
            if (body) {
              texts.push(body.innerText || body.textContent || '');
            }
          } catch { /* detached doc */ }
        }
        return texts.join('\n').trim();
      },
      getVisibleRange: (): Range | null => {
        try {
          const renderer = (viewRef.current as any)?.renderer;
          if (typeof renderer?.getVisibleRange === 'function') {
            return renderer.getVisibleRange();
          }
        } catch { /* renderer not ready */ }
        return null;
      },
      setPageCurl: (enabled: boolean, pageColor?: string) => {
        try {
          const renderer = (viewRef.current as any)?.renderer;
          if (!renderer) return;
          if (enabled) {
            renderer.setAttribute('page-curl', '');
            if (pageColor) renderer.setPageCurlColor?.(pageColor);
          } else {
            renderer.removeAttribute('page-curl');
          }
        } catch { /* renderer not ready */ }
      },
      getContentDocuments: (): Document[] => {
        const activeDocs: Document[] = [];
        try {
          const contents = (viewRef.current as any)?.renderer?.getContents?.() || [];
          for (const c of contents) {
            if (c.doc) activeDocs.push(c.doc);
          }
        } catch { /* renderer not ready */ }
        if (activeDocs.length === 0) {
          for (const doc of loadedDocsRef.current) {
            activeDocs.push(doc);
          }
        }
        return activeDocs;
      },
    }),
    [chapters, reapplyStyles, applyInterlinear, removeInterlinear, applyWordWiseToDoc, removeWordWiseFromDoc]
  );

  // Sync highlights when prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !highlights) return;
    // Re-add all annotations when highlights change
    for (const hl of highlights) {
      view.addAnnotation?.({ value: hl.value, color: hl.color } as any);
    }
  }, [highlights]);

  return <div ref={containerRef} className="epub-viewer" />;
});

FoliateEngine.displayName = 'FoliateEngine';

export default FoliateEngine;
