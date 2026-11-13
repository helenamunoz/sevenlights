import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandLockup, CoverArt } from '@/components/brand';
import { Button, Input, Screen } from '@/components/ui';
import { artwork } from '@/data/brand';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

/** Sign in with a one-time code sent by email. There are no passwords. */
export default function SignInScreen() {
  const { sendCode, verifyCode } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attempt(action: () => Promise<void>, failure: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.page}>
        <View style={styles.hero}>
          <BrandLockup />
          <Text style={styles.tagline}>{t('signIn.tagline')}</Text>
        </View>
        <CoverArt source={artwork.dusk} style={styles.cover} />
        <View style={styles.form}>
          {stage === 'email' ? (
            <>
              <Input
                label={t('signIn.email')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('signIn.emailPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                hint={t('signIn.emailHint')}
              />
              <Button
                label={t('signIn.sendCode')}
                busy={busy}
                disabled={!email.includes('@')}
                onPress={() =>
                  attempt(async () => {
                    await sendCode(email.trim());
                    setStage('code');
                  }, t('signIn.sendFailed'))
                }
              />
            </>
          ) : (
            <>
              <Input
                label={t('signIn.code')}
                value={code}
                onChangeText={setCode}
                placeholder="12345678"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={8}
                style={styles.code}
                hint={t('signIn.codeHint', { email: email.trim() })}
              />
              <Button
                label={t('signIn.enter')}
                busy={busy}
                disabled={code.length < 6}
                onPress={() => attempt(() => verifyCode(email.trim(), code.trim()), t('signIn.codeFailed'))}
              />
              <Button
                label={t('signIn.otherEmail')}
                kind="quiet"
                onPress={() => {
                  setStage('email');
                  setCode('');
                  setError(null);
                }}
              />
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        <Link href="/legal" style={styles.legal}>
          {t('legal.link')}
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  hero: { alignItems: 'center', marginTop: space.xl, marginBottom: space.lg },
  cover: { width: '100%', height: 205 },
  form: { marginTop: space.lg, gap: space.sm },
  tagline: {
    fontFamily: font.displayMedium,
    fontSize: 24,
    lineHeight: 28,
    color: color.text,
    textAlign: 'center',
    marginTop: space.md,
    maxWidth: 300,
  },
  code: { fontSize: 22, letterSpacing: 6, textAlign: 'center' },
  error: {
    fontFamily: font.body,
    fontSize: 13,
    color: color.danger,
    textAlign: 'center',
    marginTop: space.md,
  },
  legal: {
    fontFamily: font.body,
    fontSize: 13,
    color: color.textFaint,
    textAlign: 'center',
    marginTop: space.xl,
    textDecorationLine: 'underline',
  },
});
