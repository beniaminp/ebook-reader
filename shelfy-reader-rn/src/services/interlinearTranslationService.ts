/**
 * Interlinear Translation Service
 *
 * Platform-aware paragraph translation with caching.
 * React Native version:
 * - Uses Google Translate free endpoint with MyMemory fallback (same as Ionic web path)
 * - No MLKit dependency (could be added later via react-native-mlkit-translate)
 * - Uses the RN languageIdentificationService for auto-detect
 */

import { identifyLanguage } from './languageIdentificationService';

// In-memory cache keyed by "sourceLang|targetLang|text"
const cache = new Map<string, string>();

function cacheKey(sourceLang: string, targetLang: string, text: string): string {
  return `${sourceLang}|${targetLang}|${text}`;
}

/**
 * Translate text using Google Translate free endpoint (primary backend).
 * No API key required, generous rate limits.
 */
async function translateWithGoogle(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
  const params = new URLSearchParams({
    client: 'gtx',
    sl,
    tl: targetLang,
    dt: 't',
    q: text,
  });

  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Google Translate API error: ${response.status}`);
  }

  const data = await response.json();

  // Response format: [[["translated","original",...],...],...]
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const translated = data[0]
      .filter((segment: unknown) => Array.isArray(segment) && (segment as any[])[0])
      .map((segment: unknown[]) => segment[0])
      .join('');
    if (translated) return translated;
  }

  throw new Error('Unexpected Google Translate response format');
}

/**
 * Translate text using MyMemory API (fallback).
 */
async function translateWithMyMemory(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const langPair =
    sourceLang === 'auto'
      ? `autodetect|${targetLang}`
      : `${sourceLang}|${targetLang}`;

  const params = new URLSearchParams({
    q: text,
    langpair: langPair,
  });

  const response = await fetch(
    `https://api.mymemory.translated.net/get?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`MyMemory API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    return data.responseData.translatedText;
  }

  throw new Error(data.responseDetails || 'Translation failed');
}

/**
 * Translate text with fallback chain: Google -> MyMemory.
 */
async function translateOnline(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  try {
    return await translateWithGoogle(text, sourceLang, targetLang);
  } catch (googleErr) {
    console.warn('[Interlinear] Google Translate failed, trying MyMemory:', googleErr);
    return await translateWithMyMemory(text, sourceLang, targetLang);
  }
}

/**
 * Translate a paragraph of text.
 * Uses online translation APIs with caching.
 *
 * TODO: Add offline MLKit support via react-native-mlkit-translate
 */
export async function translateParagraph(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text.trim()) return '';
  if (sourceLang === targetLang) return text;

  const key = cacheKey(sourceLang, targetLang, text);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  // Resolve 'auto' via language identification
  let resolvedSourceLang = sourceLang;
  if (sourceLang === 'auto') {
    resolvedSourceLang = await identifyLanguage(text);
  }

  if (resolvedSourceLang === targetLang) return text;

  const translated = await translateOnline(text, resolvedSourceLang, targetLang);

  cache.set(key, translated);
  return translated;
}

/**
 * Clear the translation cache.
 */
export function clearInterlinearCache(): void {
  cache.clear();
}

/**
 * Ensure the translation model is downloaded (no-op in RN web-only mode).
 * TODO: Implement with react-native-mlkit-translate for offline support.
 */
export async function ensureModelDownloaded(_lang: string): Promise<void> {
  // No-op: RN version uses online translation only
}

/**
 * Get list of downloaded models (empty in RN web-only mode).
 * TODO: Implement with react-native-mlkit-translate for offline support.
 */
export async function getDownloadedModels(): Promise<string[]> {
  return [];
}

/**
 * Delete a downloaded model (no-op in RN web-only mode).
 * TODO: Implement with react-native-mlkit-translate for offline support.
 */
export async function deleteDownloadedModel(_lang: string): Promise<void> {
  // No-op
}
