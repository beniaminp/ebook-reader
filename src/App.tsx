import { Redirect, Route, useLocation } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { book, library, settings, globeOutline } from 'ionicons/icons';
import Library from './pages/Library/Library';
import Reader from './pages/Reader/Reader';
import Settings from './pages/Settings/Settings';
import CalibreWebSettings from './pages/CalibreWebSettings';
import Statistics from './pages/Statistics/Statistics';
import OpdsCatalog from './pages/OpdsCatalog/OpdsCatalog';
import CloudSyncSettings from './pages/CloudSyncSettings/CloudSyncSettings';
import { useAppStore } from './stores/useAppStore';

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

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const AppTabs: React.FC = () => {
  const currentBook = useAppStore((state) => state.currentBook);
  const readerHref = currentBook ? `/reader/${currentBook.id}` : undefined;
  const location = useLocation();
  const isReaderRoute = location.pathname.startsWith('/reader/');

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/library">
          <Library />
        </Route>
        <Route exact path="/reader/:bookId">
          <Reader />
        </Route>
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
        <Route exact path="/">
          <Redirect to="/library" />
        </Route>
      </IonRouterOutlet>
      <IonTabBar slot="bottom" style={isReaderRoute ? { display: 'none' } : undefined}>
        <IonTabButton tab="library" href="/library">
          <IonIcon aria-hidden="true" icon={library} />
          <IonLabel>Library</IonLabel>
        </IonTabButton>
        <IonTabButton tab="reader" href={readerHref} disabled={!currentBook}>
          <IonIcon aria-hidden="true" icon={book} />
          <IonLabel>Reader</IonLabel>
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
  );
};

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <AppTabs />
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
