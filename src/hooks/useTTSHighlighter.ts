/**
 * useTTSHighlighter Hook
 *
 * Highlights the currently spoken word in the rendered text, synchronized
 * with TTS word boundary events. Works with both EPUB (iframe-based) and
 * scroll-based (main document) readers.
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
  background-color: rgba(255, 213, 79, 0.6);
  border-radius: 2px;
  padding: 0 1px;
  transition: background-color 0.1s ease;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
`;

const STYLE_ID = 'tts-highlighter-style';

interface TextNodeEntry {
  node: Text;
  start: number;
  end: number;
}

/**
 * Build an array mapping character offsets (within `body.innerText`) to
 * their owning text nodes. This lets us locate any word by char index.
 */
function buildTextNodeMap(doc: Document): TextNodeEntry[] {
  const body = doc.body;
  if (!body) return [];

  const entries: TextNodeEntry[] = [];
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      // Skip text inside our highlight spans (shouldn't exist yet, but guard)
      const parent = node.parentElement;
      if (parent?.classList.contains(HIGHLIGHT_CLASS)) return NodeFilter.FILTER_REJECT;
      // Skip hidden elements and script/style
      if (parent?.tagName === 'SCRIPT' || parent?.tagName === 'STYLE') {
        return NodeFilter.FILTER_REJECT;
      }
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

/**
 * Find the text that matches a sentence in the document's text content.
 * Returns the character offset where the sentence starts in the document.
 */
function findSentenceInDocument(
  textNodeMap: TextNodeEntry[],
  sentence: string
): number {
  if (textNodeMap.length === 0) return -1;
  // Build full text from the text node map
  let fullText = '';
  for (const entry of textNodeMap) {
    fullText += entry.node.textContent || '';
  }

  // Try exact match first
  const idx = fullText.indexOf(sentence);
  if (idx >= 0) return idx;

  // Try with normalized whitespace
  const normalizedFull = fullText.replace(/\s+/g, ' ');
  const normalizedSentence = sentence.replace(/\s+/g, ' ').trim();
  const normIdx = normalizedFull.indexOf(normalizedSentence);
  if (normIdx >= 0) return normIdx;

  return -1;
}

export interface UseTTSHighlighterOptions {
  /** Function that returns the content documents (iframe docs for EPUB) */
  getContentDocuments: () => Document[];
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
      removeCurrentHighlight();
      currentSentenceRef.current = sentenceText;

      const docs = getContentDocumentsRef.current();
      // Find the document that contains this sentence text
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
    [removeCurrentHighlight]
  );

  /** Called on each word boundary event */
  const onWordBoundary = useCallback(
    (boundary: TTSWordBoundary) => {
      removeCurrentHighlight();

      const map = textNodeMapRef.current;
      const sentenceOffset = sentenceDocOffsetRef.current;
      const doc = activeDocRef.current;
      if (!map.length || sentenceOffset < 0 || !doc) return;

      // Compute the absolute offset of this word in the document text
      const wordStartInDoc = sentenceOffset + boundary.charIndex;
      const wordEndInDoc = wordStartInDoc + boundary.charLength;

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
          // Split the text node and wrap the word in a highlight span
          const range = doc.createRange();
          range.setStart(node, localStart);
          range.setEnd(node, localEnd);

          const span = doc.createElement('span');
          span.className = HIGHLIGHT_CLASS;
          range.surroundContents(span);

          highlightSpanRef.current = span;

          // Auto-scroll to keep the word visible
          scrollIntoViewIfNeeded(span, doc);

          // We found the word; rebuild the text node map for next boundary
          // (since we just modified the DOM by inserting a span)
          textNodeMapRef.current = buildTextNodeMap(doc);
          // Adjust the sentence offset since DOM was modified - the text
          // content of the document hasn't changed, only the nodes
          sentenceDocOffsetRef.current = findSentenceInDocument(
            textNodeMapRef.current,
            currentSentenceRef.current
          );
        } catch {
          // range operation failed (e.g. crossing node boundaries)
        }
        break;
      }
    },
    [removeCurrentHighlight]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Use a local ref copy for cleanup
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

/** Scroll an element into view if it's not currently visible */
function scrollIntoViewIfNeeded(element: HTMLElement, doc: Document): void {
  try {
    const win = doc.defaultView;
    if (!win) return;

    const rect = element.getBoundingClientRect();
    const viewHeight = win.innerHeight || doc.documentElement.clientHeight;
    const viewWidth = win.innerWidth || doc.documentElement.clientWidth;

    // Check if the element is outside the visible viewport
    const isOutOfView =
      rect.bottom < 0 ||
      rect.top > viewHeight ||
      rect.right < 0 ||
      rect.left > viewWidth;

    if (isOutOfView) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    } else if (rect.top < 50 || rect.bottom > viewHeight - 50) {
      // Near the edge of viewport, scroll to center
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  } catch {
    // ignore scroll errors
  }
}

export default useTTSHighlighter;
