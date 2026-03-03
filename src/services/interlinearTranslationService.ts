/**
 * Interlinear Translation Service
 *
 * Platform-aware paragraph translation with caching.
 * - Android: Uses @capacitor-mlkit/translation for offline on-device translation.
 * - Web: Uses Google Translate free endpoint with MyMemory fallback.
 */

import { Capacitor } from '@capacitor/core';

// Lazy-loaded MLKit Translation module (Android only)
type MlkitModule = typeof import('@capacitor-mlkit/translation');
let mlkitTranslation: MlkitModule | null = null;

async function getMlkit(): Promise<MlkitModule> {
  if (!mlkitTranslation) {
    mlkitTranslation = await import('@capacitor-mlkit/translation');
  }
  return mlkitTranslation;
}

// Track which MLKit models have been downloaded this session
const downloadedModels = new Set<string>();

// In-memory cache keyed by "sourceLang|targetLang|text"
const cache = new Map<string, string>();

function cacheKey(sourceLang: string, targetLang: string, text: string): string {
  return `${sourceLang}|${targetLang}|${text}`;
}

/**
 * Translate text using Google Translate free endpoint (primary web backend).
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
      .filter((segment: unknown) => Array.isArray(segment) && segment[0])
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
  const langPair = sourceLang === 'auto'
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
 * Translate text on web with fallback chain: Google → MyMemory.
 */
async function translateOnWeb(
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
 * Uses MLKit on native platforms, Google Translate (with MyMemory fallback) on web.
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

    // Ensure target language model is downloaded before translating
    if (!downloadedModels.has(targetLang)) {
      console.log(`[Interlinear] Downloading MLKit model for "${targetLang}"...`);
      await mlkit.Translation.downloadModel({ language: targetLang as any });
      downloadedModels.add(targetLang);
      console.log(`[Interlinear] Model for "${targetLang}" ready`);
    }

    // Also ensure source language model if not auto-detect
    if (sourceLang !== 'auto' && !downloadedModels.has(sourceLang)) {
      await mlkit.Translation.downloadModel({ language: sourceLang as any });
      downloadedModels.add(sourceLang);
    }

    const result = await mlkit.Translation.translate({
      text,
      sourceLanguage: sourceLang as any,
      targetLanguage: targetLang as any,
    });
    translated = result.text;
  } else {
    translated = await translateOnWeb(text, sourceLang, targetLang);
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
  downloadedModels.add(lang);
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
