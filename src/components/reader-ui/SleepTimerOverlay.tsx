/**
 * SleepTimerOverlay Component
 * Shown when the sleep timer expires. Provides a dim overlay with options
 * to dismiss or restart the timer.
 */

import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { moonOutline, closeOutline, timerOutline } from 'ionicons/icons';
import './SleepTimer.css';

interface SleepTimerOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  onRestart: (minutes: number) => void;
}

export const SleepTimerOverlay: React.FC<SleepTimerOverlayProps> = ({
  visible,
  onDismiss,
  onRestart,
}) => {
  if (!visible) return null;

  return (
    <div className="sleep-timer-overlay" onClick={onDismiss}>
      <div
        className="sleep-timer-overlay-content"
        onClick={(e) => e.stopPropagation()}
      >
        <IonIcon icon={moonOutline} className="overlay-icon" />
        <h2>Sleep Timer Ended</h2>
        <p>Your reading session has been paused. Sweet dreams!</p>
        <div className="sleep-timer-overlay-actions">
          <IonButton
            fill="outline"
            color="light"
            onClick={onDismiss}
          >
            <IonIcon icon={closeOutline} slot="start" />
            Dismiss
          </IonButton>
          <IonButton
            fill="solid"
            color="primary"
            onClick={() => {
              onRestart(15);
            }}
          >
            <IonIcon icon={timerOutline} slot="start" />
            +15 min
          </IonButton>
          <IonButton
            fill="solid"
            color="primary"
            onClick={() => {
              onRestart(30);
            }}
          >
            <IonIcon icon={timerOutline} slot="start" />
            +30 min
          </IonButton>
        </div>
      </div>
    </div>
  );
};

export default SleepTimerOverlay;
