/**
 * TTSControls Component
 * Floating mini-player for Text-to-Speech controls
 */

import React, { useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonItem,
  IonLabel,
  IonBadge,
} from '@ionic/react';
import {
  playOutline,
  pauseOutline,
  stopOutline,
  playSkipForwardOutline,
  playSkipBackOutline,
  closeOutline,
  settingsOutline,
  volumeHighOutline,
} from 'ionicons/icons';
import type { UseTTSReturn } from '../../hooks/useTTS';
import './TTSControls.css';

interface TTSControlsProps {
  tts: UseTTSReturn;
  onClose: () => void;
}

export const TTSControls: React.FC<TTSControlsProps> = ({ tts, onClose }) => {
  const [showSettings, setShowSettings] = useState(false);

  const {
    state,
    currentSentenceIndex,
    totalSentences,
    rate,
    pitch,
    volume,
    selectedVoiceURI,
    availableVoices,
    pause,
    resume,
    stop,
    skipForward,
    skipBackward,
    setRate,
    setPitch,
    setVolume,
    setVoice,
  } = tts;

  const handlePlayPause = () => {
    if (state === 'playing') {
      pause();
    } else if (state === 'paused') {
      resume();
    }
  };

  const handleStop = () => {
    stop();
    onClose();
  };

  const progressPercent =
    totalSentences > 0 ? Math.round(((currentSentenceIndex + 1) / totalSentences) * 100) : 0;

  return (
    <>
      <div className="tts-mini-player">
        <div className="tts-mini-player-header">
          <IonIcon icon={volumeHighOutline} className="tts-icon" />
          <span className="tts-progress-text">
            {totalSentences > 0
              ? `${currentSentenceIndex + 1} / ${totalSentences} (${progressPercent}%)`
              : 'TTS'}
          </span>
          <IonButton
            fill="clear"
            size="small"
            onClick={() => setShowSettings(true)}
            aria-label="TTS settings"
          >
            <IonIcon icon={settingsOutline} />
          </IonButton>
          <IonButton fill="clear" size="small" onClick={handleStop} aria-label="Close TTS">
            <IonIcon icon={closeOutline} />
          </IonButton>
        </div>

        <div className="tts-progress-bar-container">
          <div className="tts-progress-bar" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="tts-controls">
          <IonButton
            fill="clear"
            size="small"
            onClick={skipBackward}
            disabled={state === 'idle'}
            aria-label="Previous sentence"
          >
            <IonIcon icon={playSkipBackOutline} />
          </IonButton>

          <IonButton
            fill="clear"
            onClick={handlePlayPause}
            disabled={state === 'idle'}
            aria-label={state === 'playing' ? 'Pause' : 'Resume'}
            className="tts-play-pause-btn"
          >
            <IonIcon icon={state === 'playing' ? pauseOutline : playOutline} />
          </IonButton>

          <IonButton
            fill="clear"
            size="small"
            onClick={skipForward}
            disabled={state === 'idle'}
            aria-label="Next sentence"
          >
            <IonIcon icon={playSkipForwardOutline} />
          </IonButton>

          <IonButton
            fill="clear"
            size="small"
            onClick={handleStop}
            disabled={state === 'idle'}
            aria-label="Stop TTS"
          >
            <IonIcon icon={stopOutline} />
          </IonButton>

          <IonBadge color="primary" className="tts-rate-badge">
            {rate.toFixed(1)}x
          </IonBadge>
        </div>
      </div>

      {/* TTS Settings Modal */}
      <IonModal isOpen={showSettings} onDidDismiss={() => setShowSettings(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>TTS Settings</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowSettings(false)}>Done</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="tts-settings-content">
            <IonItem>
              <IonLabel>
                <h3>Speed</h3>
                <p>{rate.toFixed(1)}x (0.5 - 2.0)</p>
              </IonLabel>
            </IonItem>
            <div className="tts-range-container">
              <IonRange
                min={0.5}
                max={2.0}
                step={0.1}
                value={rate}
                onIonInput={(e) => setRate(e.detail.value as number)}
                ticks
                snaps
              >
                <span slot="start">0.5x</span>
                <span slot="end">2.0x</span>
              </IonRange>
            </div>

            <IonItem>
              <IonLabel>
                <h3>Pitch</h3>
                <p>{pitch.toFixed(1)} (0.5 - 2.0)</p>
              </IonLabel>
            </IonItem>
            <div className="tts-range-container">
              <IonRange
                min={0.5}
                max={2.0}
                step={0.1}
                value={pitch}
                onIonInput={(e) => setPitch(e.detail.value as number)}
                ticks
                snaps
              >
                <span slot="start">Low</span>
                <span slot="end">High</span>
              </IonRange>
            </div>

            <IonItem>
              <IonLabel>
                <h3>Volume</h3>
                <p>{Math.round(volume * 100)}%</p>
              </IonLabel>
            </IonItem>
            <div className="tts-range-container">
              <IonRange
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onIonInput={(e) => setVolume(e.detail.value as number)}
              >
                <span slot="start">0%</span>
                <span slot="end">100%</span>
              </IonRange>
            </div>

            {availableVoices.length > 0 && (
              <IonItem>
                <IonLabel>Voice</IonLabel>
                <IonSelect
                  value={selectedVoiceURI}
                  onIonChange={(e) => setVoice(e.detail.value as string)}
                  interface="action-sheet"
                  placeholder="Default"
                >
                  <IonSelectOption value="">System Default</IonSelectOption>
                  {availableVoices.map((voice) => (
                    <IonSelectOption key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            )}
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};

export default TTSControls;
