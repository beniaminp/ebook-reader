import React, { useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { bookOutline, handLeftOutline, colorPaletteOutline } from 'ionicons/icons';

const STEPS = [
  {
    icon: bookOutline,
    title: 'Welcome to Shelfy!',
    description: 'Import EPUB, PDF, MOBI, and 10+ formats. Tap the + button to get started.',
  },
  {
    icon: handLeftOutline,
    title: 'Reading Controls',
    description: 'Tap left/right edges to turn pages. Tap the center to show the toolbar with themes, fonts, and reading tools.',
  },
  {
    icon: colorPaletteOutline,
    title: 'Customize Your Experience',
    description: 'Choose from 11 themes, adjust fonts, enable bionic reading, and more in Settings.',
  },
];

const OnboardingOverlay: React.FC = () => {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('shelfy_onboarding_done') === 'true');

  if (dismissed) return null;

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('shelfy_onboarding_done', 'true');
      setDismissed(true);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('shelfy_onboarding_done', 'true');
    setDismissed(true);
  };

  const current = STEPS[step];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 'var(--z-max, 9999)' as unknown as number,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'var(--ion-background-color, #fff)',
        borderRadius: '16px',
        padding: '32px 24px',
        maxWidth: '340px',
        width: '100%',
        textAlign: 'center',
        boxShadow: 'var(--shadow-xl, 0 8px 24px rgba(0,0,0,0.25))',
      }}>
        <IonIcon icon={current.icon} style={{
          fontSize: '48px',
          color: 'var(--ion-color-primary)',
          marginBottom: '16px',
          display: 'block',
        }} />
        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>{current.title}</h2>
        <p style={{ margin: '0 0 24px', fontSize: '15px', color: 'var(--ion-color-medium)', lineHeight: 1.5 }}>
          {current.description}
        </p>

        {/* Step indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i === step ? 'var(--ion-color-primary)' : 'var(--ion-color-light-shade, #ddd)',
              transition: 'width 0.2s ease, background 0.2s ease',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <IonButton fill="clear" size="small" color="medium" onClick={handleSkip}>
            Skip
          </IonButton>
          <IonButton fill="solid" size="small" onClick={handleNext}>
            {step < STEPS.length - 1 ? 'Next' : 'Get Started'}
          </IonButton>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
