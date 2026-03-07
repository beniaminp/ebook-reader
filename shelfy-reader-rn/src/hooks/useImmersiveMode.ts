/**
 * useImmersiveMode Hook
 *
 * Manages immersive full-screen reading mode for React Native:
 *  - Hides/shows the status bar via React Native's StatusBar API
 *  - Hides/shows the Android navigation bar via expo-navigation-bar
 *  - Coordinates with the toolbar visibility state
 *  - Cleans up on unmount (restores status bar and nav bar)
 *
 * React Native version: replaces Capacitor StatusBar, Fullscreen API, and
 * CSS class toggling with RN StatusBar and expo-navigation-bar APIs.
 */

import { useEffect, useCallback, useRef } from 'react';
import { StatusBar, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

export interface UseImmersiveModeOptions {
  /** Whether immersive mode is enabled (from settings). */
  enabled: boolean;
  /** Whether the toolbar is currently visible. */
  toolbarVisible: boolean;
  /** Callback to set toolbar visibility. */
  setToolbarVisible: (visible: boolean) => void;
}

export interface UseImmersiveModeReturn {
  /** Whether immersive mode is currently active. */
  isImmersive: boolean;
}

async function hideSystemBars() {
  StatusBar.setHidden(true, 'fade');
  if (Platform.OS === 'android') {
    try {
      await NavigationBar.setVisibilityAsync('hidden');
    } catch {
      // ignore on platforms that don't support it
    }
  }
}

async function showSystemBars() {
  StatusBar.setHidden(false, 'fade');
  if (Platform.OS === 'android') {
    try {
      await NavigationBar.setVisibilityAsync('visible');
    } catch {
      // ignore on platforms that don't support it
    }
  }
}

export const useImmersiveMode = ({
  enabled,
  toolbarVisible,
  setToolbarVisible,
}: UseImmersiveModeOptions): UseImmersiveModeReturn => {
  const wasEnabledRef = useRef(false);

  // Enter immersive mode
  const enterImmersive = useCallback(async () => {
    // Hide toolbar
    setToolbarVisible(false);

    try {
      await hideSystemBars();
    } catch (e) {
      console.warn('[ImmersiveMode] hideSystemBars failed:', e);
    }
  }, [setToolbarVisible]);

  // Exit immersive mode
  const exitImmersive = useCallback(async () => {
    try {
      await showSystemBars();
    } catch (e) {
      console.warn('[ImmersiveMode] showSystemBars failed:', e);
    }
  }, []);

  // Toggle OS chrome based on toolbar visibility in immersive mode
  useEffect(() => {
    if (!enabled) return;

    const toggleChrome = async () => {
      try {
        if (toolbarVisible) {
          await showSystemBars();
        } else {
          await hideSystemBars();
        }
      } catch {
        // ignore
      }
    };

    toggleChrome();
  }, [enabled, toolbarVisible]);

  // Activate/deactivate based on enabled flag
  useEffect(() => {
    if (enabled && !wasEnabledRef.current) {
      // Entering immersive mode
      enterImmersive();
      wasEnabledRef.current = true;
    } else if (!enabled && wasEnabledRef.current) {
      // Leaving immersive mode
      exitImmersive();
      setToolbarVisible(true);
      wasEnabledRef.current = false;
    }
  }, [enabled, enterImmersive, exitImmersive, setToolbarVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wasEnabledRef.current) {
        // Restore system bars on unmount
        showSystemBars().catch(() => {
          // ignore cleanup errors
        });
      }
    };
  }, []);

  return {
    isImmersive: enabled,
  };
};

export default useImmersiveMode;
