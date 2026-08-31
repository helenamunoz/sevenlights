import { StyleSheet, View } from 'react-native';

import { alpha } from '@/theme/tokens';

/** How many circles a bloom is built from. Enough that no ring reads as an edge. */
const RINGS = 14;

/**
 * The glow behind a chakra. React Native has no radial gradient, so the bloom
 * is built from concentric circles of the same low opacity, packed tighter
 * toward the middle — cheap to render, and at this many rings indistinguishable
 * from a blur.
 */
export function Aura({
  color,
  size,
  intensity = 1,
}: {
  color: string;
  size: number;
  intensity?: number;
}) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { width: size, height: size }]}>
      {Array.from({ length: RINGS }, (_, i) => {
        // Rings crowd toward the center, so light gathers there the way it does.
        const d = size * Math.pow(1 - i / RINGS, 1.7);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: alpha(color, 0.046 * intensity),
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
