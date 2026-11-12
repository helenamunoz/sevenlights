import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { t } from '@/lib/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/**
 * The handful of words that name a board. Short by design — one word each.
 * Without `onAdd` and `onRemove` the chips are read-only.
 */
export function WordChips({
  words,
  accent,
  onAdd,
  onRemove,
}: {
  words: string[];
  accent: string;
  onAdd?: (word: string) => void;
  onRemove?: (index: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function commit() {
    const word = draft.trim();
    if (word) onAdd?.(word);
    setDraft('');
    setAdding(false);
  }

  if (!onAdd && words.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('board.words')}</Text>
      <View style={styles.row}>
        {words.map((word, index) => (
          <Pressable
            key={`${word}-${index}`}
            disabled={!onRemove}
            onLongPress={() => onRemove?.(index)}
            accessibilityLabel={onRemove ? t('board.wordRemoveHint', { word }) : word}
            style={[
              styles.chip,
              { backgroundColor: alpha(accent, 0.14), borderColor: alpha(accent, 0.3) },
            ]}>
            <Text style={styles.chipText}>{word}</Text>
          </Pressable>
        ))}

        {!onAdd ? null : adding ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commit}
            onBlur={commit}
            placeholder={t('board.wordPlaceholder')}
            placeholderTextColor={color.textFaint}
            autoFocus
            maxLength={30}
            returnKeyType="done"
            style={[styles.input, { borderColor: accent }]}
          />
        ) : (
          <Pressable onPress={() => setAdding(true)} style={styles.add} accessibilityRole="button">
            <Text style={styles.addText}>+ {t('board.wordAdd')}</Text>
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
