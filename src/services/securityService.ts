/**
 * Security Service
 * Manages lock state, PIN/password authentication, and biometric authentication.
 * On native platforms uses Capacitor NativeBiometric (if installed).
 * On web falls back to PIN/password only.
 * Credentials are hashed with SHA-256 via SubtleCrypto before storage.
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export type LockType = 'none' | 'pin' | 'password' | 'biometric';

export interface SecurityConfig {
  isEnabled: boolean;
  lockType: LockType;
  hashedCredential: string | null;
  biometricAvailable: boolean;
  autoLockDelay: number; // seconds, 0 = immediate
}

const PREF_KEY = 'security_config';

// ---------------------------------------------------------------------------
// SubtleCrypto SHA-256 helper
// ---------------------------------------------------------------------------

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// NativeBiometric – optional dynamic import (not in package.json)
// ---------------------------------------------------------------------------

interface NativeBiometricPlugin {
  isAvailable(): Promise<{ isAvailable: boolean; biometryType?: number }>;
  verifyIdentity(opts: {
    reason: string;
    title: string;
    subtitle?: string;
    description?: string;
  }): Promise<void>;
}

let _nativeBiometric: NativeBiometricPlugin | null = null;

async function getNativeBiometric(): Promise<NativeBiometricPlugin | null> {
  if (_nativeBiometric !== null) return _nativeBiometric;

  // Only attempt native biometric on native Capacitor platforms
  if (!Capacitor.isNativePlatform()) {
    _nativeBiometric = null;
    return null;
  }

  try {
    // Attempt dynamic import – only succeeds if the plugin is installed
    // @ts-expect-error - Optional dependency, may not be installed
    const mod = await import('@capacitor-community/native-biometric');
    _nativeBiometric = (mod.NativeBiometric as unknown as NativeBiometricPlugin) ?? null;
  } catch {
    _nativeBiometric = null;
  }

  return _nativeBiometric;
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: SecurityConfig = {
  isEnabled: false,
  lockType: 'none',
  hashedCredential: null,
  biometricAvailable: false,
  autoLockDelay: 0,
};

// ---------------------------------------------------------------------------
// SecurityService class
// ---------------------------------------------------------------------------

class SecurityService {
  private config: SecurityConfig = { ...DEFAULT_CONFIG };
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const { value } = await Preferences.get({ key: PREF_KEY });
    if (value) {
      try {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(value) };
      } catch {
        this.config = { ...DEFAULT_CONFIG };
      }
    }

    // Probe biometric availability
    this.config.biometricAvailable = await this.checkBiometricAvailable();

    this.initialized = true;
  }

  // -------------------------------------------------------------------------
  // Biometric availability check
  // -------------------------------------------------------------------------

  async checkBiometricAvailable(): Promise<boolean> {
    try {
      const plugin = await getNativeBiometric();
      if (!plugin) return false;
      const result = await plugin.isAvailable();
      return result.isAvailable === true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Config getters / persistance
  // -------------------------------------------------------------------------

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  private async saveConfig(): Promise<void> {
    await Preferences.set({ key: PREF_KEY, value: JSON.stringify(this.config) });
  }

  // -------------------------------------------------------------------------
  // Enable / disable security
  // -------------------------------------------------------------------------

  async setEnabled(enabled: boolean): Promise<void> {
    this.config.isEnabled = enabled;
    if (!enabled) {
      this.config.lockType = 'none';
      this.config.hashedCredential = null;
    }
    await this.saveConfig();
  }

  // -------------------------------------------------------------------------
  // Set / change credential (PIN or password)
  // -------------------------------------------------------------------------

  async setCredential(
    credential: string,
    lockType: 'pin' | 'password' | 'biometric',
  ): Promise<void> {
    this.config.lockType = lockType;
    if (lockType === 'biometric') {
      // No credential to store for biometric – biometric verification is handled
      // directly by the OS. We still keep the hashed credential as a fallback
      // PIN if the caller provides one.
      this.config.hashedCredential = credential ? await sha256(credential) : null;
    } else {
      this.config.hashedCredential = await sha256(credential);
    }
    this.config.isEnabled = true;
    await this.saveConfig();
  }

  async clearCredential(): Promise<void> {
    this.config.hashedCredential = null;
    this.config.lockType = 'none';
    this.config.isEnabled = false;
    await this.saveConfig();
  }

  // -------------------------------------------------------------------------
  // Verify credential
  // -------------------------------------------------------------------------

  async verifyCredential(credential: string): Promise<boolean> {
    if (!this.config.hashedCredential) return false;
    const hashed = await sha256(credential);
    return hashed === this.config.hashedCredential;
  }

  // -------------------------------------------------------------------------
  // Biometric verification
  // -------------------------------------------------------------------------

  async verifyBiometric(): Promise<boolean> {
    try {
      const plugin = await getNativeBiometric();
      if (!plugin) return false;

      await plugin.verifyIdentity({
        reason: 'Authenticate to access your ebook library',
        title: 'Biometric Authentication',
        subtitle: 'Use your fingerprint or face to unlock',
      });

      return true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Auto-lock delay
  // -------------------------------------------------------------------------

  async setAutoLockDelay(seconds: number): Promise<void> {
    this.config.autoLockDelay = seconds;
    await this.saveConfig();
  }

  getAutoLockDelay(): number {
    return this.config.autoLockDelay;
  }

  // -------------------------------------------------------------------------
  // Validate PIN format
  // -------------------------------------------------------------------------

  static validatePin(pin: string): boolean {
    return /^\d{4,6}$/.test(pin);
  }

  static validatePassword(password: string): boolean {
    return password.length >= 4;
  }
}

export const securityService = new SecurityService();
