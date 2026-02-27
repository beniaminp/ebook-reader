import React, { useRef, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonToggle,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonNote,
  IonIcon,
  IonSpinner,
  IonToast,
} from '@ionic/react';
import { cloudOutline, peopleOutline, downloadOutline, pushOutline } from 'ionicons/icons';
import { useThemeStore } from '../../stores/useThemeStore';
import type { ThemeType, FontFamily, TextAlignment } from '../../stores/useThemeStore';
import { downloadExport, importAllData } from '../../services/localExportService';

const Settings: React.FC = () => {
  const {
    theme,
    fontFamily,
    fontSize,
    lineHeight,
    textAlign,
    blueLightFilter,
    readingRuler,
    bionicReading,
    autoScroll,
    autoScrollSpeed,
    setTheme,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setTextAlign,
    setBlueLightFilter,
    setReadingRuler,
    setBionicReading,
    setAutoScroll,
    setAutoScrollSpeed,
    resetSettings,
  } = useThemeStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadExport();
      setToastMessage('Backup exported successfully!');
    } catch (err) {
      setToastMessage(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const result = await importAllData(file);
      if (result.success) {
        setToastMessage(
          `Imported: ${result.booksAdded} books added, ${result.booksUpdated} updated, ${result.filesRestored} files restored`
        );
      } else {
        setToastMessage(`Import completed with errors: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setToastMessage(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Settings</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonList>
          <IonListHeader>
            <IonLabel>Appearance</IonLabel>
          </IonListHeader>

          <IonItem>
            <IonLabel>Theme</IonLabel>
            <IonSelect
              value={theme}
              onIonChange={(e) => setTheme(e.detail.value as ThemeType)}
              slot="end"
            >
              <IonSelectOption value="light">Light</IonSelectOption>
              <IonSelectOption value="dark">Dark</IonSelectOption>
              <IonSelectOption value="sepia">Sepia</IonSelectOption>
              <IonSelectOption value="eye-comfort">Eye Comfort</IonSelectOption>
              <IonSelectOption value="night">Night</IonSelectOption>
              <IonSelectOption value="invert">Inverted</IonSelectOption>
              <IonSelectOption value="ocean">Ocean</IonSelectOption>
              <IonSelectOption value="forest">Forest</IonSelectOption>
              <IonSelectOption value="sunset">Sunset</IonSelectOption>
              <IonSelectOption value="paper">Paper</IonSelectOption>
              <IonSelectOption value="slate">Slate</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        <IonList>
          <IonListHeader>
            <IonLabel>Typography</IonLabel>
          </IonListHeader>

          <IonItem>
            <IonLabel>Font</IonLabel>
            <IonSelect
              value={fontFamily}
              onIonChange={(e) => setFontFamily(e.detail.value as FontFamily)}
              slot="end"
            >
              <IonSelectOption value="serif">Serif</IonSelectOption>
              <IonSelectOption value="sans-serif">Sans Serif</IonSelectOption>
              <IonSelectOption value="mono">Monospace</IonSelectOption>
              <IonSelectOption value="literata">Literata</IonSelectOption>
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonLabel>Font Size: {fontSize}px</IonLabel>
            <IonRange
              min={12}
              max={32}
              step={1}
              value={fontSize}
              onIonChange={(e) => setFontSize(e.detail.value as number)}
              slot="end"
              style={{ width: '60%' }}
            />
          </IonItem>

          <IonItem>
            <IonLabel>Line Height: {lineHeight.toFixed(1)}</IonLabel>
            <IonRange
              min={1}
              max={2.5}
              step={0.1}
              value={lineHeight}
              onIonChange={(e) => setLineHeight(e.detail.value as number)}
              slot="end"
              style={{ width: '60%' }}
            />
          </IonItem>

          <IonItem>
            <IonLabel>Text Alignment</IonLabel>
            <IonSelect
              value={textAlign}
              onIonChange={(e) => setTextAlign(e.detail.value as TextAlignment)}
              slot="end"
            >
              <IonSelectOption value="left">Left</IonSelectOption>
              <IonSelectOption value="justify">Justify</IonSelectOption>
              <IonSelectOption value="center">Center</IonSelectOption>
              <IonSelectOption value="right">Right</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        <IonList>
          <IonListHeader>
            <IonLabel>Reading Features</IonLabel>
          </IonListHeader>

          <IonItem>
            <IonLabel>
              <h3>Blue Light Filter</h3>
              <IonNote>Reduce eye strain in low light</IonNote>
            </IonLabel>
            <IonToggle
              checked={blueLightFilter}
              onIonChange={(e) => setBlueLightFilter(e.detail.checked)}
            />
          </IonItem>

          <IonItem>
            <IonLabel>
              <h3>Reading Ruler</h3>
              <IonNote>Line guide to keep your place</IonNote>
            </IonLabel>
            <IonToggle
              checked={readingRuler}
              onIonChange={(e) => setReadingRuler(e.detail.checked)}
            />
          </IonItem>

          <IonItem>
            <IonLabel>
              <h3>Bionic Reading</h3>
              <IonNote>Bold first letters to guide the eye</IonNote>
            </IonLabel>
            <IonToggle
              checked={bionicReading}
              onIonChange={(e) => setBionicReading(e.detail.checked)}
            />
          </IonItem>

          <IonItem>
            <IonLabel>Auto Scroll</IonLabel>
            <IonToggle checked={autoScroll} onIonChange={(e) => setAutoScroll(e.detail.checked)} />
          </IonItem>

          {autoScroll && (
            <IonItem>
              <IonLabel>Scroll Speed: {autoScrollSpeed}</IonLabel>
              <IonRange
                min={1}
                max={10}
                step={1}
                value={autoScrollSpeed}
                onIonChange={(e) => setAutoScrollSpeed(e.detail.value as number)}
                slot="end"
                style={{ width: '60%' }}
              />
            </IonItem>
          )}
        </IonList>

        <IonList>
          <IonListHeader>
            <IonLabel>Library</IonLabel>
          </IonListHeader>

          <IonItem button routerLink="/calibre-web-settings" detail>
            <IonLabel>
              <h3>Calibre-Web</h3>
              <IonNote>Connect to your Calibre-Web server</IonNote>
            </IonLabel>
          </IonItem>

          <IonItem button routerLink="/statistics" detail>
            <IonLabel>
              <h3>Reading Statistics</h3>
              <IonNote>View your reading history and progress</IonNote>
            </IonLabel>
          </IonItem>
        </IonList>

        <IonList>
          <IonListHeader>
            <IonLabel>Cloud Sync</IonLabel>
          </IonListHeader>

          <IonItem button routerLink="/cloud-sync-settings" detail>
            <IonIcon icon={cloudOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Cloud Sync</h3>
              <IonNote>Sync your reading progress, bookmarks, and highlights</IonNote>
            </IonLabel>
          </IonItem>
        </IonList>

        <IonList>
          <IonListHeader>
            <IonLabel>Data & Backup</IonLabel>
          </IonListHeader>

          <IonItem>
            <IonIcon icon={downloadOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Export All Data</h3>
              <IonNote>Download books, progress, and settings as a ZIP file</IonNote>
            </IonLabel>
            <IonButton
              slot="end"
              fill="outline"
              onClick={handleExport}
              disabled={isExporting || isImporting}
            >
              {isExporting ? <IonSpinner name="crescent" /> : 'Export'}
            </IonButton>
          </IonItem>

          <IonItem>
            <IonIcon icon={pushOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Import Data</h3>
              <IonNote>Restore from a previously exported backup ZIP</IonNote>
            </IonLabel>
            <IonButton
              slot="end"
              fill="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExporting || isImporting}
            >
              {isImporting ? <IonSpinner name="crescent" /> : 'Import'}
            </IonButton>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </IonItem>
        </IonList>

        <IonList>
          <IonListHeader>
            <IonLabel>P2P Sharing</IonLabel>
          </IonListHeader>

          <IonItem button routerLink="/community-books" detail>
            <IonIcon icon={peopleOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Community Books</h3>
              <IonNote>Browse and download books shared by others</IonNote>
            </IonLabel>
          </IonItem>

          <IonItem button routerLink="/my-shared-books" detail>
            <IonIcon icon={peopleOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>My Shared Books</h3>
              <IonNote>Manage books you are sharing</IonNote>
            </IonLabel>
          </IonItem>
        </IonList>

        <div style={{ padding: '16px' }}>
          <IonButton expand="block" fill="outline" color="medium" onClick={resetSettings}>
            Reset to Defaults
          </IonButton>
        </div>

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage}
          duration={4000}
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default Settings;
