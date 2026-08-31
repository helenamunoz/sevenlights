import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Aura } from '@/components/aura';
import { CHAKRA_COLORS } from '@/data/chakras';
import { useT } from '@/i18n';
import { alpha, color, glow, motion, space, type } from '@/theme/tokens';

/** How long the column stays lit before the app is allowed to take over. */
const HOLD_MS = 420;

/**
 * The opening: the column of lights comes up one at a time, root to crown, and
 * the name arrives under it. The static splash the OS shows is the same column
 * unlit, so this picks up from exactly the frame the system leaves behind.
 *
 * It waits for `ready` — fonts, stored boards, stored language — before it
 * clears, so the first screen the user sees is never a half-loaded one.
 */
export function Splash({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const t = useT();
  const lights = useMemo(() => [...CHAKRA_COLORS].reverse(), []);

  // One value per light, plus the name and the overlay itself.
  const lit = useRef(lights.map(() => new Animated.Value(0))).current;
  const name = useRef(new Animated.Value(0)).current;
  const cover = useRef(new Animated.Value(1)).current;
  const [ignited, setIgnited] = useState(false);

  useEffect(() => {
    // Root first: the column fills the way the app reads, from the bottom up.
    const ignition = Animated.stagger(
      motion.igniteStagger,
      [...lit].reverse().map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: motion.ignite,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    );
    const naming = Animated.timing(name, {
      toValue: 1,
      delay: motion.igniteStagger * 4,
      duration: motion.slow,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    const run = Animated.parallel([ignition, naming]);
    run.start(({ finished }) => finished && setIgnited(true));
    return () => run.stop();
  }, [lit, name]);

  useEffect(() => {
    if (!ignited || !ready) return;
    const timer = setTimeout(() => {
      Animated.timing(cover, {
        toValue: 0,
        duration: motion.slow,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(onFinish);
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [ignited, ready, cover, onFinish]);

  const size = 20;
  const gap = 44;

  return (
    <Animated.View
      style={[styles.screen, { opacity: cover }]}
      accessibilityLabel={t.app.name}>
      <View style={{ width: size * 4, height: gap * (lights.length - 1) + size }}>
        <View style={[styles.thread, { top: size / 2, bottom: size / 2 }]} />
        {lights.map((light, index) => (
          <View key={light} style={[styles.light, { top: index * gap, height: size }]}>
            <Animated.View style={[styles.halo, { opacity: lit[index] }]}>
              <Aura color={light} size={size * 3.6} intensity={1.35} />
            </Animated.View>
            <Animated.View
              style={[
                glow(light, size * 0.9, 0.6),
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: light,
                  opacity: lit[index].interpolate({ inputRange: [0, 1], outputRange: [0.28, 1] }),
                  transform: [
                    {
                      scale: lit[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.72, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        ))}
      </View>

      <Animated.Text
        style={[
          styles.name,
          {
            opacity: name,
            transform: [{ translateY: name.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          },
        ]}>
        {t.app.name}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxl,
  },
  thread: { position: 'absolute', left: '50%', width: 1, backgroundColor: alpha('#FFFFFF', 0.1) },
  light: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  name: { ...type.title, color: color.text, letterSpacing: -0.5 },
});
