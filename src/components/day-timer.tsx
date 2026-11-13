import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Aura } from '@/components/aura';
import { Button } from '@/components/ui';
import { artwork } from '@/data/brand';
import { t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

const KEEP_AWAKE = 'day-timer';
const BREATH_MS = 5000;

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * A countdown for a day's practice, with a light that swells and settles at a
 * slow breathing pace. Time is measured against the clock, not counted in
 * ticks, so it stays right if the app goes to the background and comes back.
 */
export function DayTimer({
  seconds,
  accent,
  paper = false,
  onFinish,
}: {
  seconds: number;
  accent: string;
  paper?: boolean;
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
  const action = left === 0 ? t('timer.again')
    : running ? t('timer.pause')
    : left < seconds ? t('timer.resume')
    : t('timer.start');

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Animated.View style={{ transform: [{ scale }] }}>
          {paper ? (
            <Image source={artwork.disc} style={styles.disc} contentFit="contain" accessible={false} />
          ) : (
            <Aura color={accent} size={230} intensity={running ? 1.5 : 0.9} />
          )}
        </Animated.View>
        <Text style={styles.time} accessibilityLiveRegion="none">{clock(Math.ceil(left))}</Text>
      </View>
      <Text style={styles.hint}>{t('timer.hint')}</Text>
      <Button label={action} onPress={toggle} accent={accent} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: space.md },
  stage: { width: 250, height: 250, alignItems: 'center', justifyContent: 'center' },
  disc: { width: 230, height: 230 },
  time: {
    position: 'absolute',
    fontFamily: font.display,
    fontSize: 54,
    lineHeight: 60,
    fontVariant: ['tabular-nums'],
    color: color.text,
    textShadowColor: color.scrim,
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
  hint: { fontFamily: font.body, fontSize: 15, color: color.textSoft, textAlign: 'center', marginBottom: space.md },
  button: { width: '100%', maxWidth: 320 },
});
