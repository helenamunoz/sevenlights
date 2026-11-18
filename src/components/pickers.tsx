import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { boardColor, boardName } from '@/components/board-card';
import { Sheet, SheetRow } from '@/components/sheet';
import { Loading } from '@/components/ui';
import { CATEGORIES, type CategoryId } from '@/data/categories';
import { CHAKRAS, type ChakraId } from '@/data/chakras';
import { useMyBoards } from '@/lib/api/boards';
import type { Board } from '@/lib/db.types';
import { t, tr } from '@/lib/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/** Seven dots to choose the light of a free board or a challenge. */
export function LightPicker({ value, onChange }: { value: ChakraId; onChange: (value: ChakraId) => void }) {
  return (
    <View style={styles.lights}>
      {CHAKRAS.map((chakra) => {
        const on = chakra.id === value;
        return (
          <Pressable
            key={chakra.id}
            onPress={() => onChange(chakra.id)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tr(chakra.name)}
            style={[styles.ring, on && { borderColor: chakra.color }]}>
            <View style={[styles.light, { backgroundColor: chakra.color, opacity: on ? 1 : 0.55 }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The kinds of practice, as chips. With `allLabel` the first chip means "any
 * kind" (null) and the row scrolls sideways, for filtering a list; without it
 * the chips wrap, for choosing one in a form.
 */
export function CategoryPicker<T extends CategoryId | null>({
  value,
  onChange,
  allLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  allLabel?: string;
}) {
  const options: { id: CategoryId | null; label: string }[] = [
    ...(allLabel ? [{ id: null, label: allLabel }] : []),
    ...CATEGORIES.map((category) => ({ id: category.id, label: tr(category.name) })),
  ];
  const chips = options.map((option) => {
    const on = option.id === value;
    return (
      <Pressable
        key={option.id ?? 'all'}
        onPress={() => onChange(option.id as T)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        style={[styles.chip, on && styles.chipOn]}>
        <Text style={[styles.chipText, on && styles.chipTextOn]}>{option.label}</Text>
      </Pressable>
    );
  });
  return allLabel ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipScroll}>
      {chips}
    </ScrollView>
  ) : (
    <View style={styles.chipWrap}>{chips}</View>
  );
}

/** Asks which of your own boards something should go to. */
export function BoardPicker({
  visible,
  onClose,
  onPick,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (board: Board) => void;
  title: string;
}) {
  const boards = useMyBoards();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {boards.isPending ? <Loading /> : null}
      {(boards.data ?? []).map((board) => (
        <SheetRow
          key={board.id}
          label={boardName(board)}
          detail={board.chakra ? undefined : t('board.free')}
          dot={boardColor(board)}
          onPress={() => {
            onClose();
            onPick(board);
          }}
        />
      ))}
      <SheetRow label={t('common.cancel')} quiet onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chipScroll: { marginBottom: space.lg, flexGrow: 0 },
  chipRow: { gap: space.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  chipOn: { backgroundColor: alpha(color.text, 0.16), borderColor: alpha(color.text, 0.5) },
  chipText: { fontFamily: font.bodyMedium, fontSize: 13, color: color.textSoft },
  chipTextOn: { color: color.text },
  lights: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
  ring: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  light: { width: 22, height: 22, borderRadius: 11 },
});
