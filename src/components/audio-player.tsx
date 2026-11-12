import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import { useMediaUrl } from '@/lib/media';
import { alpha, color, font, radius, space } from '@/theme/tokens';

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** Plays a challenge's recording — a guided practice, say — from storage. */
export function AudioPlayer({ path, accent }: { path: string; accent: string }) {
  const uri = useMediaUrl(path);
  if (!uri) return null;
  return <Player uri={uri} accent={accent} />;
}

function Player({ uri, accent }: { uri: string; accent: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  // A practice recording should be heard even with the phone on silent.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const done = status.duration > 0 && status.currentTime >= status.duration - 0.25;
  const fraction = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (done) player.seekTo(0);
    player.play();
  }

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? t('audio.pause') : t('audio.play')}
      style={[styles.player, { borderColor: alpha(accent, 0.35) }]}>
      <View style={[styles.button, { backgroundColor: accent }]}>
        <Text style={styles.glyph}>{status.playing ? '❚❚' : '▶'}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{status.playing ? t('audio.playing') : t('audio.play')}</Text>
        <View style={styles.bar}>
          <View style={[styles.fill, { backgroundColor: accent, width: `${fraction * 100}%` }]} />
        </View>
        <Text style={styles.time}>
          {clock(status.currentTime)} / {status.duration > 0 ? clock(status.duration) : '–:––'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: color.surface,
    marginBottom: space.lg,
  },
  button: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontFamily: font.bodyBold, fontSize: 14, color: color.ink },
  body: { flex: 1, gap: 6 },
  label: { fontFamily: font.bodyMedium, fontSize: 14, color: color.text },
  bar: { height: 4, borderRadius: 2, backgroundColor: color.line, overflow: 'hidden' },
  fill: { height: 4 },
  time: { fontFamily: font.body, fontSize: 12, color: color.textFaint },
});
