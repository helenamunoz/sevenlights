import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ChallengeCard } from '@/components/challenge-card';
import { PathCard, pathsFrom } from '@/components/path-card';
import { CategoryPicker } from '@/components/pickers';
import { Button, Empty, Label, Loading, Screen, Segmented, Title } from '@/components/ui';
import { categoryOf, type CategoryId } from '@/data/categories';
import { LEVELS, levelOf } from '@/data/levels';
import {
  useChallenges,
  useMemberships,
  useMyCheckins,
  useSuggestedChallenges,
  type ChallengeSort,
} from '@/lib/api/challenges';
import { progress } from '@/lib/days';
import { LANGUAGES, locale, t, tr, type Locale } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

/**
 * Home. The challenges you are doing, then what to join next: the 7Lights
 * team's as a ladder from beginning to committed, and the community's, of
 * every kind of practice or just one.
 */
export default function ChallengesScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [sort, setSort] = useState<ChallengeSort>('top');
  const [language, setLanguage] = useState<Locale | 'all'>(locale);

  const memberships = useMemberships();
  const checkins = useMyCheckins();
  const team = useSuggestedChallenges();
  const community = useChallenges(sort, language, category);

  const joined = new Set((memberships.data ?? []).map((m) => m.challenge_id));
  const fromTeam = (team.data ?? []).filter(
    (c) => !joined.has(c.id) && (category === null || categoryOf(c).id === category)
  );
  const others = (community.data ?? []).filter((c) => !joined.has(c.id));

  const paths = pathsFrom(team.data ?? []);
  const completed = new Set(
    (memberships.data ?? [])
      .filter(
        (m) =>
          progress(
            m.challenge.missed_rule,
            m.challenge.duration_days,
            m.start_date,
            (checkins.data ?? []).filter((c) => c.challenge_id === m.challenge_id)
          )?.status === 'completed'
      )
      .map((m) => m.challenge_id)
  );

  function refresh() {
    memberships.refetch();
    checkins.refetch();
    team.refetch();
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
      ) : memberships.isSuccess ? (
        <Text style={styles.start}>{t('challenges.start')}</Text>
      ) : null}

      <CategoryPicker value={category} onChange={setCategory} allLabel={t('challenges.all')} />

      {category === null && paths.length ? (
        <View style={styles.section}>
          <Label>{t('paths.title')}</Label>
          <Text style={styles.levelAbout}>{t('paths.about')}</Text>
          {paths.map((path) => (
            <PathCard key={path.id} path={path} completed={completed} />
          ))}
        </View>
      ) : null}

      {fromTeam.length ? (
        <View style={styles.section}>
          <Label>{t('challenges.suggested')}</Label>
          {LEVELS.map((level) => {
            const rung = fromTeam.filter((challenge) => levelOf(challenge).id === level.id);
            if (rung.length === 0) return null;
            return (
              <View key={level.id}>
                <Text style={styles.level}>{tr(level.name)}</Text>
                <Text style={styles.levelAbout}>{tr(level.about)}</Text>
                {rung.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </View>
            );
          })}
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
          {LANGUAGES.length > 1 ? (
            <Segmented
              value={language}
              onChange={setLanguage}
              options={[
                { value: locale, label: t('challenges.myLanguage') },
                { value: 'all', label: t('challenges.allLanguages') },
              ]}
            />
          ) : null}
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
  level: { fontFamily: font.display, fontSize: 24, lineHeight: 30, color: color.text, marginTop: space.sm },
  levelAbout: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 21,
    color: color.textSoft,
    marginTop: space.xs,
    marginBottom: space.md,
  },
  start: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 23,
    color: color.textSoft,
    marginBottom: space.lg,
  },
});
