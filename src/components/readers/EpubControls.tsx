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
  checkmark,
} from 'ionicons/icons';
import type { EpubTheme, EpubChapter } from '../../types/epub';
import { EPUB_THEMES } from '../../types/epub';

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

  const themeList = Object.values(EPUB_THEMES);

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
            <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {themeList.map((theme) => {
                const isActive = currentTheme.id === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => onSetTheme(theme)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: isActive ? '2px solid var(--ion-color-primary)' : '2px solid transparent',
                      background: 'var(--ion-color-light)',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: theme.backgroundColor,
                        border: '2px solid var(--ion-color-medium-shade)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        position: 'relative',
                      }}
                    >
                      <span style={{ color: theme.textColor, fontSize: '14px', fontWeight: 700 }}>A</span>
                      {isActive && (
                        <IonIcon
                          icon={checkmark}
                          style={{
                            position: 'absolute',
                            bottom: '-4px',
                            right: '-4px',
                            fontSize: '14px',
                            color: 'white',
                            background: 'var(--ion-color-primary)',
                            borderRadius: '50%',
                            padding: '1px',
                          }}
                        />
                      )}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400 }}>{theme.name}</span>
                  </div>
                );
              })}
            </div>
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
