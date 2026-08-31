import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Card, Label, PrimaryButton, QuietButton, Segmented } from '@/components/ui';
import { LOCALE_NAMES, LOCALES, useLocale, type Locale } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { useBoards } from '@/lib/store';
import { isSyncConfigured } from '@/lib/supabase';
import { color, space, type } from '@/theme/tokens';

/**
 * Everything about the app rather than about a board: the language it speaks,
 * and whether the boards go anywhere beyond this phone.
 */
export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, sync, syncNow, signIn, signOut } = useBoards();
  const { locale, setLocale, t, fill, tag } = useLocale();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attempt(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(messageFor(e, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.md,
          paddingBottom: insets.bottom + space.xl,
          paddingHorizontal: space.lg,
        }}
        keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
          <Text style={styles.back}>{t.board.back}</Text>
        </Pressable>

        <Text style={styles.title}>{t.settings.title}</Text>

        <Card style={styles.section}>
          <Label>{t.settings.language}</Label>
          <Segmented<Locale>
            options={LOCALES.map((option) => ({ value: option, label: LOCALE_NAMES[option] }))}
            value={locale}
            onChange={setLocale}
          />
          <Body tone="faint">{t.settings.languageHint}</Body>
        </Card>

        <Text style={styles.sectionTitle}>{t.settings.sync}</Text>

        {!isSyncConfigured ? (
          <Card>
            <Label>{t.settings.notConfiguredTitle}</Label>
            <Body>{t.settings.notConfiguredBody}</Body>
            <Body tone="faint">{t.settings.notConfiguredMore}</Body>
          </Card>
        ) : session ? (
          <Card>
            <Label>{t.settings.session}</Label>
            <Body>{session.user.email}</Body>

            <View style={styles.spaced}>
              <Label>{t.settings.state}</Label>
            </View>
            <Body>
              {sync.status === 'syncing'
                ? t.sync.syncing
                : sync.status === 'error'
                  ? sync.message || t.errors['sync-failed']
                  : sync.status === 'idle' && sync.lastSyncedAt
                    ? fill(t.settings.lastSynced, {
                        when: new Date(sync.lastSyncedAt).toLocaleString(tag),
                      })
                    : t.settings.neverSynced}
            </Body>

            <PrimaryButton
              label={t.settings.syncNow}
              onPress={() => attempt(syncNow)}
              disabled={sync.status === 'syncing'}
            />
            <QuietButton label={t.settings.signOut} onPress={() => attempt(signOut)} />
          </Card>
        ) : (
          <Card>
            <Label>{t.settings.session}</Label>
            <Body tone="faint">{t.settings.signInHint}</Body>
            <PrimaryButton label={t.settings.signIn} busy={busy} onPress={() => attempt(signIn)} />
          </Card>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ink },
  backRow: { paddingVertical: space.sm, alignSelf: 'flex-start' },
  back: { ...type.bodySmall, fontSize: 14, color: color.textSoft },
  title: { ...type.title, color: color.text, marginTop: space.md, marginBottom: space.lg },
  section: { marginBottom: space.xl },
  sectionTitle: { ...type.label, color: color.textFaint, marginBottom: space.md },
  spaced: { marginTop: space.md },
  error: { ...type.bodySmall, color: color.danger, marginTop: space.md, textAlign: 'center' },
});
