import { useRouter } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

const INSTAGRAM = process.env.EXPO_PUBLIC_INSTAGRAM_URL;

/** You, as others see you, and the way into settings. */
export default function ProfileScreen() {
  const router = useRouter();
  const { profile, isAdmin } = useAuth();
  if (!profile) return null;

  return (
    <Screen>
      <View style={styles.head}>
        <Avatar person={profile} size={92} />
        <Text style={styles.name}>{profile.display_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Button
          label={t('profile.viewPublic')}
          kind="secondary"
          onPress={() => router.push(`/user/${profile.username}`)}
        />
        <Button label={t('settings.title')} kind="secondary" onPress={() => router.push('/settings')} />
        {isAdmin ? (
          <Button label={t('admin.title')} kind="secondary" onPress={() => router.push('/admin/reports')} />
        ) : null}
        {INSTAGRAM ? (
          <Button label={t('profile.instagram')} kind="quiet" onPress={() => Linking.openURL(INSTAGRAM)} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', marginTop: space.xl, marginBottom: space.xl },
  name: { fontFamily: font.display, fontSize: 34, lineHeight: 40, color: color.text, marginTop: space.md },
  username: { fontFamily: font.bodyMedium, fontSize: 14, color: color.textFaint, marginTop: 2 },
  bio: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 23,
    color: color.textSoft,
    textAlign: 'center',
    marginTop: space.md,
    maxWidth: 320,
  },
  actions: { gap: space.sm },
});
