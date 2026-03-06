/**
 * Pomodoro / Focus Timer
 *
 * Built-in 25-min focus blocks with break reminders.
 * Configurable work/break durations.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IonButton, IonIcon, IonToast } from '@ionic/react';
import { playOutline, pauseOutline, refreshOutline, timerOutline } from 'ionicons/icons';
import './PomodoroTimer.css';

interface PomodoroTimerProps {
  onSessionComplete?: (minutes: number) => void;
}

type TimerPhase = 'idle' | 'work' | 'break';

const WORK_DURATIONS = [15, 20, 25, 30, 45, 60];
const BREAK_DURATIONS = [3, 5, 10];

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onSessionComplete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showBreakToast, setShowBreakToast] = useState(false);

  const intervalRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return clearTimer;
  }, [isRunning, clearTimer]);

  // Handle timer completion
  useEffect(() => {
    if (secondsLeft === 0 && phase !== 'idle' && !isRunning) {
      if (phase === 'work') {
        setSessionsCompleted((prev) => prev + 1);
        onSessionComplete?.(workMinutes);
        setShowBreakToast(true);
        // Auto-start break
        setPhase('break');
        setSecondsLeft(breakMinutes * 60);
        setIsRunning(true);
      } else if (phase === 'break') {
        // Break done, ready for next work session
        setPhase('idle');
      }
    }
  }, [secondsLeft, phase, isRunning, workMinutes, breakMinutes, onSessionComplete]);

  const startWork = () => {
    setPhase('work');
    setSecondsLeft(workMinutes * 60);
    setIsRunning(true);
    setIsExpanded(false);
  };

  const togglePause = () => {
    setIsRunning((prev) => !prev);
  };

  const reset = () => {
    clearTimer();
    setPhase('idle');
    setIsRunning(false);
    setSecondsLeft(0);
  };

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressFraction = phase === 'work'
    ? 1 - secondsLeft / (workMinutes * 60)
    : phase === 'break'
      ? 1 - secondsLeft / (breakMinutes * 60)
      : 0;

  if (!isExpanded && phase === 'idle') {
    return (
      <button className="pomodoro-mini" onClick={() => setIsExpanded(true)} title="Focus Timer">
        <IonIcon icon={timerOutline} />
      </button>
    );
  }

  if (!isExpanded && phase !== 'idle') {
    return (
      <button
        className={`pomodoro-mini pomodoro-mini--active ${phase === 'break' ? 'pomodoro-mini--break' : ''}`}
        onClick={() => setIsExpanded(true)}
      >
        <span className="pomodoro-mini-time">{formatTime(secondsLeft)}</span>
      </button>
    );
  }

  return (
    <>
      <div className="pomodoro-panel">
        <div className="pomodoro-header">
          <span className="pomodoro-label">
            {phase === 'idle' ? 'Focus Timer' : phase === 'work' ? 'Focus Session' : 'Break Time'}
          </span>
          <button className="pomodoro-collapse" onClick={() => setIsExpanded(false)}>&minus;</button>
        </div>

        {phase === 'idle' ? (
          <div className="pomodoro-setup">
            <div className="pomodoro-option">
              <span className="pomodoro-option-label">Work</span>
              <div className="pomodoro-chips">
                {WORK_DURATIONS.map((d) => (
                  <button
                    key={d}
                    className={`pomodoro-chip ${workMinutes === d ? 'pomodoro-chip--active' : ''}`}
                    onClick={() => setWorkMinutes(d)}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
            <div className="pomodoro-option">
              <span className="pomodoro-option-label">Break</span>
              <div className="pomodoro-chips">
                {BREAK_DURATIONS.map((d) => (
                  <button
                    key={d}
                    className={`pomodoro-chip ${breakMinutes === d ? 'pomodoro-chip--active' : ''}`}
                    onClick={() => setBreakMinutes(d)}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
            <IonButton expand="block" onClick={startWork} style={{ marginTop: '8px' }}>
              <IonIcon icon={playOutline} slot="start" />
              Start {workMinutes}m Session
            </IonButton>
            {sessionsCompleted > 0 && (
              <div className="pomodoro-sessions">
                {sessionsCompleted} session{sessionsCompleted !== 1 ? 's' : ''} today
              </div>
            )}
          </div>
        ) : (
          <div className="pomodoro-active">
            <div className="pomodoro-ring">
              <svg viewBox="0 0 100 100" className="pomodoro-svg">
                <circle cx="50" cy="50" r="45" className="pomodoro-ring-bg" />
                <circle
                  cx="50" cy="50" r="45"
                  className={`pomodoro-ring-fill ${phase === 'break' ? 'pomodoro-ring-fill--break' : ''}`}
                  style={{
                    strokeDasharray: `${2 * Math.PI * 45}`,
                    strokeDashoffset: `${2 * Math.PI * 45 * (1 - progressFraction)}`,
                  }}
                />
              </svg>
              <div className="pomodoro-time">{formatTime(secondsLeft)}</div>
            </div>
            <div className="pomodoro-buttons">
              <IonButton fill="clear" onClick={togglePause}>
                <IonIcon icon={isRunning ? pauseOutline : playOutline} slot="icon-only" />
              </IonButton>
              <IonButton fill="clear" color="danger" onClick={reset}>
                <IonIcon icon={refreshOutline} slot="icon-only" />
              </IonButton>
            </div>
          </div>
        )}
      </div>

      <IonToast
        isOpen={showBreakToast}
        message={`Focus session complete! Take a ${breakMinutes} minute break.`}
        duration={3000}
        onDidDismiss={() => setShowBreakToast(false)}
        color="success"
      />
    </>
  );
};

export default PomodoroTimer;
