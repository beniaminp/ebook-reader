/**
 * SleepTimerWarning Component
 * Floating toast-like notification shown when 1 minute remains.
 * Offers quick extend or dismiss options.
 */

import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { alarmOutline, addCircleOutline, closeCircleOutline } from 'ionicons/icons';
import './SleepTimer.css';

interface SleepTimerWarningProps {
  visible: boolean;
  remainingSeconds: number;
  onExtend: (minutes: number) => void;
  onDismiss: () => void;
}

export const SleepTimerWarning: React.FC<SleepTimerWarningProps> = ({
  visible,
  remainingSeconds,
  onExtend,
  onDismiss,
}) => {
  if (!visible) return null;

  return (
    <div className="sleep-timer-warning">
      <IonIcon icon={alarmOutline} className="warning-icon" />
      <div className="warning-content">
        <p className="warning-title">Sleep timer ending soon</p>
        <p className="warning-subtitle">{remainingSeconds} seconds remaining</p>
      </div>
      <div className="warning-actions">
        <IonButton
          fill="clear"
          size="small"
          color="dark"
          onClick={() => onExtend(5)}
        >
          <IonIcon icon={addCircleOutline} slot="start" />
          +5m
        </IonButton>
        <IonButton
          fill="clear"
          size="small"
          color="dark"
          onClick={onDismiss}
        >
          <IonIcon icon={closeCircleOutline} />
        </IonButton>
      </div>
    </div>
  );
};

export default SleepTimerWarning;
