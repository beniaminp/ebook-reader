/**
 * Translation Store
 * Manages translation settings and history
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TranslationSettings, TranslationHistoryEntry, TranslationLanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../services/translationService';

const DEFAULT_SETTINGS: TranslationSettings = {
  targetLanguage: 'en',
  autoDetectSource: true,
  saveHistory: true,
};

interface TranslationState extends TranslationSettings {
  // UI state
  isTranslationPanelOpen: boolean;
  currentSelection: string | null;
  currentTranslation: string | null;
  detectedLanguage: string | null;
  isLoading: boolean;
  error: string | null;

  // History
  translationHistory: TranslationHistoryEntry[];

  // Actions
  setTargetLanguage: (lang: TranslationLanguageCode) => void;
  setAutoDetectSource: (autoDetect: boolean) => void;
  setApiKey: (key: string) => void;
  setApiEndpoint: (endpoint: string) => void;
  setSaveHistory: (save: boolean) => void;

  // UI actions
  openTranslationPanel: (selection: string) => void;
  closeTranslationPanel: () => void;
  setCurrentTranslation: (translation: string, sourceLang: string) => void;
  clearCurrentTranslation: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // History actions
  addToHistory: (entry: Omit<TranslationHistoryEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  clearHistoryForBook: (bookId: string) => void;
  getHistoryForBook: (bookId: string) => TranslationHistoryEntry[];

  // Settings actions
  updateSettings: (settings: Partial<TranslationSettings>) => void;
  resetSettings: () => void;
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_SETTINGS,
      isTranslationPanelOpen: false,
      currentSelection: null,
      currentTranslation: null,
      detectedLanguage: null,
      isLoading: false,
      error: null,
      translationHistory: [],

      // Settings actions
      setTargetLanguage: (lang) => set({ targetLanguage: lang }),

      setAutoDetectSource: (autoDetect) => set({ autoDetectSource: autoDetect }),

      setApiKey: (key) => set({ apiKey: key }),

      setApiEndpoint: (endpoint) => set({ apiEndpoint: endpoint }),

      setSaveHistory: (save) => set({ saveHistory: save }),

      // UI actions
      openTranslationPanel: (selection) => set({
        isTranslationPanelOpen: true,
        currentSelection: selection,
        currentTranslation: null,
        detectedLanguage: null,
        error: null,
      }),

      closeTranslationPanel: () => set({
        isTranslationPanelOpen: false,
        currentSelection: null,
        currentTranslation: null,
        detectedLanguage: null,
        error: null,
      }),

      setCurrentTranslation: (translation, sourceLang) => set({
        currentTranslation: translation,
        detectedLanguage: sourceLang,
      }),

      clearCurrentTranslation: () => set({
        currentTranslation: null,
        detectedLanguage: null,
        error: null,
      }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      // History actions
      addToHistory: (entry) => {
        const state = get();
        if (!state.saveHistory) return;

        const historyEntry: TranslationHistoryEntry = {
          ...entry,
          id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          timestamp: Date.now(),
        };

        set((state) => ({
          translationHistory: [historyEntry, ...state.translationHistory].slice(0, 100), // Keep last 100
        }));
      },

      clearHistory: () => set({ translationHistory: [] }),

      clearHistoryForBook: (bookId) => set((state) => ({
        translationHistory: state.translationHistory.filter((entry) => entry.bookId !== bookId),
      })),

      getHistoryForBook: (bookId) => {
        return get().translationHistory.filter((entry) => entry.bookId === bookId);
      },

      // Settings actions
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),

      resetSettings: () => set({
        ...DEFAULT_SETTINGS,
      }),
    }),
    {
      name: 'translation-storage',
      partialize: (state) => ({
        targetLanguage: state.targetLanguage,
        autoDetectSource: state.autoDetectSource,
        apiKey: state.apiKey,
        apiEndpoint: state.apiEndpoint,
        saveHistory: state.saveHistory,
        translationHistory: state.translationHistory,
      }),
    }
  )
);

// Helper to get language name from code
export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang?.name || code.toUpperCase();
}

// Helper to get supported target languages
export function getTargetLanguages(): Array<{ code: string; name: string }> {
  return SUPPORTED_LANGUAGES
    .filter((l) => l.target !== false && l.code !== 'auto')
    .map((l) => ({ code: l.code, name: l.name }));
}

// Re-export types
export type { TranslationSettings, TranslationHistoryEntry };
