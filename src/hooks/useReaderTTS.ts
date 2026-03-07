/**
 * useReaderTTS — encapsulates TTS state, hooks (useTTS, useTTSHighlighter),
 * and handlers for the unified reader.
 *
 * Extracted from UnifiedReaderContainer to reduce its size.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTTS } from './useTTS';
import { useTTSHighlighter } from './useTTSHighlighter';
import type { ReaderEngineRef } from '../types/reader';

export interface UseReaderTTSOptions {
  engineRef: React.RefObject<ReaderEngineRef | null>;
  ionContentRef: React.RefObject<HTMLIonContentElement | null>;
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
  ionContentRef,
  onNoText,
}: UseReaderTTSOptions): UseReaderTTSReturn {
  const [ttsActive, setTtsActive] = useState(false);

  // Refs to avoid stale closures
  const ttsActiveRef = useRef(false);
  const ttsAutoAdvancingRef = useRef(false);
  const ttsSpeakRef = useRef<((text: string) => void) | null>(null);
  const ttsLastTextRef = useRef<string>('');

  // TTS word-level highlighter
  const ttsHighlighter = useTTSHighlighter({
    getContentDocuments: () => engineRef.current?.getContentDocuments?.() || [],
    getVisibleRange: () => engineRef.current?.getVisibleRange?.() ?? null,
    onScrollToHighlight: useCallback((element: HTMLElement, doc: Document) => {
      try {
        const win = doc.defaultView;
        if (!win) return;

        const isInIframe = win !== win.parent;
        if (isInIframe) {
          // Paginated EPUB: no scroll needed within the iframe.
          return;
        }

        // ScrollEngine: scroll to the highlighted word within IonContent
        const ionContent = ionContentRef?.current;
        if (ionContent) {
          const rect = element.getBoundingClientRect();
          const viewHeight = win.innerHeight || doc.documentElement.clientHeight;
          const isOutOfView =
            rect.bottom < 0 ||
            rect.top > viewHeight ||
            rect.top < 60 ||
            rect.bottom > viewHeight - 60;

          if (isOutOfView) {
            ionContent.getScrollElement().then((scrollEl) => {
              const scrollTop = scrollEl.scrollTop;
              const targetTop = scrollTop + rect.top - viewHeight / 2;
              ionContent.scrollToPoint(0, Math.max(0, targetTop), 200);
            });
          }
        } else {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }
      } catch {
        // ignore scroll errors
      }
    }, [ionContentRef]),
  });

  // TTS hook with word boundary events for highlighting
  const tts = useTTS({
    onWordBoundary: ttsHighlighter.onWordBoundary,
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
        } catch { /* navigation may fail at end of book */ }

        await new Promise(r => setTimeout(r, 100));

        ttsAutoAdvancingRef.current = false;

        if (!ttsActiveRef.current) return;

        const newText = engine.getVisibleText?.();
        if (newText && newText.trim().length > 0) {
          const trimmedNew = newText.trim();
          if (trimmedNew === ttsLastTextRef.current) {
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
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [tts, ttsHighlighter]);

  // Clean up highlighter on unmount
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
