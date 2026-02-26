/**
 * Theme Toggle Button
 * Quick theme switcher button for the reading interface
 */

import React, { useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonPopover,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/react';
import { sunny, moon, book, eye, contrast } from 'ionicons/icons';
import { useThemeStore } from '../../stores/useThemeStore';
import type { ThemeType } from '../../services/themeService';
import './ThemeToggleButton.css';

interface ThemeOption {
  value: ThemeType;
  label: string;
  icon: any;
  color: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: sunny, color: '#ffffff' },
  { value: 'sepia', label: 'Sepia', icon: book, color: '#f4ecd8' },
  { value: 'eye-comfort', label: 'Eye Comfort', icon: eye, color: '#214e34' },
  { value: 'dark', label: 'Dark', icon: moon, color: '#1a1a1a' },
];

interface ThemeToggleButtonProps {
  showLabel?: boolean;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ showLabel = false }) => {
  const { theme, setTheme } = useThemeStore();
  const [showPopover, setShowPopover] = useState(false);

  const currentTheme = THEME_OPTIONS.find((t) => t.value === theme) || THEME_OPTIONS[0];

  return (
    <>
      <IonButton
        className="theme-toggle-button"
        onClick={() => setShowPopover(!showPopover)}
        aria-label="Change theme"
      >
        <IonIcon icon={currentTheme.icon} slot="start" />
        {showLabel && <IonLabel>{currentTheme.label}</IonLabel>}
      </IonButton>

      <IonPopover
        isOpen={showPopover}
        onDidDismiss={() => setShowPopover(false)}
        side="bottom"
        alignment="center"
      >
        <div className="theme-toggle-popover">
          <IonSegment
            value={theme}
            onIonChange={(e) => {
              setTheme(e.detail.value as ThemeType);
              setShowPopover(false);
            }}
          >
            {THEME_OPTIONS.map((option) => (
              <IonSegmentButton key={option.value} value={option.value}>
                <div className="theme-option">
                  <div
                    className="theme-preview"
                    style={{
                      backgroundColor: option.color,
                      borderColor: option.color === '#ffffff' ? '#ddd' : option.color,
                    }}
                  >
                    <IonIcon icon={option.icon} />
                  </div>
                  <span className="theme-option-label">{option.label}</span>
                </div>
              </IonSegmentButton>
            ))}
          </IonSegment>
        </div>
      </IonPopover>
    </>
  );
};

export default ThemeToggleButton;
