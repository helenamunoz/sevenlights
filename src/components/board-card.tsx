import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Byline } from '@/components/avatar';
import { CoverArt } from '@/components/brand';
import { MediaImage } from '@/components/media-image';
import { chakraCovers } from '@/data/brand';
import { CHAKRA_BY_ID, lightColor } from '@/data/chakras';
import type { Board } from '@/lib/db.types';
import { t, tr } from '@/lib/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/** What a board is called: its chakra's name, or the title its owner gave it. */
export function boardName(board: Board): string {
  if (board.chakra) return tr(CHAKRA_BY_ID[board.chakra].name);
  return board.title || t('board.untitled');
}

export function boardColor(board: Board): string {
  return lightColor(board.chakra ?? board.light);
}

/** A board as it appears in a list: a strip of photos, its name, a first line. */
export function BoardCard({ board, showOwner = false, compact = false }: { board: Board; showOwner?: boolean; compact?: boolean }) {
  const router = useRouter();
  const accent = boardColor(board);
  const photos = board.images.slice(0, compact ? 1 : 3);
  const line = board.intention || board.affirmation;

  return (
    <Pressable
      onPress={() => router.push(`/board/${board.id}`)}
      accessibilityRole="button"
      accessibilityLabel={boardName(board)}
      style={({ pressed }) => [styles.card, compact && styles.compactCard, { borderColor: alpha(accent, 0.28) }, pressed && styles.pressed]}>
      {photos.length > 0 ? (
        <View style={[styles.strip, compact && styles.compactStrip]}>
          {photos.map((image) => (
            <MediaImage key={image.id} path={image.storage_path} style={styles.photo} />
          ))}
        </View>
      ) : compact ? (
        <CoverArt source={chakraCovers[board.chakra ?? board.light]} style={styles.compactCover} />
      ) : null}

      <View style={[styles.body, compact && styles.compactBody]}>
        <View style={styles.top}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={[styles.name, compact && styles.compactName]} numberOfLines={compact ? 2 : 1}>
            {boardName(board)}
          </Text>
          {!board.is_public ? <Text style={styles.meta}>{t('board.private')}</Text> : null}
          {board.like_count > 0 ? <Text style={styles.meta}>♥ {board.like_count}</Text> : null}
        </View>
        {line ? (
          <Text style={styles.line} numberOfLines={3}>
            {line}
          </Text>
        ) : null}
        {showOwner ? (
          <View style={styles.owner}>
            <Byline person={board.owner} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  compactCard: { marginBottom: 0 },
  compactStrip: { height: 116 },
  compactCover: { height: 116, borderRadius: 0 },
  compactBody: { padding: space.sm },
  compactName: { fontSize: 16, lineHeight: 20 },
  pressed: { opacity: 0.8 },
  strip: { flexDirection: 'row', gap: 2, height: 132 },
  photo: { flex: 1, backgroundColor: color.ink2 },
  body: { padding: space.md, gap: space.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 9, height: 9, borderRadius: 5 },
  name: { flex: 1, fontFamily: font.display, fontSize: 21, lineHeight: 26, color: color.text },
  meta: { fontFamily: font.bodyMedium, fontSize: 12, color: color.textSoft },
  line: { fontFamily: font.displayItalic, fontSize: 16, lineHeight: 23, color: color.textSoft },
  owner: { marginTop: 2 },
});
