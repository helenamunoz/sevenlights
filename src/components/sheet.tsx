import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/lib/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/**
 * A panel that rises from the bottom. Used for menus and confirmations in
 * place of the system alert, which does nothing in a browser and cannot wear
 * the app's colors.
 */
export function Sheet({
  visible,
  onClose,
  title,
  message,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[styles.panel, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.grip} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type Action = { label: string; onPress: () => void; destructive?: boolean };

/** A sheet that is just a list of things to do; choosing one closes it. */
export function ActionSheet({
  visible,
  onClose,
  title,
  message,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: Action[];
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} message={message}>
      {actions.map((action) => (
        <SheetRow
          key={action.label}
          label={action.label}
          destructive={action.destructive}
          onPress={() => {
            onClose();
            action.onPress();
          }}
        />
      ))}
      <SheetRow label={t('common.cancel')} quiet onPress={onClose} />
    </Sheet>
  );
}

export function SheetRow({
  label,
  detail,
  onPress,
  destructive = false,
  quiet = false,
  dot,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
  quiet?: boolean;
  /** A small colored light before the label. */
  dot?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <View style={styles.rowText}>
        <Text
          style={[
            styles.rowLabel,
            destructive && { color: color.danger },
            quiet && { color: color.textSoft },
          ]}>
          {label}
        </Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: alpha(color.scrim, 0.72) },
  panel: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.md * 1.5,
    borderTopRightRadius: radius.md * 1.5,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: color.line,
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
    maxHeight: '86%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  grip: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.line,
    marginBottom: space.md,
  },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 30, color: color.text, marginBottom: space.xs },
  message: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 21,
    color: color.textSoft,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 50,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  rowPressed: { opacity: 0.6 },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: font.bodyMedium, fontSize: 16, color: color.text },
  rowDetail: { fontFamily: font.body, fontSize: 13, color: color.textFaint, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
