import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aura } from '@/components/aura';
import { LanguageToggle } from '@/components/language-toggle';
import { Mark, Wordmark } from '@/components/logo';
import { CHAKRAS, type Chakra } from '@/data/chakras';
import { useLocale } from '@/i18n';
import type { Dictionary } from '@/i18n/es';
import { isBoardStarted, useBoards } from '@/lib/store';
import type { Board, SyncState } from '@/lib/types';
import { alpha, color, radius, space, type } from '@/theme/tokens';

export default function ColumnScreen() {
  const insets = useSafeAreaInsets();
  const { boards, sync } = useBoards();
  const { t } = useLocale();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xxl }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerWords}>
            <Text style={styles.eyebrow}>{t.app.tagline}</Text>
            <Wordmark />
          </View>
          <Mark size={80} style={styles.headerMark} />
        </View>
        <Text style={styles.subtitle}>{t.column.subtitle}</Text>
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

      <View style={styles.footer}>
        <Link href="/account" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.settings.title}
            style={styles.syncChip}>
            <View style={[styles.syncDot, { backgroundColor: syncColor(sync.status) }]} />
            <Text style={styles.syncText}>{syncLabel(sync, t)}</Text>
          </Pressable>
        </Link>
        <LanguageToggle />
      </View>
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
  const { locale, t, fill } = useLocale();
  const copy = chakra.copy[locale];
  const started = isBoardStarted(board);
  const thumbs = board.images.filter((i) => i.localUri).slice(0, 4);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/chakra/${chakra.id}`)}
      accessibilityRole="button"
      accessibilityLabel={fill(t.column.rowLabel, { name: copy.name, n: chakra.n })}>
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
        <Text style={styles.rowNumber}>{fill(t.column.center, { n: chakra.n })}</Text>
        <Text style={styles.rowName}>{copy.name}</Text>
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
          <Text style={styles.rowPrompt}>{copy.prompt}</Text>
        )}
      </View>
    </Pressable>
  );
}

function syncLabel(sync: SyncState, t: Dictionary): string {
  switch (sync.status) {
    case 'syncing':
      return t.sync.syncing;
    case 'idle':
      return t.sync.synced;
    case 'error':
      return t.sync.error;
    default:
      return sync.reason === 'signed-out' ? t.sync.signedOut : t.sync.local;
  }
}

function syncColor(status: SyncState['status']): string {
  if (status === 'idle') return color.ok;
  if (status === 'error') return color.danger;
  if (status === 'syncing') return color.warn;
  return color.textFaint;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ink },
  header: { paddingHorizontal: space.lg, marginBottom: space.xl },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headerWords: { flex: 1 },
  headerMark: { marginTop: space.xs },
  eyebrow: { ...type.eyebrow, color: color.textFaint },
  subtitle: { ...type.body, color: color.textSoft, marginTop: space.md, maxWidth: 300 },
  column: { paddingRight: space.lg },
  row: { flexDirection: 'row', paddingVertical: space.md },
  rowPressed: { backgroundColor: alpha('#FFFFFF', 0.03) },
  rail: { width: 64, alignItems: 'center', justifyContent: 'center' },
  thread: { position: 'absolute', width: 1, backgroundColor: color.line },
  threadCut: { backgroundColor: 'transparent' },
  railGlow: { position: 'absolute' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowBody: { flex: 1, paddingVertical: space.sm },
  rowNumber: { ...type.label, color: color.textFaint },
  rowName: { ...type.heading, color: color.text, marginTop: 2 },
  rowSanskrit: { ...type.label, letterSpacing: 1.6, fontSize: 11, marginTop: 6 },
  rowPrompt: {
    ...type.quote,
    fontSize: 16,
    lineHeight: 23,
    color: color.textFaint,
    marginTop: space.sm,
    paddingRight: space.md,
  },
  rowIntention: {
    ...type.lead,
    fontSize: 17,
    lineHeight: 25,
    color: color.textSoft,
    marginTop: space.sm,
    paddingRight: space.md,
  },
  thumbs: { flexDirection: 'row', gap: 6, marginTop: space.md },
  thumb: { width: 46, height: 46, borderRadius: radius.sm, backgroundColor: color.ink2 },
  thumbMore: { alignItems: 'center', justifyContent: 'center' },
  thumbMoreText: { ...type.caption, fontFamily: type.button.fontFamily, color: color.textSoft },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.xl,
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  syncDot: { width: 6, height: 6, borderRadius: 3 },
  syncText: { ...type.caption, color: color.textSoft },
});
