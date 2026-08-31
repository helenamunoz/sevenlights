import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Aura } from '@/components/aura';
import { CHAKRA_COLORS } from '@/data/chakras';
import { useT } from '@/i18n';
import { alpha, color, glow, space, type } from '@/theme/tokens';

/**
 * The mark: seven lights on a thread, root at the bottom, crown at the top.
 * It is the app's own column seen from far away, and it is what the icon, the
 * splash and the header all draw.
 *
 * `lit` runs 0–1 across the whole column, so a caller can bring it up as one
 * piece; the splash instead drives each light on its own.
 */
export function Mark({
  size = 96,
  lit = 1,
  style,
}: {
  size?: number;
  lit?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const dot = Math.max(3, size * 0.115);
  const gap = (size - dot) / (CHAKRA_COLORS.length - 1);

  return (
    <View
      style={[{ width: size * 0.42, height: size }, styles.mark, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.thread, { top: dot / 2, bottom: dot / 2 }]} />
      {[...CHAKRA_COLORS].reverse().map((light, index) => (
        <Light key={light} color={light} size={dot} lit={lit} style={{ top: index * gap }} />
      ))}
    </View>
  );
}

/** One light. Split out so the splash can animate a single one at a time. */
export function Light({
  color: light,
  size,
  lit,
  style,
}: {
  color: string;
  size: number;
  lit: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.light, { height: size }, style]}>
      {lit > 0 && (
        <View style={[styles.halo, { opacity: lit }]}>
          <Aura color={light} size={size * 3} intensity={1.2} />
        </View>
      )}
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: light,
            opacity: 0.3 + lit * 0.7,
          },
          lit > 0 && glow(light, size * 0.8, 0.6 * lit),
        ]}
      />
    </View>
  );
}

/** The app's name, set the one way it is ever set. */
export function Wordmark({ size = 'regular' }: { size?: 'regular' | 'small' }) {
  const t = useT();
  return (
    <Text style={size === 'small' ? styles.wordmarkSmall : styles.wordmark}>{t.app.name}</Text>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center' },
  thread: { position: 'absolute', left: '50%', width: 1, backgroundColor: alpha('#FFFFFF', 0.12) },
  light: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  wordmark: { ...type.hero, color: color.text, marginTop: space.sm },
  wordmarkSmall: { ...type.heading, color: color.text, letterSpacing: -0.4 },
});
