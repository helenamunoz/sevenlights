import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, Input, Screen, Title, Toggle } from '@/components/ui';
import { USERNAME_TAKEN, useCreateProfile } from '@/lib/api/social';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

export const USERNAME = /^[a-z0-9_]{3,20}$/;

/** First run after signing in: pick a name, and learn that boards are public. */
export default function OnboardingScreen() {
  const { signOut } = useAuth();
  const create = useCreateProfile();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [accepted, setAccepted] = useState(false);

  const valid = name.trim().length > 0 && USERNAME.test(username) && accepted;
  const error = !create.error
    ? null
    : create.error.message === USERNAME_TAKEN
      ? t('profile.usernameTaken')
      : t('common.failed');

  return (
    <Screen>
      <Title eyebrow={t('onboarding.eyebrow')}>{t('onboarding.title')}</Title>

      <Input
        label={t('profile.displayName')}
        value={name}
        onChangeText={setName}
        placeholder={t('profile.displayNamePlaceholder')}
        maxLength={40}
        autoComplete="name"
      />
      <Input
        label={t('profile.username')}
        value={username}
        onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
        placeholder={t('profile.usernamePlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        hint={t('profile.usernameHint')}
      />

      <Card style={styles.notice}>
        <Text style={styles.noticeTitle}>{t('onboarding.publicTitle')}</Text>
        <Text style={styles.noticeBody}>{t('onboarding.publicBody')}</Text>
      </Card>

      <Toggle label={t('onboarding.accept')} value={accepted} onChange={setAccepted} />
      <Link href="/legal" style={styles.legal}>
        {t('legal.link')}
      </Link>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={t('onboarding.start')}
        busy={create.isPending}
        disabled={!valid}
        onPress={() => create.mutate({ username, display_name: name.trim() })}
      />
      <Button label={t('settings.signOut')} kind="quiet" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { marginBottom: space.md, gap: space.sm },
  noticeTitle: { fontFamily: font.display, fontSize: 20, lineHeight: 26, color: color.text },
  noticeBody: { fontFamily: font.body, fontSize: 14, lineHeight: 22, color: color.textSoft },
  legal: {
    fontFamily: font.body,
    fontSize: 13,
    color: color.textFaint,
    textDecorationLine: 'underline',
    marginBottom: space.lg,
  },
  error: { fontFamily: font.body, fontSize: 13, color: color.danger, marginBottom: space.md },
});
