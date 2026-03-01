/**
 * Interlinear Translation Service
 *
 * Platform-aware paragraph translation with caching.
 * - Android: Uses @capacitor-mlkit/translation for offline on-device translation.
 * - Web: Falls back to LibreTranslate via translationService.
 */

import { Capacitor } from '@capacitor/core';
import { translationService } from './translationService';

// Lazy-loaded MLKit Translation module (Android only)
type MlkitModule = typeof import('@capacitor-mlkit/translation');
let mlkitTranslation: MlkitModule | null = null;

async function getMlkit(): Promise<MlkitModule> {
  if (!mlkitTranslation) {
    mlkitTranslation = await import('@capacitor-mlkit/translation');
  }
  return mlkitTranslation;
}

// In-memory cache keyed by "sourceLang|targetLang|text"
const cache = new Map<string, string>();

function cacheKey(sourceLang: string, targetLang: string, text: string): string {
  return `${sourceLang}|${targetLang}|${text}`;
}

/**
 * Translate a paragraph of text.
 * Uses MLKit on native platforms, LibreTranslate on web.
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

  let translated: string;

  if (Capacitor.isNativePlatform()) {
    const mlkit = await getMlkit();
    const result = await mlkit.Translation.translate({
      text,
      sourceLanguage: sourceLang as any,
      targetLanguage: targetLang as any,
    });
    translated = result.text;
  } else {
    const result = await translationService.translate(text, sourceLang, targetLang);
    translated = result.translatedText;
  }

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
 * Ensure the MLKit language model is downloaded (Android only).
 * No-op on web.
 */
export async function ensureModelDownloaded(lang: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const mlkit = await getMlkit();
  await mlkit.Translation.downloadModel({ language: lang as any });
}

/**
 * Get list of downloaded MLKit models (Android only).
 * Returns empty array on web.
 */
export async function getDownloadedModels(): Promise<string[]> {
  if (!Capacitor.isNativePlatform()) return [];
  const mlkit = await getMlkit();
  const result = await mlkit.Translation.getDownloadedModels();
  return result.languages as any as string[];
}
