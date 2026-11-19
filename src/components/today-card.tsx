import { StyleSheet, Text, View } from 'react-native';

import { Aura } from '@/components/aura';
import { Moon } from '@/components/moon';
import { DAY_LIGHTS, MOON_NAMES } from '@/data/daily';
import { t, tr } from '@/lib/i18n';
import { moonPhase } from '@/lib/moon';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/** Today's light and tonight's moon: the one part of home that is different every day. */
export function TodayCard() {
  const light = DAY_LIGHTS[new Date().getDay()];
  const phase = moonPhase();

  return (
    <View style={[styles.card, { borderColor: alpha(light.color, 0.3) }]}>
      <View style={styles.glow}>
        <Aura color={light.glow ?? light.color} size={72} intensity={1.6} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{t('today.label')}</Text>
        <Text style={[styles.word, { color: light.color }]}>{tr(light.word)}</Text>
        <Text style={styles.line}>{tr(light.line)}</Text>
        <View style={styles.moon}>
          <Moon size={14} />
          <Text style={styles.moonName}>
            {phase === 'new' ? t('today.newMoon') : phase === 'full' ? t('today.fullMoon') : tr(MOON_NAMES[phase])}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.ink2,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: space.md,
    paddingRight: space.md,
    marginBottom: space.lg,
  },
  glow: { width: 72, height: 72 },
  body: { flex: 1, gap: 2 },
  label: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  word: { fontFamily: font.display, fontSize: 24, lineHeight: 29 },
  line: { fontFamily: font.displayItalic, fontSize: 18, lineHeight: 25, color: color.textSoft },
  moon: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xs },
  moonName: { flex: 1, fontFamily: font.bodyMedium, fontSize: 12, lineHeight: 17, color: color.textFaint },
});
