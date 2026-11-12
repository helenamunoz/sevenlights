import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Aura } from '@/components/aura';
import { MediaImage } from '@/components/media-image';
import { CHAKRAS, type Chakra } from '@/data/chakras';
import type { Board } from '@/lib/db.types';
import { t, tr } from '@/lib/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/**
 * The seven chakra boards as lights on a thread, root to crown. A center that
 * has something on it glows; an empty one shows the question that opens it.
 * Boards missing from the list (someone else's private ones) are left out.
 */
export function ChakraColumn({ boards, showPrompts }: { boards: Board[]; showPrompts: boolean }) {
  const rows = CHAKRAS.map((chakra) => ({
    chakra,
    board: boards.find((board) => board.chakra === chakra.id),
  })).filter((row): row is { chakra: Chakra; board: Board } => row.board !== undefined);

  return (
    <View style={styles.column}>
      {rows.map(({ chakra, board }, index) => (
        <Row
          key={chakra.id}
          chakra={chakra}
          board={board}
          first={index === 0}
          last={index === rows.length - 1}
          showPrompt={showPrompts}
        />
      ))}
    </View>
  );
}

function Row({
  chakra,
  board,
  first,
  last,
  showPrompt,
}: {
  chakra: Chakra;
  board: Board;
  first: boolean;
  last: boolean;
  showPrompt: boolean;
}) {
  const router = useRouter();
  const started = board.image_count > 0 || board.intention !== '' || board.affirmation !== '';
  const thumbs = board.images.slice(0, 4);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/board/${board.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${tr(chakra.name)}, ${t('board.center', { n: chakra.n })}`}>
      <View style={styles.rail}>
        <View style={[styles.thread, first && styles.threadCut, { top: 0, bottom: '50%' }]} />
        <View style={[styles.thread, last && styles.threadCut, { top: '50%', bottom: 0 }]} />
        {started && (
          <View style={styles.railGlow}>
            <Aura color={chakra.color} size={68} intensity={1.1} />
          </View>
        )}
        <View
          style={[
            styles.dot,
            {
              backgroundColor: chakra.color,
              opacity: started ? 1 : 0.4,
              transform: [{ scale: started ? 1.15 : 1 }],
            },
          ]}
        />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowNumber}>{t('board.center', { n: chakra.n })}</Text>
          {!board.is_public ? <Text style={styles.private}>{t('board.private')}</Text> : null}
        </View>
        <Text style={styles.rowName}>{tr(chakra.name)}</Text>
        <Text style={[styles.rowSanskrit, { color: chakra.color }]}>{chakra.sa}</Text>

        {started ? (
          <>
            {board.intention ? (
              <Text style={styles.rowIntention} numberOfLines={2}>
                {board.intention}
              </Text>
            ) : null}
            {thumbs.length > 0 && (
              <View style={styles.thumbs}>
                {thumbs.map((image) => (
                  <MediaImage key={image.id} path={image.storage_path} style={styles.thumb} />
                ))}
                {board.images.length > thumbs.length && (
                  <View style={[styles.thumb, styles.thumbMore]}>
                    <Text style={styles.thumbMoreText}>+{board.images.length - thumbs.length}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        ) : showPrompt ? (
          <Text style={styles.rowPrompt}>{tr(chakra.prompt)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: { paddingRight: space.lg },
  row: { flexDirection: 'row', paddingVertical: space.md },
  rowPressed: { backgroundColor: alpha(color.white, 0.03) },
  rail: { width: 64, alignItems: 'center', justifyContent: 'center' },
  thread: { position: 'absolute', width: 1, backgroundColor: color.line },
  threadCut: { backgroundColor: 'transparent' },
  railGlow: { position: 'absolute' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowBody: { flex: 1, paddingVertical: space.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowNumber: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  private: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: color.textSoft,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  rowName: { fontFamily: font.display, fontSize: 28, lineHeight: 32, color: color.text, marginTop: 2 },
  rowSanskrit: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  rowPrompt: {
    fontFamily: font.displayItalic,
    fontSize: 16,
    lineHeight: 23,
    color: color.textFaint,
    marginTop: space.sm,
    paddingRight: space.md,
  },
  rowIntention: {
    fontFamily: font.display,
    fontSize: 17,
    lineHeight: 25,
    color: color.textSoft,
    marginTop: space.sm,
    paddingRight: space.md,
  },
  thumbs: { flexDirection: 'row', gap: 6, marginTop: space.md },
  thumb: { width: 46, height: 46, borderRadius: radius.sm, backgroundColor: color.ink2 },
  thumbMore: { alignItems: 'center', justifyContent: 'center' },
  thumbMoreText: { fontFamily: font.bodyMedium, fontSize: 12, color: color.textSoft },
});
