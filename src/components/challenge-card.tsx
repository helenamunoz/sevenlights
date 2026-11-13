import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CoverArt } from '@/components/brand';
import { challengeColor, challengeCover } from '@/data/brand';
import type { Progress } from '@/lib/days';
import type { Challenge } from '@/lib/db.types';
import { t } from '@/lib/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/** "21 days · 5 min" — the facts of a challenge on one line. */
export function challengeFacts(challenge: Challenge): string {
  const parts = [t('challenge.days', { n: challenge.duration_days })];
  if (challenge.timer_seconds) {
    parts.push(t('challenge.minutes', { n: Math.round(challenge.timer_seconds / 60) || 1 }));
  }
  if (challenge.member_count > 0) parts.push(t('challenge.members', { n: challenge.member_count }));
  return parts.join(' · ');
}

/** A challenge in a list. With `progress` it also shows how far the person is. */
export function ChallengeCard({ challenge, progress }: { challenge: Challenge; progress?: Progress | null }) {
  const router = useRouter();
  const accent = challengeColor(challenge);
  const cover = challengeCover(challenge);
  const score = challenge.up_count - challenge.down_count;

  return (
    <Pressable
      onPress={() => router.push(`/challenge/${challenge.id}`)}
      accessibilityRole="button"
      accessibilityLabel={challenge.title}
      style={({ pressed }) => [styles.card, { borderColor: alpha(accent, 0.28) }, pressed && styles.pressed]}>
      {!progress ? <CoverArt source={cover} style={styles.cover} /> : null}
      <View style={styles.top}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text style={styles.facts}>{challengeFacts(challenge)}</Text>
        {challenge.is_official ? <Text style={styles.badge}>{t('challenge.suggested')}</Text> : null}
        {!challenge.is_official && score !== 0 ? (
          <Text style={styles.score}>
            {score > 0 ? '▲' : '▼'} {Math.abs(score)}
          </Text>
        ) : null}
      </View>
      <Text style={styles.title}>{challenge.title}</Text>

      {progress ? (
        <View style={styles.progress}>
          <View style={styles.bar}>
            <View
              style={[
                styles.barFill,
                { backgroundColor: accent, width: `${(progress.done / challenge.duration_days) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.status === 'completed'
              ? t('challenge.completed')
              : progress.status === 'broken'
                ? t('challenge.broken')
                : progress.status === 'ended'
                  ? t('challenge.ended', { done: progress.done, total: challenge.duration_days })
                  : progress.doneToday
                    ? t('challenge.doneToday')
                    : t('challenge.dayOf', { day: progress.currentDay, total: challenge.duration_days })}
          </Text>
        </View>
      ) : challenge.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {challenge.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
    marginBottom: space.md,
    gap: space.sm,
  },
  pressed: { opacity: 0.8 },
  cover: { width: '100%', height: 108 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 9, height: 9, borderRadius: 5 },
  facts: {
    flex: 1,
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  badge: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1, color: color.textSoft, textTransform: 'uppercase' },
  score: { fontFamily: font.bodyMedium, fontSize: 12, color: color.textSoft },
  title: { fontFamily: font.display, fontSize: 23, lineHeight: 29, color: color.text },
  description: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: color.textSoft },
  progress: { gap: 6 },
  bar: { height: 4, borderRadius: 2, backgroundColor: color.line, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  progressText: { fontFamily: font.bodyMedium, fontSize: 13, color: color.textSoft },
});
