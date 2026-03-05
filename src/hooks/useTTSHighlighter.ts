/**
 * useTTSHighlighter Hook
 *
 * Highlights the currently spoken word in the rendered text, synchronized
 * with TTS word boundary events. Works with both EPUB (iframe-based) and
 * scroll-based (main document) readers, and PDF text layers.
 *
 * Strategy:
 *  1. When TTS starts a sentence, we find all text nodes in the content
 *     document(s) and build a character-offset map.
 *  2. On each word boundary event, we compute which text node + offset
 *     contains the current word and wrap it in a <span> highlight.
 *  3. We auto-scroll to keep the highlighted word visible.
 *  4. On stop/pause/sentence change, we remove the old highlight.
 */

import { useRef, useCallback, useEffect } from 'react';
import type { TTSWordBoundary } from './useTTS';

/** CSS class injected into content documents for the highlight */
const HIGHLIGHT_CLASS = 'tts-word-highlight';

/** CSS for the word highlight — injected into each content document */
const HIGHLIGHT_STYLE = `
.${HIGHLIGHT_CLASS} {
  background-color: rgba(255, 213, 79, 0.55);
  border-radius: 3px;
  padding: 1px 2px;
  margin: -1px -2px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  box-shadow: 0 1px 3px rgba(255, 213, 79, 0.3);
}
`;

const STYLE_ID = 'tts-highlighter-style';

interface TextNodeEntry {
  node: Text;
  start: number;
  end: number;
}

/**
 * Check if an element or any of its ancestors is hidden (display:none, etc.)
 */
