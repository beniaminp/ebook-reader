/**
 * Reading Settings Panel
 * Bottom sheet modal for adjusting reading settings
 */

import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { close, contrast, text, eye, ribbon } from 'ionicons/icons';
import { useThemeStore } from '../../stores/useThemeStore';
import type { ThemeType, FontFamily, TextAlignment, MarginSize, RulerColor } from '../../services/themeService';
import { PREDEFINED_THEMES, FONT_FAMILIES } from '../../services/themeService';
import './ReadingSettingsPanel.css';

type SettingsTab = 'appearance' | 'typography' | 'reading-tools' | 'focus-ruler';

export interface ReadingSettingsPanelProps {
  onDismiss: () => void;
}

export const ReadingSettingsPanel: React.FC<ReadingSettingsPanelProps> = ({ onDismiss }) => {
  const {
    theme,
    fontFamily,
    fontSize,
    lineHeight,
    textAlign,
    marginSize,
    blueLightFilter,
    blueLightIntensity,
    readingRuler,
    readingRulerSettings,
    bionicReading,
    focusMode,
    focusModeSettings,
    autoScroll,
    autoScrollSpeed,
    setTheme,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setTextAlign,
    setMarginSize,
    setBlueLightFilter,
    setBlueLightIntensity,
    setReadingRuler,
    setReadingRulerHeight,
    setReadingRulerOpacity,
    setReadingRulerColor,
    setBionicReading,
    setFocusMode,
    setFocusModeOpacity,
    setAutoScroll,
    setAutoScrollSpeed,
    resetSettings,
  } = useThemeStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  const handleFontSizeChange = (e: any) => {
    setFontSize(e.detail.value as number);
  };

  const handleLineHeightChange = (e: any) => {
    setLineHeight(e.detail.value as number);
  };

  const handleBlueLightIntensityChange = (e: any) => {
    setBlueLightIntensity(e.detail.value as number);
  };

  const handleAutoScrollSpeedChange = (e: any) => {
    setAutoScrollSpeed(e.detail.value as number);
  };

  const handleReadingRulerHeightChange = (e: any) => {
    setReadingRulerHeight(e.detail.value as number);
  };

  const handleReadingRulerOpacityChange = (e: any) => {
    setReadingRulerOpacity(e.detail.value as number);
  };

  const handleReadingRulerColorChange = (e: any) => {
    setReadingRulerColor(e.detail.value as RulerColor);
  };

  const handleFocusModeOpacityChange = (e: any) => {
    setFocusModeOpacity(e.detail.value as number);
  };

  const toggleReadingRuler = () => {
    setReadingRuler(!readingRuler);
  };

  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
  };

  return (
    <div className="reading-settings-panel">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reading Settings</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            value={activeTab}
            onIonChange={(e) => setActiveTab(e.detail.value as SettingsTab)}
          >
            <IonSegmentButton value="appearance">
              <IonIcon icon={contrast} />
              <IonLabel>Theme</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="typography">
              <IonIcon icon={text} />
              <IonLabel>Type</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="reading-tools">
              <IonIcon icon={eye} />
              <IonLabel>Tools</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="focus-ruler">
              <IonIcon icon={ribbon} />
              <IonLabel>Focus</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {activeTab === 'appearance' && (
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Theme</IonLabel>
              <IonGrid>
                <IonRow>
                  {PREDEFINED_THEMES.map((t) => (
                    <IonCol key={t.id} size="4">
                      <div
                        className={`theme-option ${theme === t.id ? 'active' : ''}`}
                        onClick={() => setTheme(t.id as ThemeType)}
                        style={{
                          backgroundColor: t.backgroundColor,
                          color: t.textColor,
                          borderColor: t.textColor,
                        }}
                      >
                        <div className="theme-preview">
                          <div className="preview-line" />
                          <div className="preview-line short" />
                        </div>
                        <span className="theme-name">{t.name}</span>
                      </div>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            </IonItem>
          </IonList>
        )}

        {activeTab === 'typography' && (
          <IonList>
            <IonItem>
              <IonLabel position="stacked">
                Font Size: {fontSize}px
              </IonLabel>
              <IonRange
                min={12}
                max={32}
                step={1}
                value={fontSize}
                onIonChange={handleFontSizeChange}
                snaps
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">
                Line Height: {lineHeight}x
              </IonLabel>
              <IonRange
                min={1}
                max={2.5}
                step={0.1}
                value={lineHeight}
                onIonChange={handleLineHeightChange}
                snaps
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Font Family</IonLabel>
              <IonSelect
                value={fontFamily}
                onIonChange={(e) => setFontFamily(e.detail.value as FontFamily)}
              >
                {FONT_FAMILIES.map((font) => (
                  <IonSelectOption key={font.value} value={font.value}>
                    {font.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Text Alignment</IonLabel>
              <IonSegment
                value={textAlign}
                onIonChange={(e) => setTextAlign(e.detail.value as TextAlignment)}
              >
                <IonSegmentButton value="left">
                  <IonLabel>Left</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="justify">
                  <IonLabel>Justify</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Page Margin</IonLabel>
              <IonSegment
                value={marginSize}
                onIonChange={(e) => setMarginSize(e.detail.value as MarginSize)}
              >
                <IonSegmentButton value="small">
                  <IonLabel>S</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="medium">
                  <IonLabel>M</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="large">
                  <IonLabel>L</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </IonItem>
          </IonList>
        )}

        {activeTab === 'reading-tools' && (
          <IonList>
            <IonItem>
              <IonLabel>Blue Light Filter</IonLabel>
              <IonToggle
                checked={blueLightFilter}
                onIonChange={(e) => setBlueLightFilter(e.detail.checked)}
              />
            </IonItem>

            {blueLightFilter && (
              <IonItem>
                <IonLabel position="stacked">
                  Intensity: {blueLightIntensity}%
                </IonLabel>
                <IonRange
                  min={0}
                  max={50}
                  step={1}
                  value={blueLightIntensity}
                  onIonChange={handleBlueLightIntensityChange}
                  snaps
                />
              </IonItem>
            )}

            <IonItem>
              <IonLabel>Reading Ruler</IonLabel>
              <IonToggle
                checked={readingRuler}
                onIonChange={(e) => setReadingRuler(e.detail.checked)}
              />
            </IonItem>

            <IonItem>
              <IonLabel>Bionic Reading</IonLabel>
              <IonToggle
                checked={bionicReading}
                onIonChange={(e) => setBionicReading(e.detail.checked)}
              />
            </IonItem>

            <IonItem>
              <IonLabel>Auto Scroll</IonLabel>
              <IonToggle
                checked={autoScroll}
                onIonChange={(e) => setAutoScroll(e.detail.checked)}
              />
            </IonItem>

            {autoScroll && (
              <IonItem>
                <IonLabel position="stacked">
                  Speed: {autoScrollSpeed}x
                </IonLabel>
                <IonRange
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={autoScrollSpeed}
                  onIonChange={handleAutoScrollSpeedChange}
                  snaps
                />
              </IonItem>
            )}

            <IonItem button onClick={resetSettings}>
              <IonLabel color="danger">Reset to Defaults</IonLabel>
            </IonItem>
          </IonList>
        )}

        {activeTab === 'focus-ruler' && (
          <IonList>
            <IonItem>
              <IonLabel>Reading Ruler</IonLabel>
              <IonToggle
                checked={readingRuler || readingRulerSettings.enabled}
                onIonChange={toggleReadingRuler}
              />
            </IonItem>

            {(readingRuler || readingRulerSettings.enabled) && (
              <>
                <IonItem>
                  <IonLabel position="stacked">
                    Height: {readingRulerSettings.height} lines
                  </IonLabel>
                  <IonRange
                    min={1}
                    max={4}
                    step={1}
                    value={readingRulerSettings.height}
                    onIonChange={handleReadingRulerHeightChange}
                    snaps
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">
                    Opacity: {readingRulerSettings.opacity}%
                  </IonLabel>
                  <IonRange
                    min={10}
                    max={100}
                    step={5}
                    value={readingRulerSettings.opacity}
                    onIonChange={handleReadingRulerOpacityChange}
                    snaps
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Color</IonLabel>
                  <IonSelect
                    value={readingRulerSettings.color}
                    onIonChange={handleReadingRulerColorChange}
                  >
                    <IonSelectOption value="accent">Accent</IonSelectOption>
                    <IonSelectOption value="yellow">Yellow</IonSelectOption>
                    <IonSelectOption value="green">Green</IonSelectOption>
                    <IonSelectOption value="blue">Blue</IonSelectOption>
                    <IonSelectOption value="pink">Pink</IonSelectOption>
                    <IonSelectOption value="red">Red</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </>
            )}

            <IonItem>
              <IonLabel>Focus Mode</IonLabel>
              <IonToggle
                checked={focusMode || focusModeSettings.enabled}
                onIonChange={toggleFocusMode}
              />
            </IonItem>

            {(focusMode || focusModeSettings.enabled) && (
              <IonItem>
                <IonLabel position="stacked">
                  Dim Opacity: {focusModeSettings.opacity}%
                </IonLabel>
                <IonRange
                  min={10}
                  max={80}
                  step={5}
                  value={focusModeSettings.opacity}
                  onIonChange={handleFocusModeOpacityChange}
                  snaps
                />
              </IonItem>
            )}

            <IonItem>
              <IonLabel>Bionic Reading</IonLabel>
              <IonToggle
                checked={bionicReading}
                onIonChange={(e) => setBionicReading(e.detail.checked)}
              />
            </IonItem>

            <IonItem button onClick={resetSettings}>
              <IonLabel color="danger">Reset to Defaults</IonLabel>
            </IonItem>
          </IonList>
        )}
      </IonContent>
    </div>
  );
};

export default ReadingSettingsPanel;
