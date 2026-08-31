import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { alpha, color, font, radius, space } from '@/theme/tokens';

/** The handful of words that name a center. Short by design — one word each. */
export function WordChips({
  words,
  accent,
  onAdd,
  onRemove,
}: {
  words: string[];
  accent: string;
  onAdd: (word: string) => void;
  onRemove: (index: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function commit() {
    const word = draft.trim();
    if (word) onAdd(word);
    setDraft('');
    setAdding(false);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Palabras</Text>
      <View style={styles.row}>
        {words.map((word, index) => (
          <Pressable
            key={`${word}-${index}`}
            onLongPress={() => onRemove(index)}
            accessibilityLabel={`${word}. Mantené apretado para quitar.`}
            style={[
              styles.chip,
              { backgroundColor: alpha(accent, 0.14), borderColor: alpha(accent, 0.3) },
            ]}>
            <Text style={styles.chipText}>{word}</Text>
          </Pressable>
        ))}

        {adding ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commit}
            onBlur={commit}
            placeholder="una palabra"
            placeholderTextColor={color.textFaint}
            autoFocus
            returnKeyType="done"
            style={[styles.input, { borderColor: accent }]}
          />
        ) : (
          <Pressable onPress={() => setAdding(true)} style={styles.add}>
            <Text style={styles.addText}>+ palabra</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
    marginBottom: space.sm,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontFamily: font.body, fontSize: 14, color: color.text },
  add: {
    paddingVertical: 7,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.line,
  },
  addText: { fontFamily: font.body, fontSize: 14, color: color.textFaint },
  input: {
    minWidth: 130,
    paddingVertical: 7,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: color.surface,
    fontFamily: font.body,
    fontSize: 14,
    color: color.text,
  },
});