function isHidden(el: Element | null): boolean {
  while (el) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT') {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Build an array mapping character offsets to their owning text nodes.
 * Includes text inside highlight spans so the map stays correct after
 * wrapping a word.
 */
function buildTextNodeMap(doc: Document): TextNodeEntry[] {
  const body = doc.body;
  if (!body) return [];

  const entries: TextNodeEntry[] = [];
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (isHidden(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let offset = 0;
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent || '';
    if (text.length > 0) {
      entries.push({ node, start: offset, end: offset + text.length });
      offset += text.length;
    }
  }
  return entries;
}

/**
 * Build a text node map restricted to only nodes within the given Range.
 * For paginated EPUB, this gives us only the nodes on the visible page.
 */
function buildTextNodeMapFromRange(doc: Document, visibleRange: Range): TextNodeEntry[] {
  const entries: TextNodeEntry[] = [];
  const walker = doc.createTreeWalker(
    visibleRange.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (isHidden(parent)) return NodeFilter.FILTER_REJECT;
        // Only include nodes that intersect the visible range
        try {
          const nodeRange = doc.createRange();
          nodeRange.selectNodeContents(node);
          if (
            visibleRange.compareBoundaryPoints(Range.END_TO_START, nodeRange) >= 0 ||
            visibleRange.compareBoundaryPoints(Range.START_TO_END, nodeRange) <= 0
          ) {
            return NodeFilter.FILTER_REJECT;
          }
        } catch {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let offset = 0;
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent || '';
    if (text.length > 0) {
      entries.push({ node, start: offset, end: offset + text.length });
      offset += text.length;
    }
  }
  return entries;
}

/** Inject the highlight CSS into a document if not already present. */
function ensureStyleInjected(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = HIGHLIGHT_STYLE;
  (doc.head || doc.documentElement).appendChild(style);
}

/** Remove highlight CSS from a document. */
function removeStyleFromDoc(doc: Document): void {
  doc.getElementById(STYLE_ID)?.remove();
}

/** Get the concatenated text from a text node map */
function getMapText(map: TextNodeEntry[]): string {
  let text = '';
  for (const entry of map) {
    text += entry.node.textContent || '';
  }
  return text;
}

/**
 * Find the text that matches a sentence in the document's text content.
 * Returns the character offset where the sentence starts in the document.
 * Uses progressive normalization to handle innerText vs textContent differences.
 */
function findSentenceInDocument(
  textNodeMap: TextNodeEntry[],
  sentence: string
): number {
  if (textNodeMap.length === 0) return -1;
  const fullText = getMapText(textNodeMap);

  // Try exact match first
  const idx = fullText.indexOf(sentence);
  if (idx >= 0) return idx;

  // Try with normalized whitespace (handles \n vs space differences)
  const normalizedFull = fullText.replace(/\s+/g, ' ');
  const normalizedSentence = sentence.replace(/\s+/g, ' ').trim();
  const normIdx = normalizedFull.indexOf(normalizedSentence);
  if (normIdx >= 0) {
    // Map normalized offset back to original offset
    return mapNormalizedOffset(fullText, normIdx);
  }

  // Try a word-based fuzzy search: find the first few words of the sentence
  const words = normalizedSentence.split(' ').slice(0, 4).join(' ');
  if (words.length > 5) {
    const wordIdx = normalizedFull.indexOf(words);
    if (wordIdx >= 0) {
      return mapNormalizedOffset(fullText, wordIdx);
    }
  }

  return -1;
}

/**
 * Map an offset in whitespace-normalized text back to the original text.
 */
function mapNormalizedOffset(original: string, normalizedOffset: number): number {
  let origIdx = 0;
  let normCount = 0;
  let inWhitespace = false;

  while (origIdx < original.length && normCount < normalizedOffset) {
    const ch = original[origIdx];
    if (/\s/.test(ch)) {
      if (!inWhitespace) {
        normCount++; // one space in normalized
        inWhitespace = true;
      }
    } else {
      normCount++;
      inWhitespace = false;
    }
    origIdx++;
  }
  // Skip leading whitespace at the mapped position
  while (origIdx < original.length && /\s/.test(original[origIdx])) {
    origIdx++;
  }
  return origIdx;
}

export interface UseTTSHighlighterOptions {
  /** Function that returns the content documents (iframe docs for EPUB) */
  getContentDocuments: () => Document[];
  /**
   * Function that returns a Range for the currently visible text.
   * Used to narrow sentence search to the visible page in paginated layouts.
   */
  getVisibleRange?: () => Range | null;
  /**
   * Optional callback to scroll a highlighted element into view.
   * For EPUB (paginated iframes) the default scrollIntoView won't work,
   * so the caller can provide a custom implementation that, e.g., calls
   * IonContent.scrollToPoint or does nothing for paginated layouts.
   */
  onScrollToHighlight?: (element: HTMLElement, doc: Document) => void;
}

export interface UseTTSHighlighterReturn {
  /** Called when a sentence starts being spoken */
  onSentenceStart: (sentenceIndex: number, sentenceText: string) => void;
  /** Called on each word boundary event */
  onWordBoundary: (boundary: TTSWordBoundary) => void;
  /** Remove all highlights and clean up */
  clearHighlight: () => void;
}

export function useTTSHighlighter(
  options: UseTTSHighlighterOptions
): UseTTSHighlighterReturn {
  const getContentDocumentsRef = useRef(options.getContentDocuments);
  getContentDocumentsRef.current = options.getContentDocuments;

  const getVisibleRangeRef = useRef(options.getVisibleRange);
  getVisibleRangeRef.current = options.getVisibleRange;

  const onScrollToHighlightRef = useRef(options.onScrollToHighlight);
  onScrollToHighlightRef.current = options.onScrollToHighlight;

  // Track the current highlight state
  const highlightSpanRef = useRef<HTMLSpanElement | null>(null);
  const textNodeMapRef = useRef<TextNodeEntry[]>([]);
  const sentenceDocOffsetRef = useRef<number>(-1);
  const currentSentenceRef = useRef<string>('');
  const activeDocRef = useRef<Document | null>(null);

  /** Remove the current highlight span, unwrapping it back to a text node */
  const removeCurrentHighlight = useCallback(() => {
    const span = highlightSpanRef.current;
    if (!span) return;
    try {
      const parent = span.parentNode;
      if (parent) {
        const textNode = (span.ownerDocument || document).createTextNode(
          span.textContent || ''
        );
        parent.replaceChild(textNode, span);
        parent.normalize(); // merge adjacent text nodes
      }
    } catch {
      // Span might be detached
    }
    highlightSpanRef.current = null;
  }, []);

  /** Remove highlight and rebuild the text node map (since normalize changes nodes) */
  const removeHighlightAndRebuild = useCallback(() => {
    const hadHighlight = !!highlightSpanRef.current;
    removeCurrentHighlight();

    // After removing a highlight, the DOM has changed (normalize merges nodes).
    // Rebuild the text node map so subsequent operations use valid node refs.
    if (hadHighlight && activeDocRef.current) {
      const doc = activeDocRef.current;
      try {
        textNodeMapRef.current = buildTextNodeMap(doc);
        sentenceDocOffsetRef.current = findSentenceInDocument(
          textNodeMapRef.current,
          currentSentenceRef.current
        );
      } catch {
        // detached doc
      }
    }
  }, [removeCurrentHighlight]);

  /** Clear all highlights and reset state */
  const clearHighlight = useCallback(() => {
    removeCurrentHighlight();
    textNodeMapRef.current = [];
    sentenceDocOffsetRef.current = -1;
    currentSentenceRef.current = '';

    // Clean up injected styles
    const docs = getContentDocumentsRef.current();
    for (const doc of docs) {
      try {
        // Remove any lingering highlight spans
        const spans = doc.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
        spans.forEach((span) => {
          const parent = span.parentNode;
          if (parent) {
            const textNode = doc.createTextNode(span.textContent || '');
            parent.replaceChild(textNode, span);
            parent.normalize();
          }
        });
        removeStyleFromDoc(doc);
      } catch {
        // detached doc
      }
    }
    activeDocRef.current = null;
  }, [removeCurrentHighlight]);

  /** Called when a new sentence starts being spoken */
  const onSentenceStart = useCallback(
    (sentenceIndex: number, sentenceText: string) => {
      removeHighlightAndRebuild();
      currentSentenceRef.current = sentenceText;

      const docs = getContentDocumentsRef.current();

      // For paginated EPUB, try using the visible range first to narrow search
      // to only the text nodes on the current page.
      const visibleRange = getVisibleRangeRef.current?.();
      if (visibleRange && docs.length > 0) {
        const doc = docs[0];
        try {
          ensureStyleInjected(doc);
          const map = buildTextNodeMapFromRange(doc, visibleRange);
          const offset = findSentenceInDocument(map, sentenceText);
          if (offset >= 0) {
            textNodeMapRef.current = map;
            sentenceDocOffsetRef.current = offset;
            activeDocRef.current = doc;
            return;
          }
        } catch {
          // fall through to full document search
        }
      }

      // Fallback: search the full document(s)
      for (const doc of docs) {
        try {
          ensureStyleInjected(doc);
          const map = buildTextNodeMap(doc);
          const offset = findSentenceInDocument(map, sentenceText);
          if (offset >= 0) {
            textNodeMapRef.current = map;
            sentenceDocOffsetRef.current = offset;
            activeDocRef.current = doc;
            return;
          }
        } catch {
          // detached doc
        }
      }

      // Couldn't find the sentence; use first doc as fallback
      if (docs.length > 0) {
        try {
          ensureStyleInjected(docs[0]);
          textNodeMapRef.current = buildTextNodeMap(docs[0]);
          sentenceDocOffsetRef.current = -1;
          activeDocRef.current = docs[0];
        } catch {
          // detached doc
        }
      }
    },
    [removeHighlightAndRebuild]
  );

  /** Called on each word boundary event */
  const onWordBoundary = useCallback(
    (boundary: TTSWordBoundary) => {
      // Remove old highlight and rebuild map (since DOM changed from normalize)
      removeHighlightAndRebuild();

      const map = textNodeMapRef.current;
      const sentenceOffset = sentenceDocOffsetRef.current;
      const doc = activeDocRef.current;
      if (!map.length || sentenceOffset < 0 || !doc) return;

      // Compute the absolute offset of this word in the text node map text.
      // We need to account for possible whitespace normalization differences
      // between the TTS sentence text and the actual DOM text.
      const sentence = currentSentenceRef.current;
      const mapText = getMapText(map);
      const sentenceInMap = mapText.substring(sentenceOffset);

      // Find the word within the sentence portion of the map text
      let wordStartInDoc: number;
      let wordEndInDoc: number;

      if (boundary.word && boundary.word.length > 0) {
        // Try to find the word by searching in the sentence text from charIndex
        const normalizedSentenceMap = sentenceInMap.replace(/\s+/g, ' ');
        const normalizedSentence = sentence.replace(/\s+/g, ' ');

        // Map the boundary charIndex through normalization
        const normWord = boundary.word.trim();
        const searchFrom = Math.max(0, boundary.charIndex - 5);
        const wordPosInNorm = normalizedSentence.indexOf(normWord, searchFrom);

        if (wordPosInNorm >= 0) {
          // Find this word in the map text
          const wordInMapNorm = normalizedSentenceMap.indexOf(normWord, Math.max(0, wordPosInNorm - 10));
          if (wordInMapNorm >= 0) {
            const actualOffset = mapNormalizedOffset(sentenceInMap, wordInMapNorm);
            wordStartInDoc = sentenceOffset + actualOffset;
            wordEndInDoc = wordStartInDoc + normWord.length;
          } else {
            // Direct offset calculation
            wordStartInDoc = sentenceOffset + boundary.charIndex;
            wordEndInDoc = wordStartInDoc + boundary.charLength;
          }
        } else {
          wordStartInDoc = sentenceOffset + boundary.charIndex;
          wordEndInDoc = wordStartInDoc + boundary.charLength;
        }
      } else {
        wordStartInDoc = sentenceOffset + boundary.charIndex;
        wordEndInDoc = wordStartInDoc + boundary.charLength;
      }

      // Clamp to valid range
      const totalLen = map[map.length - 1]?.end ?? 0;
      wordStartInDoc = Math.max(0, Math.min(wordStartInDoc, totalLen));
      wordEndInDoc = Math.max(wordStartInDoc, Math.min(wordEndInDoc, totalLen));

      if (wordStartInDoc >= wordEndInDoc) return;

      // Find the text node(s) that contain this word
      for (const entry of map) {
        if (entry.end <= wordStartInDoc) continue;
        if (entry.start >= wordEndInDoc) break;

        const node = entry.node;
        const nodeText = node.textContent || '';
        // Calculate offsets relative to this text node
        const localStart = Math.max(0, wordStartInDoc - entry.start);
        const localEnd = Math.min(nodeText.length, wordEndInDoc - entry.start);

        if (localStart >= localEnd || localStart >= nodeText.length) continue;

        try {
          const range = doc.createRange();
          range.setStart(node, localStart);
          range.setEnd(node, localEnd);

          const span = doc.createElement('span');
          span.className = HIGHLIGHT_CLASS;
          range.surroundContents(span);

          highlightSpanRef.current = span;

          // Auto-scroll to keep the word visible
          if (onScrollToHighlightRef.current) {
            onScrollToHighlightRef.current(span, doc);
          } else {
            scrollIntoViewIfNeeded(span, doc);
          }
        } catch {
          // range operation failed (e.g. crossing node boundaries)
        }
        break;
      }
    },
    [removeHighlightAndRebuild]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const span = highlightSpanRef.current;
      if (span) {
        try {
          const parent = span.parentNode;
          if (parent) {
            const textNode = (span.ownerDocument || document).createTextNode(
              span.textContent || ''
            );
            parent.replaceChild(textNode, span);
            parent.normalize();
          }
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    onSentenceStart,
    onWordBoundary,
    clearHighlight,
  };
}

/** Scroll an element into view if it's not currently visible. */
function scrollIntoViewIfNeeded(element: HTMLElement, doc: Document): void {
  try {
    const win = doc.defaultView;
    if (!win) return;

    const isInIframe = win !== win.parent;

    if (isInIframe) {
      const iframeEl = win.frameElement as HTMLElement | null;
      if (!iframeEl) return;

      const elementRect = element.getBoundingClientRect();
      const iframeRect = iframeEl.getBoundingClientRect();

      const absTop = iframeRect.top + elementRect.top;
      const absBottom = iframeRect.top + elementRect.bottom;
      const parentHeight = win.parent.innerHeight || 0;

      const isOutOfParentView = absBottom < 0 || absTop > parentHeight;

      if (isOutOfParentView || absTop < 60 || absBottom > parentHeight - 60) {
        try {
          iframeEl.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        } catch {
          // ignore
        }
      }
    } else {
      const rect = element.getBoundingClientRect();
      const viewHeight = win.innerHeight || doc.documentElement.clientHeight;

      if (rect.bottom < 0 || rect.top > viewHeight || rect.top < 50 || rect.bottom > viewHeight - 50) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    }
  } catch {
    // ignore scroll errors
  }
}

export default useTTSHighlighter;
