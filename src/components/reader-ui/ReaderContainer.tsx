/**
 * Reader Container
 * Applies theme settings to reader content and provides reading tools
 */

import React, { useEffect, useRef } from 'react';
import { useThemeStore } from '../../stores/useThemeStore';
import { useTapZones } from '../../hooks/useTapZones';
import { useBionicReading } from '../../hooks/useBionicReading';
import type { TapZoneConfig } from '../../hooks/useTapZones';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useBrightnessGesture } from '../../hooks/useBrightnessGesture';
import { ReadingRuler } from './ReadingRuler';
import { FocusMode } from './FocusMode';
import './ReaderContainer.css';
import './Interlinear.css';

export interface ReaderContainerProps {
  children: React.ReactNode;
  className?: string;
  onContentRef?: (ref: HTMLDivElement | null) => void;
  /** Called when the user taps/swipes to the previous page */
  onPrevPage?: () => void;
  /** Called when the user taps/swipes to the next page */
  onNextPage?: () => void;
  /** Called when the user taps the center zone */
  onToggleToolbar?: () => void;
  /** Override tap zone boundaries/actions */
  tapZoneConfig?: TapZoneConfig;
  /** Disable tap zones entirely */
  tapZonesEnabled?: boolean;
  /** Disable swipe gestures entirely */
  swipeEnabled?: boolean;
  /** Disable brightness gesture */
  brightnessGestureEnabled?: boolean;
  /** IonContent ref for scroll tracking */
  ionContentRef?: React.RefObject<HTMLIonContentElement>;
}

/**
 * Reading Ruler Component
 * Shows a highlighted line following reading position
 */

/**
 * Blue Light Filter Component
 */
const BlueLightFilter: React.FC<{ visible: boolean; intensity: number }> = ({
  visible,
  intensity,
}) => {
  if (!visible) return null;

  return (
    <div
      className="blue-light-filter-overlay"
      style={{
        backgroundColor: `rgba(255, 120, 0, ${intensity / 100})`,
      }}
    />
  );
};

/**
 * Main Reader Container Component
 */
