import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LightPicker } from '@/components/pickers';
import { BackBar, Button, Input, Label, Screen, Segmented, Title, useToast } from '@/components/ui';
import { lightColor, type ChakraId } from '@/data/chakras';
import { useCreateChallenge, type PickedAudio } from '@/lib/api/challenges';
import type { MissedRule } from '@/lib/db.types';
import { locale, t, type Locale, type TextKey } from '@/lib/i18n';
import { color, font, space } from '@/theme/tokens';

const DURATIONS = ['7', '21', '30', '49'];
const RULE_HINT: Record<MissedRule, TextKey> = {
  calendar: 'rule.calendarHint',
  any_pace: 'rule.anyPaceHint',
  strict: 'rule.strictHint',
};

/**
 * Create a challenge. The basics are a title and a length; everything a day
 * can hold — a timer, a recording, a link, a text for each day — is optional.
 */
export default function NewChallengeScreen() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateChallenge();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('21');
  const [rule, setRule] = useState<MissedRule>('calendar');
  const [language, setLanguage] = useState<Locale>(locale);
  const [light, setLight] = useState<ChakraId>('anahata');
  const [minutes, setMinutes] = useState('');
  const [link, setLink] = useState('');
  const [audio, setAudio] = useState<PickedAudio | null>(null);
  const [dayTexts, setDayTexts] = useState<string[]>([]);

  const days = Number.parseInt(duration, 10);
  const timerMinutes = minutes.trim() === '' ? null : Number.parseFloat(minutes.replace(',', '.'));
  const url = link.trim();

  const problem =
    title.trim().length < 3
      ? t('new.needTitle')
      : !(days >= 1 && days <= 365)
        ? t('new.badDuration')
        : timerMinutes !== null && !(timerMinutes > 0 && timerMinutes <= 120)
          ? t('new.badTimer')
          : url !== '' && !url.startsWith('https://')
            ? t('new.badLink')
            : null;

  async function pickAudio() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    const file = result.canceled ? null : result.assets[0];
    if (!file) return;
    if ((file.size ?? 0) > 30 * 1024 * 1024) {
      toast(t('new.audioTooBig'));
      return;
    }
    setAudio({ uri: file.uri, name: file.name, mimeType: file.mimeType ?? 'audio/mpeg' });
  }

  function submit() {
    create.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        duration_days: days,
        locale: language,
        missed_rule: rule,
        light,
        timer_seconds: timerMinutes === null ? null : Math.max(10, Math.round(timerMinutes * 60)),
        link_url: url || null,
        audio,
        days: dayTexts.slice(0, days).map((body, index) => ({ day_number: index + 1, body: body.trim() })),
      },
      {
        onSuccess: (id) => router.replace(`/challenge/${id}`),
        onError: (error) =>
          toast(error.message.includes('too_many_challenges') ? t('new.tooMany') : t('common.failed')),
      }
    );
  }

  return (
    <Screen header={<BackBar />}>
      <Title eyebrow={t('challenges.eyebrow')}>{t('challenges.create')}</Title>

      <Input
        label={t('new.title')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('new.titlePlaceholder')}
        maxLength={80}
      />
      <Input
        label={t('new.description')}
        value={description}
        onChangeText={setDescription}
        placeholder={t('new.descriptionPlaceholder')}
        multiline
        maxLength={1200}
      />

      <Label>{t('new.duration')}</Label>
      <View style={styles.block}>
        <Segmented
          value={DURATIONS.includes(duration) ? duration : 'other'}
          onChange={(value) => setDuration(value === 'other' ? '' : value)}
          options={[
            ...DURATIONS.map((value) => ({ value, label: t('challenge.days', { n: value }) })),
            { value: 'other', label: t('new.otherDuration') },
          ]}
        />
        {!DURATIONS.includes(duration) ? (
          <Input
            value={duration}
            onChangeText={(value) => setDuration(value.replace(/\D/g, ''))}
            placeholder={t('new.durationPlaceholder')}
            keyboardType="number-pad"
            maxLength={3}
            style={styles.gap}
          />
        ) : null}
      </View>

      <Label>{t('new.rule')}</Label>
      <View style={styles.block}>
        <Segmented
          value={rule}
          onChange={setRule}
          options={[
            { value: 'calendar', label: t('rule.calendar') },
            { value: 'any_pace', label: t('rule.anyPace') },
            { value: 'strict', label: t('rule.strict') },
          ]}
        />
        <Text style={styles.hint}>{t(RULE_HINT[rule])}</Text>
      </View>

      <Label>{t('new.language')}</Label>
      <View style={styles.block}>
        <Segmented
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'es', label: 'Español' },
            { value: 'en', label: 'English' },
          ]}
        />
      </View>

      <Label>{t('board.light')}</Label>
      <LightPicker value={light} onChange={setLight} />

      <Text style={styles.section}>{t('new.eachDay')}</Text>
      <Text style={styles.sectionHint}>{t('new.eachDayHint')}</Text>

      <Input
        label={t('new.timer')}
        value={minutes}
        onChangeText={setMinutes}
        placeholder={t('new.timerPlaceholder')}
        keyboardType="decimal-pad"
        maxLength={5}
      />
      <Input
        label={t('new.link')}
        value={link}
        onChangeText={setLink}
        placeholder="https://"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        maxLength={500}
      />

      <Label>{t('new.audio')}</Label>
      <View style={styles.block}>
        {audio ? <Text style={styles.file}>{audio.name}</Text> : null}
        <Button
          label={audio ? t('new.audioRemove') : t('new.audioPick')}
          kind="secondary"
          onPress={() => (audio ? setAudio(null) : pickAudio())}
        />
      </View>

      <Label>{t('new.dayTexts')}</Label>
      <Text style={styles.hint}>{t('new.dayTextsHint')}</Text>
      <View style={styles.gap}>
        {dayTexts.slice(0, days || 0).map((body, index) => (
          <Input
            key={index}
            label={t('challenge.day', { n: index + 1 })}
            value={body}
            onChangeText={(value) => setDayTexts(dayTexts.map((old, i) => (i === index ? value : old)))}
            multiline
            maxLength={1200}
            style={styles.dayText}
          />
        ))}
        {dayTexts.length < (days || 0) ? (
          <Button
            label={t('new.addDayText', { n: dayTexts.length + 1 })}
            kind="secondary"
            onPress={() => setDayTexts([...dayTexts, ''])}
          />
        ) : null}
      </View>

      <View style={styles.submit}>
        {problem && title !== '' ? <Text style={styles.problem}>{problem}</Text> : null}
        <Button
          label={t('new.publish')}
          accent={lightColor(light)}
          busy={create.isPending}
          disabled={problem !== null}
          onPress={submit}
        />
        <Text style={styles.hint}>{t('new.publishHint')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: space.lg },
  gap: { marginTop: space.md },
  hint: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.textFaint, marginTop: space.sm },
  section: { fontFamily: font.display, fontSize: 24, lineHeight: 30, color: color.text, marginTop: space.md },
  sectionHint: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 21,
    color: color.textSoft,
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  file: { fontFamily: font.bodyMedium, fontSize: 14, color: color.text, marginBottom: space.sm },
  dayText: { minHeight: 64 },
  submit: { marginTop: space.xl },
  problem: { fontFamily: font.body, fontSize: 13, color: color.warn, marginBottom: space.sm },
});
