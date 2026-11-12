import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Aura } from '@/components/aura';
import { Button, Card, Input, Screen } from '@/components/ui';
import { CHAKRAS } from '@/data/chakras';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

/** Sign in with a six-digit code sent by email. There are no passwords. */
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
      <View style={styles.glow} pointerEvents="none">
        <Aura color={CHAKRAS[6].color} size={380} intensity={0.9} />
      </View>

      <View style={styles.hero}>
        <View style={styles.lights}>
          {CHAKRAS.map((chakra) => (
            <View key={chakra.id} style={[styles.light, { backgroundColor: chakra.color }]} />
          ))}
        </View>
        <Text style={styles.name}>SevenLights</Text>
        <Text style={styles.tagline}>{t('signIn.tagline')}</Text>
      </View>

      <Card>
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
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
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
      </Card>

      <Link href="/legal" style={styles.legal}>
        {t('legal.link')}
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: -160, alignSelf: 'center' },
  hero: { alignItems: 'center', marginTop: space.xxl, marginBottom: space.xl },
  lights: { flexDirection: 'row', gap: 7, marginBottom: space.lg },
  light: { width: 9, height: 9, borderRadius: 5 },
  name: { fontFamily: font.display, fontSize: 50, lineHeight: 56, color: color.text, letterSpacing: -1 },
  tagline: {
    fontFamily: font.displayItalic,
    fontSize: 18,
    lineHeight: 26,
    color: color.textSoft,
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
