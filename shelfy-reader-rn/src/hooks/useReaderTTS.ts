/**
 * useReaderTTS -- encapsulates TTS state and handlers for the unified reader.
 *
 * React Native version: uses the RN useTTS hook (expo-speech) and
 * useTTSHighlighter. Replaces HTMLIonContentElement refs with ScrollView refs,
 * and removes browser-specific DOM references.
 *
 * Extracted from the reader container to reduce its size.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTTS } from './useTTS';
import { useTTSHighlighter } from './useTTSHighlighter';
import type { ReaderEngineRef } from '../types/reader';
import type { ScrollView } from 'react-native';

export interface UseReaderTTSOptions {
  engineRef: React.RefObject<ReaderEngineRef | null>;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  onNoText?: () => void;
}

export interface UseReaderTTSReturn {
  ttsActive: boolean;
  tts: ReturnType<typeof useTTS>;
  ttsHighlighter: ReturnType<typeof useTTSHighlighter>;
  ttsActiveRef: React.RefObject<boolean>;
  ttsAutoAdvancingRef: React.RefObject<boolean>;
  handleToggleTTS: () => void;
  handleTTSClose: () => void;
  /** Call from sleep timer onExpire to stop TTS */
  stopTTSForSleep: () => void;
}

export function useReaderTTS({
  engineRef,
  onNoText,
}: UseReaderTTSOptions): UseReaderTTSReturn {
  const [ttsActive, setTtsActive] = useState(false);

  // Refs to avoid stale closures
  const ttsActiveRef = useRef(false);
  const ttsAutoAdvancingRef = useRef(false);
  const ttsSpeakRef = useRef<((text: string) => void) | null>(null);
  const ttsLastTextRef = useRef<string>('');

  // TTS word-level highlighter (limited platform support in RN)
  const ttsHighlighter = useTTSHighlighter();

  // TTS hook with sentence-level callbacks
  const tts = useTTS({
    onSentenceStart: ttsHighlighter.onSentenceStart,
    onComplete: useCallback(() => {
      ttsHighlighter.clearHighlight();

      if (ttsAutoAdvancingRef.current || !ttsActiveRef.current) {
        return;
      }

      const engine = engineRef.current;
      if (!engine) return;

      ttsAutoAdvancingRef.current = true;

      const advance = async () => {
        try {
          await engine.next();
        } catch {
          /* navigation may fail at end of book */
        }

        await new Promise((r) => setTimeout(r, 100));

        ttsAutoAdvancingRef.current = false;

        if (!ttsActiveRef.current) return;

        const newText = engine.getVisibleText?.();
        if (newText && newText.trim().length > 0) {
          const trimmedNew = newText.trim();
          if (trimmedNew === ttsLastTextRef.current) {
            // Same text as last time -- end of book
            ttsActiveRef.current = false;
            ttsLastTextRef.current = '';
            setTtsActive(false);
            return;
          }
          ttsLastTextRef.current = trimmedNew;
          ttsSpeakRef.current?.(newText);
        } else {
          ttsActiveRef.current = false;
          ttsLastTextRef.current = '';
          setTtsActive(false);
        }
      };
      advance();
    }, [ttsHighlighter, engineRef]),
  });

  // Keep the speak ref in sync
  ttsSpeakRef.current = tts.speak;

  const handleToggleTTS = useCallback(() => {
    if (ttsActive) {
      tts.stop();
      ttsHighlighter.clearHighlight();
      ttsActiveRef.current = false;
      ttsAutoAdvancingRef.current = false;
      ttsLastTextRef.current = '';
      setTtsActive(false);
    } else {
      const text = engineRef.current?.getVisibleText?.();
      if (text && text.trim().length > 0) {
        ttsActiveRef.current = true;
        ttsLastTextRef.current = text.trim();
        tts.speak(text);
        setTtsActive(true);
      } else {
        onNoText?.();
      }
    }
  }, [ttsActive, tts, ttsHighlighter, engineRef, onNoText]);

  const handleTTSClose = useCallback(() => {
    tts.stop();
    ttsHighlighter.clearHighlight();
    ttsActiveRef.current = false;
    ttsAutoAdvancingRef.current = false;
    ttsLastTextRef.current = '';
    setTtsActive(false);
  }, [tts, ttsHighlighter]);

  const stopTTSForSleep = useCallback(() => {
    if (tts.state === 'playing' || tts.state === 'paused') {
      tts.stop();
      ttsHighlighter.clearHighlight();
      ttsActiveRef.current = false;
      ttsAutoAdvancingRef.current = false;
      setTtsActive(false);
    }
  }, [tts, ttsHighlighter]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      ttsHighlighter.clearHighlight();
      ttsActiveRef.current = false;
      ttsAutoAdvancingRef.current = false;
    };
  }, [ttsHighlighter]);

  return {
    ttsActive,
    tts,
    ttsHighlighter,
    ttsActiveRef,
    ttsAutoAdvancingRef,
    handleToggleTTS,
    handleTTSClose,
    stopTTSForSleep,
  };
}
