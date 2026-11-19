import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ChallengeCard } from '@/components/challenge-card';
import { TodayCard } from '@/components/today-card';
import { Button, Label, Loading, Screen, Title } from '@/components/ui';
import { DAY_LIGHTS } from '@/data/daily';
import { levelOf } from '@/data/levels';
import { useMemberships, useMyCheckins, useSuggestedChallenges, type Joined } from '@/lib/api/challenges';
import { progress } from '@/lib/days';
import type { Challenge, Checkin } from '@/lib/db.types';
import { t, type TextKey } from '@/lib/i18n';
import { alpha, color, font, space } from '@/theme/tokens';

/** How the day is greeted, by the hour on the person's own clock. */
function greeting(hour = new Date().getHours()): TextKey {
  if (hour < 5) return 'today.night';
  if (hour < 8) return 'today.firstLight';
  if (hour < 12) return 'today.morning';
  if (hour < 17) return 'today.afternoon';
  if (hour < 20) return 'today.goldenHour';
  if (hour < 23) return 'today.evening';
  return 'today.night';
}

const standing = (membership: Joined, checkins: Checkin[]) =>
  progress(
    membership.challenge.missed_rule,
    membership.challenge.duration_days,
    membership.start_date,
    checkins.filter((c) => c.challenge_id === membership.challenge_id)
  );

/**
 * One practice to offer: the next step of a path the person has finished a
 * step of, or else one of the team's beginning practices, a different one
 * each day.
 */
function suggestion(team: Challenge[], joined: Set<string>, completed: Set<string>): Challenge | null {
  const open = team.filter((challenge) => !joined.has(challenge.id));
  const onward = team.find((challenge) => completed.has(challenge.id) && challenge.next_id && !joined.has(challenge.next_id));
  const next = onward && open.find((challenge) => challenge.id === onward.next_id);
  if (next) return next;
  const gentle = open.filter((challenge) => levelOf(challenge).id === 'beginning');
  const pool = gentle.length ? gentle : open;
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  return pool.length ? pool[dayNumber % pool.length] : null;
}

/**
 * Home, kept quiet: today's light, what you are in the middle of, and one
 * thing you might begin. Everything else is a tap away on Practices.
 */
export default function TodayScreen() {
  const router = useRouter();
  const memberships = useMemberships();
  const checkins = useMyCheckins();
  const team = useSuggestedChallenges();

  const mine = memberships.data ?? [];
  const ticks = checkins.data ?? [];
  const joined = new Set(mine.map((m) => m.challenge_id));
  const completed = new Set(mine.filter((m) => standing(m, ticks)?.status === 'completed').map((m) => m.challenge_id));
  const offered = team.data ? suggestion(team.data, joined, completed) : null;

  const today = DAY_LIGHTS[new Date().getDay()];
  const sky = today.glow ?? today.color;

  function refresh() {
    memberships.refetch();
    checkins.refetch();
    team.refetch();
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={memberships.isRefetching} onRefresh={refresh} tintColor={color.textFaint} />
      }>
      <LinearGradient
        pointerEvents="none"
        colors={[alpha(sky, 0), alpha(sky, 0.2), alpha(sky, 0.07), alpha(sky, 0)]}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.sky}
      />
      <Title eyebrow={t(greeting())}>{t('today.title')}</Title>
      <TodayCard />

      {memberships.isPending ? <Loading /> : null}

      {mine.length ? (
        <View style={styles.section}>
          <Label>{t('challenges.mine')}</Label>
          {mine.map((membership) => (
            <ChallengeCard
              key={membership.challenge_id}
              challenge={membership.challenge}
              progress={standing(membership, ticks)}
            />
          ))}
        </View>
      ) : memberships.isSuccess ? (
        <Text style={styles.start}>{t('challenges.start')}</Text>
      ) : null}

      {offered ? (
        <View style={styles.section}>
          <Label>{t('today.suggested')}</Label>
          <ChallengeCard challenge={offered} />
        </View>
      ) : null}

      <Button label={t('today.all')} kind="secondary" onPress={() => router.push('/practices')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space.lg },
  // Behind the header, edge to edge. It fades in as well as out, so it has no top edge.
  sky: { position: 'absolute', top: 0, left: -space.lg, right: -space.lg, height: 460 },
  start: {
    fontFamily: font.displayItalic,
    fontSize: 20,
    lineHeight: 27,
    color: color.textSoft,
    marginBottom: space.lg,
  },
});
