import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ActionSheet } from '@/components/sheet';
import { BackBar, Button, Input, Label, Screen, Title, useToast } from '@/components/ui';
import { USERNAME_TAKEN, useBlocked, useDeleteAccount, useSetBlocked, useUpdateProfile } from '@/lib/api/social';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { pickPhotos } from '@/lib/photos';
import { color, font, space } from '@/theme/tokens';

import { USERNAME } from './onboarding';

/** Your profile, the people you have blocked, and the way out. */
export default function SettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { profile, session, signOut } = useAuth();
  const update = useUpdateProfile();
  const blocked = useBlocked();
  const setBlocked = useSetBlocked();
  const deleteAccount = useDeleteAccount();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [deleting, setDeleting] = useState(false);
  if (!profile) return null;

  const changed = name.trim() !== profile.display_name || username !== profile.username || bio.trim() !== profile.bio;
  const valid = name.trim().length > 0 && USERNAME.test(username);

  const saved = {
    onSuccess: () => toast(t('common.saved')),
    onError: (error: Error) =>
      toast(error.message === USERNAME_TAKEN ? t('profile.usernameTaken') : t('common.saveFailed')),
  };

  async function changeAvatar() {
    try {
      const [avatar] = await pickPhotos(1);
      if (avatar) update.mutate({ avatar }, saved);
    } catch {
      toast(t('photos.noPermission'));
    }
  }

  return (
    <Screen header={<BackBar />}>
      <Title>{t('settings.title')}</Title>

      <Pressable onPress={changeAvatar} style={styles.avatar} accessibilityRole="button">
        <Avatar person={profile} size={72} />
        <Text style={styles.link}>{t('settings.changePhoto')}</Text>
      </Pressable>

      <Input label={t('profile.displayName')} value={name} onChangeText={setName} maxLength={40} />
      <Input
        label={t('profile.username')}
        value={username}
        onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        hint={t('profile.usernameHint')}
      />
      <Input
        label={t('profile.bio')}
        value={bio}
        onChangeText={setBio}
        placeholder={t('profile.bioPlaceholder')}
        multiline
        maxLength={200}
      />
      {changed ? (
        <Button
          label={t('common.save')}
          busy={update.isPending}
          disabled={!valid}
          onPress={() => update.mutate({ display_name: name.trim(), username, bio: bio.trim() }, saved)}
        />
      ) : null}

      <View style={styles.section}>
        <Label>{t('settings.blocked')}</Label>
        {blocked.data?.length === 0 ? <Text style={styles.faint}>{t('settings.blockedEmpty')}</Text> : null}
        {(blocked.data ?? []).map((person) => (
          <View key={person.id} style={styles.row}>
            <Text style={styles.rowText} numberOfLines={1}>
              {person.display_name} · @{person.username}
            </Text>
            <Button
              label={t('settings.unblock')}
              kind="quiet"
              onPress={() => setBlocked.mutate({ userId: person.id, blocked: false })}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Label>{t('settings.account')}</Label>
        <Text style={styles.faint}>{session?.user.email}</Text>
        <View style={styles.buttons}>
          <Button label={t('legal.link')} kind="secondary" onPress={() => router.push('/legal')} />
          <Button label={t('settings.signOut')} kind="secondary" onPress={signOut} />
          <Button
            label={t('settings.delete')}
            kind="danger"
            busy={deleteAccount.isPending}
            onPress={() => setDeleting(true)}
          />
        </View>
      </View>

      <ActionSheet
        visible={deleting}
        onClose={() => setDeleting(false)}
        title={t('settings.deleteTitle')}
        message={t('settings.deleteMessage')}
        actions={[
          {
            label: t('settings.deleteConfirm'),
            destructive: true,
            onPress: () => deleteAccount.mutate(undefined, { onError: () => toast(t('common.failed')) }),
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  link: { fontFamily: font.bodyMedium, fontSize: 14, color: color.textSoft, textDecorationLine: 'underline' },
  section: { marginTop: space.xl },
  faint: { fontFamily: font.body, fontSize: 14, color: color.textFaint },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  rowText: { flex: 1, fontFamily: font.body, fontSize: 15, color: color.text },
  buttons: { gap: space.sm, marginTop: space.md },
});