export const ReaderContainer: React.FC<ReaderContainerProps> = ({
  children,
  className = '',
  onContentRef,
  onPrevPage,
  onNextPage,
  onToggleToolbar,
  tapZoneConfig,
  tapZonesEnabled = true,
  swipeEnabled = true,
  brightnessGestureEnabled = true,
  ionContentRef,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const {
    theme,
    fontFamily,
    fontSize,
    lineHeight,
    textAlign,
    marginSize,
    customMargins,
    blueLightFilter,
    blueLightIntensity,
    readingRuler,
    readingRulerSettings,
    bionicReading,
    focusMode,
    focusModeSettings,
    customBackgroundColor,
    customBackgroundImage,
    hyphenation,
    paragraphSpacing,
    letterSpacing,
    fontWeight,
    tapSensitivity,
    swipeThreshold,
  } = useThemeStore();

  // Bionic reading hook
  const bionicHook = useBionicReading({
    enabled: bionicReading,
    boldFraction: 0.5,
    boldClassName: 'word-bold',
    regularClassName: 'word-regular',
    wordClassName: 'word',
  });

  // Brightness gesture hook
  const brightnessGesture = useBrightnessGesture({
    enabled: brightnessGestureEnabled,
    contentRef: contentRef,
  });

  // Swipe gesture handlers
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: onNextPage,
    onSwipeRight: onPrevPage,
    enabled: swipeEnabled && (!!onNextPage || !!onPrevPage),
    threshold: swipeThreshold,
  });

  // Tap zone handlers (coordinated with brightness gesture)
  const tapHandlers = useTapZones({
    onPrev: onPrevPage,
    onNext: onNextPage,
    onToggleToolbar,
    config: tapZoneConfig,
    enabled: tapZonesEnabled && (!!onPrevPage || !!onNextPage || !!onToggleToolbar),
    maxTapMovement: tapSensitivity,
    wasBrightnessDrag: brightnessGesture.wasBrightnessDrag
      ? () => brightnessGesture.wasBrightnessDrag
      : undefined,
    resetBrightnessDragFlag: brightnessGesture.resetBrightnessDragFlag,
  });

  // Merge touch handlers: swipe gesture takes precedence for move/end detection,
  // tap zones fire only for short stationary taps, brightness gesture for left edge.
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    swipeHandlers.onTouchStart(e);
    tapHandlers.onTouchStart(e);
    brightnessGesture.onTouchStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    swipeHandlers.onTouchMove(e);
    brightnessGesture.onTouchMove(e);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    swipeHandlers.onTouchEnd(e);
    tapHandlers.onTouchEnd(e);
    brightnessGesture.onTouchEnd(e);
  };

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Apply theme data attribute
    root.setAttribute('data-theme', theme);

    // Apply font family
    root.setAttribute('data-font', fontFamily);

    // Apply text alignment
    root.setAttribute('data-align', textAlign);

    // Apply margin size
    root.setAttribute('data-margin', marginSize);

    // Apply CSS custom properties for dynamic values
    root.style.setProperty('--reader-font-size', `${fontSize}px`);
    root.style.setProperty('--reader-line-height', lineHeight.toString());
    root.style.setProperty('--reader-letter-spacing', `${letterSpacing}em`);
    root.style.setProperty('--reader-paragraph-spacing', `${paragraphSpacing}em`);
    root.style.setProperty('--reader-font-weight', fontWeight.toString());
    root.style.setProperty('--reader-hyphens', hyphenation ? 'auto' : 'manual');
  }, [theme, fontFamily, fontSize, lineHeight, textAlign, marginSize, hyphenation, paragraphSpacing, letterSpacing, fontWeight]);

  // Apply bionic reading to text content

  // Notify parent of content ref
  useEffect(() => {
    if (onContentRef) {
      onContentRef(contentRef.current);
    }
  }, [onContentRef]);

  const containerClasses = [
    'reader-container',
    `theme-${theme}`,
    `font-${fontFamily}`,
    `align-${textAlign}`,
    `margin-${marginSize}`,
    bionicReading ? 'bionic-reading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Check if any reading features are enabled
  const hasReadingFeatures =
    readingRuler || readingRulerSettings.enabled || focusMode || focusModeSettings.enabled;

  // Sync content ref with bionic reading hook
  useEffect(() => {
    if (contentRef.current && bionicHook.containerRef) {
      (bionicHook.containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        contentRef.current;
    }
  }, [bionicHook.containerRef]);

  // Build container style with custom background support
  const containerStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    lineHeight: lineHeight.toString(),
    textAlign,
    padding: `${customMargins.top}px ${customMargins.right}px ${customMargins.bottom}px ${customMargins.left}px`,
    letterSpacing: letterSpacing ? `${letterSpacing}em` : undefined,
    hyphens: hyphenation ? 'auto' : undefined,
    WebkitHyphens: hyphenation ? 'auto' : undefined,
  };

  // Apply custom background if set
  if (customBackgroundImage) {
    containerStyle.backgroundImage = `url(${customBackgroundImage})`;
    containerStyle.backgroundSize = 'cover';
    containerStyle.backgroundPosition = 'center';
    containerStyle.backgroundRepeat = 'no-repeat';
    // Add semi-transparent overlay for readability
    containerStyle.boxShadow = 'inset 0 0 0 2000px rgba(0, 0, 0, 0.5)';
  } else if (customBackgroundColor) {
    containerStyle.backgroundColor = customBackgroundColor;
  }

  return (
    <div
      className="reader-wrapper"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <BlueLightFilter visible={blueLightFilter} intensity={blueLightIntensity} />
      {brightnessGesture.brightnessOverlay}
      {hasReadingFeatures && (
        <>
          <ReadingRuler containerRef={contentRef} ionContentRef={ionContentRef} />
          <FocusMode containerRef={contentRef} ionContentRef={ionContentRef} />
        </>
      )}
      <div ref={contentRef} className={containerClasses} style={containerStyle}>
        {children}
      </div>
    </div>
  );
};

export default ReaderContainer;
