import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { alpha, color, radius, space, type } from '@/theme/tokens';

/**
 * The pieces every screen is built from. They exist so a screen never reaches
 * for a raw color, size or radius — everything here reads from
 * `@/theme/tokens`, and a change to the tokens moves the whole app at once.
 */

/** The small uppercase key above a value or a field. */
export function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** Running text. `tone` picks how loudly it speaks. */
export function Body({
  children,
  tone = 'normal',
  style,
}: {
  children: ReactNode;
  tone?: 'normal' | 'soft' | 'faint' | 'danger';
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.body, TONES[tone], style]}>{children}</Text>;
}

const TONES = {
  normal: { color: color.text },
  soft: { color: color.textSoft },
  faint: { ...type.bodySmall, color: color.textFaint },
  danger: { ...type.bodySmall, color: color.danger },
} as const;

/** A panel on the ink ground. Everything on a settings screen sits in one. */
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** The one filled button on a screen: the thing the screen is for. */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => [
        styles.primary,
        (disabled || busy) && styles.primaryOff,
        pressed && styles.pressed,
      ]}
      disabled={disabled || busy}
      onPress={onPress}>
      {busy ? (
        <ActivityIndicator color={color.ink} />
      ) : (
        <Text style={styles.primaryText}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Everything else: undoing, going back, changing your mind. */
export function QuietButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
      onPress={onPress}>
      <Text style={styles.quietText}>{label}</Text>
    </Pressable>
  );
}

/** A one-of-n picker. Small enough to sit inside a card. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentOn,
              pressed && styles.pressed,
            ]}
            onPress={() => onChange(option.value)}>
            <Text style={[styles.segmentText, selected && styles.segmentTextOn]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...type.label, color: color.textFaint },
  body: { ...type.body },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.lg,
    gap: space.sm,
  },
  pressed: { opacity: 0.65 },
  primary: {
    marginTop: space.md,
    backgroundColor: color.text,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  primaryOff: { opacity: 0.45 },
  primaryText: { ...type.button, color: color.ink },
  quiet: { marginTop: space.sm, paddingVertical: space.sm, alignItems: 'center' },
  quietText: { ...type.bodySmall, color: color.textSoft },
  segmented: {
    flexDirection: 'row',
    gap: space.xs,
    padding: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.ink2,
    borderWidth: 1,
    borderColor: color.line,
  },
  segment: {
    flex: 1,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentOn: { backgroundColor: alpha('#FFFFFF', 0.1) },
  segmentText: { ...type.bodySmall, color: color.textFaint },
  segmentTextOn: { fontFamily: type.button.fontFamily, color: color.text },
});
