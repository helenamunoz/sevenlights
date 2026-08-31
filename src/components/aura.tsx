import { StyleSheet, View } from 'react-native';

import { alpha } from '@/theme/tokens';

/**
 * The glow behind a chakra. React Native has no radial gradient, so the bloom
 * is built from concentric circles of decreasing opacity — cheap to render and
 * indistinguishable from a blur at these sizes.
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
  const rings = [
    { scale: 1, opacity: 0.1 * intensity },
    { scale: 0.72, opacity: 0.13 * intensity },
    { scale: 0.48, opacity: 0.17 * intensity },
    { scale: 0.28, opacity: 0.22 * intensity },
    { scale: 0.14, opacity: 0.3 * intensity },
  ];

  return (
    <View pointerEvents="none" style={[styles.wrap, { width: size, height: size }]}>
      {rings.map((ring) => {
        const d = size * ring.scale;
        return (
          <View
            key={ring.scale}
            style={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: alpha(color, ring.opacity),
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
