/**
 * useTTS Hook
 * Text-to-Speech using Web Speech API (SpeechSynthesis)
 * Works in Android WebView with system voices
 *
 * Supports word-level boundary events for highlighting the currently
 * spoken word in the rendered text.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type TTSState = 'idle' | 'playing' | 'paused';

export interface TTSVoice {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
}

/** Word boundary info emitted during speech */
export interface TTSWordBoundary {
  /** Character index within the current sentence */
  charIndex: number;
  /** Length of the spoken word */
  charLength: number;
  /** The word being spoken */
  word: string;
  /** Index of the sentence containing the word */
  sentenceIndex: number;
}

export interface UseTTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceURI?: string;
  /** Called when a word boundary event fires during speech */
  onWordBoundary?: (boundary: TTSWordBoundary) => void;
  /** Called when speech of a sentence starts */
  onSentenceStart?: (sentenceIndex: number, sentenceText: string) => void;
  /** Called when all speech completes */
  onComplete?: () => void;
}

export interface UseTTSReturn {
  state: TTSState;
  currentSentenceIndex: number;
  totalSentences: number;
  rate: number;
  pitch: number;
  volume: number;
  selectedVoiceURI: string;
  availableVoices: TTSVoice[];
  isSupported: boolean;
  /** The current word boundary (updated on each word event) */
  currentWord: TTSWordBoundary | null;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  setVoice: (voiceURI: string) => void;
  /** Get all sentences and their character offsets within the original text */
  getSentences: () => { text: string; startOffset: number; endOffset: number }[];
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  const sentences = text.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g) || [];
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Compute character offsets for each sentence within the full text.
 * Returns array of { text, startOffset, endOffset }.
 */
