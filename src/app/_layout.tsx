import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { InstrumentSans_400Regular } from '@expo-google-fonts/instrument-sans/400Regular';
import { InstrumentSans_400Regular_Italic } from '@expo-google-fonts/instrument-sans/400Regular_Italic';
import { InstrumentSans_500Medium } from '@expo-google-fonts/instrument-sans/500Medium';
import { InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans/700Bold';
import { NotoSerifDevanagari_400Regular } from '@expo-google-fonts/noto-serif-devanagari/400Regular';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/brand';
import { EmberLoader } from '@/components/ember';
import { ReminderSync } from '@/components/reminder-sync';
import { Button, ToastProvider } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { rememberInvite, takeInvite } from '@/lib/invite';
import { persistOptions, queryClient } from '@/lib/query';
import { isConfigured } from '@/lib/aws';
import { color, font, space } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
// Before any guard redirects: the address may be an invitation to a challenge.
rememberInvite();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    InstrumentSans_400Regular,
    InstrumentSans_400Regular_Italic,
    InstrumentSans_500Medium,
    InstrumentSans_700Bold,
    NotoSerifDevanagari_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={styles.blank} />;

  if (!isConfigured) {
    return (
      <View style={styles.notice}>
        <BrandLockup />
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
  const router = useRouter();
  const pathname = usePathname();
  const inside = ready && !profileLoading && session !== null && profile !== null;

  // Once the person is in, take them to the challenge they were invited to.
  useEffect(() => {
    if (!inside) return;
    const invited = takeInvite();
    if (invited && invited !== pathname) router.replace(invited as `/challenge/${string}`);
    // Only when the door opens; later navigation is the person's own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inside]);

  if (!ready || profileLoading) {
    return (
      <View style={styles.waiting}>
        <EmberLoader size={56} />
      </View>
    );
  }

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
  waiting: { flex: 1, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  notice: {
    flex: 1,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.lg,
  },
  noticeBody: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 23,
    color: color.textSoft,
    textAlign: 'center',
    maxWidth: 360,
  },
});
