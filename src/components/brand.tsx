import { Image, type ImageStyle } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp } from 'react-native';

import { color, font, radius, space } from '@/theme/tokens';

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  const size = compact ? 24 : 52;
  return (
    <View style={styles.lockup}>
      <Image
        source={require('../../assets/brand/ember-ring.png')}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessible={false}
      />
      <Text style={[styles.wordmark, compact && styles.compact]}>7Lights</Text>
    </View>
  );
}

export function CoverArt({ source, style }: { source: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={source} style={[styles.cover, style]} contentFit="cover" accessible={false} />;
}

const styles = StyleSheet.create({
  lockup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  wordmark: { fontFamily: font.display, fontSize: 47, lineHeight: 53, letterSpacing: -1.8, color: color.text },
  compact: { fontSize: 22, lineHeight: 26, letterSpacing: -0.6 },
  cover: { borderRadius: radius.md, backgroundColor: color.ink2 },
});
