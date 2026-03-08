/**
 * useTTSHighlighter Hook
 *
 * Tracks the currently spoken sentence and word for visual highlighting
 * during TTS playback.
 *
 * React Native version: The web/Ionic version manipulates browser DOM
 * (TreeWalker, Range, surroundContents) to highlight words in iframes.
 * Since RN has no DOM, this hook instead exposes reactive state
 * (currentSentence, currentWord) that can be used by RN reader
 * components to render highlights in their own way (e.g., via WebView
 * message passing or native text overlays).
 */

import { useState, useRef, useCallback } from 'react';
import type { TTSWordBoundary } from './useTTS';

export interface TTSHighlightState {
  /** Index of the sentence currently being spoken */
  sentenceIndex: number;
  /** Text of the sentence currently being spoken */
  sentenceText: string;
  /** Current word boundary info (may be null on platforms without word events) */
  currentWord: TTSWordBoundary | null;
  /** Whether TTS highlighting is active */
  isActive: boolean;
}

export interface UseTTSHighlighterReturn {
  /** Current highlight state for rendering */
  highlightState: TTSHighlightState;
  /** Called when a sentence starts being spoken */
  onSentenceStart: (sentenceIndex: number, sentenceText: string) => void;
  /** Called on each word boundary event */
  onWordBoundary: (boundary: TTSWordBoundary) => void;
  /** Remove all highlights and clean up */
  clearHighlight: () => void;
}

export function useTTSHighlighter(): UseTTSHighlighterReturn {
  const [highlightState, setHighlightState] = useState<TTSHighlightState>({
    sentenceIndex: -1,
    sentenceText: '',
    currentWord: null,
    isActive: false,
  });

  const isActiveRef = useRef(false);

  /** Called when a new sentence starts being spoken */
  const onSentenceStart = useCallback(
    (sentenceIndex: number, sentenceText: string) => {
      isActiveRef.current = true;
      setHighlightState({
        sentenceIndex,
        sentenceText,
        currentWord: null,
        isActive: true,
      });
    },
    []
  );

  /** Called on each word boundary event */
  const onWordBoundary = useCallback((boundary: TTSWordBoundary) => {
    if (!isActiveRef.current) return;

    setHighlightState((prev) => ({
      ...prev,
      currentWord: boundary,
    }));
  }, []);

  /** Clear all highlights and reset state */
  const clearHighlight = useCallback(() => {
    isActiveRef.current = false;
    setHighlightState({
      sentenceIndex: -1,
      sentenceText: '',
      currentWord: null,
      isActive: false,
    });
  }, []);

  return {
    highlightState,
    onSentenceStart,
    onWordBoundary,
    clearHighlight,
  };
}

export default useTTSHighlighter;
