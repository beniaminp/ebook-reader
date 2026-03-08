/**
 * useReaderThemeSync -- syncs theme/font/style settings from the theme store
 * to the reader engine via useEffect hooks.
 *
 * React Native version: instead of CSS injection, sends commands to the
 * WebView-based reader engine through the ReaderEngineRef interface.
 * AutoScroll uses setInterval + ScrollView ref instead of requestAnimationFrame.
 *
 * Extracted from UnifiedReaderContainer to reduce its size.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { ScrollView } from 'react-native';
import { useThemeStore, PREDEFINED_THEMES } from '../stores/useThemeStore';
import type { ReaderEngineRef } from '../types/reader';
import { autoScrollManager } from '../components/reader/ui/AutoScrollManager';

export interface UseReaderThemeSyncOptions {
  isFoliate: boolean;
  isPdf: boolean;
  isScroll: boolean;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

export interface ReaderThemeInfo {
  currentTheme: { backgroundColor: string; textColor: string; id?: string };
  toolbarColors: { background: string; text: string; borderColor: string } | undefined;
  iconColor: string | undefined;
  pageBackgroundColor: string | undefined;
}

export function useReaderThemeSync(
  engineRef: React.RefObject<ReaderEngineRef | null>,
  options: UseReaderThemeSyncOptions,
): ReaderThemeInfo {
  const { isFoliate, isPdf, isScroll, scrollViewRef } = options;
  const themeStore = useThemeStore();
  const baseTheme = PREDEFINED_THEMES[themeStore.theme] || PREDEFINED_THEMES.light;

  const currentTheme = useMemo(
    () =>
      themeStore.customBackgroundColor
        ? { ...baseTheme, backgroundColor: themeStore.customBackgroundColor }
        : baseTheme,
    [baseTheme, themeStore.customBackgroundColor],
  );

  // --- Apply theme/font changes to foliate engine ---

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setTheme?.({
      backgroundColor: currentTheme.backgroundColor,
      textColor: currentTheme.textColor,
    });
  }, [currentTheme, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setCustomBackgroundImage?.(themeStore.customBackgroundImage);
  }, [themeStore.customBackgroundImage, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setFontSize?.(themeStore.fontSize);
  }, [themeStore.fontSize, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setFontFamily?.(themeStore.fontFamily);
  }, [themeStore.fontFamily, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setLineHeight?.(themeStore.lineHeight);
  }, [themeStore.lineHeight, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setTextAlign?.(themeStore.textAlign);
  }, [themeStore.textAlign, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setMarginSize?.(themeStore.marginSize);
  }, [themeStore.marginSize, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setCustomMargins?.(themeStore.customMargins);
  }, [themeStore.customMargins, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setBionicReading?.(themeStore.bionicReading);
  }, [themeStore.bionicReading, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setHyphenation?.(themeStore.hyphenation);
  }, [themeStore.hyphenation, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setParagraphSpacing?.(themeStore.paragraphSpacing);
  }, [themeStore.paragraphSpacing, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setLetterSpacing?.(themeStore.letterSpacing);
  }, [themeStore.letterSpacing, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setFontWeight?.(themeStore.fontWeight);
  }, [themeStore.fontWeight, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setWordSpacing?.(themeStore.wordSpacing);
  }, [themeStore.wordSpacing, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setMaxLineWidth?.(themeStore.maxLineWidth);
  }, [themeStore.maxLineWidth, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setDropCaps?.(themeStore.dropCaps);
  }, [themeStore.dropCaps, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setTwoColumnLayout?.(themeStore.twoColumnLayout);
  }, [themeStore.twoColumnLayout, isFoliate, engineRef]);

  useEffect(() => {
    if (!isFoliate) return;
    engineRef.current?.setGlobalBold?.(themeStore.globalBold);
  }, [themeStore.globalBold, isFoliate, engineRef]);

  useEffect(() => {
    if (isPdf) return;
    engineRef.current?.setInterlinearMode?.(
      themeStore.interlinearMode,
      themeStore.interlinearLanguage,
    );
  }, [
    themeStore.interlinearMode,
    themeStore.interlinearLanguage,
    isFoliate,
    isScroll,
    isPdf,
    engineRef,
  ]);

  useEffect(() => {
    if (isPdf) return;
    // On native, pass the interlinear language as the target lang
    engineRef.current?.setWordWise?.(
      themeStore.wordWiseEnabled,
      themeStore.wordWiseLevel,
      themeStore.interlinearLanguage,
    );
  }, [
    themeStore.wordWiseEnabled,
    themeStore.wordWiseLevel,
    themeStore.interlinearLanguage,
    isFoliate,
    isScroll,
    isPdf,
    engineRef,
  ]);

  // --- Page curl animation ---
  useEffect(() => {
    if (!isFoliate) return;
    const enabled = themeStore.pageTransitionType === 'curl';
    engineRef.current?.setPageCurl?.(enabled, currentTheme.backgroundColor);
  }, [themeStore.pageTransitionType, isFoliate, currentTheme.backgroundColor, engineRef]);

  // --- AutoScroll (uses setInterval + ScrollView ref) ---

  useEffect(() => {
    if (themeStore.autoScroll) {
      const sv = scrollViewRef?.current;
      if (sv) {
        autoScrollManager.start(sv, themeStore.autoScrollSpeed);
      }
    } else {
      autoScrollManager.stop();
    }
    return () => {
      autoScrollManager.stop();
    };
  }, [themeStore.autoScroll, scrollViewRef]);

  useEffect(() => {
    if (themeStore.autoScroll) {
      autoScrollManager.updateSpeed(themeStore.autoScrollSpeed);
    }
  }, [themeStore.autoScrollSpeed, themeStore.autoScroll]);

  // --- Computed style values (RN-compatible, no CSSProperties) ---

  const toolbarColors = isFoliate
    ? {
        background: currentTheme.backgroundColor,
        text: currentTheme.textColor,
        borderColor:
          currentTheme.id === 'light' ? '#e0e0e0' : 'rgba(255,255,255,0.12)',
      }
    : undefined;

  const iconColor = isFoliate ? currentTheme.textColor : undefined;

  const pageBackgroundColor = isFoliate
    ? currentTheme.backgroundColor
    : undefined;

  return { currentTheme, toolbarColors, iconColor, pageBackgroundColor };
}
