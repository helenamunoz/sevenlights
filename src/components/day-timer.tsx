import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Aura } from '@/components/aura';
import { t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

const KEEP_AWAKE = 'day-timer';
const BREATH_MS = 5000;

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * A countdown for a day's practice, with a light that swells and settles at a
 * slow breathing pace. Time is measured against the clock, not counted in
 * ticks, so it stays right if the app goes to the background and comes back.
 */
export function DayTimer({
  seconds,
  accent,
  onFinish,
}: {
  seconds: number;
  accent: string;
  onFinish?: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const endsAt = useRef(0);
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!running) return;
    activateKeepAwakeAsync(KEEP_AWAKE).catch(() => {});
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: BREATH_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: BREATH_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    const interval = setInterval(() => {
      const remaining = Math.max(0, (endsAt.current - Date.now()) / 1000);
      setLeft(remaining);
      if (remaining === 0) {
        setRunning(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onFinish?.();
      }
    }, 250);
    return () => {
      clearInterval(interval);
      loop.stop();
      deactivateKeepAwake(KEEP_AWAKE).catch(() => {});
    };
  }, [running, breath, onFinish]);

  function toggle() {
    if (running) {
      setRunning(false);
      return;
    }
    const from = left === 0 ? seconds : left;
    setLeft(from);
    endsAt.current = Date.now() + from * 1000;
    setRunning(true);
  }

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.08] });
  const finished = left === 0;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={running ? t('timer.pause') : t('timer.start')}
        style={styles.stage}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Aura color={accent} size={230} intensity={running ? 1.5 : 0.9} />
        </Animated.View>
        <View style={styles.center}>
          <Text style={styles.time} accessibilityLiveRegion="none">
            {clock(Math.ceil(left))}
          </Text>
          <Text style={styles.action}>
            {finished ? t('timer.again') : running ? t('timer.pause') : left < seconds ? t('timer.resume') : t('timer.start')}
          </Text>
        </View>
      </Pressable>
      {running ? <Text style={styles.hint}>{t('timer.hint')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: space.md },
  stage: { width: 250, height: 250, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  time: { fontFamily: font.display, fontSize: 54, lineHeight: 60, color: color.text },
  action: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: color.textSoft,
    marginTop: space.xs,
  },
  hint: { fontFamily: font.displayItalic, fontSize: 15, color: color.textFaint, marginTop: space.sm },
});
