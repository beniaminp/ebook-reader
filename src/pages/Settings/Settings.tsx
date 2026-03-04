import React, { useRef, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
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
import {
  cloudOutline,
  peopleOutline,
  downloadOutline,
  pushOutline,
  colorPaletteOutline,
  textOutline,
  eyeOutline,
  libraryOutline,
  syncOutline,
  shieldCheckmarkOutline,
  shareSocialOutline,
  statsChartOutline,
  serverOutline,
  refreshOutline,
  speedometerOutline,
  flameOutline,
  bookOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { useThemeStore } from '../../stores/useThemeStore';
import type { ThemeType, FontFamily, TextAlignment } from '../../stores/useThemeStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useReadingGoalsStore } from '../../stores/useReadingGoalsStore';
import { useHardcoverStore } from '../../stores/hardcoverStore';
import { useAppStore } from '../../stores/useAppStore';
import { downloadExport, importAllData } from '../../services/localExportService';
import { enrichAllBooks } from '../../services/metadataLookupService';
import './Settings.css';

const THEME_OPTIONS: { value: ThemeType; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'eye-comfort', label: 'Comfort' },
  { value: 'night', label: 'Night' },
  { value: 'invert', label: 'Invert' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'forest', label: 'Forest' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'paper', label: 'Paper' },
  { value: 'slate', label: 'Slate' },
];

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

  const {
    isSignedIn,
    user,
    isBackingUp,
    isRestoring,
    lastBackupTime,
    backupError,
    signIn: authSignIn,
    signOut: authSignOut,
    triggerBackup,
    triggerRestore,
  } = useAuthStore();

  const {
    enabled: streakEnabled,
    dailyGoalMinutes,
    currentStreak,
  } = useReadingGoalsStore();

  const { isConnected: hardcoverConnected, username: hardcoverUsername } = useHardcoverStore();
  const books = useAppStore((s) => s.books);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const stats = await downloadExport();
      setToastMessage(
        `Exported: ${stats.books} books, ${stats.bookmarks} bookmarks, ${stats.highlights} highlights, ${stats.files} files`
      );
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
          `Imported: ${result.booksAdded} books, ${result.bookmarksAdded} bookmarks, ${result.highlightsAdded} highlights, ${result.filesRestored} files restored`
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

  const handleEnrichAll = async () => {
    setIsEnriching(true);
    try {
      const count = await enrichAllBooks(books);
      setToastMessage(count > 0 ? `Enriched ${count} books with metadata` : 'All books already have metadata');
      if (count > 0) useAppStore.getState().loadBooks();
    } catch (err) {
      setToastMessage(`Enrichment failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsEnriching(false);
    }
  };

  const fontPreviewClass = `font-preview font-preview--${fontFamily}`;

  return (
    <IonPage className="settings-page">
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

        {/* ─── Appearance ──────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon settings-section-icon--blue">
              <IonIcon icon={colorPaletteOutline} />
            </div>
            <span className="settings-section-title">Appearance</span>
          </div>

          <div className="theme-dots">
            {THEME_OPTIONS.map((t) => (
              <div key={t.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  className={`theme-dot theme-dot--${t.value}${theme === t.value ? ' theme-dot--active' : ''}`}
                  onClick={() => setTheme(t.value)}
                  title={t.label}
                />
                <span className="theme-dot-label">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Typography ──────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon settings-section-icon--purple">
              <IonIcon icon={textOutline} />
            </div>
            <span className="settings-section-title">Typography</span>
          </div>

          <div className={fontPreviewClass} style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}`, textAlign: textAlign }}>
            The quick brown fox jumps over the lazy dog.
          </div>

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
            <IonLabel>Font Size</IonLabel>
            <div className="settings-range-row" slot="end" style={{ width: '55%' }}>
              <IonRange
                min={12}
                max={32}
                step={1}
                value={fontSize}
                onIonChange={(e) => setFontSize(e.detail.value as number)}
              />
              <span className="settings-range-value">{fontSize}px</span>
            </div>
          </IonItem>

          <IonItem>
            <IonLabel>Line Height</IonLabel>
            <div className="settings-range-row" slot="end" style={{ width: '55%' }}>
              <IonRange
                min={1}
                max={2.5}
                step={0.1}
                value={lineHeight}
                onIonChange={(e) => setLineHeight(e.detail.value as number)}
              />
              <span className="settings-range-value">{lineHeight.toFixed(1)}</span>
            </div>
          </IonItem>

          <IonItem>
            <IonLabel>Alignment</IonLabel>
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
        </div>

        {/* ─── Reading Features ────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon settings-section-icon--orange">
              <IonIcon icon={eyeOutline} />
            </div>
            <span className="settings-section-title">Reading Features</span>
          </div>

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
            <IonLabel>
              <h3>Auto Scroll</h3>
              <IonNote>Automatically scroll while reading</IonNote>
            </IonLabel>
            <IonToggle checked={autoScroll} onIonChange={(e) => setAutoScroll(e.detail.checked)} />
          </IonItem>

          {autoScroll && (
            <IonItem>
              <IonIcon icon={speedometerOutline} className="settings-item-icon" />
              <IonLabel>Scroll Speed</IonLabel>
              <div className="settings-range-row" slot="end" style={{ width: '55%' }}>
                <IonRange
                  min={1}
                  max={10}
                  step={1}
                  value={autoScrollSpeed}
                  onIonChange={(e) => setAutoScrollSpeed(e.detail.value as number)}
                />
                <span className="settings-range-value">{autoScrollSpeed}</span>
              </div>
            </IonItem>
          )}
        </div>

        {/* ─── Reading Goals & Streaks ─────────────────── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon settings-section-icon--orange">
              <IonIcon icon={flameOutline} />
            </div>
            <span className="settings-section-title">Reading Goals</span>
          </div>

          <IonItem button routerLink="/reading-goals" detail className="settings-nav-item">
            <IonIcon icon={flameOutline} slot="start" color="warning" />
            <IonLabel>
              <h3>Goals & Streaks</h3>
              <IonNote>
                {streakEnabled
                  ? `${currentStreak} day streak \u00B7 ${dailyGoalMinutes}m daily goal`
                  : 'Set daily and yearly reading goals'}
              </IonNote>
            </IonLabel>
          </IonItem>
        </div>

        {/* ─── Library & Sync ──────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon settings-section-icon--green">
              <IonIcon icon={libraryOutline} />
            </div>
            <span className="settings-section-title">Library & Sync</span>
          </div>

          <IonItem button routerLink="/hardcover-settings" detail className="settings-nav-item">
            <IonIcon icon={bookOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Hardcover</h3>
              <IonNote>
                {hardcoverConnected
                  ? `Connected as ${hardcoverUsername}`
                  : 'Sync reading status, ratings & reviews'}
              </IonNote>
            </IonLabel>
          </IonItem>

          <IonItem button routerLink="/calibre-web-settings" detail className="settings-nav-item">
            <IonIcon icon={serverOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Calibre-Web</h3>
              <IonNote>Connect to your Calibre-Web server</IonNote>
            </IonLabel>
          </IonItem>

          <IonItem button routerLink="/cloud-sync-settings" detail className="settings-nav-item">
            <IonIcon icon={cloudOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Cloud Sync</h3>
              <IonNote>Sync progress, bookmarks, and highlights</IonNote>
            </IonLabel>
          </IonItem>

          <IonItem button routerLink="/statistics" detail className="settings-nav-item">
            <IonIcon icon={statsChartOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Reading Statistics</h3>
              <IonNote>View your reading history and progress</IonNote>
            </IonLabel>
          </IonItem>

          <IonItem>
            <IonIcon icon={sparklesOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Enrich All Books</h3>
              <IonNote>Fetch descriptions, ratings & covers from online sources</IonNote>
            </IonLabel>
            <IonButton
              slot="end"
              fill="outline"
              size="small"
              onClick={handleEnrichAll}
              disabled={isEnriching}
              style={{ '--border-radius': '8px' }}
            >
              {isEnriching ? <IonSpinner name="crescent" /> : 'Enrich'}
            </IonButton>
          </IonItem>
        </div>

        {/* ─── P2P Sharing ─────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon settings-section-icon--teal">
              <IonIcon icon={peopleOutline} />
            </div>
            <span className="settings-section-title">P2P Sharing</span>
          </div>

          <IonItem button routerLink="/community-books" detail className="settings-nav-item">
            <IonIcon icon={peopleOutline} slot="start" color="tertiary" />
            <IonLabel>
              <h3>Community Books</h3>
              <IonNote>Browse and download books shared by others</IonNote>
            </IonLabel>
          </IonItem>

          <IonItem button routerLink="/my-shared-books" detail className="settings-nav-item">
            <IonIcon icon={shareSocialOutline} slot="start" color="tertiary" />
            <IonLabel>
              <h3>My Shared Books</h3>
              <IonNote>Manage books you are sharing</IonNote>
            </IonLabel>
          </IonItem>
        </div>

        {/* ─── Data & Backup ───────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon settings-section-icon--indigo">
              <IonIcon icon={shieldCheckmarkOutline} />
            </div>
            <span className="settings-section-title">Data & Backup</span>
          </div>

          {isSignedIn ? (
            <>
              <IonItem>
                <IonIcon icon={cloudOutline} slot="start" color="success" />
                <IonLabel>
                  <h3>Signed in as {user?.displayName || user?.email}</h3>
                  <IonNote>
                    {lastBackupTime
                      ? `Last backup: ${new Date(lastBackupTime).toLocaleString()}`
                      : 'No backup yet'}
                  </IonNote>
                  {backupError && <IonNote color="danger">{backupError}</IonNote>}
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px 0' }}>
                    <IonButton
                      fill="outline"
                      size="small"
                      onClick={triggerBackup}
                      disabled={isBackingUp || isRestoring}
                      style={{ '--border-radius': '8px' }}
                    >
                      {isBackingUp ? <IonSpinner name="crescent" /> : <>
                        <IonIcon icon={cloudOutline} slot="start" />
                        Backup Now
                      </>}
                    </IonButton>
                    <IonButton
                      fill="outline"
                      size="small"
                      onClick={triggerRestore}
                      disabled={isBackingUp || isRestoring}
                      style={{ '--border-radius': '8px' }}
                    >
                      {isRestoring ? <IonSpinner name="crescent" /> : <>
                        <IonIcon icon={syncOutline} slot="start" />
                        Restore
                      </>}
                    </IonButton>
                    <IonButton
                      fill="outline"
                      size="small"
                      color="medium"
                      onClick={authSignOut}
                      style={{ '--border-radius': '8px' }}
                    >
                      Sign Out
                    </IonButton>
                  </div>
                </IonLabel>
              </IonItem>
            </>
          ) : (
            <IonItem>
              <IonIcon icon={cloudOutline} slot="start" color="primary" />
              <IonLabel>
                <h3>Cloud Backup</h3>
                <IonNote>Sign in with Google to auto-backup your library</IonNote>
              </IonLabel>
              <IonButton
                slot="end"
                fill="outline"
                size="small"
                onClick={authSignIn}
                style={{ '--border-radius': '8px' }}
              >
                Sign In
              </IonButton>
            </IonItem>
          )}

          <IonItem>
            <IonIcon icon={downloadOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Export All Data</h3>
              <IonNote>Books, bookmarks, highlights, progress, and settings as ZIP</IonNote>
            </IonLabel>
            <IonButton
              slot="end"
              fill="outline"
              size="small"
              onClick={handleExport}
              disabled={isExporting || isImporting}
              style={{ '--border-radius': '8px' }}
            >
              {isExporting ? <IonSpinner name="crescent" /> : 'Export'}
            </IonButton>
          </IonItem>

          <IonItem>
            <IonIcon icon={pushOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Import Data</h3>
              <IonNote>Restore from a backup ZIP file</IonNote>
            </IonLabel>
            <IonButton
              slot="end"
              fill="outline"
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExporting || isImporting}
              style={{ '--border-radius': '8px' }}
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
        </div>

        {/* ─── Footer ──────────────────────────────────── */}
        <div className="settings-footer">
          <IonButton expand="block" fill="outline" color="medium" onClick={resetSettings}>
            <IonIcon icon={refreshOutline} slot="start" />
            Reset to Defaults
          </IonButton>
          <p className="settings-version">Ebook Reader v1.0</p>
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
