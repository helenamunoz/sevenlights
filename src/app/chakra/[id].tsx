import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aura } from '@/components/aura';
import { Field } from '@/components/field';
import { PhotoGrid } from '@/components/photo-grid';
import { WordChips } from '@/components/word-chips';
import { CHAKRA_BY_ID, isChakraId } from '@/data/chakras';
import { useLocale } from '@/i18n';
import { useBoards } from '@/lib/store';
import { color, font, space, tint, type } from '@/theme/tokens';

export default function ChakraScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { boards, setField, addWord, removeWord, addImages, removeImage } = useBoards();
  const { locale, t, fill } = useLocale();

  if (!isChakraId(id)) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.missing}>{t.board.missing}</Text>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={styles.back}>{t.board.backToColumn}</Text>
        </Pressable>
      </View>
    );
  }

  const chakra = CHAKRA_BY_ID[id];
  const copy = chakra.copy[locale];
  const board = boards[id];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.md,
          paddingBottom: insets.bottom + space.xxl,
          paddingHorizontal: space.lg,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.auraSlot} pointerEvents="none">
          <Aura color={chakra.color} size={360} intensity={0.9} />
        </View>

        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
          <Text style={styles.back}>{t.board.back}</Text>
        </Pressable>

        <View style={styles.head}>
          <View style={[styles.bija, tint(chakra.color)]}>
            {chakra.bija ? (
              <Text style={[styles.bijaText, { color: chakra.color }]}>{chakra.bija}</Text>
            ) : (
              <Text style={[styles.bijaSilence, { color: chakra.color }]}>{t.board.silence}</Text>
            )}
          </View>

          <View style={styles.heading}>
            <Text style={styles.number}>{fill(t.column.center, { n: chakra.n })}</Text>
            <Text style={styles.name}>{copy.name}</Text>
            <Text style={[styles.sanskrit, { color: chakra.color }]}>{chakra.sa}</Text>
          </View>
        </View>

        <Text style={styles.meta}>
          {copy.element} · {copy.place}
        </Text>
        <Text style={styles.field}>{copy.field}</Text>

        <View style={styles.body}>
          <Field
            label={t.board.intention}
            value={board.intention}
            placeholder={copy.prompt}
            accent={chakra.color}
            onChange={(value) => setField(id, 'intention', value)}
          />
          <Field
            label={t.board.affirmation}
            value={board.affirmation}
            placeholder={t.board.affirmationPlaceholder}
            accent={chakra.color}
            italic
            onChange={(value) => setField(id, 'affirmation', value)}
          />
          <WordChips
            words={board.words}
            accent={chakra.color}
            onAdd={(word) => addWord(id, word)}
            onRemove={(index) => removeWord(id, index)}
          />
          <PhotoGrid
            images={board.images}
            accent={chakra.color}
            onAdd={(photos) => addImages(id, photos)}
            onRemove={(imageId) => removeImage(id, imageId)}
          />
        </View>

        <Text style={styles.hint}>{t.board.hint}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ink },
  centered: { alignItems: 'center', justifyContent: 'center', gap: space.md },
  missing: { ...type.lead, color: color.text },
  auraSlot: { position: 'absolute', top: -120, left: -140 },
  backRow: { paddingVertical: space.sm, alignSelf: 'flex-start' },
  back: { ...type.bodySmall, fontSize: 14, color: color.textSoft },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, marginTop: space.lg },
  bija: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bijaText: { fontFamily: font.deva, fontSize: 34, lineHeight: 46 },
  bijaSilence: { ...type.quote, fontSize: 14, lineHeight: 20 },
  heading: { flex: 1, paddingTop: space.xs },
  number: { ...type.label, color: color.textFaint },
  name: { ...type.title, color: color.text, marginTop: 2 },
  sanskrit: { ...type.label, fontSize: 11, marginTop: 8 },
  meta: { ...type.bodySmall, color: color.textSoft, marginTop: space.lg },
  field: { ...type.bodySmall, color: color.textFaint, marginTop: 2 },
  body: { marginTop: space.xl },
  hint: { ...type.caption, color: color.textFaint, textAlign: 'center', marginTop: space.md },
});
