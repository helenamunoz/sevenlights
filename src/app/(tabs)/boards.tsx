import { useRouter } from 'expo-router';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { BoardCard } from '@/components/board-card';
import { ChakraColumn } from '@/components/chakra-column';
import { Button, Empty, Label, Loading, Screen } from '@/components/ui';
import { useMyBoards } from '@/lib/api/boards';
import { t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

/** Your own boards: the seven centers on their thread, then your free boards. */
export default function MyBoardsScreen() {
  const router = useRouter();
  const boards = useMyBoards();
  const free = (boards.data ?? []).filter((board) => board.chakra === null);

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

      {boards.isPending ? <Loading /> : <ChakraColumn boards={boards.data ?? []} showPrompts />}
      {boards.isError && !boards.data ? <Empty>{t('common.loadFailed')}</Empty> : null}

      <View style={styles.free}>
        <Label>{t('boards.free')}</Label>
        {free.length === 0 && !boards.isPending ? <Empty>{t('boards.freeEmpty')}</Empty> : null}
        {free.map((board) => (
          <BoardCard key={board.id} board={board} />
        ))}
        <Button label={t('boards.new')} kind="secondary" onPress={() => router.push('/board/new')} />
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
  free: { paddingHorizontal: space.lg, marginTop: space.xl },
});
