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
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BoardsProvider } from '@/lib/store';
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

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: color.ink }} />;

  return (
    <SafeAreaProvider>
      <BoardsProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.ink },
            animation: 'fade',
          }}
        />
      </BoardsProvider>
    </SafeAreaProvider>
  );
}
