/**
 * SleepTimerSheet Component
 * Popover/sheet with timer presets, custom input, and active timer display.
 */

import React, { useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { timerOutline, stopCircleOutline, addCircleOutline } from 'ionicons/icons';
import './SleepTimer.css';

/** Preset durations in minutes */
const PRESETS = [15, 30, 45, 60, 90, 120] as const;

interface SleepTimerSheetProps {
  isActive: boolean;
  formattedTime: string;
  progressFraction: number;
  onStart: (minutes: number) => void;
  onStop: () => void;
  onExtend: (minutes: number) => void;
  onDismiss: () => void;
}

export const SleepTimerSheet: React.FC<SleepTimerSheetProps> = ({
  isActive,
  formattedTime,
  progressFraction,
  onStart,
  onStop,
  onExtend,
  onDismiss,
}) => {
  const [customMinutes, setCustomMinutes] = useState('');

  const handleCustomStart = () => {
    const mins = parseInt(customMinutes, 10);
    if (mins > 0 && mins <= 480) {
      onStart(mins);
      setCustomMinutes('');
      onDismiss();
    }
  };

  const handlePresetClick = (minutes: number) => {
    onStart(minutes);
    onDismiss();
  };

  const handleExtend = (minutes: number) => {
    onExtend(minutes);
  };

  const formatPresetLabel = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minutes`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hrs} hour${hrs > 1 ? 's' : ''}`;
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="sleep-timer-sheet">
      <h3>
        <IonIcon icon={timerOutline} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        Sleep Timer
      </h3>

      {isActive ? (
        <>
          {/* Active timer display */}
          <div className="sleep-timer-status">
            <div className="remaining-display">{formattedTime}</div>
            <div className="remaining-label">remaining</div>
            <div className="sleep-timer-progress">
              <div
                className="sleep-timer-progress-bar"
                style={{ width: `${progressFraction * 100}%` }}
              />
            </div>
            <div className="sleep-timer-actions">
              <IonButton
                fill="outline"
                size="small"
                onClick={() => handleExtend(5)}
              >
                <IonIcon icon={addCircleOutline} slot="start" />
                +5 min
              </IonButton>
              <IonButton
                fill="outline"
                size="small"
                onClick={() => handleExtend(15)}
              >
                <IonIcon icon={addCircleOutline} slot="start" />
                +15 min
              </IonButton>
              <IonButton
                fill="outline"
                color="danger"
                size="small"
                onClick={() => {
                  onStop();
                  onDismiss();
                }}
              >
                <IonIcon icon={stopCircleOutline} slot="start" />
                Cancel
              </IonButton>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Preset options */}
          <div className="sleep-timer-presets">
            {PRESETS.map((mins) => (
              <IonButton
                key={mins}
                fill="outline"
                expand="block"
                onClick={() => handlePresetClick(mins)}
              >
                {formatPresetLabel(mins)}
              </IonButton>
            ))}
          </div>

          {/* Custom input */}
          <div className="sleep-timer-custom-row">
            <input
              type="number"
              min="1"
              max="480"
              placeholder="Custom"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomStart();
              }}
            />
            <span>min</span>
            <IonButton
              fill="solid"
              size="small"
              disabled={!customMinutes || parseInt(customMinutes, 10) <= 0}
              onClick={handleCustomStart}
            >
              Start
            </IonButton>
          </div>
        </>
      )}
    </div>
  );
};

export default SleepTimerSheet;
