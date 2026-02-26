/**
 * LockScreen component
 * Shown when the app is locked. Supports PIN numpad, password input,
 * and biometric authentication button.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { IonButton, IonIcon, IonSpinner, IonInput, IonText } from '@ionic/react';
import {
  fingerPrintOutline,
  backspaceOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
} from 'ionicons/icons';
import { useSecurityStore } from '../../stores/useSecurityStore';

// ---------------------------------------------------------------------------
// Styles – inline to keep the component self-contained
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--ion-background-color, #fff)',
    padding: '24px',
  },
  lockIcon: {
    fontSize: '48px',
    color: 'var(--ion-color-primary)',
    marginBottom: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    marginBottom: '8px',
    color: 'var(--ion-text-color)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--ion-color-medium)',
    marginBottom: '32px',
    textAlign: 'center',
  },
  pinDots: {
    display: 'flex',
    gap: '16px',
    marginBottom: '32px',
  },
  dot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid var(--ion-color-primary)',
    transition: 'background 0.15s',
  },
  dotFilled: {
    background: 'var(--ion-color-primary)',
  },
  numpad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 72px)',
    gap: '12px',
    marginBottom: '24px',
  },
  numBtn: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    fontSize: '24px',
    fontWeight: 500,
    '--border-radius': '50%',
    '--padding-start': '0',
    '--padding-end': '0',
  } as React.CSSProperties,
  backspaceBtn: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    '--border-radius': '50%',
    '--padding-start': '0',
    '--padding-end': '0',
  } as React.CSSProperties,
  passwordWrapper: {
    width: '100%',
    maxWidth: '320px',
    marginBottom: '24px',
    position: 'relative',
  },
  errorText: {
    color: 'var(--ion-color-danger)',
    fontSize: '13px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  biometricBtn: {
    marginTop: '8px',
  },
  unlockBtn: {
    width: '100%',
    maxWidth: '320px',
    marginBottom: '16px',
  },
};

// ---------------------------------------------------------------------------
// PIN digit count mapped from lock type defaults
// ---------------------------------------------------------------------------

const MAX_PIN_LENGTH = 6;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const LockScreen: React.FC = () => {
  const { lockType, biometricAvailable, verifyAndUnlock, verifyBiometricAndUnlock } =
    useSecurityStore();

  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const passwordInputRef = useRef<HTMLIonInputElement>(null);

  // Auto-trigger biometric on mount when lock type is biometric
  useEffect(() => {
    if (lockType === 'biometric' && biometricAvailable) {
      handleBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-submit PIN when max length reached
  useEffect(() => {
    if (lockType === 'pin' && pin.length === MAX_PIN_LENGTH) {
      handlePinSubmit(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }, []);

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
        const ok = await verifyAndUnlock(currentPin);
        if (!ok) {
          setError('Incorrect PIN. Try again.');
          setPin('');
          triggerShake();
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, verifyAndUnlock, triggerShake]
  );

  const handlePasswordSubmit = useCallback(async () => {
    if (!password || loading) return;
    setLoading(true);
    try {
      const ok = await verifyAndUnlock(password);
      if (!ok) {
        setError('Incorrect password. Try again.');
        setPassword('');
        triggerShake();
      }
    } finally {
      setLoading(false);
    }
  }, [password, loading, verifyAndUnlock, triggerShake]);

  const handleBiometric = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const ok = await verifyBiometricAndUnlock();
      if (!ok) {
        setError('Biometric authentication failed.');
        triggerShake();
      }
    } finally {
      setLoading(false);
    }
  }, [loading, verifyBiometricAndUnlock, triggerShake]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderPinDots = () => {
    const maxDots = 6;
    return (
      <div style={styles.pinDots}>
        {Array.from({ length: maxDots }).map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.dot,
              ...(i < pin.length ? styles.dotFilled : {}),
            }}
          />
        ))}
      </div>
    );
  };

  const renderNumpad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'back'],
    ];

    return (
      <div style={styles.numpad}>
        {rows.flat().map((key, idx) => {
          if (key === '') {
            return <div key={idx} style={{ width: '72px', height: '72px' }} />;
          }
          if (key === 'back') {
            return (
              <IonButton
                key={idx}
                fill="clear"
                style={styles.backspaceBtn}
                onClick={handleBackspace}
                disabled={loading || pin.length === 0}
                aria-label="Delete last digit"
              >
                <IonIcon icon={backspaceOutline} style={{ fontSize: '24px' }} />
              </IonButton>
            );
          }
          return (
            <IonButton
              key={idx}
              fill="outline"
              style={styles.numBtn}
              onClick={() => handlePinPress(key)}
              disabled={loading}
            >
              {key}
            </IonButton>
          );
        })}
      </div>
    );
  };

  const renderPasswordInput = () => (
    <div style={styles.passwordWrapper}>
      <IonInput
        ref={passwordInputRef}
        type={showPassword ? 'text' : 'password'}
        placeholder="Enter password"
        value={password}
        onIonInput={(e) => {
          setPassword(e.detail.value ?? '');
          setError('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handlePasswordSubmit();
        }}
        fill="outline"
        style={{ marginBottom: '12px' }}
      >
        <IonButton
          slot="end"
          fill="clear"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
        </IonButton>
      </IonInput>
      <IonButton
        expand="block"
        style={styles.unlockBtn}
        onClick={handlePasswordSubmit}
        disabled={!password || loading}
      >
        {loading ? <IonSpinner name="dots" /> : 'Unlock'}
      </IonButton>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Root render
  // ---------------------------------------------------------------------------

  const showBiometricButton =
    biometricAvailable &&
    (lockType === 'biometric' || lockType === 'pin' || lockType === 'password');

  return (
    <div
      style={{
        ...styles.overlay,
        animation: shake ? 'lockShake 0.5s ease' : undefined,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="App locked"
    >
      {/* Lock icon */}
      <IonIcon icon={lockClosedOutline} style={styles.lockIcon} />

      {/* Title */}
      <div style={styles.title}>App Locked</div>
      <div style={styles.subtitle}>
        {lockType === 'pin' && 'Enter your PIN to unlock'}
        {lockType === 'password' && 'Enter your password to unlock'}
        {lockType === 'biometric' && 'Use biometrics or enter your PIN to unlock'}
        {lockType === 'none' && 'Enter your credentials to unlock'}
      </div>

      {/* Error message */}
      {error && <IonText style={styles.errorText}>{error}</IonText>}

      {/* PIN mode */}
      {(lockType === 'pin' || lockType === 'biometric') && (
        <>
          {renderPinDots()}
          {loading && pin.length === MAX_PIN_LENGTH ? (
            <IonSpinner name="dots" style={{ marginBottom: '24px' }} />
          ) : (
            renderNumpad()
          )}
        </>
      )}

      {/* Password mode */}
      {lockType === 'password' && renderPasswordInput()}

      {/* Biometric button */}
      {showBiometricButton && (
        <IonButton
          fill="clear"
          style={styles.biometricBtn}
          onClick={handleBiometric}
          disabled={loading}
          aria-label="Use biometric authentication"
        >
          <IonIcon icon={fingerPrintOutline} slot="start" style={{ fontSize: '22px' }} />
          Use Biometrics
        </IonButton>
      )}

      {/* Inline keyframe animation injected once */}
      <style>{`
        @keyframes lockShake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-10px); }
          40%       { transform: translateX(10px); }
          60%       { transform: translateX(-8px); }
          80%       { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
};

export default LockScreen;
