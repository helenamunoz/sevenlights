import { useRouter } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/lib/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/** The small building blocks every screen shares. */

// ── layout ───────────────────────────────────────────────────────────

/** A scrolling page with safe-area padding that stays clear of the keyboard. */
export function Screen({
  children,
  header,
  refreshControl,
  padded = true,
}: {
  children: ReactNode;
  /** Pinned above the scrolling content. */
  header?: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  padded?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.lg }}>{header}</View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.xxl, paddingHorizontal: padded ? space.lg : 0 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A back link, with room for one action on the right. */
export function BackBar({ right }: { right?: ReactNode }) {
  const router = useRouter();
  return (
    <View style={styles.backBar}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}>
        <Text style={styles.back}>← {t('common.back')}</Text>
      </Pressable>
      <View style={styles.backBarRight}>{right}</View>
    </View>
  );
}

export function Title({ eyebrow, children }: { eyebrow?: string; children: string }) {
  return (
    <View style={styles.titleWrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{children}</Text>
    </View>
  );
}

export function Label({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** What a list shows when there is nothing in it yet. */
export function Empty({ children }: { children: string }) {
  return <Text style={styles.empty}>{children}</Text>;
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={color.textFaint} />
    </View>
  );
}

// ── controls ─────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  kind = 'primary',
  busy = false,
  disabled = false,
  accent,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  /** Tints a primary button with a chakra's light. */
  accent?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || busy;
  const fill = kind === 'primary' ? (accent ?? color.text) : undefined;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' && { backgroundColor: fill },
        kind === 'secondary' && styles.buttonSecondary,
        kind === 'danger' && styles.buttonDanger,
        kind === 'quiet' && styles.buttonQuiet,
        (pressed || off) && styles.dim,
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={kind === 'primary' ? color.ink : color.textSoft} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            kind === 'primary' && { color: color.ink },
            kind === 'danger' && { color: color.danger },
            kind === 'quiet' && styles.buttonQuietText,
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** A plain boxed input, for forms. Board text uses `Field` instead. */
export function Input({ label, hint, style, ...props }: TextInputProps & { label?: string; hint?: string }) {
  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={color.textFaint}
        accessibilityLabel={label}
        {...props}
        style={[styles.input, props.multiline && styles.inputMultiline, style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A row of mutually exclusive choices. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accent = color.text,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accent?: string;
}) {
  return (
    <View style={styles.segments}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              styles.segment,
              on && { backgroundColor: alpha(accent, 0.16), borderColor: alpha(accent, 0.5) },
            ]}>
            <Text style={[styles.segmentText, on && { color: color.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A labelled on/off row. */
export function Toggle({
  label,
  hint,
  value,
  onChange,
  accent = color.ok,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  accent?: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      aria-checked={value}
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      style={styles.toggle}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={[styles.track, value && { backgroundColor: alpha(accent, 0.45) }]}>
        <View style={[styles.knob, value && { alignSelf: 'flex-end', backgroundColor: color.text }]} />
      </View>
    </Pressable>
  );
}

// ── toast ────────────────────────────────────────────────────────────

const ToastContext = createContext<(message: string) => void>(() => {});

/** A short line that appears at the bottom and leaves by itself. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(next: string) {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 3200);
  }
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <View pointerEvents="none" style={[styles.toastSlot, { bottom: insets.bottom + 84 }]}>
          <View style={styles.toast} accessibilityLiveRegion="polite">
            <Text style={styles.toastText}>{message}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ink },
  content: { paddingTop: space.sm },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  backBarRight: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { fontFamily: font.body, fontSize: 14, color: color.textSoft },
  titleWrap: { marginTop: space.md, marginBottom: space.lg },
  eyebrow: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: color.textFaint,
    marginBottom: space.sm,
  },
  title: { fontFamily: font.display, fontSize: 38, lineHeight: 43, color: color.text, letterSpacing: -0.5 },
  label: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
    marginBottom: space.sm,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.lg,
  },
  empty: {
    fontFamily: font.displayItalic,
    fontSize: 16,
    lineHeight: 24,
    color: color.textFaint,
    paddingVertical: space.lg,
  },
  loading: { paddingVertical: space.xl, alignItems: 'center' },
  button: {
    minHeight: 46,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: { borderWidth: 1, borderColor: color.line },
  buttonDanger: { borderWidth: 1, borderColor: alpha(color.danger, 0.4) },
  buttonQuiet: { minHeight: 36, paddingVertical: space.sm },
  buttonText: { fontFamily: font.bodyBold, fontSize: 14, color: color.text },
  buttonQuietText: { fontFamily: font.body, fontSize: 13, color: color.textSoft },
  dim: { opacity: 0.55 },
  inputWrap: { marginBottom: space.lg },
  input: {
    backgroundColor: color.ink2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontFamily: font.body,
    fontSize: 16,
    color: color.text,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  hint: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.textFaint, marginTop: space.xs },
  segments: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  segment: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  segmentText: { fontFamily: font.bodyMedium, fontSize: 13, color: color.textSoft },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  toggleText: { flex: 1 },
  toggleLabel: { fontFamily: font.body, fontSize: 15, color: color.text },
  track: {
    width: 46,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: color.line,
    padding: 3,
    justifyContent: 'center',
  },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.textSoft },
  toastSlot: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg },
  toast: {
    backgroundColor: color.text,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    maxWidth: 420,
  },
  toastText: { fontFamily: font.bodyMedium, fontSize: 14, color: color.ink, textAlign: 'center' },
});