function computeSentenceOffsets(
  fullText: string,
  sentences: string[]
): { text: string; startOffset: number; endOffset: number }[] {
  const result: { text: string; startOffset: number; endOffset: number }[] = [];
  let searchStart = 0;
  for (const sentence of sentences) {
    const idx = fullText.indexOf(sentence, searchStart);
    if (idx >= 0) {
      result.push({ text: sentence, startOffset: idx, endOffset: idx + sentence.length });
      searchStart = idx + sentence.length;
    } else {
      // Fallback: approximate offset
      result.push({
        text: sentence,
        startOffset: searchStart,
        endOffset: searchStart + sentence.length,
      });
      searchStart += sentence.length;
    }
  }
  return result;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [state, setState] = useState<TTSState>('idle');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<TTSVoice[]>([]);
  const [rate, setRateState] = useState(options.rate ?? 1.0);
  const [pitch, setPitchState] = useState(options.pitch ?? 1.0);
  const [volume, setVolumeState] = useState(options.volume ?? 1.0);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(options.voiceURI ?? '');
  const [currentWord, setCurrentWord] = useState<TTSWordBoundary | null>(null);

  const sentencesRef = useRef<string[]>([]);
  const fullTextRef = useRef<string>('');
  const sentenceOffsetsRef = useRef<
    { text: string; startOffset: number; endOffset: number }[]
  >([]);
  const currentIndexRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isStoppingRef = useRef(false);

  // Keep refs in sync with the latest state values so that speakSentence
  // (which is captured as a closure in utterance.onend) always reads the
  // most-recent settings without requiring a new callback reference.
  const rateRef = useRef(rate);
  const pitchRef = useRef(pitch);
  const volumeRef = useRef(volume);
  const selectedVoiceURIRef = useRef(selectedVoiceURI);
  rateRef.current = rate;
  pitchRef.current = pitch;
  volumeRef.current = volume;
  selectedVoiceURIRef.current = selectedVoiceURI;

  // Keep callback refs up to date
  const onWordBoundaryRef = useRef(options.onWordBoundary);
  const onSentenceStartRef = useRef(options.onSentenceStart);
  const onCompleteRef = useRef(options.onComplete);
  onWordBoundaryRef.current = options.onWordBoundary;
  onSentenceStartRef.current = options.onSentenceStart;
  onCompleteRef.current = options.onComplete;

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(
        voices.map((v) => ({
          name: v.name,
          lang: v.lang,
          voiceURI: v.voiceURI,
          localService: v.localService,
        }))
      );
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  // Pause TTS when app goes to background
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (document.hidden && state === 'playing') {
        window.speechSynthesis.pause();
        setState('paused');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSupported, state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        isStoppingRef.current = true;
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const speakSentence = useCallback(
    (index: number) => {
      if (!isSupported) return;
      if (index >= sentencesRef.current.length) {
        setState('idle');
        setCurrentSentenceIndex(0);
        currentIndexRef.current = 0;
        setCurrentWord(null);
        onCompleteRef.current?.();
        return;
      }

      const sentenceText = sentencesRef.current[index];
      const utterance = new SpeechSynthesisUtterance(sentenceText);
      // Read from refs so that settings changed after speak() was called are
      // picked up by subsequent sentences without re-creating this callback.
      utterance.rate = rateRef.current;
      utterance.pitch = pitchRef.current;
      utterance.volume = volumeRef.current;

      const voiceURI = selectedVoiceURIRef.current;
      if (voiceURI) {
        const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI);
        if (voice) utterance.voice = voice;
      }

      utterance.onstart = () => {
        setCurrentSentenceIndex(index);
        currentIndexRef.current = index;
        onSentenceStartRef.current?.(index, sentenceText);
      };

      // Word boundary event for highlighting
      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === 'word') {
          const charIndex = event.charIndex;
          const charLength = event.charLength || 0;
          // Extract the word from the sentence text
          let word: string;
          if (charLength > 0) {
            word = sentenceText.substring(charIndex, charIndex + charLength);
          } else {
            // charLength may be 0 on some browsers; extract word manually
            const remaining = sentenceText.substring(charIndex);
            const match = remaining.match(/^[\S]+/);
            word = match ? match[0] : '';
          }

          const boundary: TTSWordBoundary = {
            charIndex,
            charLength: charLength || word.length,
            word,
            sentenceIndex: index,
          };
          setCurrentWord(boundary);
          onWordBoundaryRef.current?.(boundary);
        }
      };

      utterance.onend = () => {
        if (isStoppingRef.current) return;
        const nextIndex = index + 1;
        if (nextIndex < sentencesRef.current.length) {
          speakSentence(nextIndex);
        } else {
          setState('idle');
          setCurrentSentenceIndex(0);
          currentIndexRef.current = 0;
          setCurrentWord(null);
          onCompleteRef.current?.();
        }
      };

      utterance.onerror = (event) => {
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.error('TTS error:', event.error);
          setState('idle');
          setCurrentWord(null);
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return;

      isStoppingRef.current = false;
      window.speechSynthesis.cancel();

      fullTextRef.current = text;
      const sentences = splitIntoSentences(text);
      sentencesRef.current = sentences;
      sentenceOffsetsRef.current = computeSentenceOffsets(text, sentences);
      currentIndexRef.current = 0;
      setCurrentSentenceIndex(0);
      setCurrentWord(null);
      setState('playing');

      speakSentence(0);
    },
    [isSupported, speakSentence]
  );

  const pause = useCallback(() => {
    if (!isSupported || state !== 'playing') return;
    window.speechSynthesis.pause();
    setState('paused');
  }, [isSupported, state]);

  const resume = useCallback(() => {
    if (!isSupported || state !== 'paused') return;
    window.speechSynthesis.resume();
    setState('playing');
  }, [isSupported, state]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    isStoppingRef.current = true;
    window.speechSynthesis.cancel();
    setState('idle');
    setCurrentSentenceIndex(0);
    currentIndexRef.current = 0;
    setCurrentWord(null);
  }, [isSupported]);

  const skipForward = useCallback(() => {
    if (!isSupported || state === 'idle') return;
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex < sentencesRef.current.length) {
      isStoppingRef.current = false;
      window.speechSynthesis.cancel();
      setState('playing');
      speakSentence(nextIndex);
    } else {
      stop();
    }
  }, [isSupported, state, speakSentence, stop]);

  const skipBackward = useCallback(() => {
    if (!isSupported || state === 'idle') return;
    const prevIndex = Math.max(0, currentIndexRef.current - 1);
    isStoppingRef.current = false;
    window.speechSynthesis.cancel();
    setState('playing');
    speakSentence(prevIndex);
  }, [isSupported, state, speakSentence]);

  const setRate = useCallback((newRate: number) => {
    setRateState(newRate);
  }, []);

  const setPitch = useCallback((newPitch: number) => {
    setPitchState(newPitch);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
  }, []);

  const setVoice = useCallback((voiceURI: string) => {
    setSelectedVoiceURI(voiceURI);
  }, []);

  const getSentences = useCallback(() => {
    return sentenceOffsetsRef.current;
  }, []);

  return {
    state,
    currentSentenceIndex,
    totalSentences: sentencesRef.current.length,
    rate,
    pitch,
    volume,
    selectedVoiceURI,
    availableVoices,
    isSupported,
    currentWord,
    speak,
    pause,
    resume,
    stop,
    skipForward,
    skipBackward,
    setRate,
    setPitch,
    setVolume,
    setVoice,
    getSentences,
  };
}

export default useTTS;
