/**
 * Reading Toolbar
 * Quick access controls for reading settings
 */

import React from 'react';
import {
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonPopover,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/react';
import {
  textOutline,
  text,
  ellipsisHorizontal,
  bookOutline,
  eyeOutline,
  eye,
  glassesOutline,
  contrast,
  moon,
  sunny,
  colorPalette,
  optionsOutline,
  volumeHighOutline,
} from 'ionicons/icons';
import { useThemeStore } from '../../stores/useThemeStore';
import './ReadingToolbar.css';

export interface QuickTheme {
  id: string;
  name: string;
  type: 'light' | 'dark' | 'sepia';
  icon: any;
}

const quickThemes: QuickTheme[] = [
  { id: 'light', name: 'Light', type: 'light', icon: sunny },
  { id: 'sepia', name: 'Sepia', type: 'sepia', icon: bookOutline },
  { id: 'dark', name: 'Dark', type: 'dark', icon: moon },
];

interface ReadingToolbarProps {
  onSettingsClick: () => void;
  onToggleRuler: () => void;
  onToggleBionic: () => void;
  onFontDecrease: () => void;
  onFontIncrease: () => void;
  onToggleTTS?: () => void;
  ttsActive?: boolean;
}

export const ReadingToolbar: React.FC<ReadingToolbarProps> = ({
  onSettingsClick,
  onToggleRuler,
  onToggleBionic,
  onFontDecrease,
  onFontIncrease,
  onToggleTTS,
  ttsActive = false,
}) => {
  const { theme, fontSize, setTheme } = useThemeStore();
  const [showThemePopover, setShowThemePopover] = React.useState(false);
  const [showToolsPopover, setShowToolsPopover] = React.useState(false);

  const currentTheme = quickThemes.find((t) => t.type === theme);

  return (
    <IonToolbar className="reading-toolbar">
      <IonButtons slot="start">
        <IonButton onClick={onFontDecrease} aria-label="Decrease font size">
          <IonIcon icon={textOutline} />
          <span className="font-adjust">A-</span>
        </IonButton>
        <IonButton onClick={onFontIncrease} aria-label="Increase font size">
          <IonIcon icon={text} />
          <span className="font-adjust">A+</span>
        </IonButton>
      </IonButtons>

      <IonButtons slot="end">
        <IonButton onClick={() => setShowThemePopover(!showThemePopover)} aria-label="Change theme">
          <IonIcon icon={currentTheme?.icon || contrast} />
          <span className="theme-name">{currentTheme?.name}</span>
        </IonButton>

        {onToggleTTS && (
          <IonButton
            onClick={onToggleTTS}
            aria-label="Text to speech"
            color={ttsActive ? 'primary' : undefined}
          >
            <IonIcon icon={volumeHighOutline} />
          </IonButton>
        )}

        <IonButton
          onClick={() => setShowToolsPopover(!showToolsPopover)}
          aria-label="Reading tools"
        >
          <IonIcon icon={glassesOutline} />
        </IonButton>

        <IonButton onClick={onSettingsClick} aria-label="Full settings">
          <IonIcon icon={optionsOutline} />
        </IonButton>
      </IonButtons>

      {/* Theme Selection Popover */}
      <IonPopover
        isOpen={showThemePopover}
        onDidDismiss={() => setShowThemePopover(false)}
        side="bottom"
        alignment="center"
      >
        <div className="theme-popover-content">
          <IonSegment
            value={theme}
            onIonChange={(e) => {
              setTheme(e.detail.value as any);
              setShowThemePopover(false);
            }}
          >
            {quickThemes.map((t) => (
              <IonSegmentButton key={t.id} value={t.type}>
                <IonIcon icon={t.icon} />
                <IonLabel>{t.name}</IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>
        </div>
      </IonPopover>

      {/* Reading Tools Popover */}
      <IonPopover
        isOpen={showToolsPopover}
        onDidDismiss={() => setShowToolsPopover(false)}
        side="bottom"
        alignment="end"
      >
        <div className="tools-popover-content">
          <IonButton
            fill="clear"
            onClick={() => {
              onToggleRuler();
              setShowToolsPopover(false);
            }}
          >
            <IonIcon icon={eyeOutline} slot="start" />
            Reading Ruler
          </IonButton>
          <IonButton
            fill="clear"
            onClick={() => {
              onToggleBionic();
              setShowToolsPopover(false);
            }}
          >
            <IonIcon icon={glassesOutline} slot="start" />
            Bionic Reading
          </IonButton>
        </div>
      </IonPopover>
    </IonToolbar>
  );
};

export default ReadingToolbar;
