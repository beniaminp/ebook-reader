/**
 * Security Service - Stub
 * Placeholder for app lock / biometric authentication.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type LockType = 'none' | 'pin' | 'password' | 'biometric';

export interface SecurityConfig {
  lockEnabled: boolean;
  lockType: LockType;
  isEnabled: boolean;
  biometricAvailable: boolean;
  autoLockDelay: number; // seconds
  autoLockTimeout: number; // minutes (legacy)
}

const SECURITY_CONFIG_KEY = 'security_config';
const SECURITY_CREDENTIAL_KEY = 'security_credential';

const DEFAULT_CONFIG: SecurityConfig = {
  lockEnabled: false,
  lockType: 'none',
  isEnabled: false,
  biometricAvailable: false,
  autoLockDelay: 0,
  autoLockTimeout: 5,
};

let _config: SecurityConfig = { ...DEFAULT_CONFIG };

export async function init(): Promise<void> {
  try {
    const value = await AsyncStorage.getItem(SECURITY_CONFIG_KEY);
    if (value) {
      _config = { ...DEFAULT_CONFIG, ...JSON.parse(value) };
    }
  } catch {
    _config = { ...DEFAULT_CONFIG };
  }
}

export function getConfig(): SecurityConfig {
  return { ..._config };
}

export async function checkBiometricAvailable(): Promise<boolean> {
  return false;
}

export async function authenticate(): Promise<boolean> {
  return true;
}

export async function getSecurityConfig(): Promise<SecurityConfig> {
  return { ..._config };
}

export async function setSecurityConfig(config: Partial<SecurityConfig>): Promise<void> {
  _config = { ..._config, ...config };
  await AsyncStorage.setItem(SECURITY_CONFIG_KEY, JSON.stringify(_config));
}

export async function setCredential(
  credential: string,
  lockType: 'pin' | 'password' | 'biometric'
): Promise<void> {
  await AsyncStorage.setItem(SECURITY_CREDENTIAL_KEY, credential);
  _config = { ..._config, lockType, isEnabled: true, lockEnabled: true };
  await AsyncStorage.setItem(SECURITY_CONFIG_KEY, JSON.stringify(_config));
}

export async function clearCredential(): Promise<void> {
  await AsyncStorage.removeItem(SECURITY_CREDENTIAL_KEY);
  _config = { ..._config, lockType: 'none', isEnabled: false, lockEnabled: false };
  await AsyncStorage.setItem(SECURITY_CONFIG_KEY, JSON.stringify(_config));
}

export async function verifyCredential(credential: string): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(SECURITY_CREDENTIAL_KEY);
    return stored === credential;
  } catch {
    return false;
  }
}

export async function verifyBiometric(): Promise<boolean> {
  // Stub -- biometric authentication not yet implemented
  console.warn('Biometric authentication not yet implemented');
  return false;
}

export async function setAutoLockDelay(seconds: number): Promise<void> {
  _config = { ..._config, autoLockDelay: seconds };
  await AsyncStorage.setItem(SECURITY_CONFIG_KEY, JSON.stringify(_config));
}

export const securityService = {
  init,
  getConfig,
  checkBiometricAvailable,
  authenticate,
  getSecurityConfig,
  setSecurityConfig,
  setCredential,
  clearCredential,
  verifyCredential,
  verifyBiometric,
  setAutoLockDelay,
};

export default securityService;
