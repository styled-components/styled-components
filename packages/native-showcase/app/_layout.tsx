import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setAnimationDebug, ThemeProvider } from 'styled-components/native';
import { FpsMeter } from '@/components/FpsMeter';
import { darkTheme, lightTheme } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Scroll timeline attach + position: sticky outcome logging, tagged
// `[sc/anim]`, one line per scroller. Dev builds only. Pass `true`
// instead for the full (very chatty) animation adapter trace.
if (__DEV__) setAnimationDebug('timeline');

function ThemedStack() {
  const scheme = useColorScheme() ?? 'light';
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  return (
    <ThemeProvider theme={theme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      />
      <FpsMeter />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <ThemedStack />
    </SafeAreaProvider>
  );
}
