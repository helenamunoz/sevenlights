import {
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_600SemiBold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import { Karla_400Regular, Karla_500Medium, Karla_700Bold } from '@expo-google-fonts/karla';
import { NotoSerifDevanagari_400Regular } from '@expo-google-fonts/noto-serif-devanagari';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReminderSync } from '@/components/reminder-sync';
import { Button, ToastProvider } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { persistOptions, queryClient } from '@/lib/query';
import { isConfigured } from '@/lib/supabase';
import { color, font, space } from '@/theme/tokens';

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

  if (!fontsLoaded) return <View style={styles.blank} />;

  if (!isConfigured) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>SevenLights</Text>
        <Text style={styles.noticeBody}>{t('setup.missing')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <AuthProvider>
          <ToastProvider>
            <StatusBar style="light" />
            <Routes />
          </ToastProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Three doors: signed out → sign in; signed in without a profile → onboarding;
 * otherwise the app. Screens behind a closed guard cannot be reached at all.
 */
function Routes() {
  const { ready, session, profile, profileLoading, profileFailed, retryProfile } = useAuth();

  if (!ready || profileLoading) return <View style={styles.blank} />;

  if (session && profileFailed) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeBody}>{t('setup.offline')}</Text>
        <Button label={t('common.retry')} kind="secondary" onPress={retryProfile} />
      </View>
    );
  }

  const signedIn = session !== null;
  const onboarded = signedIn && profile !== null;

  return (
    <>
      {onboarded ? <ReminderSync /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.ink },
          animation: 'fade',
        }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="board/new" />
          <Stack.Screen name="board/[id]" />
          <Stack.Screen name="user/[username]" />
          <Stack.Screen name="challenge/new" />
          <Stack.Screen name="challenge/[id]/index" />
          <Stack.Screen name="challenge/[id]/day/[n]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="admin/reports" />
        </Stack.Protected>
        <Stack.Screen name="legal" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: color.ink },
  notice: {
    flex: 1,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.lg,
  },
  noticeTitle: { fontFamily: font.display, fontSize: 40, color: color.text },
  noticeBody: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 23,
    color: color.textSoft,
    textAlign: 'center',
    maxWidth: 360,
  },
});
