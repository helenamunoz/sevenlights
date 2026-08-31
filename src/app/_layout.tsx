import {
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_600SemiBold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import { Karla_400Regular, Karla_500Medium, Karla_700Bold } from '@expo-google-fonts/karla';
import { NotoSerifDevanagari_400Regular } from '@expo-google-fonts/noto-serif-devanagari';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Splash } from '@/components/splash';
import { LocaleProvider, useLocale } from '@/i18n';
import { BoardsProvider, useBoards } from '@/lib/store';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_300Light,
    Fraunces_300Light_Italic,
    Fraunces_600SemiBold,
    Karla_400Regular,
    Karla_500Medium,
    Karla_700Bold,
    NotoSerifDevanagari_400Regular,
  });

  // The native splash hands over to ours as soon as there are fonts to draw
  // with; ours holds the frame until the boards are loaded.
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: color.ink }} />;

  return (
    <SafeAreaProvider>
      <LocaleProvider>
        <BoardsProvider>
          <StatusBar style="light" />
          <Opening />
        </BoardsProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}

/** The router, under the splash that covers it until the boards are in. */
function Opening() {
  const { ready: boardsReady } = useBoards();
  const { ready: localeReady } = useLocale();
  const [opened, setOpened] = useState(false);
  const finish = useCallback(() => setOpened(true), []);

  return (
    <View style={{ flex: 1, backgroundColor: color.ink }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.ink },
          animation: 'fade',
        }}
      />
      {!opened && <Splash ready={boardsReady && localeReady} onFinish={finish} />}
    </View>
  );
}
