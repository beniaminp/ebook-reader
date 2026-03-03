/**
 * SleepTimerButton Component
 * Moon/timer icon button for the reader toolbar.
 * Shows countdown when active. Tapping opens the SleepTimerSheet popover.
 */

import React, { useState } from 'react';
import { IonButton, IonIcon, IonPopover } from '@ionic/react';
import { moonOutline, timerOutline, bookOutline } from 'ionicons/icons';
import { SleepTimerSheet } from './SleepTimerSheet';
import type { UseSleepTimerReturn } from '../../hooks/useSleepTimer';
import './SleepTimer.css';

interface SleepTimerButtonProps {
  sleepTimer: UseSleepTimerReturn;
  /** Optional style override for theme-matched icons */
  iconStyle?: React.CSSProperties;
}

export const SleepTimerButton: React.FC<SleepTimerButtonProps> = ({
  sleepTimer,
  iconStyle,
}) => {
  const [showPopover, setShowPopover] = useState(false);

  const {
    isActive,
    mode,
    formattedTime,
    progressFraction,
    startTimer,
    startEndOfChapter,
    stopTimer,
    extendTimer,
  } = sleepTimer;

  // Choose icon based on mode
  const activeIcon = mode === 'end-of-chapter' ? bookOutline : timerOutline;

  return (
    <>
      <IonButton
        className={`sleep-timer-button${isActive ? ' active' : ''}`}
        onClick={() => setShowPopover(true)}
        aria-label={isActive ? `Sleep timer: ${formattedTime} remaining` : 'Sleep timer'}
        style={iconStyle}
      >
        <IonIcon icon={isActive ? activeIcon : moonOutline} />
        {isActive && mode === 'time' && (
          <span className="timer-countdown">{formattedTime}</span>
        )}
        {isActive && mode === 'end-of-chapter' && (
          <span className="timer-countdown timer-eoc">Ch.</span>
        )}
      </IonButton>

      <IonPopover
        isOpen={showPopover}
        onDidDismiss={() => setShowPopover(false)}
        side="bottom"
        alignment="end"
      >
        <SleepTimerSheet
          isActive={isActive}
          mode={mode}
          formattedTime={formattedTime}
          progressFraction={progressFraction}
          onStart={startTimer}
          onStartEndOfChapter={startEndOfChapter}
          onStop={stopTimer}
          onExtend={extendTimer}
          onDismiss={() => setShowPopover(false)}
        />
      </IonPopover>
    </>
  );
};

export default SleepTimerButton;
