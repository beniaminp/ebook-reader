/**
 * EPUB Reader Controls Component
 *
 * Bottom controls for EPUB reading: navigation, settings, TOC
 */

import React, { useState } from 'react';
import {
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import {
  chevronBack,
  chevronForward,
  list,
  book,
  colorPalette,
  text,
  arrowBack,
} from 'ionicons/icons';
import type { EpubTheme, EpubChapter } from '../../types/epub';

export interface EpubControlsProps {
  currentPage: number;
  totalPages: number;
  currentChapterIndex: number;
  chapters: EpubChapter[];
  currentTheme: EpubTheme;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  onNext: () => void;
  onPrev: () => void;
  onGoToChapter: (index: number) => void;
  onSetFontSize: (size: number) => void;
  onSetFontFamily: (family: string) => void;
  onSetLineHeight: (height: number) => void;
  onSetTheme: (theme: EpubTheme) => void;
  onToggleBookmark: () => void;
  isBookmarked: boolean;
  bookTitle: string;
}

export const EpubControls: React.FC<EpubControlsProps> = ({
  currentPage,
  totalPages,
  currentChapterIndex,
  chapters,
  currentTheme,
  fontSize,
  fontFamily,
  lineHeight,
  onNext,
  onPrev,
  onGoToChapter,
  onSetFontSize,
  onSetFontFamily,
  onSetLineHeight,
  onSetTheme,
  onToggleBookmark,
  isBookmarked,
  bookTitle,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'display' | 'theme' | 'advanced'>('display');

  const fontFamilies = [
    { value: 'serif', label: 'Serif' },
    { value: 'sans-serif', label: 'Sans Serif' },
    { value: 'monospace', label: 'Monospace' },
  ];

  const themes = [
    { id: 'light', name: 'Light', icon: 'sunny' },
    { id: 'sepia', name: 'Sepia', icon: 'eye' },
    { id: 'dark', name: 'Dark', icon: 'moon' },
  ];

  return (
    <>
      <IonToolbar className="epub-controls-toolbar">
        <IonButtons slot="start">
          <IonButton onClick={onPrev}>
            <IonIcon icon={chevronBack} />
          </IonButton>
        </IonButtons>

        <IonTitle size="small">
          {currentPage > 0 ? currentPage : '-'} / {totalPages > 0 ? totalPages : '-'}
        </IonTitle>

        <IonButtons slot="end">
          <IonButton onClick={() => setShowToc(true)}>
            <IonIcon icon={list} />
          </IonButton>
          <IonButton onClick={() => setShowSettings(true)}>
            <IonIcon icon={text} />
          </IonButton>
          <IonButton onClick={onNext}>
            <IonIcon icon={chevronForward} />
          </IonButton>
        </IonButtons>
      </IonToolbar>

      {/* Settings Popover */}
      <IonPopover isOpen={showSettings} onDidDismiss={() => setShowSettings(false)}>
        <div style={{ width: '300px', maxWidth: '80vw' }}>
          <IonSegment value={settingsTab} onIonChange={(e) => setSettingsTab(e.detail.value as any)}>
            <IonSegmentButton value="display">
              <IonIcon icon={text} />
            </IonSegmentButton>
            <IonSegmentButton value="theme">
              <IonIcon icon={colorPalette} />
            </IonSegmentButton>
          </IonSegment>

          {settingsTab === 'display' && (
            <IonList>
              <IonItem>
                <IonLabel>Font Size</IonLabel>
                <IonRange
                  min={12}
                  max={24}
                  step={1}
                  value={fontSize}
                  onIonChange={(e) => onSetFontSize(e.detail.value as number)}
                  snaps
                />
                <IonLabel slot="end" style={{ minWidth: '30px', textAlign: 'right' }}>
                  {fontSize}
                </IonLabel>
              </IonItem>

              <IonItem>
                <IonLabel>Font Family</IonLabel>
                <IonSelect
                  value={fontFamily}
                  onIonChange={(e) => onSetFontFamily(e.detail.value)}
                >
                  {fontFamilies.map((f) => (
                    <IonSelectOption key={f.value} value={f.value}>
                      {f.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              <IonItem>
                <IonLabel>Line Height</IonLabel>
                <IonRange
                  min={1.0}
                  max={2.5}
                  step={0.1}
                  value={lineHeight}
                  onIonChange={(e) => onSetLineHeight(e.detail.value as number)}
                  snaps
                />
                <IonLabel slot="end" style={{ minWidth: '30px', textAlign: 'right' }}>
                  {lineHeight.toFixed(1)}
                </IonLabel>
              </IonItem>
            </IonList>
          )}

          {settingsTab === 'theme' && (
            <IonList>
              {themes.map((theme) => (
                <IonItem
                  key={theme.id}
                  button
                  onClick={() => onSetTheme(currentTheme)}
                  disabled={currentTheme.id === theme.id}
                >
                  <IonIcon
                    icon={theme.icon === 'sunny' ? 'sunny' : theme.icon === 'moon' ? 'moon' : 'eye'}
                    slot="start"
                  />
                  <IonLabel>{theme.name}</IonLabel>
                  {currentTheme.id === theme.id && <IonIcon icon="checkmark" slot="end" />}
                </IonItem>
              ))}
            </IonList>
          )}
        </div>
      </IonPopover>

      {/* Table of Contents Popover */}
      <IonPopover isOpen={showToc} onDidDismiss={() => setShowToc(false)}>
        <div style={{ width: '300px', maxWidth: '80vw', maxHeight: '60vh', overflowY: 'auto' }}>
          <IonList>
            <IonItem lines="none">
              <IonLabel>
                <h2>Table of Contents</h2>
              </IonLabel>
            </IonItem>
            {chapters.map((chapter, index) => (
              <IonItem
                key={chapter.id}
                button
                onClick={() => {
                  onGoToChapter(index);
                  setShowToc(false);
                }}
              >
                <IonLabel>{chapter.label}</IonLabel>
              </IonItem>
            ))}
          </IonList>
        </div>
      </IonPopover>
    </>
  );
};

export default EpubControls;
