import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMyVotes, useVote } from '@/lib/api/challenges';
import type { Challenge } from '@/lib/db.types';
import { t } from '@/lib/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/** Up and down votes on a challenge. Tapping your own vote again takes it back. */
export function VoteBar({ challenge, accent }: { challenge: Challenge; accent: string }) {
  const votes = useMyVotes();
  const vote = useVote();
  const mine = votes.data?.[challenge.id] ?? 0;

  function cast(value: number) {
    Haptics.selectionAsync().catch(() => {});
    vote.mutate({ challengeId: challenge.id, value: mine === value ? 0 : value });
  }

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => cast(1)}
        accessibilityRole="button"
        accessibilityState={{ selected: mine === 1 }}
        accessibilityLabel={t('challenge.voteUp')}
        style={[styles.vote, mine === 1 && { borderColor: accent, backgroundColor: alpha(accent, 0.16) }]}>
        <Text style={[styles.text, mine === 1 && { color: color.text }]}>▲ {challenge.up_count}</Text>
      </Pressable>
      <Pressable
        onPress={() => cast(-1)}
        accessibilityRole="button"
        accessibilityState={{ selected: mine === -1 }}
        accessibilityLabel={t('challenge.voteDown')}
        style={[styles.vote, mine === -1 && { borderColor: color.textSoft, backgroundColor: alpha(color.white, 0.06) }]}>
        <Text style={[styles.text, mine === -1 && { color: color.text }]}>▼ {challenge.down_count}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: space.sm },
  vote: {
    minWidth: 64,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  text: { fontFamily: font.bodyMedium, fontSize: 14, color: color.textSoft },
});
