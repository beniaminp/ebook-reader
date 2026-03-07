import React, { createContext, useContext, useMemo } from 'react';
import { themes, ThemeColors, ThemeName } from './themes';

interface ThemeContextValue {
  theme: ThemeColors;
  themeName: ThemeName;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.light,
  themeName: 'light',
  isDark: false,
});

export function ThemeProvider({
  themeName,
  children,
}: {
  themeName: ThemeName;
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    const theme = themes[themeName] || themes.light;
    const isDark = themeName === 'dark' || themeName === 'night';
    return { theme, themeName, isDark };
  }, [themeName]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
