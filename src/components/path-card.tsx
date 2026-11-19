import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { challengeColor } from '@/data/brand';
import type { Challenge } from '@/lib/db.types';
import { t } from '@/lib/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

export type Path = { id: string; name: string; steps: Challenge[] };

/** The team's challenges that sit on a path, grouped and put in order. */
export function pathsFrom(challenges: Challenge[]): Path[] {
  const paths = new Map<string, Path>();
  for (const challenge of challenges) {
    if (!challenge.path_id) continue;
    const path = paths.get(challenge.path_id) ?? { id: challenge.path_id, name: challenge.path_name ?? '', steps: [] };
    path.steps.push(challenge);
    paths.set(path.id, path);
  }
  for (const path of paths.values()) path.steps.sort((a, b) => (a.path_step ?? 0) - (b.path_step ?? 0));
  return [...paths.values()];
}

/**
 * One path: how far along the person is and the step that comes next for
 * them. Tapping it opens that step. `completed` holds the ids of the
 * challenges they have finished.
 */
export function PathCard({ path, completed }: { path: Path; completed: Set<string> }) {
  const router = useRouter();
  const done = path.steps.filter((step) => completed.has(step.id)).length;
  const next = path.steps.find((step) => !completed.has(step.id));
  const target = next ?? path.steps[path.steps.length - 1];
  const accent = challengeColor(target);

  return (
    <Pressable
      onPress={() => router.push(`/challenge/${target.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${path.name}, ${t('path.steps', { n: path.steps.length })}`}
      style={({ pressed }) => [styles.card, { borderColor: alpha(accent, 0.28) }, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Text style={styles.name}>{path.name}</Text>
        <Text style={styles.count}>
          {done > 0 ? t('path.progress', { done, total: path.steps.length }) : t('path.steps', { n: path.steps.length })}
        </Text>
      </View>
      <View style={styles.dots} accessible={false}>
        {path.steps.map((step) => (
          <View
            key={step.id}
            style={[styles.dot, { borderColor: accent }, completed.has(step.id) && { backgroundColor: accent }]}
          />
        ))}
      </View>
      <Text style={styles.next} numberOfLines={1}>
        {next ? t('path.nextUp', { title: next.title }) : t('path.complete')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
    marginBottom: space.sm,
    gap: space.sm,
  },
  pressed: { opacity: 0.8 },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  name: { flex: 1, fontFamily: font.display, fontSize: 21, lineHeight: 26, color: color.text },
  count: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  next: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: color.textSoft },
});
