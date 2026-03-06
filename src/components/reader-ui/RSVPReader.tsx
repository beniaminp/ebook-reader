/**
 * RSVP (Rapid Serial Visual Presentation) Speed Reading Mode
 *
 * Displays one word at a time at configurable WPM for rapid reading
 * without eye movement. Uses the Optimal Recognition Point (ORP)
 * to position words for faster processing.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IonButton, IonIcon, IonRange } from '@ionic/react';
import {
  playOutline,
  pauseOutline,
  stopOutline,
  speedometerOutline,
} from 'ionicons/icons';
import './RSVPReader.css';

interface RSVPReaderProps {
  text: string;
  onClose: () => void;
  onComplete?: () => void;
}

function getORP(word: string): number {
  // Optimal Recognition Point: ~1/3 into the word
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 3) return 1;
  if (len <= 5) return 2;
  return Math.floor(len * 0.33);
}

function getWordDelay(word: string, baseMs: number): number {
  // Longer words and punctuation get extra time
  let multiplier = 1;
  if (word.length > 8) multiplier += 0.3;
  if (/[.!?]$/.test(word)) multiplier += 0.8;
  if (/[,;:]$/.test(word)) multiplier += 0.4;
  return baseMs * multiplier;
}

const RSVPReader: React.FC<RSVPReaderProps> = ({ text, onClose, onComplete }) => {
  const [wpm, setWpm] = useState(() => {
    try {
      const stored = localStorage.getItem('ebook_rsvp_wpm');
      return stored ? parseInt(stored, 10) : 300;
    } catch {
      return 300;
    }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const words = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    words.current = text.split(/\s+/).filter((w) => w.length > 0);
  }, [text]);

  useEffect(() => {
    try {
      localStorage.setItem('ebook_rsvp_wpm', String(wpm));
    } catch { /* ignore */ }
  }, [wpm]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const scheduleNext = useCallback(() => {
    const baseMs = 60000 / wpm;
    const word = words.current[currentIndex] || '';
    const delay = getWordDelay(word, baseMs);

    timerRef.current = window.setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= words.current.length) {
          setIsPlaying(false);
          onComplete?.();
          return prev;
        }
        return next;
      });
    }, delay);
  }, [wpm, currentIndex, onComplete]);

  useEffect(() => {
    if (isPlaying && currentIndex < words.current.length) {
      scheduleNext();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, scheduleNext]);

  const togglePlay = () => {
    if (currentIndex >= words.current.length) {
      setCurrentIndex(0);
    }
    setIsPlaying((p) => !p);
  };

  const handleStop = () => {
    stop();
    setCurrentIndex(0);
  };

  const currentWord = words.current[currentIndex] || '';
  const orp = getORP(currentWord);
  const beforeORP = currentWord.slice(0, orp);
  const orpChar = currentWord[orp] || '';
  const afterORP = currentWord.slice(orp + 1);

  const progress = words.current.length > 0
    ? ((currentIndex + 1) / words.current.length) * 100
    : 0;

  return (
    <div className="rsvp-overlay">
      <div className="rsvp-container">
        <div className="rsvp-header">
          <span className="rsvp-title">Speed Reading</span>
          <button className="rsvp-close" onClick={onClose}>&times;</button>
        </div>

        <div className="rsvp-display">
          <div className="rsvp-guide-line" />
          <div className="rsvp-word">
            <span className="rsvp-before">{beforeORP}</span>
            <span className="rsvp-orp">{orpChar}</span>
            <span className="rsvp-after">{afterORP}</span>
          </div>
          <div className="rsvp-guide-line" />
        </div>

        <div className="rsvp-progress-bar">
          <div className="rsvp-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="rsvp-info">
          <span>{currentIndex + 1} / {words.current.length}</span>
          <span>{wpm} WPM</span>
        </div>

        <div className="rsvp-controls">
          <IonButton fill="clear" onClick={handleStop} disabled={!isPlaying && currentIndex === 0}>
            <IonIcon icon={stopOutline} slot="icon-only" />
          </IonButton>
          <IonButton fill="solid" color="primary" onClick={togglePlay}>
            <IonIcon icon={isPlaying ? pauseOutline : playOutline} slot="icon-only" />
          </IonButton>
        </div>

        <div className="rsvp-speed">
          <IonIcon icon={speedometerOutline} style={{ fontSize: '16px', marginRight: '8px' }} />
          <IonRange
            min={100}
            max={800}
            step={25}
            value={wpm}
            onIonChange={(e) => setWpm(e.detail.value as number)}
            style={{ flex: 1 }}
            disabled={isPlaying}
          />
          <span style={{ minWidth: '60px', textAlign: 'right', fontSize: '13px' }}>{wpm} WPM</span>
        </div>
      </div>
    </div>
  );
};

export default RSVPReader;
