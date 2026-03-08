/**
 * useBionicReading Hook
 * Applies bionic reading formatting to text/HTML content.
 *
 * Bionic reading bolds the first half of each word to help the eye
 * quickly scan through text while maintaining comprehension.
 *
 * React Native version: operates on HTML strings (for WebView-based readers)
 * rather than directly manipulating DOM nodes. Returns a `transformHtml`
 * function that takes an HTML string and returns transformed HTML.
 */

import { useCallback, useMemo } from 'react';

export interface BionicReadingOptions {
  /** Whether bionic reading is enabled */
  enabled?: boolean;
  /** Fraction of each word to bold (0-1, default 0.5) */
  boldFraction?: number;
  /** CSS class name for bolded parts (default 'br-bold') */
  boldClassName?: string;
  /** CSS class name for regular parts (default 'br-regular') */
  regularClassName?: string;
}

export interface UseBionicReadingReturn {
  /** Transform an HTML string with bionic reading formatting */
  transformHtml: (html: string) => string;
  /** Transform plain text to bionic-formatted HTML */
  transformText: (text: string) => string;
  /** CSS styles to inject into a WebView or style tag for bionic reading */
  bionicStyles: string;
  /** Whether bionic reading is currently enabled */
  isEnabled: boolean;
}

// Tags whose content should not be processed
const SKIP_TAG_PATTERN = /^(script|style|code|pre|samp|kbd|var|math|svg|canvas|video|audio|iframe)$/i;

/**
 * Calculate the number of characters to bold in a word
 */
function calculateBoldLength(word: string, fraction: number): number {
  if (word.length <= 1) return 0;
  if (word.length <= 3) return 1;
  return Math.max(1, Math.ceil(word.length * fraction));
}

/**
 * Check if a character is a word character (letter, number, or certain diacritics)
 */
function isWordChar(char: string): boolean {
  return /[\w\u00C0-\u024F\u1E00-\u1EFF]/.test(char);
}

/**
 * Split text into tokens: words and non-word separators
 */
function tokenize(text: string): string[] {
  const result: string[] = [];
  let currentWord = '';
  let currentSep = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (isWordChar(char)) {
      if (currentSep) {
        result.push(currentSep);
        currentSep = '';
      }
      currentWord += char;
    } else {
      if (currentWord) {
        result.push(currentWord);
        currentWord = '';
      }
      currentSep += char;
    }
  }

  if (currentWord) result.push(currentWord);
  if (currentSep) result.push(currentSep);

  return result;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Apply bionic formatting to a plain text string, returning HTML
 */
function bionicifyText(
  text: string,
  boldFraction: number,
  boldClassName: string,
  regularClassName: string
): string {
  const tokens = tokenize(text);
  let output = '';

  for (const token of tokens) {
    if (!isWordChar(token[0])) {
      // Non-word token: whitespace or punctuation - preserve as-is
      output += escapeHtml(token);
      continue;
    }

    const boldLen = calculateBoldLength(token, boldFraction);
    if (boldLen === 0) {
      output += escapeHtml(token);
      continue;
    }

    const boldPart = escapeHtml(token.substring(0, boldLen));
    const regularPart = escapeHtml(token.substring(boldLen));
    output += `<span class="${boldClassName}">${boldPart}</span><span class="${regularClassName}">${regularPart}</span>`;
  }

  return output;
}

/**
 * Transform HTML content by applying bionic reading to text nodes.
 * Uses a regex-based approach to avoid DOM dependency (since RN has no document).
 *
 * The approach:
 * 1. Split the HTML on tags
 * 2. Track which tags we are inside
 * 3. Only transform text that is outside skip-tags
 */
function transformHtmlContent(
  html: string,
  boldFraction: number,
  boldClassName: string,
  regularClassName: string
): string {
  // Regex to split on HTML tags, capturing the tags
  const tagRegex = /(<\/?[a-zA-Z][^>]*\/?>)/g;
  const parts = html.split(tagRegex);

  const skipStack: string[] = [];
  let output = '';

  for (const part of parts) {
    if (!part) continue;

    // Check if this part is an HTML tag
    const openMatch = part.match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
    const closeMatch = part.match(/^<\/([a-zA-Z][a-zA-Z0-9]*)/);

    if (openMatch) {
      const tagName = openMatch[1];
      // Self-closing tags (like <br />, <img />) don't push to stack
      const isSelfClosing = part.endsWith('/>');
      if (!isSelfClosing && SKIP_TAG_PATTERN.test(tagName)) {
        skipStack.push(tagName.toLowerCase());
      }
      output += part;
    } else if (closeMatch) {
      const tagName = closeMatch[1].toLowerCase();
      // Pop from skip stack if matching
      const idx = skipStack.lastIndexOf(tagName);
      if (idx !== -1) {
        skipStack.splice(idx, 1);
      }
      output += part;
    } else {
      // Text node
      if (skipStack.length > 0 || !part.trim()) {
        // Inside a skip-tag or empty text: leave as-is
        output += part;
      } else {
        output += bionicifyText(part, boldFraction, boldClassName, regularClassName);
      }
    }
  }

  return output;
}

/**
 * Main hook for bionic reading functionality
 */
export const useBionicReading = (options: BionicReadingOptions = {}): UseBionicReadingReturn => {
  const {
    enabled = false,
    boldFraction = 0.5,
    boldClassName = 'br-bold',
    regularClassName = 'br-regular',
  } = options;

  const transformHtml = useCallback(
    (html: string): string => {
      if (!enabled) return html;
      return transformHtmlContent(html, boldFraction, boldClassName, regularClassName);
    },
    [enabled, boldFraction, boldClassName, regularClassName]
  );

  const transformText = useCallback(
    (text: string): string => {
      if (!enabled) return escapeHtml(text);
      return bionicifyText(text, boldFraction, boldClassName, regularClassName);
    },
    [enabled, boldFraction, boldClassName, regularClassName]
  );

  const bionicStyles = useMemo(
    () =>
      enabled
        ? `
.${boldClassName} {
  font-weight: 700;
}
.${regularClassName} {
  font-weight: 400;
  opacity: 0.8;
}
`
        : '',
    [enabled, boldClassName, regularClassName]
  );

  return {
    transformHtml,
    transformText,
    bionicStyles,
    isEnabled: enabled,
  };
};

export default useBionicReading;
