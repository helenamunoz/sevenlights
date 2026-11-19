import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { afterglow } from '@/theme/tokens';

/** The seven lights of the Ember Ring, clockwise from twelve o'clock. */
export const SEVEN = [
  afterglow.plum,
  afterglow.violet,
  afterglow.mauve,
  afterglow.cream,
  afterglow.honey,
  afterglow.amber,
  afterglow.ember,
] as const;

const native = Platform.OS !== 'web';

/** True when the person has asked their device for less motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced, () => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => listener.remove();
  }, []);
  return reduced;
}

/** Where light `index` of seven sits on a circle of `radius`, from twelve o'clock. */
function place(index: number, radius: number) {
  const angle = (index / 7) * 2 * Math.PI - Math.PI / 2;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/**
 * The app's waiting sign: the seven lights in a ring, each brightening in
 * turn, like a slow breath going round. With reduced motion it is the ring,
 * still.
 */
export function EmberLoader({ size = 44, tint }: { size?: number; tint?: string }) {
  const reduced = useReducedMotion();
  const turn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration: 2100, easing: Easing.linear, useNativeDriver: native })
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, turn]);

  const dot = size * 0.2;
  const steps = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar">
      {SEVEN.map((light, index) => {
        const { x, y } = place(index, size * 0.38);
        // Brightest when the turn reaches this light, dimmer the further round it is.
        const opacity = turn.interpolate({
          inputRange: steps.map((step) => step / 7),
          outputRange: steps.map((step) => {
            const away = Math.min((step - index + 7) % 7, (index - step + 7) % 7);
            return away === 0 ? 1 : away === 1 ? 0.55 : 0.22;
          }),
        });
        return (
          <Animated.View
            key={index}
            style={{
              position: 'absolute',
              left: size / 2 + x - dot / 2,
              top: size / 2 + y - dot / 2,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: tint ?? light,
              opacity: reduced ? 0.8 : opacity,
            }}
          />
        );
      })}
    </View>
  );
}

/** Seven small lights in a row: the app's signature under a title. */
export function SevenDots() {
  return (
    <View style={styles.row} accessible={false}>
      {SEVEN.map((light, index) => (
        <View key={index} style={[styles.dot, { backgroundColor: light }]} />
      ))}
    </View>
  );
}

/**
 * Plays once: the seven lights open outward from a point and fade, for the
 * moment a day is done. Renders nothing with reduced motion.
 */
export function Bloom({ size = 220 }: { size?: number }) {
  const reduced = useReducedMotion();
  const open = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    Animated.timing(open, { toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [reduced, open]);

  if (reduced) return null;
  const dot = 14;
  return (
    <View pointerEvents="none" style={[styles.bloom, { width: size, height: size, marginLeft: -size / 2 }]}>
      {SEVEN.map((light, index) => {
        const { x, y } = place(index, size / 2 - dot);
        return (
          <Animated.View
            key={index}
            style={{
              position: 'absolute',
              left: size / 2 - dot / 2,
              top: size / 2 - dot / 2,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: light,
              opacity: open.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 0.8, 0] }),
              transform: [
                { translateX: open.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
                { translateY: open.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
                { scale: open.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.3] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, marginTop: 12 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  bloom: { position: 'absolute', left: '50%', top: -90 },
});
