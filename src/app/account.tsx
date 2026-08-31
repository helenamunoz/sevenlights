import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Card, Label, PrimaryButton, QuietButton, Segmented } from '@/components/ui';
import { LOCALE_NAMES, LOCALES, useLocale, type Locale } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { useBoards } from '@/lib/store';
import { isSyncConfigured } from '@/lib/supabase';
import { color, radius, space, type } from '@/theme/tokens';

/**
 * Everything about the app rather than about a board: the language it speaks,
 * and whether the boards go anywhere beyond this phone.
 */
export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, sync, syncNow, signIn, verify, signOut } = useBoards();
  const { locale, setLocale, t, fill, tag } = useLocale();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            {stage === 'email' ? (
              <>
                <Label>{t.settings.email}</Label>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t.settings.emailPlaceholder}
                  placeholderTextColor={color.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  accessibilityLabel={t.settings.email}
                  style={styles.input}
                />
                <Body tone="faint">{t.settings.codeSent}</Body>
                <PrimaryButton
                  label={t.settings.sendCode}
                  busy={busy}
                  disabled={!email.includes('@')}
                  onPress={() =>
                    attempt(async () => {
                      await signIn(email.trim());
                      setStage('code');
                    })
                  }
                />
              </>
            ) : (
              <>
                <Label>{t.settings.code}</Label>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  placeholderTextColor={color.textFaint}
                  keyboardType="number-pad"
                  maxLength={6}
                  accessibilityLabel={t.settings.code}
                  style={[styles.input, styles.code]}
                />
                <PrimaryButton
                  label={t.settings.enter}
                  busy={busy}
                  disabled={code.length < 6}
                  onPress={() => attempt(() => verify(email.trim(), code.trim()))}
                />
                <QuietButton label={t.settings.otherEmail} onPress={() => setStage('email')} />
              </>
            )}
          </Card>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
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
  input: {
    backgroundColor: color.ink2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    ...type.body,
    fontSize: 16,
    color: color.text,
  },
  code: { fontSize: 22, letterSpacing: 6, textAlign: 'center' },
  error: { ...type.bodySmall, color: color.danger, marginTop: space.md, textAlign: 'center' },
});
