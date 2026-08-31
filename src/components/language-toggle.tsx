import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LOCALES, LOCALE_NAMES, LOCALE_SHORT, useLocale } from '@/i18n';
import { alpha, color, radius, space, type } from '@/theme/tokens';

/**
 * The compact language switch: two letters, one tap to change the whole app.
 * It sits on the column so the language is never more than one screen away;
 * the full picker with the language names lives in Ajustes.
 */
export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const next = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={LOCALE_NAMES[next]}
      accessibilityHint={LOCALE_NAMES[next]}
      hitSlop={10}
      onPress={() => setLocale(next)}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      {LOCALES.map((option) => (
        <View key={option} style={[styles.slot, option === locale && styles.slotOn]}>
          <Text style={[styles.text, option === locale && styles.textOn]}>
            {LOCALE_SHORT[option]}
          </Text>
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 2,
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  pressed: { opacity: 0.65 },
  slot: { paddingVertical: 5, paddingHorizontal: space.sm, borderRadius: radius.pill },
  slotOn: { backgroundColor: alpha('#FFFFFF', 0.1) },
  text: { ...type.label, letterSpacing: 1.2, color: color.textFaint },
  textOn: { color: color.text },
});
