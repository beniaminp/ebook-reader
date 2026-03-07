/**
 * useTTS Hook
 * Text-to-Speech using expo-speech.
 *
 * React Native version: replaces Web Speech API (SpeechSynthesis) with expo-speech.
 * Provides speak, stop, pause, resume, and isSpeaking state.
 *
 * Note: expo-speech does not support word-level boundary events on all platforms.
 * The onWordBoundary callback is kept in the interface for compatibility but may
 * not fire on all devices.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Speech from 'expo-speech';

export type TTSState = 'idle' | 'playing' | 'paused';

export interface TTSVoice {
  identifier: string;
  name: string;
  language: string;
  quality: string;
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
  voice?: string;
  /** Called when a word boundary event fires during speech (limited platform support) */
  onWordBoundary?: (boundary: TTSWordBoundary) => void;
  /** Called when speech of a sentence starts */
  onSentenceStart?: (sentenceIndex: number, sentenceText: string) => void;
  /** Called when all speech completes */
  onComplete?: () => void;
}

export interface UseTTSReturn {
  state: TTSState;
  isSpeaking: boolean;
  currentSentenceIndex: number;
  totalSentences: number;
  rate: number;
  pitch: number;
  volume: number;
  selectedVoice: string;
  availableVoices: TTSVoice[];
  /** The current word boundary (updated on each word event, limited platform support) */
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
  setVoice: (voice: string) => void;
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
  const [state, setState] = useState<TTSState>('idle');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<TTSVoice[]>([]);
  const [rate, setRateState] = useState(options.rate ?? 1.0);
  const [pitch, setPitchState] = useState(options.pitch ?? 1.0);
  const [volume, setVolumeState] = useState(options.volume ?? 1.0);
  const [selectedVoice, setSelectedVoice] = useState(options.voice ?? '');
  const [currentWord, setCurrentWord] = useState<TTSWordBoundary | null>(null);

  const sentencesRef = useRef<string[]>([]);
  const fullTextRef = useRef<string>('');
  const sentenceOffsetsRef = useRef<
    { text: string; startOffset: number; endOffset: number }[]
  >([]);
  const currentIndexRef = useRef(0);
  const isStoppingRef = useRef(false);

  // Keep refs in sync with the latest state values
  const rateRef = useRef(rate);
  const pitchRef = useRef(pitch);
  const volumeRef = useRef(volume);
  const selectedVoiceRef = useRef(selectedVoice);
  rateRef.current = rate;
  pitchRef.current = pitch;
  volumeRef.current = volume;
  selectedVoiceRef.current = selectedVoice;

  // Keep callback refs up to date
  const onSentenceStartRef = useRef(options.onSentenceStart);
  const onCompleteRef = useRef(options.onComplete);
  onSentenceStartRef.current = options.onSentenceStart;
  onCompleteRef.current = options.onComplete;

  // Load available voices
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        setAvailableVoices(
          voices.map((v) => ({
            identifier: v.identifier,
            name: v.name,
            language: v.language,
            quality: v.quality as string,
          }))
        );
      } catch {
        // Voices might not be available
      }
    };

    loadVoices();
  }, []);

  // Pause TTS when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active' && state === 'playing') {
        Speech.pause();
        setState('paused');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      Speech.stop();
    };
  }, []);

  const speakSentence = useCallback(
    (index: number) => {
      if (index >= sentencesRef.current.length) {
        setState('idle');
        setCurrentSentenceIndex(0);
        currentIndexRef.current = 0;
        setCurrentWord(null);
        onCompleteRef.current?.();
        return;
      }

      const sentenceText = sentencesRef.current[index];

      setCurrentSentenceIndex(index);
      currentIndexRef.current = index;
      onSentenceStartRef.current?.(index, sentenceText);

      const speechOptions: Speech.SpeechOptions = {
        rate: rateRef.current,
        pitch: pitchRef.current,
        volume: volumeRef.current,
        onDone: () => {
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
        },
        onError: (error) => {
          console.error('TTS error:', error);
          setState('idle');
          setCurrentWord(null);
        },
        onStopped: () => {
          // Called when speech is stopped manually
          if (!isStoppingRef.current) {
            setState('idle');
            setCurrentWord(null);
          }
        },
      };

      // Set voice if selected
      if (selectedVoiceRef.current) {
        speechOptions.voice = selectedVoiceRef.current;
      }

      Speech.speak(sentenceText, speechOptions);
    },
    []
  );

  const speak = useCallback(
    (text: string) => {
      isStoppingRef.current = false;
      Speech.stop();

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
    [speakSentence]
  );

  const pause = useCallback(() => {
    if (state !== 'playing') return;
    Speech.pause();
    setState('paused');
  }, [state]);

  const resume = useCallback(() => {
    if (state !== 'paused') return;
    Speech.resume();
    setState('playing');
  }, [state]);

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    Speech.stop();
    setState('idle');
    setCurrentSentenceIndex(0);
    currentIndexRef.current = 0;
    setCurrentWord(null);
  }, []);

  const skipForward = useCallback(() => {
    if (state === 'idle') return;
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex < sentencesRef.current.length) {
      isStoppingRef.current = false;
      Speech.stop();
      setState('playing');
      speakSentence(nextIndex);
    } else {
      stop();
    }
  }, [state, speakSentence, stop]);

  const skipBackward = useCallback(() => {
    if (state === 'idle') return;
    const prevIndex = Math.max(0, currentIndexRef.current - 1);
    isStoppingRef.current = false;
    Speech.stop();
    setState('playing');
    speakSentence(prevIndex);
  }, [state, speakSentence]);

  const setRate = useCallback((newRate: number) => {
    setRateState(newRate);
  }, []);

  const setPitch = useCallback((newPitch: number) => {
    setPitchState(newPitch);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
  }, []);

  const setVoice = useCallback((voice: string) => {
    setSelectedVoice(voice);
  }, []);

  const getSentences = useCallback(() => {
    return sentenceOffsetsRef.current;
  }, []);

  return {
    state,
    isSpeaking: state === 'playing',
    currentSentenceIndex,
    totalSentences: sentencesRef.current.length,
    rate,
    pitch,
    volume,
    selectedVoice,
    availableVoices,
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
