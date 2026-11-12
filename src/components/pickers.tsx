import { Pressable, StyleSheet, View } from 'react-native';

import { boardColor, boardName } from '@/components/board-card';
import { Sheet, SheetRow } from '@/components/sheet';
import { Loading } from '@/components/ui';
import { CHAKRAS, type ChakraId } from '@/data/chakras';
import { useMyBoards } from '@/lib/api/boards';
import type { Board } from '@/lib/db.types';
import { t, tr } from '@/lib/i18n';
import { color, space } from '@/theme/tokens';

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
