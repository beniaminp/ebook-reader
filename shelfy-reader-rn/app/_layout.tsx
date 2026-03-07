import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { useThemeStore } from '../src/stores/useThemeStore';
import { initDatabase } from '../src/db/connection';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const themeName = useThemeStore((s) => s.currentTheme);

  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
      } catch (e) {
        console.error('Failed to init database:', e);
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider themeName={themeName as any}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="reader/[bookId]"
              options={{
                animation: 'slide_from_right',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="statistics"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="calibre-web"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="cloud-sync"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="reading-goals"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="search"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="year-in-review"
              options={{ animation: 'slide_from_right' }}
            />
          </Stack>
          <Toast />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
