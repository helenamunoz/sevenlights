import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aura } from '@/components/aura';
import { CHAKRAS, type Chakra } from '@/data/chakras';
import { isBoardStarted, useBoards } from '@/lib/store';
import type { Board } from '@/lib/types';
import { alpha, color, font, radius, space } from '@/theme/tokens';

export default function ColumnScreen() {
  const insets = useSafeAreaInsets();
  const { boards, sync } = useBoards();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xxl }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Tablero de visión</Text>
        <Text style={styles.title}>Siete Luces</Text>
        <Text style={styles.subtitle}>
          De la raíz a la corona. Un centro por vez, cuando tengas ganas.
        </Text>
      </View>

      <View style={styles.column}>
        {CHAKRAS.map((chakra, index) => (
          <Row
            key={chakra.id}
            chakra={chakra}
            board={boards[chakra.id]}
            first={index === 0}
            last={index === CHAKRAS.length - 1}
          />
        ))}
      </View>

      <Link href="/account" asChild>
        <Pressable style={styles.syncChip}>
          <View style={[styles.syncDot, { backgroundColor: syncColor(sync.status) }]} />
          <Text style={styles.syncText}>{syncLabel(sync)}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

function Row({
  chakra,
  board,
  first,
  last,
}: {
  chakra: Chakra;
  board: Board;
  first: boolean;
  last: boolean;
}) {
  const router = useRouter();
  const started = isBoardStarted(board);
  const thumbs = board.images.filter((i) => i.localUri).slice(0, 4);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/chakra/${chakra.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${chakra.es}, centro ${chakra.n}`}>
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
        <Text style={styles.rowNumber}>Centro {chakra.n}</Text>
        <Text style={styles.rowName}>{chakra.es}</Text>
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
                  <Image
                    key={image.id}
                    source={{ uri: image.localUri! }}
                    style={styles.thumb}
                    contentFit="cover"
                    transition={200}
                  />
                ))}
                {board.images.length > thumbs.length && (
                  <View style={[styles.thumb, styles.thumbMore]}>
                    <Text style={styles.thumbMoreText}>+{board.images.length - thumbs.length}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.rowPrompt}>{chakra.prompt}</Text>
        )}
      </View>
    </Pressable>
  );
}

function syncLabel(sync: ReturnType<typeof useBoards>['sync']): string {
  switch (sync.status) {
    case 'syncing':
      return 'Sincronizando…';
    case 'idle':
      return 'Sincronizado';
    case 'error':
      return 'Error al sincronizar';
    default:
      return sync.reason === 'signed-out' ? 'Entrar para sincronizar' : 'Solo en este teléfono';
  }
}

function syncColor(status: string): string {
  if (status === 'idle') return '#4E9E6A';
  if (status === 'error') return color.danger;
  if (status === 'syncing') return '#DFA52C';
  return color.textFaint;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ink },
  header: { paddingHorizontal: space.lg, marginBottom: space.xl },
  eyebrow: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  title: {
    fontFamily: font.display,
    fontSize: 52,
    lineHeight: 56,
    color: color.text,
    marginTop: space.sm,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 23,
    color: color.textSoft,
    marginTop: space.md,
    maxWidth: 300,
  },
  column: { paddingRight: space.lg },
  row: { flexDirection: 'row', paddingVertical: space.md },
  rowPressed: { backgroundColor: alpha('#FFFFFF', 0.03) },
  rail: { width: 64, alignItems: 'center', justifyContent: 'center' },
  thread: { position: 'absolute', width: 1, backgroundColor: color.line },
  threadCut: { backgroundColor: 'transparent' },
  railGlow: { position: 'absolute' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowBody: { flex: 1, paddingVertical: space.sm },
  rowNumber: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  rowName: {
    fontFamily: font.display,
    fontSize: 28,
    lineHeight: 32,
    color: color.text,
    marginTop: 2,
  },
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
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'center',
    marginTop: space.xl,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  syncDot: { width: 6, height: 6, borderRadius: 3 },
  syncText: { fontFamily: font.body, fontSize: 12, color: color.textSoft },
});
