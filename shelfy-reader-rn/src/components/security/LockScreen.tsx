import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../../theme/ThemeContext';

type LockType = 'pin' | 'password' | 'biometric' | 'none';

interface LockScreenProps {
  lockType: LockType;
  biometricAvailable: boolean;
  onVerify: (credential: string) => Promise<boolean>;
  onBiometricVerify: () => Promise<boolean>;
  onUnlock: () => void;
}

const MAX_PIN_LENGTH = 6;

export function LockScreen({
  lockType,
  biometricAvailable,
  onVerify,
  onBiometricVerify,
  onUnlock,
}: LockScreenProps) {
  const { theme } = useTheme();

  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (lockType === 'biometric' && biometricAvailable) {
      handleBiometric();
    }
  }, []);

  // Auto-submit PIN when max length reached
  useEffect(() => {
    if (lockType === 'pin' && pin.length === MAX_PIN_LENGTH) {
      handlePinSubmit(pin);
    }
  }, [pin]);

  const handlePinPress = useCallback(
    (digit: string) => {
      if (pin.length >= MAX_PIN_LENGTH || loading) return;
      setError('');
      setPin((prev) => prev + digit);
    },
    [pin, loading]
  );

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }, []);

  const handlePinSubmit = useCallback(
    async (currentPin: string) => {
      if (loading) return;
      setLoading(true);
      try {
        const ok = await onVerify(currentPin);
        if (ok) {
          onUnlock();
        } else {
          setError('Incorrect PIN. Try again.');
          setPin('');
          triggerShake();
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, onVerify, onUnlock, triggerShake]
  );

  const handlePasswordSubmit = useCallback(async () => {
    if (!password || loading) return;
    setLoading(true);
    try {
      const ok = await onVerify(password);
      if (ok) {
        onUnlock();
      } else {
        setError('Incorrect password. Try again.');
        setPassword('');
        triggerShake();
      }
    } finally {
      setLoading(false);
    }
  }, [password, loading, onVerify, onUnlock, triggerShake]);

  const handleBiometric = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Shelfy Reader',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const ok = await onBiometricVerify();
        if (ok) {
          onUnlock();
        } else {
          setError('Biometric authentication failed.');
          triggerShake();
        }
      } else {
        setError('Biometric authentication cancelled.');
      }
    } catch {
      setError('Biometric authentication failed.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  }, [loading, onBiometricVerify, onUnlock, triggerShake]);

  // Render PIN dots
  const renderPinDots = () => (
    <View style={styles.pinDots}>
      {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { borderColor: theme.primary },
            i < pin.length && {
              backgroundColor: theme.primary,
            },
          ]}
        />
      ))}
    </View>
  );

  // Render numpad
  const renderNumpad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'back'],
    ];

    return (
      <View style={styles.numpad}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.numpadRow}>
            {row.map((key, idx) => {
              if (key === '') {
                return <View key={idx} style={styles.numBtn} />;
              }
              if (key === 'back') {
                return (
                  <Pressable
                    key={idx}
                    onPress={handleBackspace}
                    disabled={loading || pin.length === 0}
                    style={[styles.numBtn, styles.numBtnClear]}
                    accessibilityLabel="Delete last digit"
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={24}
                      color={
                        pin.length === 0 ? theme.textMuted : theme.text
                      }
                    />
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={idx}
                  onPress={() => handlePinPress(key)}
                  disabled={loading}
                  style={[
                    styles.numBtn,
                    { borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.numBtnText, { color: theme.text }]}>
                    {key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // Render password input
  const renderPasswordInput = () => (
    <View style={styles.passwordWrapper}>
      <View
        style={[
          styles.passwordInputRow,
          {
            borderColor: theme.border,
            backgroundColor: theme.surface,
          },
        ]}
      >
        <TextInput
          style={[styles.passwordInput, { color: theme.text }]}
          secureTextEntry={!showPassword}
          placeholder="Enter password"
          placeholderTextColor={theme.textMuted}
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            setError('');
          }}
          onSubmitEditing={handlePasswordSubmit}
          returnKeyType="go"
          autoFocus
        />
        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          hitSlop={8}
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={theme.textMuted}
          />
        </Pressable>
      </View>
      <Pressable
        onPress={handlePasswordSubmit}
        disabled={!password || loading}
        style={[
          styles.unlockBtn,
          {
            backgroundColor:
              !password || loading ? theme.textMuted : theme.primary,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.unlockBtnText}>Unlock</Text>
        )}
      </Pressable>
    </View>
  );

  const showBiometricButton =
    biometricAvailable &&
    (lockType === 'biometric' || lockType === 'pin' || lockType === 'password');

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          backgroundColor: theme.background,
          transform: [{ translateX: shakeAnim }],
        },
      ]}
      accessibilityRole="none"
      accessibilityLabel="App locked"
    >
      {/* Lock icon */}
      <Ionicons
        name="lock-closed-outline"
        size={48}
        color={theme.primary}
        style={styles.lockIcon}
      />

      {/* Title */}
      <Text style={[styles.title, { color: theme.text }]}>App Locked</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        {lockType === 'pin' && 'Enter your PIN to unlock'}
        {lockType === 'password' && 'Enter your password to unlock'}
        {lockType === 'biometric' &&
          'Use biometrics or enter your PIN to unlock'}
        {lockType === 'none' && 'Enter your credentials to unlock'}
      </Text>

      {/* Error message */}
      {error ? (
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
      ) : null}

      {/* PIN mode */}
      {(lockType === 'pin' || lockType === 'biometric') && (
        <>
          {renderPinDots()}
          {loading && pin.length === MAX_PIN_LENGTH ? (
            <ActivityIndicator
              size="large"
              color={theme.primary}
              style={styles.loadingIndicator}
            />
          ) : (
            renderNumpad()
          )}
        </>
      )}

      {/* Password mode */}
      {lockType === 'password' && renderPasswordInput()}

      {/* Biometric button */}
      {showBiometricButton && (
        <Pressable
          onPress={handleBiometric}
          disabled={loading}
          style={styles.biometricBtn}
          accessibilityLabel="Use biometric authentication"
        >
          <Ionicons
            name="finger-print-outline"
            size={22}
            color={theme.primary}
          />
          <Text style={[styles.biometricText, { color: theme.primary }]}>
            Use Biometrics
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  numpad: {
    marginBottom: 24,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  numBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBtnClear: {
    borderWidth: 0,
  },
  numBtnText: {
    fontSize: 24,
    fontWeight: '500',
  },
  loadingIndicator: {
    marginBottom: 24,
  },
  passwordWrapper: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
  },
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
  },
  unlockBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  biometricText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default LockScreen;
