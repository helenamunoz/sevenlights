import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Aura } from '@/components/aura';
import { EmberLoader } from '@/components/ember';
import { Button } from '@/components/ui';
import { artwork } from '@/data/brand';
import { t } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

const KEEP_AWAKE = 'day-timer';
const BREATH_MS = 5000;
/** How long the threshold stays up before the practice begins. */
const ARRIVE_MS = 3500;
const bowl = require('../../assets/sounds/bowl.mp3') as number;

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * A countdown for a day's practice, with a light that swells and settles at a
 * slow breathing pace. Time is measured against the clock, not counted in
 * ticks, so it stays right if the app goes to the background and comes back.
 *
 * Starting from the top passes a threshold first: a few seconds of an empty
 * page that says "Arrive." A bowl sounds as the practice begins and again as
 * it ends.
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
  const [arriving, setArriving] = useState(false);
  const bell = useAudioPlayer(bowl);

  // The bowl marks the practice, so it should sound with the phone on silent, like a recording does.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  function ring() {
    try {
      bell.seekTo(0);
      bell.play();
    } catch {
      // No sound is no reason to stop a practice.
    }
  }

  function begin(from: number) {
    setArriving(false);
    setLeft(from);
    endsAt.current = Date.now() + from * 1000;
    setRunning(true);
    ring();
  }

  useEffect(() => {
    if (!arriving) return;
    const wait = setTimeout(() => begin(seconds), ARRIVE_MS);
    return () => clearTimeout(wait);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arriving]);
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
        ring();
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
    // From the top, the threshold comes first; resuming goes straight back in.
    if (left === 0 || left === seconds) {
      setArriving(true);
      return;
    }
    setLeft(left);
    endsAt.current = Date.now() + left * 1000;
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
      <Modal visible={arriving} transparent animationType="fade" onRequestClose={() => begin(seconds)}>
        <Pressable style={styles.threshold} onPress={() => begin(seconds)} accessibilityRole="button">
          <EmberLoader size={64} />
          <Text style={styles.arrive}>{t('timer.arrive')}</Text>
        </Pressable>
      </Modal>
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
  threshold: { flex: 1, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center', gap: space.xl },
  arrive: { fontFamily: font.displayItalic, fontSize: 40, lineHeight: 48, color: color.text },
  hint: { fontFamily: font.body, fontSize: 15, color: color.textSoft, textAlign: 'center', marginBottom: space.md },
  button: { width: '100%', maxWidth: 320 },
});
