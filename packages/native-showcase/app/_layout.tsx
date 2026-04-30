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
import { ThemeProvider } from 'styled-components/native';
import { darkTheme, lightTheme } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
