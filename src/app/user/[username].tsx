import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { BoardCard } from '@/components/board-card';
import { ChakraColumn } from '@/components/chakra-column';
import { ReportMenu } from '@/components/report-menu';
import { BackBar, Empty, Label, Loading, Screen } from '@/components/ui';
import { useBoardsOf } from '@/lib/api/boards';
import { useProfileByUsername } from '@/lib/api/social';
import { t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

/** Someone's public page: who they are and the boards they share. */
export default function UserScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const profile = useProfileByUsername(username);
  const boards = useBoardsOf(profile.data?.id);

  if (profile.isPending) {
    return (
      <Screen header={<BackBar />}>
        <Loading />
      </Screen>
    );
  }
  if (!profile.data) {
    return (
      <Screen header={<BackBar />}>
        <Empty>{t('profile.missing')}</Empty>
      </Screen>
    );
  }

  const person = profile.data;
  const all = boards.data ?? [];
  // Empty chakra boards say nothing about a person; leave them off their page.
  const centers = all.filter(
    (b) => b.chakra !== null && (b.image_count > 0 || b.intention !== '' || b.affirmation !== '')
  );
  const free = all.filter((b) => b.chakra === null);

  return (
    <Screen
      padded={false}
      header={<BackBar right={<ReportMenu type="profile" id={person.id} authorId={person.id} />} />}>
      <View style={styles.head}>
        <Avatar person={person} size={84} />
        <Text style={styles.name}>{person.display_name}</Text>
        <Text style={styles.username}>@{person.username}</Text>
        {person.bio ? <Text style={styles.bio}>{person.bio}</Text> : null}
      </View>

      {boards.isPending ? <Loading /> : null}
      {boards.isSuccess && centers.length + free.length === 0 ? (
        <View style={styles.padded}>
          <Empty>{t('profile.noBoards')}</Empty>
        </View>
      ) : null}

      <ChakraColumn boards={centers} showPrompts={false} />

      {free.length ? (
        <View style={styles.padded}>
          <Label>{t('boards.free')}</Label>
          {free.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', marginTop: space.md, marginBottom: space.lg, paddingHorizontal: space.lg },
  name: { fontFamily: font.display, fontSize: 32, lineHeight: 38, color: color.text, marginTop: space.md },
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
  padded: { paddingHorizontal: space.lg, marginTop: space.lg },
});
