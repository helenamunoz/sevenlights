import { View } from 'react-native';

import { moonAge } from '@/lib/moon';
import { color } from '@/theme/tokens';

/**
 * Tonight's moon, drawn from three shapes: a dark disc, a lit half, and an
 * ellipse over the middle that widens the light (gibbous) or eats into it
 * (crescent). Shown as seen from the northern hemisphere.
 */
export function Moon({ size = 28, lit = color.text, now }: { size?: number; lit?: string; now?: number }) {
  const age = moonAge(now);
  const waxing = age < 0.5;
  // 1 at new and full, 0 at the quarters.
  const bulge = Math.abs(Math.cos(age * 2 * Math.PI));
  const gibbous = age > 0.25 && age < 0.75;
  const dark = color.line;

  return (
    <View
      accessible={false}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: dark, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: size / 2,
          left: waxing ? size / 2 : 0,
          backgroundColor: lit,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: gibbous ? lit : dark,
          transform: [{ scaleX: bulge }],
        }}
      />
    </View>
  );
}
