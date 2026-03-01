import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hide splash screen once the app has rendered
if (Capacitor.isNativePlatform()) {
  // Give the webview a moment to paint, then hide splash
  requestAnimationFrame(() => {
    setTimeout(() => {
      SplashScreen.hide().catch(() => {
        // Splash screen plugin may not be available
      });
    }, 300);
  });
}
