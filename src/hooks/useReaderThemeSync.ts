/**
 * useReaderThemeSync — syncs theme/font/style settings from the theme store
 * to the reader engine via useEffect hooks.
 *
 * Extracted from UnifiedReaderContainer to reduce its size.
 */

import { useEffect, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { useThemeStore } from '../stores/useThemeStore';
import { EPUB_THEMES } from '../types/epub';
import type { ReaderEngineRef } from '../types/reader';
import { autoScrollManager } from '../components/reader-ui/AutoScrollManager';

export interface UseReaderThemeSyncOptions {
  isFoliate: boolean;
  isPdf: boolean;
  isScroll: boolean;
  ionContentRef: React.RefObject<HTMLIonContentElement | null>;
}

export interface ReaderThemeInfo {
  currentTheme: { backgroundColor: string; textColor: string; id?: string };
  toolbarStyle: React.CSSProperties | undefined;
  iconColor: { color: string } | undefined;
  pageStyle: React.CSSProperties | undefined;
}

export function useReaderThemeSync(
  engineRef: React.RefObject<ReaderEngineRef | null>,
  options: UseReaderThemeSyncOptions
): ReaderThemeInfo {
  const { isFoliate, isPdf, isScroll, ionContentRef } = options;
  const themeStore = useThemeStore();
  const baseTheme = EPUB_THEMES[themeStore.theme] || EPUB_THEMES.light;

  const currentTheme = useMemo(
    () =>
      themeStore.customBackgroundColor
        ? { ...baseTheme, backgroundColor: themeStore.customBackgroundColor }
        : baseTheme,
    [baseTheme, themeStore.customBackgroundColor]
  );

  // ─── Apply theme/font changes to foliate engine ─────────────────────────

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
      themeStore.interlinearLanguage
    );
  }, [themeStore.interlinearMode, themeStore.interlinearLanguage, isFoliate, isScroll, isPdf, engineRef]);

  useEffect(() => {
    if (isPdf) return;
    const targetLang = Capacitor.isNativePlatform() ? themeStore.interlinearLanguage : undefined;
    engineRef.current?.setWordWise?.(
      themeStore.wordWiseEnabled,
      themeStore.wordWiseLevel,
      targetLang
    );
  }, [themeStore.wordWiseEnabled, themeStore.wordWiseLevel, themeStore.interlinearLanguage, isFoliate, isScroll, isPdf, engineRef]);

  // ─── Page curl animation ─────────────────────────
  useEffect(() => {
    if (!isFoliate) return;
    const enabled = themeStore.pageTransitionType === 'curl';
    engineRef.current?.setPageCurl?.(enabled, currentTheme.backgroundColor);
  }, [themeStore.pageTransitionType, isFoliate, currentTheme.backgroundColor, engineRef]);

  // ─── AutoScroll ─────────────────────────

  useEffect(() => {
    if (themeStore.autoScroll) {
      const ionContent = ionContentRef?.current;
      if (ionContent) {
        ionContent.getScrollElement().then((scrollEl) => {
          if (scrollEl) {
            autoScrollManager.start(scrollEl, themeStore.autoScrollSpeed);
          }
        });
      }
    } else {
      autoScrollManager.stop();
    }
    return () => {
      autoScrollManager.stop();
    };
  }, [themeStore.autoScroll, ionContentRef]);

  useEffect(() => {
    if (themeStore.autoScroll) {
      autoScrollManager.updateSpeed(themeStore.autoScrollSpeed);
    }
  }, [themeStore.autoScrollSpeed, themeStore.autoScroll]);

  // ─── Computed style values ─────────────────────────

  const toolbarStyle: React.CSSProperties | undefined = isFoliate
    ? ({
        '--background': currentTheme.backgroundColor,
        '--color': currentTheme.textColor,
        '--border-color': currentTheme.id === 'light' ? '#e0e0e0' : 'rgba(255,255,255,0.12)',
      } as React.CSSProperties)
    : undefined;

  const iconColor = isFoliate ? { color: currentTheme.textColor } : undefined;

  const pageStyle: React.CSSProperties | undefined = isFoliate
    ? themeStore.customBackgroundImage
      ? {
          '--reader-bg': currentTheme.backgroundColor,
          backgroundImage: `url(${themeStore.customBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } as React.CSSProperties
      : { '--reader-bg': currentTheme.backgroundColor } as React.CSSProperties
    : themeStore.customBackgroundImage
      ? {
          backgroundImage: `url(${themeStore.customBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : undefined;

  return { currentTheme, toolbarStyle, iconColor, pageStyle };
}
