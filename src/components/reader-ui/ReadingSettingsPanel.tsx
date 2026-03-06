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
  cloudDownload,
} from 'ionicons/icons';
import { GoogleFontsModal } from './GoogleFontsModal';
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
    fontWeight,
    setFontWeight,
    wordSpacing,
    setWordSpacing,
    maxLineWidth,
    setMaxLineWidth,
    dropCaps,
    setDropCaps,
    twoColumnLayout,
    setTwoColumnLayout,
    globalBold,
    setGlobalBold,
    colorVisionFilter,
    setColorVisionFilter,
    pageTransitionType,
    setPageTransitionType,
    setAutoScroll,
    setAutoScrollSpeed,
    setCustomBackgroundColor,
    setCustomBackgroundImage,
    clearCustomBackground,
    applyPreset,
    resetSettings,
    typographyProfiles,
    saveTypographyProfile,
    loadTypographyProfile,
    deleteTypographyProfile,
  } = useThemeStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [importingFont, setImportingFont] = useState(false);
  const [fontImportError, setFontImportError] = useState<string | null>(null);
  const [showGoogleFonts, setShowGoogleFonts] = useState(false);
  const [showSaveProfile, setShowSaveProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
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
          <div className="type-settings">
            {/* Font Size — compact stepper + slider */}
            <div className="type-section">
              <div className="type-section-header">Font</div>
              <div className="type-font-size-row">
                <button
                  className="type-stepper-btn"
                  onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                  aria-label="Decrease font size"
                >
                  A<span className="type-stepper-icon">−</span>
                </button>
                <div className="type-font-size-track">
                  <IonRange
                    min={12}
                    max={32}
                    step={1}
                    value={fontSize}
                    onIonChange={handleFontSizeChange}
                    className="type-compact-range"
                  />
                  <span className="type-font-size-value">{fontSize}px</span>
                </div>
                <button
                  className="type-stepper-btn type-stepper-btn-large"
                  onClick={() => setFontSize(Math.min(32, fontSize + 1))}
                  aria-label="Increase font size"
                >
                  A<span className="type-stepper-icon">+</span>
                </button>
              </div>

              <div className="type-row">
                <IonLabel className="type-row-label">Font Family</IonLabel>
                <IonSelect
                  value={fontFamily}
                  onIonChange={(e) => setFontFamily(e.detail.value as FontFamily)}
                  interface="popover"
                  className="type-select"
                >
                  {getAllFontFamilies().map((font) => (
                    <IonSelectOption key={font.value} value={font.value}>
                      {font.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </div>

              <div className="type-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <IonLabel className="type-row-label">Font Weight</IonLabel>
                  <span style={{ fontSize: '13px', opacity: 0.7 }}>{fontWeight}</span>
                </div>
                <IonRange
                  min={100}
                  max={900}
                  step={100}
                  value={fontWeight}
                  onIonChange={(e) => setFontWeight(e.detail.value as number)}
                  className="type-compact-range"
                  pin
                  pinFormatter={(value: number) => {
                    const labels: Record<number, string> = { 100: 'Thin', 200: 'ExLight', 300: 'Light', 400: 'Normal', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExBold', 900: 'Black' };
                    return labels[value] || String(value);
                  }}
                />
              </div>

              {/* Custom font import */}
              <div className="type-custom-fonts">
                <input
                  ref={fontInputRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={handleFontImport}
                  disabled={importingFont}
                  className="type-hidden-input"
                />
                <button
                  className="type-import-btn"
                  onClick={() => fontInputRef.current?.click()}
                  disabled={importingFont}
                >
                  <IonIcon icon={documentText} />
                  {importingFont ? 'Importing...' : 'Import Font'}
                </button>
                <button
                  className="type-import-btn"
                  onClick={() => setShowGoogleFonts(true)}
                >
                  <IonIcon icon={cloudDownload} />
                  Google Fonts
                </button>
                {customFonts.map((font) => (
                  <div key={font.name} className="type-custom-font-chip">
                    <span>{font.name}</span>
                    <button
                      className="type-chip-delete"
                      onClick={() => handleDeleteFont(font.name)}
                      aria-label={`Remove ${font.name}`}
                    >
                      <IonIcon icon={closeCircle} />
                    </button>
                  </div>
                ))}
              </div>
              <GoogleFontsModal
                isOpen={showGoogleFonts}
                onDismiss={() => setShowGoogleFonts(false)}
              />
              {fontImportError && (
                <div className="type-error">{fontImportError}</div>
              )}
            </div>

            {/* Text Layout */}
            <div className="type-section">
              <div className="type-section-header">Text Layout</div>

              <div className="type-row">
                <IonLabel className="type-row-label">Alignment</IonLabel>
                <IonSegment
                  value={textAlign}
                  onIonChange={(e) => setTextAlign(e.detail.value as TextAlignment)}
                  className="type-align-segment"
                >
                  <IonSegmentButton value="left">
                    <IonLabel>Left</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="justify">
                    <IonLabel>Justify</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </div>

              <div className="type-row">
                <IonLabel className="type-row-label">Hyphenation</IonLabel>
                <IonToggle
                  checked={hyphenation}
                  onIonChange={(e) => setHyphenation(e.detail.checked)}
                />
              </div>

              <div className="type-slider-row">
                <div className="type-slider-header">
                  <span>Line Height</span>
                  <span className="type-slider-value">{lineHeight}x</span>
                </div>
                <IonRange
                  min={1}
                  max={2.5}
                  step={0.1}
                  value={lineHeight}
                  onIonChange={handleLineHeightChange}
                  className="type-compact-range"
                />
              </div>

              <div className="type-slider-row">
                <div className="type-slider-header">
                  <span>Paragraph Spacing</span>
                  <span className="type-slider-value">{paragraphSpacing}em</span>
                </div>
                <IonRange
                  min={0}
                  max={4}
                  step={0.25}
                  value={paragraphSpacing}
                  onIonChange={(e) => setParagraphSpacing(e.detail.value as number)}
                  className="type-compact-range"
                />
              </div>

              <div className="type-slider-row">
                <div className="type-slider-header">
                  <span>Letter Spacing</span>
                  <span className="type-slider-value">{letterSpacing.toFixed(2)}em</span>
                </div>
                <IonRange
                  min={0}
                  max={0.3}
                  step={0.02}
                  value={letterSpacing}
                  onIonChange={(e) => setLetterSpacing(e.detail.value as number)}
                  className="type-compact-range"
                />
              </div>

              <div className="type-slider-row">
                <div className="type-slider-header">
                  <span>Word Spacing</span>
                  <span className="type-slider-value">{wordSpacing.toFixed(2)}em</span>
                </div>
                <IonRange
                  min={0}
                  max={0.5}
                  step={0.05}
                  value={wordSpacing}
                  onIonChange={(e) => setWordSpacing(e.detail.value as number)}
                  className="type-compact-range"
                />
              </div>

              <div className="type-slider-row">
                <div className="type-slider-header">
                  <span>Max Line Width</span>
                  <span className="type-slider-value">{maxLineWidth === 0 ? 'Auto' : `${maxLineWidth} ch`}</span>
                </div>
                <IonRange
                  min={0}
                  max={120}
                  step={5}
                  value={maxLineWidth}
                  onIonChange={(e) => setMaxLineWidth(e.detail.value as number)}
                  className="type-compact-range"
                />
              </div>
            </div>

            {/* Margins — compact 2x2 grid */}
            <div className="type-section">
              <div className="type-section-header">Margins</div>
              <div className="type-margins-grid">
                <div className="type-margin-cell">
                  <label className="type-margin-label">Top</label>
                  <div className="type-margin-control">
                    <button className="type-margin-btn" onClick={() => setCustomMargins({ top: Math.max(0, customMargins.top - 4) })}>−</button>
                    <span className="type-margin-value">{customMargins.top}</span>
                    <button className="type-margin-btn" onClick={() => setCustomMargins({ top: Math.min(64, customMargins.top + 4) })}>+</button>
                  </div>
                </div>
                <div className="type-margin-cell">
                  <label className="type-margin-label">Bottom</label>
                  <div className="type-margin-control">
                    <button className="type-margin-btn" onClick={() => setCustomMargins({ bottom: Math.max(0, customMargins.bottom - 4) })}>−</button>
                    <span className="type-margin-value">{customMargins.bottom}</span>
                    <button className="type-margin-btn" onClick={() => setCustomMargins({ bottom: Math.min(64, customMargins.bottom + 4) })}>+</button>
                  </div>
                </div>
                <div className="type-margin-cell">
                  <label className="type-margin-label">Left</label>
                  <div className="type-margin-control">
                    <button className="type-margin-btn" onClick={() => setCustomMargins({ left: Math.max(0, customMargins.left - 4) })}>−</button>
                    <span className="type-margin-value">{customMargins.left}</span>
                    <button className="type-margin-btn" onClick={() => setCustomMargins({ left: Math.min(64, customMargins.left + 4) })}>+</button>
                  </div>
                </div>
                <div className="type-margin-cell">
                  <label className="type-margin-label">Right</label>
                  <div className="type-margin-control">
                    <button className="type-margin-btn" onClick={() => setCustomMargins({ right: Math.max(0, customMargins.right - 4) })}>−</button>
                    <span className="type-margin-value">{customMargins.right}</span>
                    <button className="type-margin-btn" onClick={() => setCustomMargins({ right: Math.min(64, customMargins.right + 4) })}>+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout Options */}
            <div className="type-section">
              <div className="type-section-label">Layout Options</div>
              <IonList lines="none" style={{ background: 'transparent', padding: 0 }}>
                <IonItem style={{ '--background': 'transparent', '--padding-start': '0', '--inner-padding-end': '0' }}>
                  <IonLabel style={{ fontSize: '14px' }}>Drop Caps</IonLabel>
                  <IonToggle slot="end" checked={dropCaps} onIonChange={(e) => setDropCaps(e.detail.checked)} />
                </IonItem>
                <IonItem style={{ '--background': 'transparent', '--padding-start': '0', '--inner-padding-end': '0' }}>
                  <IonLabel style={{ fontSize: '14px' }}>Two-Column Layout</IonLabel>
                  <IonToggle slot="end" checked={twoColumnLayout} onIonChange={(e) => setTwoColumnLayout(e.detail.checked)} />
                </IonItem>
                <IonItem style={{ '--background': 'transparent', '--padding-start': '0', '--inner-padding-end': '0' }}>
                  <IonLabel style={{ fontSize: '14px' }}>Global Bold</IonLabel>
                  <IonToggle slot="end" checked={globalBold} onIonChange={(e) => setGlobalBold(e.detail.checked)} />
                </IonItem>
                <IonItem style={{ '--background': 'transparent', '--padding-start': '0', '--inner-padding-end': '0' }}>
                  <IonLabel style={{ fontSize: '14px' }}>Color Vision Filter</IonLabel>
                  <IonSelect
                    slot="end"
                    value={colorVisionFilter}
                    onIonChange={(e) => setColorVisionFilter(e.detail.value)}
                    interface="popover"
                    style={{ fontSize: '13px' }}
                  >
                    <IonSelectOption value="none">None</IonSelectOption>
                    <IonSelectOption value="protanopia">Protanopia</IonSelectOption>
                    <IonSelectOption value="deuteranopia">Deuteranopia</IonSelectOption>
                    <IonSelectOption value="tritanopia">Tritanopia</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </IonList>
            </div>

            {/* Preset */}
            <div className="type-section">
              <button className="type-preset-btn" onClick={() => applyPreset('dyslexia')}>
                <IonIcon icon={accessibility} />
                <div className="type-preset-text">
                  <span className="type-preset-title">Dyslexia-Friendly</span>
                  <span className="type-preset-desc">OpenDyslexic, wider spacing, left-aligned</span>
                </div>
              </button>
            </div>

            {/* Typography Profiles */}
            <div className="type-section">
              <div className="type-section-label">Saved Profiles</div>
              {typographyProfiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                  {typographyProfiles.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="type-preset-btn"
                        style={{ flex: 1 }}
                        onClick={() => loadTypographyProfile(p.id)}
                      >
                        <div className="type-preset-text">
                          <span className="type-preset-title">{p.name}</span>
                          <span className="type-preset-desc">
                            {p.settings.fontSize}px, {p.settings.fontFamily}, {p.settings.lineHeight}x
                          </span>
                        </div>
                      </button>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--ion-color-danger)',
                          fontSize: '18px',
                          padding: '4px',
                          cursor: 'pointer',
                        }}
                        onClick={() => deleteTypographyProfile(p.id)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {showSaveProfile ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Profile name..."
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--ion-color-light-shade)',
                      background: 'var(--ion-color-light)',
                      color: 'var(--ion-text-color)',
                      fontSize: '13px',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && profileName.trim()) {
                        saveTypographyProfile(profileName.trim());
                        setProfileName('');
                        setShowSaveProfile(false);
                      }
                    }}
                    autoFocus
                  />
                  <button
                    className="type-preset-btn"
                    style={{ padding: '8px 12px', minWidth: 'auto' }}
                    onClick={() => {
                      if (profileName.trim()) {
                        saveTypographyProfile(profileName.trim());
                        setProfileName('');
                        setShowSaveProfile(false);
                      }
                    }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  className="type-preset-btn"
                  onClick={() => setShowSaveProfile(true)}
                  style={{ width: '100%' }}
                >
                  <div className="type-preset-text">
                    <span className="type-preset-title">+ Save Current Settings</span>
                    <span className="type-preset-desc">Save as a named profile to quickly switch later</span>
                  </div>
                </button>
              )}
            </div>
          </div>
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
              <IonLabel>Page Animation</IonLabel>
              <IonSelect
                value={pageTransitionType}
                onIonChange={(e) => setPageTransitionType(e.detail.value)}
                interface="popover"
              >
                <IonSelectOption value="none">None</IonSelectOption>
                <IonSelectOption value="fade">Fade</IonSelectOption>
                <IonSelectOption value="slide">Slide</IonSelectOption>
                <IonSelectOption value="curl">Page Curl</IonSelectOption>
              </IonSelect>
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
