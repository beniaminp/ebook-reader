/**
 * Word Wise Service
 *
 * Kindle-like "Word Wise" feature: shows short definitions above difficult words
 * using HTML <ruby> annotations. Uses the same platform-aware translation approach
 * as interlinear translations.
 *
 * - Android: MLKit Translation via translateParagraph() for offline word hints
 * - Web: Free Dictionary API via dictionaryService for English definitions
 */

import { Capacitor } from '@capacitor/core';
import { shouldAnnotateWord } from '../data/wordFrequency';
import { translateParagraph } from './interlinearTranslationService';
import { dictionaryService } from './dictionaryService';

// In-memory cache for word hints: "word|lang?" → short hint
const hintCache = new Map<string, string>();

// Set of words we already tried and failed to get hints for
const failedWords = new Set<string>();

function hintKey(word: string, targetLang?: string): string {
  return `${word.toLowerCase()}|${targetLang || ''}`;
}

/**
 * Get a short hint/definition for a word.
 *
 * On Android (native): uses MLKit to translate the word.
 * On Web: uses the Free Dictionary API to get a short definition.
 */
async function getWordHint(word: string, targetLang?: string): Promise<string | null> {
  const key = hintKey(word, targetLang);
  if (hintCache.has(key)) return hintCache.get(key)!;
  if (failedWords.has(key)) return null;

  try {
    let hint: string | null = null;

    if (Capacitor.isNativePlatform() && targetLang) {
      // Android: translate the word
      const translated = await translateParagraph(word.toLowerCase(), 'en', targetLang);
      if (translated && translated.toLowerCase() !== word.toLowerCase()) {
        hint = translated;
      }
    } else {
      // Web: look up in dictionary
      const result = await dictionaryService.lookup(word);
      if (result.found && result.meanings.length > 0) {
        const firstDef = result.meanings[0]?.definitions?.[0]?.definition;
        if (firstDef) {
          // Truncate to a short hint (max ~40 chars)
          hint = firstDef.length > 40 ? firstDef.slice(0, 37) + '...' : firstDef;
        }
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
 * Returns array of { word, isWord } objects.
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

const PROCESSED_ATTR = 'data-wordwise-processed';

/**
 * Apply Word Wise annotations to a document.
 * Walks text nodes in content elements, identifies difficult words,
 * and wraps them in <ruby> elements with hints.
 */
export async function applyWordWise(
  doc: Document,
  level: number,
  targetLang?: string
): Promise<void> {
  const elements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption');

  // First pass: collect all words that need annotation
  const wordsToAnnotate = new Set<string>();
  for (const el of elements) {
    if (el.getAttribute(PROCESSED_ATTR)) continue;
    const text = el.textContent || '';
    const tokens = tokenize(text);
    for (const token of tokens) {
      if (token.isWord && shouldAnnotateWord(token.text, level)) {
        wordsToAnnotate.add(token.text.toLowerCase());
      }
    }
  }

  if (wordsToAnnotate.size === 0) return;

  // Batch-fetch hints (with concurrency limit)
  const BATCH_SIZE = 10;
  const wordArray = Array.from(wordsToAnnotate);
  for (let i = 0; i < wordArray.length; i += BATCH_SIZE) {
    const batch = wordArray.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((w) => getWordHint(w, targetLang)));
  }

  // Second pass: apply annotations
  let annotatedCount = 0;
  for (const el of elements) {
    if (el.getAttribute(PROCESSED_ATTR)) continue;

    // Collect text nodes
    const textNodes: Text[] = [];
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        // Skip text inside existing ruby/rt elements
        const parent = node.parentElement;
        if (parent && (parent.tagName === 'RT' || parent.tagName === 'RUBY' || parent.tagName === 'RP')) {
          return NodeFilter.FILTER_REJECT;
        }
        if ((node.textContent || '').trim().length === 0) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let textNode: Text | null;
    while ((textNode = walker.nextNode() as Text | null)) {
      textNodes.push(textNode);
    }

    for (const tNode of textNodes) {
      const nodeText = tNode.textContent || '';
      const tokens = tokenize(nodeText);

      // Check if any token in this text node needs annotation
      let hasAnnotation = false;
      for (const token of tokens) {
        if (token.isWord && shouldAnnotateWord(token.text, level)) {
          const hint = hintCache.get(hintKey(token.text, targetLang));
          if (hint) {
            hasAnnotation = true;
            break;
          }
        }
      }

      if (!hasAnnotation) continue;

      // Build replacement fragment
      const fragment = doc.createDocumentFragment();
      for (const token of tokens) {
        if (token.isWord && shouldAnnotateWord(token.text, level)) {
          const hint = hintCache.get(hintKey(token.text, targetLang));
          if (hint) {
            const ruby = doc.createElement('ruby');
            ruby.className = 'word-wise-annotation';
            ruby.textContent = token.text;
            const rt = doc.createElement('rt');
            rt.textContent = hint;
            ruby.appendChild(rt);
            fragment.appendChild(ruby);
            annotatedCount++;
            continue;
          }
        }
        fragment.appendChild(doc.createTextNode(token.text));
      }

      tNode.parentNode?.replaceChild(fragment, tNode);
    }

    el.setAttribute(PROCESSED_ATTR, 'true');
  }

  console.log(`[WordWise] Annotated ${annotatedCount} words at level ${level}`);
}

/**
 * Remove all Word Wise annotations from a document.
 * Replaces <ruby class="word-wise-annotation"> elements with plain text.
 */
export function removeWordWise(doc: Document): void {
  // Replace ruby elements with their base text
  doc.querySelectorAll('ruby.word-wise-annotation').forEach((ruby) => {
    const baseText = ruby.childNodes[0]?.textContent || '';
    const textNode = doc.createTextNode(baseText);
    ruby.parentNode?.replaceChild(textNode, ruby);
  });

  // Clear processed markers
  doc.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach((el) => {
    el.removeAttribute(PROCESSED_ATTR);
  });
}

/**
 * Clear the in-memory hint cache.
 */
export function clearWordWiseCache(): void {
  hintCache.clear();
  failedWords.clear();
}
