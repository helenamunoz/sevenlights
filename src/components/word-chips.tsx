import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useLocale } from '@/i18n';
import { color, radius, space, tint, type } from '@/theme/tokens';

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
  const { t, fill } = useLocale();
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
      <Text style={styles.label}>{t.board.words}</Text>
      <View style={styles.row}>
        {words.map((word, index) => (
          <Pressable
            key={`${word}-${index}`}
            onLongPress={() => onRemove(index)}
            accessibilityLabel={fill(t.board.removeWordHint, { word })}
            style={[styles.chip, tint(accent, 1.15)]}>
            <Text style={styles.chipText}>{word}</Text>
          </Pressable>
        ))}

        {adding ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commit}
            onBlur={commit}
            placeholder={t.board.wordPlaceholder}
            placeholderTextColor={color.textFaint}
            autoFocus
            returnKeyType="done"
            style={[styles.input, { borderColor: accent }]}
          />
        ) : (
          <Pressable onPress={() => setAdding(true)} style={styles.add}>
            <Text style={styles.addText}>{t.board.addWord}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: { ...type.label, color: color.textFaint, marginBottom: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { ...type.bodySmall, fontSize: 14, color: color.text },
  add: {
    paddingVertical: 7,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.line,
  },
  addText: { ...type.bodySmall, fontSize: 14, color: color.textFaint },
  input: {
    minWidth: 130,
    paddingVertical: 7,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: color.surface,
    ...type.bodySmall,
    fontSize: 14,
    color: color.text,
  },
});
