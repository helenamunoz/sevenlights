import { useRouter } from 'expo-router';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { BoardCard } from '@/components/board-card';
import { ChakraColumn } from '@/components/chakra-column';
import { Button, Empty, Label, Loading, Screen } from '@/components/ui';
import { useMyBoards } from '@/lib/api/boards';
import { t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

/** Your own vision boards. The chakra set, if you made it, keeps its root-to-crown thread. */
export default function MyBoardsScreen() {
  const router = useRouter();
  const boards = useMyBoards();
  const all = boards.data ?? [];
  const centers = all.filter((board) => board.chakra !== null);
  const others = all.filter((board) => board.chakra === null);

  return (
    <Screen
      padded={false}
      refreshControl={
        <RefreshControl refreshing={boards.isRefetching} onRefresh={boards.refetch} tintColor={color.textFaint} />
      }>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t('boards.eyebrow')}</Text>
        <Text style={styles.title}>{t('boards.title')}</Text>
        <Text style={styles.subtitle}>{t('boards.subtitle')}</Text>
      </View>

      {boards.isPending ? <Loading /> : null}
      {boards.isError && !boards.data ? <Empty>{t('common.loadFailed')}</Empty> : null}

      {others.length ? (
        <View style={styles.group}>
          {others.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </View>
      ) : null}

      {centers.length ? (
        <>
          <View style={styles.label}>
            <Label>{t('boards.chakras')}</Label>
          </View>
          <ChakraColumn boards={centers} showPrompts />
        </>
      ) : null}

      <View style={styles.group}>
        {boards.isSuccess && all.length === 0 ? <Empty>{t('boards.empty')}</Empty> : null}
        <Button
          label={t('boards.new')}
          kind={all.length === 0 ? 'primary' : 'secondary'}
          onPress={() => router.push('/board/new')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, marginTop: space.lg, marginBottom: space.lg },
  eyebrow: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  title: {
    fontFamily: font.display,
    fontSize: 52,
    lineHeight: 56,
    color: color.text,
    marginTop: space.sm,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 23,
    color: color.textSoft,
    marginTop: space.md,
    maxWidth: 320,
  },
  group: { paddingHorizontal: space.lg, marginBottom: space.md },
  label: { paddingHorizontal: space.lg },
});
