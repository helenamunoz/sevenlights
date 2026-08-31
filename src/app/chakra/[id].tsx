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
import { useBoards } from '@/lib/store';
import { alpha, color, font, space } from '@/theme/tokens';

export default function ChakraScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { boards, setField, addWord, removeWord, addImages, removeImage } = useBoards();

  if (!isChakraId(id)) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.missing}>Ese centro no existe.</Text>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={styles.back}>← Volver a la columna</Text>
        </Pressable>
      </View>
    );
  }

  const chakra = CHAKRA_BY_ID[id];
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
          <Text style={styles.back}>← Columna</Text>
        </Pressable>

        <View style={styles.head}>
          <View
            style={[
              styles.bija,
              {
                borderColor: alpha(chakra.color, 0.35),
                backgroundColor: alpha(chakra.color, 0.12),
              },
            ]}>
            {chakra.bija ? (
              <Text style={[styles.bijaText, { color: chakra.color }]}>{chakra.bija}</Text>
            ) : (
              <Text style={[styles.bijaSilence, { color: chakra.color }]}>silencio</Text>
            )}
          </View>

          <View style={styles.heading}>
            <Text style={styles.number}>Centro {chakra.n}</Text>
            <Text style={styles.name}>{chakra.es}</Text>
            <Text style={[styles.sanskrit, { color: chakra.color }]}>{chakra.sa}</Text>
          </View>
        </View>

        <Text style={styles.meta}>
          {chakra.element} · {chakra.place}
        </Text>
        <Text style={styles.field}>{chakra.field}</Text>

        <View style={styles.body}>
          <Field
            label="Intención"
            value={board.intention}
            placeholder={chakra.prompt}
            accent={chakra.color}
            onChange={(value) => setField(id, 'intention', value)}
          />
          <Field
            label="Afirmación"
            value={board.affirmation}
            placeholder="Yo…"
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

        <Text style={styles.hint}>Se guarda solo. Mantené apretada una imagen para quitarla.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ink },
  centered: { alignItems: 'center', justifyContent: 'center', gap: space.md },
  missing: { fontFamily: font.display, fontSize: 22, color: color.text },
  auraSlot: { position: 'absolute', top: -120, left: -140 },
  backRow: { paddingVertical: space.sm, alignSelf: 'flex-start' },
  back: { fontFamily: font.body, fontSize: 14, color: color.textSoft },
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
  bijaSilence: { fontFamily: font.displayItalic, fontSize: 14 },
  heading: { flex: 1, paddingTop: space.xs },
  number: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  name: { fontFamily: font.display, fontSize: 38, lineHeight: 42, color: color.text, marginTop: 2 },
  sanskrit: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  meta: { fontFamily: font.body, fontSize: 13, color: color.textSoft, marginTop: space.lg },
  field: { fontFamily: font.body, fontSize: 13, color: color.textFaint, marginTop: 2 },
  body: { marginTop: space.xl },
  hint: {
    fontFamily: font.body,
    fontSize: 12,
    color: color.textFaint,
    textAlign: 'center',
    marginTop: space.md,
  },
});
