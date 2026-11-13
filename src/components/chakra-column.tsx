import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CoverArt } from '@/components/brand';
import { MediaImage } from '@/components/media-image';
import { chakraCovers } from '@/data/brand';
import { CHAKRAS } from '@/data/chakras';
import type { Board } from '@/lib/db.types';
import { t, tr } from '@/lib/i18n';
import { color, font, radius, space } from '@/theme/tokens';

/** The seven centers, with the person's own images taking precedence over the cover art. */
export function ChakraColumn({ boards, showPrompts }: { boards: Board[]; showPrompts: boolean }) {
  const router = useRouter();

  return (
    <View style={styles.column}>
      {CHAKRAS.map((chakra) => {
        const board = boards.find((entry) => entry.chakra === chakra.id);
        if (!board) return null;

        const image = board.images[0];
        const detail = board.intention || (showPrompts && !board.affirmation && !image ? tr(chakra.prompt) : '');
        return (
          <Pressable
            key={chakra.id}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => router.push(`/board/${board.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${tr(chakra.name)}, ${t('board.center', { n: chakra.n })}`}>
            {image ? (
              <MediaImage path={image.storage_path} style={styles.cover} />
            ) : (
              <CoverArt source={chakraCovers[chakra.id]} style={styles.cover} />
            )}
            <View style={styles.body}>
              <Text style={styles.name}>{tr(chakra.name)}</Text>
              {detail ? <Text style={styles.detail} numberOfLines={1}>{detail}</Text> : null}
              {!board.is_public ? <Text style={styles.detail}>{t('board.private')}</Text> : null}
            </View>
            <Text style={styles.chevron} accessible={false}>›</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { paddingHorizontal: space.lg, gap: space.sm },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.ink2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    overflow: 'hidden',
  },
  pressed: { backgroundColor: color.surface },
  cover: { width: '31%', maxWidth: 136, alignSelf: 'stretch', borderRadius: 0 },
  body: { flex: 1, paddingVertical: space.sm },
  name: { fontFamily: font.displayMedium, fontSize: 21, lineHeight: 25, color: color.text },
  detail: { fontFamily: font.body, fontSize: 13, lineHeight: 17, color: color.textSoft },
  chevron: { fontFamily: font.body, fontSize: 23, color: color.text, marginRight: space.md },
});
