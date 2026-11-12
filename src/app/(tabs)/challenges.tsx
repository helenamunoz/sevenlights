import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { ChallengeCard } from '@/components/challenge-card';
import { Button, Empty, Label, Loading, Screen, Segmented, Title } from '@/components/ui';
import {
  useChallenges,
  useMemberships,
  useMyCheckins,
  useSuggestedChallenges,
  type ChallengeSort,
} from '@/lib/api/challenges';
import { progress } from '@/lib/days';
import { locale, t, type Locale } from '@/lib/i18n';
import { color, space } from '@/theme/tokens';

/** Challenges: the ones you are doing, the app's suggestions, the community's. */
export default function ChallengesScreen() {
  const router = useRouter();
  const [sort, setSort] = useState<ChallengeSort>('top');
  const [language, setLanguage] = useState<Locale | 'all'>(locale);

  const memberships = useMemberships();
  const checkins = useMyCheckins();
  const suggested = useSuggestedChallenges();
  const community = useChallenges(sort, language);

  const joined = new Set((memberships.data ?? []).map((m) => m.challenge_id));
  const suggestions = (suggested.data ?? []).filter((c) => !joined.has(c.id));
  const others = (community.data ?? []).filter((c) => !joined.has(c.id));

  function refresh() {
    memberships.refetch();
    checkins.refetch();
    suggested.refetch();
    community.refetch();
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={community.isRefetching} onRefresh={refresh} tintColor={color.textFaint} />
      }>
      <Title eyebrow={t('challenges.eyebrow')}>{t('challenges.title')}</Title>

      {memberships.data?.length ? (
        <View style={styles.section}>
          <Label>{t('challenges.mine')}</Label>
          {memberships.data.map((membership) => (
            <ChallengeCard
              key={membership.challenge_id}
              challenge={membership.challenge}
              progress={progress(
                membership.challenge.missed_rule,
                membership.challenge.duration_days,
                membership.start_date,
                (checkins.data ?? []).filter((c) => c.challenge_id === membership.challenge_id)
              )}
            />
          ))}
        </View>
      ) : null}

      {suggestions.length ? (
        <View style={styles.section}>
          <Label>{t('challenges.suggested')}</Label>
          {suggestions.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Label>{t('challenges.community')}</Label>
        <View style={styles.filters}>
          <Segmented
            value={sort}
            onChange={setSort}
            options={[
              { value: 'top', label: t('challenges.top') },
              { value: 'new', label: t('challenges.new') },
            ]}
          />
          <Segmented
            value={language}
            onChange={setLanguage}
            options={[
              { value: locale, label: t('challenges.myLanguage') },
              { value: 'all', label: t('challenges.allLanguages') },
            ]}
          />
        </View>
        {community.isPending ? <Loading /> : null}
        {community.isError && !community.data ? <Empty>{t('common.loadFailed')}</Empty> : null}
        {community.isSuccess && others.length === 0 ? <Empty>{t('challenges.empty')}</Empty> : null}
        {others.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </View>

      <Button label={t('challenges.create')} onPress={() => router.push('/challenge/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space.lg },
  filters: { gap: space.sm, marginBottom: space.md },
});
