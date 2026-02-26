/**
 * useBionicReading Hook
 * Applies bionic reading formatting to text content.
 *
 * Bionic reading bolds the first half of each word to help
 * the eye quickly scan through text while maintaining comprehension.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

export interface BionicReadingOptions {
  /** Whether bionic reading is enabled */
  enabled?: boolean;
  /** Fraction of each word to bold (0-1, default 0.5) */
  boldFraction?: number;
  /** CSS class name for bolded parts */
  boldClassName?: string;
  /** CSS class name for regular parts */
  regularClassName?: string;
  /** CSS class name for word wrapper */
  wordClassName?: string;
  /** Selector for content to process (default: direct children) */
  contentSelector?: string;
}

export interface UseBionicReadingReturn {
  /** Apply bionic reading to content */
  applyBionicReading: () => void;
  /** Remove bionic reading formatting */
  removeBionicReading: () => void;
  /** Ref to the container element */
  containerRef: React.RefObject<HTMLDivElement>;
}

const DEFAULT_OPTIONS: Required<Omit<BionicReadingOptions, 'contentSelector'>> & {
  contentSelector?: string;
} = {
  enabled: false,
  boldFraction: 0.5,
  boldClassName: 'word-bold',
  regularClassName: 'word-regular',
  wordClassName: 'word',
  contentSelector: undefined,
};

// Tags to skip when processing (script, style, code, pre, etc.)
const SKIP_TAGS = new Set([
  'script',
  'style',
  'code',
  'pre',
  'samp',
  'kbd',
  'var',
  'math',
  'svg',
  'canvas',
  'video',
  'audio',
  'iframe',
]);

/**
 * Check if a node should be skipped during bionic reading processing
 */
function shouldSkipNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false;
  const tagName = node.tagName.toLowerCase();
  return SKIP_TAGS.has(tagName);
}

/**
 * Calculate the number of characters to bold in a word
 */
function calculateBoldLength(word: string, fraction: number): number {
  const trimmed = word.trim();
  if (trimmed.length <= 1) return 0;
  if (trimmed.length <= 3) return 1;
  return Math.max(1, Math.ceil(trimmed.length * fraction));
}

/**
 * Check if a character is a word character (letter, number, or certain diacritics)
 */
function isWordChar(char: string): boolean {
  return /[\w\u00C0-\u024F\u1E00-\u1EFF]/.test(char);
}

/**
 * Split text into words while preserving whitespace
 */
function splitIntoWords(text: string): string[] {
  const result: string[] = [];
  let currentWord = '';
  let currentSpace = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (isWordChar(char)) {
      if (currentSpace) {
        result.push(currentSpace);
        currentSpace = '';
      }
      currentWord += char;
    } else {
      if (currentWord) {
        result.push(currentWord);
        currentWord = '';
      }
      currentSpace += char;
    }
  }

  // Don't forget the last word/space
  if (currentWord) result.push(currentWord);
  if (currentSpace) result.push(currentSpace);

  return result;
}

/**
 * Apply bionic reading formatting to a single text node
 */
function processTextNode(
  textNode: Text,
  options: Required<Omit<BionicReadingOptions, 'contentSelector'>>
): void {
  const text = textNode.textContent || '';
  if (!text.trim()) return;

  const parts = splitIntoWords(text);
  if (parts.length <= 1) return; // Only whitespace or single word

  const fragment = document.createDocumentFragment();

  parts.forEach((part) => {
    if (!part.trim()) {
      // Whitespace - add as text node
      fragment.appendChild(document.createTextNode(part));
      return;
    }

    const boldLength = calculateBoldLength(part, options.boldFraction);
    if (boldLength === 0) {
      fragment.appendChild(document.createTextNode(part));
      return;
    }

    // Create word wrapper
    const wordSpan = document.createElement('span');
    wordSpan.className = options.wordClassName;

    // Bold part
    const boldSpan = document.createElement('span');
    boldSpan.className = options.boldClassName;
    boldSpan.textContent = part.substring(0, boldLength);

    // Regular part
    const regularSpan = document.createElement('span');
    regularSpan.className = options.regularClassName;
    regularSpan.textContent = part.substring(boldLength);

    wordSpan.appendChild(boldSpan);
    wordSpan.appendChild(regularSpan);
    fragment.appendChild(wordSpan);
  });

  // Replace the text node with the fragment
  textNode.parentNode?.replaceChild(fragment, textNode);
}

/**
 * Main hook for bionic reading functionality
 */
export const useBionicReading = (options: BionicReadingOptions = {}): UseBionicReadingReturn => {
  const mergedOptions = useMemo(
    () => ({
      ...DEFAULT_OPTIONS,
      ...options,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      options.enabled,
      options.boldFraction,
      options.boldClassName,
      options.regularClassName,
      options.wordClassName,
      options.contentSelector,
    ]
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef<Set<Document>>(new Set());

  const applyBionicReading = useCallback(() => {
    const container = containerRef.current;
    if (!container || !mergedOptions.enabled) return;

    // Clear previous processing
    processedRef.current.clear();

    // Find the root element to process
    const rootElement = mergedOptions.contentSelector
      ? container.querySelector(mergedOptions.contentSelector)
      : container;

    if (!rootElement) return;

    // Use TreeWalker to find all text nodes
    const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // Skip empty nodes
        if (!node.textContent?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip nodes inside certain tags
        let parent = node.parentElement;
        while (parent) {
          if (shouldSkipNode(parent)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent === rootElement) break;
          parent = parent.parentElement;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    // Process each text node
    textNodes.forEach((textNode) => {
      processTextNode(textNode, mergedOptions);
      // Track that we've processed this document
      const doc = textNode.ownerDocument;
      if (doc) {
        processedRef.current.add(doc);
      }
    });
  }, [mergedOptions]);

  const removeBionicReading = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Remove all bionic reading formatting
    const wordElements = container.querySelectorAll(`.${mergedOptions.wordClassName}`);
    wordElements.forEach((el) => {
      const textContent = el.textContent || '';
      const textNode = document.createTextNode(textContent);
      el.parentNode?.replaceChild(textNode, el);
    });

    processedRef.current.clear();
  }, [mergedOptions.wordClassName]);

  // Auto-apply when enabled option changes
  useEffect(() => {
    if (mergedOptions.enabled) {
      // Small delay to ensure content is rendered
      const timeoutId = setTimeout(() => {
        applyBionicReading();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      removeBionicReading();
    }
  }, [mergedOptions.enabled]);

  return {
    applyBionicReading,
    removeBionicReading,
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
  };
};

export default useBionicReading;
