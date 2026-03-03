/**
 * useImmersiveMode Hook
 *
 * Manages immersive full-screen reading mode:
 *  - Hides/shows OS chrome (status bar, navigation bar) on Android via Capacitor
 *  - Uses the Fullscreen API on web browsers
 *  - Coordinates with the toolbar visibility state
 *  - Cleans up on unmount (exits fullscreen, restores status bar)
 */

import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

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

/**
 * Dynamically imports StatusBar and Animation enum to avoid breaking web builds.
 * Returns null if unavailable.
 */
async function getStatusBarModule() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import('@capacitor/status-bar');
    return { StatusBar: mod.StatusBar, Animation: mod.Animation };
  } catch {
    return null;
  }
}

async function hideStatusBar() {
  const mod = await getStatusBarModule();
  if (mod) {
    await mod.StatusBar.hide({ animation: mod.Animation.Fade });
  }
}

async function showStatusBar() {
  const mod = await getStatusBarModule();
  if (mod) {
    await mod.StatusBar.show({ animation: mod.Animation.Fade });
  }
}

export const useImmersiveMode = ({
  enabled,
  toolbarVisible,
  setToolbarVisible,
}: UseImmersiveModeOptions): UseImmersiveModeReturn => {
  const wasEnabledRef = useRef(false);

  // ─── Enter immersive mode ─────────────────────────
  const enterImmersive = useCallback(async () => {
    // Hide toolbar
    setToolbarVisible(false);

    // Web: Fullscreen API
    if (!Capacitor.isNativePlatform()) {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn('[ImmersiveMode] Fullscreen API failed:', e);
      }
    }

    // Android: hide status bar
    try {
      await hideStatusBar();
    } catch (e) {
      console.warn('[ImmersiveMode] StatusBar.hide failed:', e);
    }

    // Apply immersive CSS class to document
    document.documentElement.classList.add('immersive-mode');
  }, [setToolbarVisible]);

  // ─── Exit immersive mode ─────────────────────────
  const exitImmersive = useCallback(async () => {
    // Remove immersive CSS class
    document.documentElement.classList.remove('immersive-mode');

    // Web: exit fullscreen
    if (!Capacitor.isNativePlatform()) {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (e) {
        console.warn('[ImmersiveMode] exitFullscreen failed:', e);
      }
    }

    // Android: show status bar
    try {
      await showStatusBar();
    } catch (e) {
      console.warn('[ImmersiveMode] StatusBar.show failed:', e);
    }
  }, []);

  // ─── Toggle OS chrome based on toolbar visibility in immersive mode ─────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const toggleChrome = async () => {
      try {
        if (toolbarVisible) {
          await showStatusBar();
        } else {
          await hideStatusBar();
        }
      } catch {
        // ignore
      }
    };

    toggleChrome();
  }, [enabled, toolbarVisible]);

  // ─── Activate/deactivate based on enabled flag ─────────────────────────
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

  // ─── Cleanup on unmount ─────────────────────────
  useEffect(() => {
    return () => {
      if (wasEnabledRef.current) {
        // Synchronous cleanup: remove CSS class
        document.documentElement.classList.remove('immersive-mode');

        // Async cleanup: restore OS chrome
        (async () => {
          if (!Capacitor.isNativePlatform()) {
            try {
              if (document.fullscreenElement) {
                await document.exitFullscreen();
              }
            } catch {
              // ignore
            }
          }

          try {
            await showStatusBar();
          } catch {
            // ignore
          }
        })();
      }
    };
  }, []);

  // ─── Handle fullscreen exit by Escape key (browser) ─────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !Capacitor.isNativePlatform()) {
        // User pressed Escape to exit fullscreen — don't disable immersive mode,
        // just re-show toolbar to let them see UI
        setToolbarVisible(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [enabled, setToolbarVisible]);

  return {
    isImmersive: enabled,
  };
};

export default useImmersiveMode;
