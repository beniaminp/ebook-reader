/**
 * Reading Settings Panel
 * Bottom sheet modal for adjusting reading settings
 */

import React, { useState, useRef } from 'react';
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
import {
  close,
  contrast,
  text,
  eye,
  expand,
  ribbon,
  colorPalette,
  image,
  closeCircle,
  documentText,
  trash,
  accessibility,
} from 'ionicons/icons';
import { useThemeStore } from '../../stores/useThemeStore';
import type {
  ThemeType,
  FontFamily,
  TextAlignment,
  RulerColor,
  CustomMargins,
} from '../../services/themeService';
import { PREDEFINED_THEMES, FONT_FAMILIES } from '../../services/themeService';
import { SUPPORTED_LANGUAGES } from '../../services/translationService';
import { fontService } from '../../services/fontService';
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
    customMargins,
    blueLightFilter,
    blueLightIntensity,
    readingRuler,
    readingRulerSettings,
    bionicReading,
    interlinearMode,
    interlinearLanguage,
    focusMode,
    focusModeSettings,
    autoScroll,
    autoScrollSpeed,
    customBackgroundColor,
    customBackgroundImage,
    customFonts,
    getAllFontFamilies,
    addCustomFont,
    removeCustomFont,
    setTheme,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setTextAlign,
    setMarginSize,
    setCustomMargins,
    setBlueLightFilter,
    setBlueLightIntensity,
    setReadingRuler,
    setReadingRulerHeight,
    setReadingRulerOpacity,
    setReadingRulerColor,
    setBionicReading,
    setInterlinearMode,
    setInterlinearLanguage,
    wordWiseEnabled,
    wordWiseLevel,
    setWordWiseEnabled,
    setWordWiseLevel,
    immersiveMode,
    setImmersiveMode,
    hyphenation,
    setHyphenation,
    paragraphSpacing,
    setParagraphSpacing,
    letterSpacing,
    setLetterSpacing,
    setFocusMode,
    setFocusModeOpacity,
    setAutoScroll,
    setAutoScrollSpeed,
    setCustomBackgroundColor,
    setCustomBackgroundImage,
    clearCustomBackground,
    applyPreset,
    resetSettings,
  } = useThemeStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [importingFont, setImportingFont] = useState(false);
  const [fontImportError, setFontImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);

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

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomBackgroundColor(color);
    // Clear custom image when setting a color
    if (customBackgroundImage) {
      setCustomBackgroundImage(undefined);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUri = event.target?.result as string;
        setCustomBackgroundImage(dataUri);
        // Clear custom color when setting an image
        if (customBackgroundColor) {
          setCustomBackgroundColor(undefined);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearCustomBackground = () => {
    clearCustomBackground();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFontImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingFont(true);
    setFontImportError(null);

    try {
      const fontInfo = await fontService.importFontFile(file);
      addCustomFont(fontInfo);

      // Reset the input
      if (fontInputRef.current) {
        fontInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to import font:', error);
      setFontImportError(error instanceof Error ? error.message : 'Failed to import font');
    } finally {
      setImportingFont(false);
    }
  };

  const handleDeleteFont = async (fontName: string) => {
    try {
      await removeCustomFont(fontName);
    } catch (error) {
      console.error('Failed to delete font:', error);
      setFontImportError(error instanceof Error ? error.message : 'Failed to delete font');
    }
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

            {/* Custom Background Section */}
            <IonItem>
              <IonLabel position="stacked">
                <IonIcon
                  icon={colorPalette}
                  style={{ marginRight: '8px', verticalAlign: 'middle' }}
                />
                Custom Background
              </IonLabel>
            </IonItem>

            {/* Custom Color Picker */}
            <IonItem>
              <IonLabel>Custom Color</IonLabel>
              <input
                type="color"
                value={customBackgroundColor || '#ffffff'}
                onChange={handleColorChange}
                disabled={!!customBackgroundImage}
                style={{
                  width: '48px',
                  height: '48px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: customBackgroundImage ? 'not-allowed' : 'pointer',
                  opacity: customBackgroundImage ? 0.5 : 1,
                }}
              />
              {customBackgroundColor && (
                <IonButton
                  fill="clear"
                  slot="end"
                  onClick={() => setCustomBackgroundColor(undefined)}
                >
                  <IonIcon icon={closeCircle} />
                </IonButton>
              )}
            </IonItem>

            {/* Custom Image Picker */}
            <IonItem>
              <IonLabel>Custom Image</IonLabel>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={!!customBackgroundColor}
                style={{
                  width: '0.1px',
                  height: '0.1px',
                  opacity: 0,
                  overflow: 'hidden',
                  position: 'absolute',
                  zIndex: -1,
                }}
              />
              <IonButton
                fill="outline"
                slot="end"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!customBackgroundColor}
              >
                <IonIcon icon={image} slot="start" />
                Choose Image
              </IonButton>
              {customBackgroundImage && (
                <IonButton
                  fill="clear"
                  slot="end"
                  onClick={() => {
                    setCustomBackgroundImage(undefined);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <IonIcon icon={closeCircle} />
                </IonButton>
              )}
            </IonItem>

            {/* Preview of custom background */}
            {(customBackgroundColor || customBackgroundImage) && (
              <IonItem>
                <div
                  style={{
                    width: '100%',
                    height: '60px',
                    borderRadius: '8px',
                    marginTop: '8px',
                    border: '1px solid var(--ion-color-medium)',
                    backgroundColor: customBackgroundColor || 'transparent',
                    backgroundImage: customBackgroundImage
                      ? `url(${customBackgroundImage})`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      backgroundColor: customBackgroundImage ? 'rgba(0,0,0,0.3)' : 'transparent',
                      color: customBackgroundImage ? '#fff' : 'inherit',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>
                      {customBackgroundColor ? 'Custom Color' : 'Custom Image'}
                    </span>
                  </div>
                </div>
              </IonItem>
            )}

            {/* Clear All Custom Background */}
            {(customBackgroundColor || customBackgroundImage) && (
              <IonItem button onClick={handleClearCustomBackground}>
                <IonLabel color="danger">Clear Custom Background</IonLabel>
              </IonItem>
            )}
          </IonList>
        )}

        {activeTab === 'typography' && (
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Font Size: {fontSize}px</IonLabel>
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
              <IonLabel position="stacked">Line Height: {lineHeight}x</IonLabel>
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
                {getAllFontFamilies().map((font) => (
                  <IonSelectOption key={font.value} value={font.value}>
                    {font.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* Import Custom Font */}
            <IonItem>
              <IonLabel position="stacked">Custom Fonts</IonLabel>
              <input
                ref={fontInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleFontImport}
                disabled={importingFont}
                style={{
                  width: '0.1px',
                  height: '0.1px',
                  opacity: 0,
                  overflow: 'hidden',
                  position: 'absolute',
                  zIndex: -1,
                }}
              />
              <IonButton
                fill="outline"
                slot="end"
                onClick={() => fontInputRef.current?.click()}
                disabled={importingFont}
              >
                <IonIcon icon={documentText} slot="start" />
                {importingFont ? 'Importing...' : 'Import Font'}
              </IonButton>
            </IonItem>

            {fontImportError && (
              <IonItem>
                <IonLabel color="danger">{fontImportError}</IonLabel>
              </IonItem>
            )}

            {/* List of custom fonts */}
            {customFonts.length > 0 && (
              <>
                {customFonts.map((font) => (
                  <IonItem key={font.name}>
                    <IonLabel>
                      <h3>{font.name}</h3>
                      <p>Custom font</p>
                    </IonLabel>
                    <IonButton fill="clear" slot="end" onClick={() => handleDeleteFont(font.name)}>
                      <IonIcon icon={trash} color="danger" />
                    </IonButton>
                  </IonItem>
                ))}
              </>
            )}

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
              <IonLabel>Hyphenation</IonLabel>
              <IonToggle
                checked={hyphenation}
                onIonChange={(e) => setHyphenation(e.detail.checked)}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Paragraph Spacing: {paragraphSpacing}em</IonLabel>
              <IonRange
                min={0}
                max={4}
                step={0.25}
                value={paragraphSpacing}
                onIonChange={(e) => setParagraphSpacing(e.detail.value as number)}
                snaps
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Letter Spacing: {letterSpacing}em</IonLabel>
              <IonRange
                min={0}
                max={0.3}
                step={0.01}
                value={letterSpacing}
                onIonChange={(e) => setLetterSpacing(e.detail.value as number)}
                snaps
              />
            </IonItem>

            <IonItem button onClick={() => applyPreset('dyslexia')}>
              <IonIcon icon={accessibility} slot="start" />
              <IonLabel>
                <h2>Dyslexia-Friendly Preset</h2>
                <p>OpenDyslexic, wider spacing, left-aligned</p>
              </IonLabel>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Margin Top: {customMargins.top}px</IonLabel>
              <IonRange
                min={0}
                max={64}
                step={2}
                value={customMargins.top}
                onIonChange={(e) => setCustomMargins({ top: e.detail.value as number })}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Margin Bottom: {customMargins.bottom}px</IonLabel>
              <IonRange
                min={0}
                max={64}
                step={2}
                value={customMargins.bottom}
                onIonChange={(e) => setCustomMargins({ bottom: e.detail.value as number })}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Margin Left: {customMargins.left}px</IonLabel>
              <IonRange
                min={0}
                max={64}
                step={2}
                value={customMargins.left}
                onIonChange={(e) => setCustomMargins({ left: e.detail.value as number })}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Margin Right: {customMargins.right}px</IonLabel>
              <IonRange
                min={0}
                max={64}
                step={2}
                value={customMargins.right}
                onIonChange={(e) => setCustomMargins({ right: e.detail.value as number })}
              />
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
                <IonLabel position="stacked">Intensity: {blueLightIntensity}%</IonLabel>
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
              <IonLabel>Interlinear Translation</IonLabel>
              <IonToggle
                checked={interlinearMode}
                onIonChange={(e) => setInterlinearMode(e.detail.checked)}
              />
            </IonItem>

            {interlinearMode && (
              <IonItem>
                <IonLabel>Target Language</IonLabel>
                <IonSelect
                  value={interlinearLanguage}
                  onIonChange={(e) => setInterlinearLanguage(e.detail.value)}
                >
                  {SUPPORTED_LANGUAGES.filter((l) => l.target).map((lang) => (
                    <IonSelectOption key={lang.code} value={lang.code}>
                      {lang.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            )}

            <IonItem>
              <IonLabel>Word Wise</IonLabel>
              <IonToggle
                checked={wordWiseEnabled}
                onIonChange={(e) => setWordWiseEnabled(e.detail.checked)}
              />
            </IonItem>

            {wordWiseEnabled && (
              <IonItem>
                <IonLabel position="stacked">
                  Hint Level: {wordWiseLevel} — {wordWiseLevel <= 2 ? 'Fewer Hints' : wordWiseLevel >= 4 ? 'More Hints' : 'Medium'}
                </IonLabel>
                <IonRange
                  min={1}
                  max={5}
                  step={1}
                  value={wordWiseLevel}
                  onIonChange={(e) => setWordWiseLevel(e.detail.value as number)}
                  snaps
                />
              </IonItem>
            )}

            <IonItem>
              <IonLabel>Auto Scroll</IonLabel>
              <IonToggle
                checked={autoScroll}
                onIonChange={(e) => setAutoScroll(e.detail.checked)}
              />
            </IonItem>

            {autoScroll && (
              <IonItem>
                <IonLabel position="stacked">Speed: {autoScrollSpeed}x</IonLabel>
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

            <IonItem>
              <IonIcon icon={expand} slot="start" />
              <IonLabel>
                <h2>Immersive Mode</h2>
                <p>Hide all chrome for distraction-free reading</p>
              </IonLabel>
              <IonToggle
                checked={immersiveMode}
                onIonChange={(e) => setImmersiveMode(e.detail.checked)}
              />
            </IonItem>

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
                  <IonLabel position="stacked">Opacity: {readingRulerSettings.opacity}%</IonLabel>
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
                <IonLabel position="stacked">Dim Opacity: {focusModeSettings.opacity}%</IonLabel>
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
