/**
 * Translation Service
 * Integrates with LibreTranslate API for text translation
 */

import axios, { AxiosError } from 'axios';

// ============================================================================
// TYPES
// ============================================================================

export interface LanguageCode {
  code: string;
  name: string;
  target?: boolean; // Can be used as target language
}

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface TranslationResponse {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

export interface LanguageDetectionResponse {
  confidence: number;
  language: string;
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
  { code: 'auto', name: 'Auto Detect', target: false },
];

// Language name lookup map
const LANGUAGE_NAME_MAP: Record<string, string> = SUPPORTED_LANGUAGES.reduce(
  (acc, lang) => ({ ...acc, [lang.code]: lang.name }),
  {}
);

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface TranslationServiceConfig {
  apiUrl: string;
  apiKey?: string;
  timeout: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: TranslationServiceConfig = {
  apiUrl: 'https://libretranslate.com/translate',
  timeout: 30000,
  maxRetries: 2,
};

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

function handleApiError(error: unknown): TranslationServiceError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;

    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data as any;

      if (status === 429) {
        return new TranslationServiceError(
          'Rate limit exceeded. Please try again later.',
          'RATE_LIMIT',
          true,
          false
        );
      }

      if (status === 400 && data?.error) {
        if (data.error.includes('not supported') || data.error.includes('invalid language')) {
          return new TranslationServiceError(
            'Unsupported language pair.',
            'UNSUPPORTED_LANGUAGE',
            false,
            true
          );
        }
        return new TranslationServiceError(data.error, 'INVALID_REQUEST');
      }

      if (status === 401) {
        return new TranslationServiceError('Invalid API key.', 'INVALID_API_KEY', false, false);
      }

      if (status === 503) {
        return new TranslationServiceError(
          'Translation service temporarily unavailable.',
          'SERVICE_UNAVAILABLE',
          false,
          false
        );
      }

      return new TranslationServiceError(`Server error: ${status}`, 'SERVER_ERROR', false, false);
    }

    if (axiosError.request) {
      return new TranslationServiceError(
        'Network error. Please check your connection.',
        'NETWORK_ERROR',
        false,
        false
      );
    }
  }

  if (error instanceof TranslationServiceError) {
    return error;
  }

  return new TranslationServiceError(
    error instanceof Error ? error.message : 'Unknown error occurred',
    'UNKNOWN',
    false,
    false
  );
}

// ============================================================================
// TRANSLATION SERVICE CLASS
// ============================================================================

class TranslationService {
  private config: TranslationServiceConfig;
  private cache: Map<string, TranslationResponse>;
  private languageCache: LanguageCode[] | null;

  constructor(config: Partial<TranslationServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.languageCache = null;
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<TranslationServiceConfig>): void {
    this.config = { ...this.config, ...config };
    this.cache.clear();
    this.languageCache = null;
  }

  /**
   * Get cache key for translation request
   */
  private getCacheKey(text: string, sourceLang: string, targetLang: string): string {
    return `${sourceLang}|${targetLang}|${text.substring(0, 100)}`;
  }

  /**
   * Translate text from source language to target language
   */
  async translate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<TranslationResponse> {
    // Validate input
    if (!text || text.trim().length === 0) {
      throw new TranslationServiceError('Text to translate cannot be empty', 'INVALID_INPUT');
    }

    if (text.length > 10000) {
      throw new TranslationServiceError('Text too long (max 10,000 characters)', 'TEXT_TOO_LONG');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text, sourceLang, targetLang);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Auto-detect language if needed
    let effectiveSourceLang = sourceLang;
    if (sourceLang === 'auto') {
      try {
        effectiveSourceLang = await this.detectLanguage(text);
      } catch (error) {
        // If detection fails, fall back to English
        effectiveSourceLang = 'en';
      }
    }

    // Prepare request
    const requestData = {
      q: text,
      source: effectiveSourceLang,
      target: targetLang,
      format: 'text',
    };

    // Add API key if configured
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    try {
      const response = await axios.post(this.config.apiUrl, requestData, {
        headers,
        timeout: this.config.timeout,
      });

      const result: TranslationResponse = {
        translatedText: response.data.translatedText,
        sourceLang: effectiveSourceLang,
        targetLang,
      };

      // Cache the result
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get supported languages from the API
   * Falls back to hardcoded list if API fails
   */
  async getSupportedLanguages(): Promise<LanguageCode[]> {
    if (this.languageCache) {
      return this.languageCache;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await axios.get(this.config.apiUrl.replace('/translate', '/languages'), {
        headers,
        timeout: this.config.timeout,
      });

      // Map API response to our format
      const languages: LanguageCode[] = response.data.map((lang: any) => ({
        code: lang.code,
        name: lang.name,
        target: lang.targets !== undefined ? lang.targets.length > 0 : true,
      }));

      this.languageCache = languages;
      return languages;
    } catch (error) {
      // Fall back to hardcoded list
      console.warn('Failed to fetch languages from API, using cached list');
      this.languageCache = SUPPORTED_LANGUAGES;
      return SUPPORTED_LANGUAGES;
    }
  }

  /**
   * Detect the language of a text
   */
  async detectLanguage(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      throw new TranslationServiceError('Text for detection cannot be empty', 'INVALID_INPUT');
    }

    if (text.length < 10) {
      throw new TranslationServiceError(
        'Text too short for reliable detection (min 10 characters)',
        'TEXT_TOO_SHORT'
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    try {
      const response = await axios.post(
        this.config.apiUrl.replace('/translate', '/detect'),
        {
          q: text,
        },
        {
          headers,
          timeout: this.config.timeout,
        }
      );

      const detections = response.data as LanguageDetectionResponse[];
      if (detections && detections.length > 0) {
        // Return the language with highest confidence
        const sorted = detections.sort((a, b) => b.confidence - a.confidence);
        return sorted[0].language;
      }

      throw new TranslationServiceError('Language detection failed', 'DETECTION_FAILED');
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get language name from code
   */
  getLanguageName(code: string): string {
    return LANGUAGE_NAME_MAP[code] || code.toUpperCase();
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const translationService = new TranslationService();

// Export class for testing
export { TranslationService, TranslationServiceError };
