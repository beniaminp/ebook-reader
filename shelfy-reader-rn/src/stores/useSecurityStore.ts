/**
 * Security Store
 * Tracks lock state and coordinates with securityService.
 * Listens to React Native AppState lifecycle events to auto-lock on background.
 *
 * React Native version: replaces @capacitor/app with RN AppState,
 * uses AsyncStorage for persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { securityService } from '../services/securityService';
import type { LockType } from '../services/securityService';

interface SecurityState {
  // Lock state
  isLocked: boolean;
  lockType: LockType;
  isEnabled: boolean;
  biometricAvailable: boolean;
  autoLockDelay: number; // seconds

  // Initialization
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  lock: () => void;
  unlock: () => void;
  enableSecurity: (lockType: LockType, credential?: string) => Promise<void>;
  disableSecurity: () => Promise<void>;
  verifyAndUnlock: (credential: string) => Promise<boolean>;
  verifyBiometricAndUnlock: () => Promise<boolean>;
  setAutoLockDelay: (seconds: number) => Promise<void>;
  refreshBiometricAvailability: () => Promise<void>;
}

// Track auto-lock timer id outside of store to avoid serialization
let autoLockTimerId: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

function clearAutoLockTimer() {
  if (autoLockTimerId !== null) {
    clearTimeout(autoLockTimerId);
    autoLockTimerId = null;
  }
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      isLocked: false,
      lockType: 'none',
      isEnabled: false,
      biometricAvailable: false,
      autoLockDelay: 0,
      isInitialized: false,

      initialize: async () => {
        if (get().isInitialized) return;

        await securityService.init();
        const config = securityService.getConfig();

        set({
          lockType: config.lockType,
          isEnabled: config.isEnabled,
          biometricAvailable: config.biometricAvailable,
          autoLockDelay: config.autoLockDelay,
          // Lock on startup if security is enabled
          isLocked: config.isEnabled,
          isInitialized: true,
        });

        // Listen for app state changes using React Native AppState
        if (appStateSubscription) {
          appStateSubscription.remove();
        }

        appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
          const state = get();
          if (!state.isEnabled) return;

          if (nextAppState === 'background' || nextAppState === 'inactive') {
            // App moved to background
            const delay = state.autoLockDelay;
            if (delay === 0) {
              get().lock();
            } else {
              clearAutoLockTimer();
              autoLockTimerId = setTimeout(() => {
                get().lock();
              }, delay * 1000);
            }
          } else if (nextAppState === 'active') {
            // App came back to foreground -- cancel any pending timer
            clearAutoLockTimer();
          }
        });
      },

      lock: () => {
        const { isEnabled } = get();
        if (!isEnabled) return;
        set({ isLocked: true });
      },

      unlock: () => {
        set({ isLocked: false });
      },

      enableSecurity: async (lockType: LockType, credential?: string) => {
        if (lockType === 'none') {
          await get().disableSecurity();
          return;
        }

        const credToStore = credential ?? '';
        await securityService.setCredential(
          credToStore,
          lockType as 'pin' | 'password' | 'biometric'
        );

        set({
          lockType,
          isEnabled: true,
          isLocked: false,
        });
      },

      disableSecurity: async () => {
        await securityService.clearCredential();
        clearAutoLockTimer();
        set({
          lockType: 'none',
          isEnabled: false,
          isLocked: false,
        });
      },

      verifyAndUnlock: async (credential: string): Promise<boolean> => {
        const ok = await securityService.verifyCredential(credential);
        if (ok) {
          set({ isLocked: false });
        }
        return ok;
      },

      verifyBiometricAndUnlock: async (): Promise<boolean> => {
        const ok = await securityService.verifyBiometric();
        if (ok) {
          set({ isLocked: false });
        }
        return ok;
      },

      setAutoLockDelay: async (seconds: number) => {
        await securityService.setAutoLockDelay(seconds);
        set({ autoLockDelay: seconds });
      },

      refreshBiometricAvailability: async () => {
        const available = await securityService.checkBiometricAvailable();
        set({ biometricAvailable: available });
      },
    }),
    {
      name: 'security-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist settings, not transient lock state
      partialize: (state) => ({
        lockType: state.lockType,
        isEnabled: state.isEnabled,
        autoLockDelay: state.autoLockDelay,
      }),
    }
  )
);
