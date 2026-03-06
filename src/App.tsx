import { Redirect, Route, useLocation } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  IonAlert,
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { library, settings, globeOutline, compassOutline } from 'ionicons/icons';
import Library from './pages/Library/Library';
import Reader from './pages/Reader/Reader';
import Settings from './pages/Settings/Settings';
import Browse from './pages/Browse/Browse';
import CalibreWebSettings from './pages/CalibreWebSettings';
import Statistics from './pages/Statistics/Statistics';
import OpdsCatalog from './pages/OpdsCatalog/OpdsCatalog';
import CloudSyncSettings from './pages/CloudSyncSettings/CloudSyncSettings';
import CommunityBooks from './pages/CommunityBooks/CommunityBooks';
import MySharedBooks from './pages/MySharedBooks/MySharedBooks';
import ReadingGoals from './pages/ReadingGoals/ReadingGoals';
import HardcoverSettings from './pages/HardcoverSettings/HardcoverSettings';
import SearchBooks from './pages/SearchBooks/SearchBooks';
import TranslationLanguages from './pages/TranslationLanguages/TranslationLanguages';
import ReadLater from './pages/ReadLater/ReadLater';
import { useThemeStore } from './stores/useThemeStore';
import { useSharingStore } from './stores/useSharingStore';
import { useAuthStore } from './stores/useAuthStore';
import { useAppStore } from './stores/useAppStore';
import { useAutoRestore } from './hooks/useAutoRestore';
import { initDatabase } from './services/database';
import { torrentService } from './services/torrentService';
import { useHardcoverStore } from './stores/hardcoverStore';
import { autoImportFromWatchFolder } from './services/watchFolderService';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Design tokens & theme variables */
import './theme/tokens.css';
import './theme/variables.css';

setupIonicReact();

const AppTabs: React.FC = () => {
  const location = useLocation();
  const isReaderRoute = location.pathname.startsWith('/reader/');
  const loadCustomFonts = useThemeStore((state) => state.loadCustomFonts);

  useEffect(() => {
    // Initialize database eagerly on app startup, then pre-load books into the store.
    // This avoids a race condition on Android where the Library component mounts
    // and tries to load books before the SQLite database is ready.
    initDatabase().then(async () => {
      await useAppStore.getState().loadBooks();
      // Auto-import from watch folder after books are loaded
      const count = await autoImportFromWatchFolder();
      if (count > 0) useAppStore.getState().loadBooks();
    }).catch((err) => {
      console.error('Failed to initialize database:', err);
    });
  }, []);

  useEffect(() => {
    // Load custom fonts on app startup
    loadCustomFonts().catch((err) => {
      console.error('Failed to load custom fonts:', err);
    });
  }, [loadCustomFonts]);

  useEffect(() => {
    // Resume seeding shared books on app startup (fire-and-forget, don't block UI).
    // resumeSeeding() already checks isSupported() and exits early on native.
    useSharingStore.getState().resumeSeeding().catch((err) => {
      console.error('Failed to resume seeding:', err);
    });
    // Clean up WebTorrent client on app unmount
    return () => { torrentService.destroy(); };
  }, []);

  // Initialize Firebase auth listener
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initialize();
    return unsubscribe;
  }, []);

  // Initialize Hardcover store and process sync queue when coming online
  useEffect(() => {
    useHardcoverStore.getState().initialize().then(() => {
      const state = useHardcoverStore.getState();
      if (state.isConnected && state.autoSync) {
        state.processQueue();
      }
    });

    const handleOnline = () => {
      const state = useHardcoverStore.getState();
      if (state.isConnected) {
        state.processQueue();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Reload library when app resumes from background (Android)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // Re-initialize DB first — Android may close the SQLite connection when backgrounded
        initDatabase().then(async () => {
          await useAppStore.getState().loadBooks();
          const count = await autoImportFromWatchFolder();
          if (count > 0) useAppStore.getState().loadBooks();
        });
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  // Auto-restore from cloud backup on fresh install
  const { showPrompt, backupInfo, isRestoring, confirmRestore, dismiss } = useAutoRestore();

  return (
    <>
      <IonAlert
        isOpen={showPrompt}
        header="Restore from Cloud Backup?"
        message={
          backupInfo
            ? `Found a backup with ${backupInfo.bookCount} books from ${new Date(backupInfo.timestamp).toLocaleDateString()}. Would you like to restore it?`
            : 'A cloud backup was found. Restore it?'
        }
        buttons={[
          { text: 'Skip', role: 'cancel', handler: dismiss },
          { text: isRestoring ? 'Restoring...' : 'Restore', handler: confirmRestore },
        ]}
        onDidDismiss={dismiss}
      />
      <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/library">
          <Library />
        </Route>
        <Route exact path="/browse">
          <Browse />
        </Route>
        <Route exact path="/reader/:bookId" render={() => <Reader />} />
        <Route exact path="/settings">
          <Settings />
        </Route>
        <Route exact path="/calibre-web-settings">
          <CalibreWebSettings />
        </Route>
        <Route exact path="/statistics">
          <Statistics />
        </Route>
        <Route exact path="/opds">
          <OpdsCatalog />
        </Route>
        <Route exact path="/cloud-sync-settings">
          <CloudSyncSettings />
        </Route>
        <Route exact path="/community-books">
          <CommunityBooks />
        </Route>
        <Route exact path="/my-shared-books">
          <MySharedBooks />
        </Route>
        <Route exact path="/reading-goals">
          <ReadingGoals />
        </Route>
        <Route exact path="/hardcover-settings">
          <HardcoverSettings />
        </Route>
        <Route exact path="/search-books">
          <SearchBooks />
        </Route>
        <Route exact path="/translation-languages">
          <TranslationLanguages />
        </Route>
        <Route exact path="/read-later">
          <ReadLater />
        </Route>
        <Route exact path="/">
          <Redirect to="/library" />
        </Route>
        <Route>
          <Redirect to="/library" />
        </Route>
      </IonRouterOutlet>
      <IonTabBar slot="bottom" style={isReaderRoute ? { display: 'none' } : undefined}>
        <IonTabButton tab="library" href="/library">
          <IonIcon aria-hidden="true" icon={library} />
          <IonLabel>Library</IonLabel>
        </IonTabButton>
        <IonTabButton tab="browse" href="/browse">
          <IonIcon aria-hidden="true" icon={compassOutline} />
          <IonLabel>Browse</IonLabel>
        </IonTabButton>
        <IonTabButton tab="opds" href="/opds">
          <IonIcon aria-hidden="true" icon={globeOutline} />
          <IonLabel>Catalogs</IonLabel>
        </IonTabButton>
        <IonTabButton tab="settings" href="/settings">
          <IonIcon aria-hidden="true" icon={settings} />
          <IonLabel>Settings</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
    </>
  );
};

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter basename={basename}>
        <AppTabs />
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
