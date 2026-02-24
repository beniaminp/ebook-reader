/**
 * useTTS Hook
 * Text-to-Speech using Web Speech API (SpeechSynthesis)
 * Works in Android WebView with system voices
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type TTSState = 'idle' | 'playing' | 'paused';

export interface TTSVoice {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
}

export interface UseTTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceURI?: string;
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
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  const sentences = text.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g) || [];
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 0);
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

  const sentencesRef = useRef<string[]>([]);
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

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(
        voices.map(v => ({
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
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentencesRef.current[index]);
      // Read from refs so that settings changed after speak() was called are
      // picked up by subsequent sentences without re-creating this callback.
      utterance.rate = rateRef.current;
      utterance.pitch = pitchRef.current;
      utterance.volume = volumeRef.current;

      const voiceURI = selectedVoiceURIRef.current;
      if (voiceURI) {
        const voice = window.speechSynthesis
          .getVoices()
          .find(v => v.voiceURI === voiceURI);
        if (voice) utterance.voice = voice;
      }

      utterance.onstart = () => {
        setCurrentSentenceIndex(index);
        currentIndexRef.current = index;
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
        }
      };

      utterance.onerror = (event) => {
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.error('TTS error:', event.error);
          setState('idle');
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

      const sentences = splitIntoSentences(text);
      sentencesRef.current = sentences;
      currentIndexRef.current = 0;
      setCurrentSentenceIndex(0);
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
  };
}

export default useTTS;
