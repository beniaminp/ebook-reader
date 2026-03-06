/**
 * Translation Service
 * Uses Google Translate (free endpoint) with MyMemory fallback.
 * Works on both web and Android without API keys.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LanguageCode {
  code: string;
  name: string;
  target?: boolean; // Can be used as target language
}

export interface TranslationResponse {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

export interface TranslationError {
  message: string;
  code?: string;
  isRateLimit?: boolean;
  isUnsupported?: boolean;
}

// ============================================================================
// LANGUAGE CODES
// ============================================================================

export const SUPPORTED_LANGUAGES: LanguageCode[] = [
  { code: 'en', name: 'English', target: true },
  { code: 'es', name: 'Spanish', target: true },
  { code: 'fr', name: 'French', target: true },
  { code: 'de', name: 'German', target: true },
  { code: 'it', name: 'Italian', target: true },
  { code: 'pt', name: 'Portuguese', target: true },
  { code: 'ru', name: 'Russian', target: true },
  { code: 'zh', name: 'Chinese', target: true },
  { code: 'ja', name: 'Japanese', target: true },
  { code: 'ko', name: 'Korean', target: true },
  { code: 'ar', name: 'Arabic', target: true },
  { code: 'nl', name: 'Dutch', target: true },
  { code: 'pl', name: 'Polish', target: true },
  { code: 'tr', name: 'Turkish', target: true },
  { code: 'sv', name: 'Swedish', target: true },
  { code: 'da', name: 'Danish', target: true },
  { code: 'fi', name: 'Finnish', target: true },
  { code: 'no', name: 'Norwegian', target: true },
  { code: 'cs', name: 'Czech', target: true },
  { code: 'el', name: 'Greek', target: true },
  { code: 'he', name: 'Hebrew', target: true },
  { code: 'hi', name: 'Hindi', target: true },
  { code: 'th', name: 'Thai', target: true },
  { code: 'vi', name: 'Vietnamese', target: true },
  { code: 'id', name: 'Indonesian', target: true },
  { code: 'uk', name: 'Ukrainian', target: true },
  { code: 'ro', name: 'Romanian', target: true },
  { code: 'hu', name: 'Hungarian', target: true },
  { code: 'bg', name: 'Bulgarian', target: true },
  { code: 'auto', name: 'Auto Detect', target: false },
];

// Language name lookup map
const LANGUAGE_NAME_MAP: Record<string, string> = SUPPORTED_LANGUAGES.reduce(
  (acc, lang) => ({ ...acc, [lang.code]: lang.name }),
  {}
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

class TranslationServiceError extends Error implements TranslationError {
  code?: string;
  isRateLimit?: boolean;
  isUnsupported?: boolean;

  constructor(message: string, code?: string, isRateLimit?: boolean, isUnsupported?: boolean) {
    super(message);
    this.name = 'TranslationServiceError';
    this.code = code;
    this.isRateLimit = isRateLimit;
    this.isUnsupported = isUnsupported;
  }
}

// ============================================================================
// TRANSLATION BACKENDS
// ============================================================================

/**
 * Translate using Google Translate free endpoint.
 * Returns translated text and detected source language.
 */
async function translateWithGoogle(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{ translatedText: string; detectedLang: string }> {
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

  if (response.status === 429) {
    throw new TranslationServiceError(
      'Rate limit exceeded. Please try again later.',
      'RATE_LIMIT',
      true
    );
  }

  if (!response.ok) {
    throw new TranslationServiceError(
      `Google Translate error: ${response.status}`,
      'SERVER_ERROR'
    );
  }

  const data = await response.json();

  // Response format: [[["translated","original",...],...], null, "detected_lang"]
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const translated = data[0]
      .filter((segment: unknown) => Array.isArray(segment) && segment[0])
      .map((segment: unknown[]) => segment[0])
      .join('');
    const detectedLang = (typeof data[2] === 'string' ? data[2] : sourceLang) || sourceLang;
    if (translated) return { translatedText: translated, detectedLang };
  }

  throw new TranslationServiceError('Unexpected response format', 'PARSE_ERROR');
}

/**
 * Translate using MyMemory API (fallback).
 */
async function translateWithMyMemory(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{ translatedText: string; detectedLang: string }> {
  const langPair =
    sourceLang === 'auto' ? `autodetect|${targetLang}` : `${sourceLang}|${targetLang}`;

  const params = new URLSearchParams({
    q: text,
    langpair: langPair,
  });

  const response = await fetch(
    `https://api.mymemory.translated.net/get?${params.toString()}`
  );

  if (!response.ok) {
    throw new TranslationServiceError(
      `MyMemory API error: ${response.status}`,
      'SERVER_ERROR'
    );
  }

  const data = await response.json();

  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    return {
      translatedText: data.responseData.translatedText,
      detectedLang: data.responseData?.detectedLanguage || sourceLang,
    };
  }

  throw new TranslationServiceError(
    data.responseDetails || 'Translation failed',
    'TRANSLATION_FAILED'
  );
}

// ============================================================================
// TRANSLATION SERVICE CLASS
// ============================================================================

class TranslationService {
  private cache: Map<string, TranslationResponse>;

  constructor() {
    this.cache = new Map();
  }

  private getCacheKey(text: string, sourceLang: string, targetLang: string): string {
    return `${sourceLang}|${targetLang}|${text.substring(0, 200)}`;
  }

  /**
   * Translate text using Google Translate with MyMemory fallback.
   */
  async translate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<TranslationResponse> {
    if (!text || text.trim().length === 0) {
      throw new TranslationServiceError('Text to translate cannot be empty', 'INVALID_INPUT');
    }

    if (text.length > 10000) {
      throw new TranslationServiceError('Text too long (max 10,000 characters)', 'TEXT_TOO_LONG');
    }

    // Check cache
    const cacheKey = this.getCacheKey(text, sourceLang, targetLang);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    let translatedText: string;
    let detectedLang: string;

    try {
      const result = await translateWithGoogle(text, sourceLang, targetLang);
      translatedText = result.translatedText;
      detectedLang = result.detectedLang;
    } catch (googleErr) {
      console.warn('[Translation] Google Translate failed, trying MyMemory:', googleErr);
      try {
        const result = await translateWithMyMemory(text, sourceLang, targetLang);
        translatedText = result.translatedText;
        detectedLang = result.detectedLang;
      } catch (mmErr) {
        // Re-throw the original Google error if both fail
        throw googleErr;
      }
    }

    const response: TranslationResponse = {
      translatedText,
      sourceLang: detectedLang === 'auto' ? 'en' : detectedLang,
      targetLang,
    };

    this.cache.set(cacheKey, response);
    return response;
  }

  getLanguageName(code: string): string {
    return LANGUAGE_NAME_MAP[code] || code.toUpperCase();
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const translationService = new TranslationService();

export { TranslationService, TranslationServiceError };
