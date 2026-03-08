/**
 * Word Wise Service
 *
 * Kindle-like "Word Wise" feature: shows short definitions above difficult words
 * using HTML <ruby> annotations. Processes text and returns annotated HTML
 * that can be rendered in a WebView.
 *
 * React Native version:
 * - No DOM manipulation (document.createTreeWalker, etc.)
 * - Instead, provides functions to annotate raw text/HTML strings
 * - Uses dictionaryService for word definitions (same as Ionic web fallback)
 * - Does NOT use MLKit or Capacitor (those are Ionic-native)
 * - Same word frequency data for difficulty classification
 */

import { shouldAnnotateWord } from '../data/wordFrequency';
import { dictionaryService } from './dictionaryService';

// In-memory cache for word hints: "word|lang?" -> short hint
const hintCache = new Map<string, string>();

// Set of words we already tried and failed to get hints for
const failedWords = new Set<string>();

function hintKey(word: string, targetLang?: string): string {
  return `${word.toLowerCase()}|${targetLang || ''}`;
}

/**
 * Get a short hint/definition for a word.
 * Uses the Free Dictionary API to get a short definition.
 */
async function getWordHint(word: string, targetLang?: string): Promise<string | null> {
  const key = hintKey(word, targetLang);
  if (hintCache.has(key)) return hintCache.get(key)!;
  if (failedWords.has(key)) return null;

  try {
    let hint: string | null = null;

    // TODO: Add native translation support (e.g., MLKit) when targetLang is set
    // For now, always use dictionary lookup
    const result = await dictionaryService.lookup(word);
    if (result.found && result.meanings.length > 0) {
      const firstDef = result.meanings[0]?.definitions?.[0]?.definition;
      if (firstDef) {
        // Truncate to a short hint (max ~40 chars)
        hint = firstDef.length > 40 ? firstDef.slice(0, 37) + '...' : firstDef;
      }
    }

    if (hint) {
      hintCache.set(key, hint);
      return hint;
    }

    failedWords.add(key);
    return null;
  } catch (err) {
    console.error('[WordWise] Failed to get hint for:', word, err);
    failedWords.add(key);
    return null;
  }
}

/**
 * Tokenize text into words and non-word segments.
 * Returns array of { text, isWord } objects.
 */
