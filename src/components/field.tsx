import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { alpha, color, space, type } from '@/theme/tokens';

/**
 * A labelled, self-saving text field. Local state keeps typing smooth; the
 * store only hears about a change when the field loses focus or after a pause,
 * which is also when a sync push is scheduled.
 */
export function Field({
  label,
  value,
  placeholder,
  accent,
  italic = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  accent: string;
  italic?: boolean;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  // Adopt values that arrive from a sync while this field is not being edited.
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.frame,
          { borderLeftColor: focused ? accent : alpha(accent, 0.45) },
          focused && { backgroundColor: alpha(accent, 0.07) },
        ]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (draft !== value) onChange(draft.trim());
          }}
          placeholder={placeholder}
          placeholderTextColor={color.textFaint}
          multiline
          scrollEnabled={false}
          style={[styles.input, italic && styles.inputItalic]}
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: space.lg },
  label: { ...type.label, color: color.textFaint, marginBottom: space.sm },
  frame: { borderLeftWidth: 2, paddingLeft: space.md, paddingVertical: 2, borderRadius: 2 },
  input: { ...type.lead, color: color.text, padding: 0, minHeight: type.lead.lineHeight },
  inputItalic: { fontFamily: type.quote.fontFamily, fontSize: 22 },
});
