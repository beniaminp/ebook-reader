/**
 * Dictionary Service
 *
 * Provides word definitions using the Free Dictionary API
 * with offline caching via AsyncStorage.
 *
 * React Native version: replaces Capacitor Preferences with AsyncStorage,
 * replaces axios with standard fetch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const CACHE_PREFIX = 'dict_cache_';
const VOCAB_PREFIX = 'dict_vocab_';
const CACHE_INDEX_KEY = 'dict_cache_index';

// Types

export interface Phonetic {
  text?: string;
  audio?: string;
}

export interface Definition {
  definition: string;
  synonyms?: string[];
  antonyms?: string[];
  example?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface WordEntry {
  word: string;
  phonetic?: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  origin?: string;
}

export interface DefinitionResult {
  word: string;
  phonetic?: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  origin?: string;
  found: boolean;
  cachedAt?: number;
}

export interface VocabularyWord {
  word: string;
  definition: string;
  partOfSpeech: string;
  example?: string;
  addedAt: number;
  context?: string; // Where the word was encountered
}

export interface CacheIndexEntry {
  word: string;
  cachedAt: number;
}

/**
 * Dictionary Service Class
 */
class DictionaryService {
  private cacheIndex: Set<string> = new Set();

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.loadCacheIndex();
  }

  /**
   * Load the cache index from AsyncStorage
   */
  private async loadCacheIndex(): Promise<void> {
    try {
      const value = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (value) {
        const index: CacheIndexEntry[] = JSON.parse(value);
        this.cacheIndex = new Set(index.map((entry) => entry.word.toLowerCase()));
      }
    } catch (error) {
      console.error('Failed to load cache index:', error);
      this.cacheIndex = new Set();
    }
  }

  /**
   * Save the cache index to AsyncStorage
   */
  private async saveCacheIndex(): Promise<void> {
    try {
      // Get all cached words with their timestamps
      const entries: CacheIndexEntry[] = [];
      for (const word of this.cacheIndex) {
        const cached = await this.getCached(word);
        if (cached?.cachedAt) {
          entries.push({ word, cachedAt: cached.cachedAt });
        }
      }
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save cache index:', error);
    }
  }

  /**
   * Clean word input - remove punctuation, trim whitespace
   */
  private cleanWord(word: string): string {
    return word
      .trim()
      .replace(/^[^\w]+/, '') // Remove leading non-word chars
      .replace(/[^\w]+$/, '') // Remove trailing non-word chars
      .toLowerCase();
  }

  /**
   * Check if a string looks like a valid word
   */
  isValidWord(word: string): boolean {
    const cleaned = this.cleanWord(word);
    return cleaned.length > 1 && /^[a-z]+(-[a-z]+)*$/.test(cleaned);
  }

  /**
   * Fetch word definition from the Free Dictionary API
   */
  async lookup(word: string): Promise<DefinitionResult> {
    const cleaned = this.cleanWord(word);

    if (!cleaned) {
      return {
        word: cleaned,
        found: false,
        meanings: [],
        phonetics: [],
      };
    }

    try {
      const response = await fetch(
        `${DICTIONARY_API_BASE}${encodeURIComponent(cleaned)}`
      );

      if (response.ok) {
        const data: WordEntry[] = await response.json();

        if (data && data.length > 0) {
          const entry = data[0];
          const result: DefinitionResult = {
            word: entry.word,
            phonetic: entry.phonetic,
            phonetics: entry.phonetics || [],
            meanings: entry.meanings || [],
            origin: entry.origin,
            found: true,
            cachedAt: Date.now(),
          };

          // Auto-cache on successful lookup
          await this.cacheWord(cleaned, result);

          return result;
        }
      }

      if (response.status === 404) {
        return {
          word: cleaned,
          found: false,
          meanings: [],
          phonetics: [],
        };
      }

      // Other error status - might be offline, try cache
      const cached = await this.getCached(cleaned);
      if (cached) {
        return {
          ...cached,
          found: true,
        };
      }

      return {
        word: cleaned,
        found: false,
        meanings: [],
        phonetics: [],
      };
    } catch (error) {
      // Network error - try to get from cache
      const cached = await this.getCached(cleaned);
      if (cached) {
        return {
          ...cached,
          found: true,
        };
      }

      console.error('Dictionary lookup error:', error);
      return {
        word: cleaned,
        found: false,
        meanings: [],
        phonetics: [],
      };
    }
  }

  /**
   * Get cached definition for a word
   */
  async getCached(word: string): Promise<DefinitionResult | null> {
    const cleaned = this.cleanWord(word);
    if (!cleaned) return null;

    try {
      const key = `${CACHE_PREFIX}${cleaned}`;
      const value = await AsyncStorage.getItem(key);

      if (value) {
        return JSON.parse(value) as DefinitionResult;
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached definition:', error);
      return null;
    }
  }

  /**
   * Cache a word definition
   */
  async cacheWord(word: string, result: DefinitionResult): Promise<void> {
    const cleaned = this.cleanWord(word);
    if (!cleaned) return;

    try {
      const key = `${CACHE_PREFIX}${cleaned}`;
      await AsyncStorage.setItem(key, JSON.stringify(result));

      // Update index
      this.cacheIndex.add(cleaned);
      await this.saveCacheIndex();
    } catch (error) {
      console.error('Failed to cache word:', error);
    }
  }

  /**
   * Search cache for words with a given prefix
   */
  async searchCache(prefix: string, limit = 10): Promise<string[]> {
    const cleaned = this.cleanWord(prefix);
    if (!cleaned) return [];

    try {
      const value = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (!value) return [];

      const index: CacheIndexEntry[] = JSON.parse(value);
      const matches = index
        .filter((entry) => entry.word.startsWith(cleaned))
        .sort((a, b) => b.cachedAt - a.cachedAt)
        .slice(0, limit)
        .map((entry) => entry.word);

      return matches;
    } catch (error) {
      console.error('Failed to search cache:', error);
      return [];
    }
  }

  /**
   * Get all cached words
   */
  async getAllCachedWords(): Promise<string[]> {
    try {
      const value = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (!value) return [];

      const index: CacheIndexEntry[] = JSON.parse(value);
      return index.map((entry) => entry.word);
    } catch (error) {
      console.error('Failed to get all cached words:', error);
      return [];
    }
  }

  /**
   * Clear cache for a specific word
   */
  async clearCachedWord(word: string): Promise<void> {
    const cleaned = this.cleanWord(word);
    if (!cleaned) return;

    try {
      const key = `${CACHE_PREFIX}${cleaned}`;
      await AsyncStorage.removeItem(key);

      this.cacheIndex.delete(cleaned);
      await this.saveCacheIndex();
    } catch (error) {
      console.error('Failed to clear cached word:', error);
    }
  }

  /**
   * Clear all dictionary cache
   */
  async clearAllCache(): Promise<void> {
    try {
      const words = await this.getAllCachedWords();

      for (const word of words) {
        const key = `${CACHE_PREFIX}${word}`;
        await AsyncStorage.removeItem(key);
      }

      this.cacheIndex.clear();
      await AsyncStorage.removeItem(CACHE_INDEX_KEY);
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }

  /**
   * Save a word to vocabulary list
   */
  async saveToVocabulary(vocabWord: VocabularyWord): Promise<void> {
    try {
      const key = `${VOCAB_PREFIX}${vocabWord.word.toLowerCase()}`;
      await AsyncStorage.setItem(key, JSON.stringify(vocabWord));
    } catch (error) {
      console.error('Failed to save to vocabulary:', error);
    }
  }

  /**
   * Get a word from vocabulary list
   */
  async getFromVocabulary(word: string): Promise<VocabularyWord | null> {
    try {
      const key = `${VOCAB_PREFIX}${word.toLowerCase()}`;
      const value = await AsyncStorage.getItem(key);

      if (value) {
        return JSON.parse(value) as VocabularyWord;
      }

      return null;
    } catch (error) {
      console.error('Failed to get from vocabulary:', error);
      return null;
    }
  }

  /**
   * Get all vocabulary words
   */
  async getAllVocabulary(): Promise<VocabularyWord[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const vocabKeys = allKeys.filter((key) => key.startsWith(VOCAB_PREFIX));

      const words: VocabularyWord[] = [];
      for (const key of vocabKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          words.push(JSON.parse(value) as VocabularyWord);
        }
      }

      return words.sort((a, b) => b.addedAt - a.addedAt);
    } catch (error) {
      console.error('Failed to get all vocabulary:', error);
      return [];
    }
  }

  /**
   * Remove a word from vocabulary list
   */
  async removeFromVocabulary(word: string): Promise<void> {
    try {
      const key = `${VOCAB_PREFIX}${word.toLowerCase()}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from vocabulary:', error);
    }
  }

  /**
   * Check if a word is in vocabulary
   */
  async isInVocabulary(word: string): Promise<boolean> {
    const vocab = await this.getFromVocabulary(word);
    return vocab !== null;
  }

  /**
   * Clear all vocabulary
   */
  async clearAllVocabulary(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const vocabKeys = allKeys.filter((key) => key.startsWith(VOCAB_PREFIX));

      if (vocabKeys.length > 0) {
        await AsyncStorage.multiRemove(vocabKeys);
      }
    } catch (error) {
      console.error('Failed to clear all vocabulary:', error);
    }
  }
}

// Export singleton instance
export const dictionaryService = new DictionaryService();