function tokenize(text: string): Array<{ text: string; isWord: boolean }> {
  const tokens: Array<{ text: string; isWord: boolean }> = [];
  // Match sequences of word characters (including hyphens within words)
  // or sequences of non-word characters
  const regex = /([a-zA-Z](?:[a-zA-Z'-]*[a-zA-Z])?)|([^a-zA-Z]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      tokens.push({ text: match[1], isWord: true });
    } else if (match[2]) {
      tokens.push({ text: match[2], isWord: false });
    }
  }
  return tokens;
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Annotate a plain text string with Word Wise ruby annotations.
 * Returns an HTML string with <ruby> elements for difficult words.
 *
 * This is the primary API for React Native — instead of manipulating
 * a DOM document, we process text strings directly.
 */
export async function annotateText(
  text: string,
  level: number,
  targetLang?: string
): Promise<string> {
  const tokens = tokenize(text);

  // Collect words that need annotation
  const wordsToAnnotate = new Set<string>();
  for (const token of tokens) {
    if (token.isWord && shouldAnnotateWord(token.text, level)) {
      wordsToAnnotate.add(token.text.toLowerCase());
    }
  }

  if (wordsToAnnotate.size === 0) {
    return escapeHtml(text);
  }

  // Batch-fetch hints (with concurrency limit)
  const BATCH_SIZE = 10;
  const wordArray = Array.from(wordsToAnnotate);
  for (let i = 0; i < wordArray.length; i += BATCH_SIZE) {
    const batch = wordArray.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((w) => getWordHint(w, targetLang)));
  }

  // Build annotated HTML
  let html = '';
  for (const token of tokens) {
    if (token.isWord && shouldAnnotateWord(token.text, level)) {
      const hint = hintCache.get(hintKey(token.text, targetLang));
      if (hint) {
        html += `<ruby class="word-wise-annotation">${escapeHtml(token.text)}<rt>${escapeHtml(hint)}</rt></ruby>`;
        continue;
      }
    }
    html += escapeHtml(token.text);
  }

  return html;
}

/**
 * Annotate HTML content with Word Wise ruby annotations.
 *
 * This processes text nodes within the HTML. It uses a simple regex-based
 * approach to find text between tags, since we don't have DOM access in RN.
 *
 * Note: This is a best-effort implementation. For complex HTML structures,
 * consider using the WebView's JavaScript injection to apply annotations
 * using the DOM-based approach from the Ionic version.
 */
export async function annotateHtml(
  html: string,
  level: number,
  targetLang?: string
): Promise<string> {
  // Extract all unique words from the HTML text content
  const textContent = html.replace(/<[^>]+>/g, ' ');
  const tokens = tokenize(textContent);

  const wordsToAnnotate = new Set<string>();
  for (const token of tokens) {
    if (token.isWord && shouldAnnotateWord(token.text, level)) {
      wordsToAnnotate.add(token.text.toLowerCase());
    }
  }

  if (wordsToAnnotate.size === 0) {
    return html;
  }

  // Batch-fetch hints
  const BATCH_SIZE = 10;
  const wordArray = Array.from(wordsToAnnotate);
  for (let i = 0; i < wordArray.length; i += BATCH_SIZE) {
    const batch = wordArray.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((w) => getWordHint(w, targetLang)));
  }

  // Build a set of words that have hints
  const annotatedWords = new Set<string>();
  for (const word of wordsToAnnotate) {
    if (hintCache.has(hintKey(word, targetLang))) {
      annotatedWords.add(word);
    }
  }

  if (annotatedWords.size === 0) {
    return html;
  }

  // Replace words in text segments (between HTML tags)
  // Split HTML into tag/text segments
  const segments = html.split(/(<[^>]+>)/);
  const result: string[] = [];

  for (const segment of segments) {
    if (segment.startsWith('<')) {
      // It's an HTML tag - pass through
      result.push(segment);
    } else if (segment.trim()) {
      // It's text content - process words
      const segTokens = tokenize(segment);
      let annotatedSegment = '';
      for (const token of segTokens) {
        if (
          token.isWord &&
          shouldAnnotateWord(token.text, level) &&
          annotatedWords.has(token.text.toLowerCase())
        ) {
          const hint = hintCache.get(hintKey(token.text, targetLang));
          if (hint) {
            annotatedSegment += `<ruby class="word-wise-annotation">${escapeHtml(token.text)}<rt>${escapeHtml(hint)}</rt></ruby>`;
            continue;
          }
        }
        annotatedSegment += escapeHtml(token.text);
      }
      result.push(annotatedSegment);
    } else {
      result.push(segment);
    }
  }

  return result.join('');
}

/**
 * Generate a JavaScript snippet for WebView injection that applies
 * Word Wise annotations using the DOM-based approach.
 *
 * This is the recommended approach for React Native: inject this script
 * into the reader WebView to annotate content using proper DOM manipulation.
 */
export function getWordWiseInjectionScript(level: number, _targetLang?: string): string {
  // Build word frequency map entries for injection
  return `
    (function() {
      // Word Wise level: ${level}
      // This script should be injected into the reader WebView
      // along with the word frequency data and hint cache.
      // TODO: Implement full DOM-based Word Wise via WebView injection
      console.log('[WordWise] Injection script placeholder - level:', ${level});
    })();
  `;
}

/**
 * Remove Word Wise annotations from HTML string.
 * Replaces <ruby class="word-wise-annotation">word<rt>hint</rt></ruby>
 * with just the word text.
 */
export function removeWordWiseFromHtml(html: string): string {
  return html.replace(
    /<ruby class="word-wise-annotation">([^<]*)<rt>[^<]*<\/rt><\/ruby>/g,
    '$1'
  );
}

/**
 * Clear the in-memory hint cache.
 */
export function clearWordWiseCache(): void {
  hintCache.clear();
  failedWords.clear();
}
