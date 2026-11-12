import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { BoardCard } from '@/components/board-card';
import { Button, Empty, Loading, Screen, Segmented, Title } from '@/components/ui';
import { useExplore, type ExploreSort } from '@/lib/api/boards';
import { t } from '@/lib/i18n';
import { color, space } from '@/theme/tokens';

/** Other people's public boards, to look through and borrow from. */
export default function ExploreScreen() {
  const [sort, setSort] = useState<ExploreSort>('popular');
  const explore = useExplore(sort);
  const boards = explore.data?.pages.flat() ?? [];

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={explore.isRefetching && !explore.isFetchingNextPage}
          onRefresh={explore.refetch}
          tintColor={color.textFaint}
        />
      }>
      <Title eyebrow={t('explore.eyebrow')}>{t('explore.title')}</Title>
      <View style={styles.sort}>
        <Segmented
          value={sort}
          onChange={setSort}
          options={[
            { value: 'popular', label: t('explore.popular') },
            { value: 'recent', label: t('explore.recent') },
          ]}
        />
      </View>

      {explore.isPending ? <Loading /> : null}
      {explore.isError && boards.length === 0 ? <Empty>{t('common.loadFailed')}</Empty> : null}
      {explore.isSuccess && boards.length === 0 ? <Empty>{t('explore.empty')}</Empty> : null}
      {boards.map((board) => (
        <BoardCard key={board.id} board={board} showOwner />
      ))}
      {explore.hasNextPage ? (
        <Button
          label={t('common.more')}
          kind="secondary"
          busy={explore.isFetchingNextPage}
          onPress={() => explore.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sort: { marginBottom: space.lg },
});
