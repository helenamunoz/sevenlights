import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { CoverArt } from '@/components/brand';
import { AudioPlayer } from '@/components/audio-player';
import { DayTimer } from '@/components/day-timer';
import { Bloom } from '@/components/ember';
import { BackBar, Button, Empty, Input, Loading, Screen, Toggle, useToast } from '@/components/ui';
import { artwork, challengeColor, isBreathingChallenge } from '@/data/brand';
import { closingFor } from '@/data/daily';
import {
  useChallenge,
  useChallengeDays,
  useCheckIn,
  useMyProgress,
  useUndoCheckIn,
  useUpdateNote,
} from '@/lib/api/challenges';
import type { Challenge, Checkin } from '@/lib/db.types';
import { t, tr } from '@/lib/i18n';
import { afterglow, color, font, space } from '@/theme/tokens';

/** One day of a challenge: what there is to do, then tick it and leave a note. */
export default function DayScreen() {
  const { id, n } = useLocalSearchParams<{ id: string; n: string }>();
  const day = Number.parseInt(n, 10);
  const challenge = useChallenge(id);

  if (challenge.isPending) {
    return (
      <Screen header={<BackBar />}>
        <Loading />
      </Screen>
    );
  }
  if (!challenge.data || !(day >= 1 && day <= challenge.data.duration_days)) {
    return (
      <Screen header={<BackBar />}>
        <Empty>{t('challenge.missing')}</Empty>
      </Screen>
    );
  }
  return <DayView challenge={challenge.data} day={day} />;
}

function DayView({ challenge, day }: { challenge: Challenge; day: number }) {
  const breathing = isBreathingChallenge(challenge);
  const accent = challengeColor(challenge);
  const checkInAccent = breathing ? afterglow.honey : accent;
  const days = useChallengeDays(challenge.id);
  const { progress, checkins } = useMyProgress(challenge);
  const [justDone, setJustDone] = useState(false);
  const router = useRouter();

  // A day's own settings win over the challenge's defaults.
  const own = days.data?.find((d) => d.day_number === day);
  const timer = own?.timer_seconds ?? challenge.timer_seconds;
  const audio = own?.audio_path ?? challenge.audio_path;
  const link = own?.link_url ?? challenge.link_url;

  const checkin = checkins.find((c) => c.day_number === day);
  const open = progress?.openDays.includes(day) ?? false;

  return (
    <Screen header={<BackBar />}>
      <Text style={styles.challenge}>{challenge.title}</Text>
      <Text style={styles.title}>
        {t('challenge.dayOf', { day, total: challenge.duration_days })}
      </Text>

      {checkin ? (
        <View style={styles.closingBlock}>
          {/* Ticked a moment ago, on this screen: the bloom, and a way back. */}
          {justDone ? <Bloom /> : null}
          <Text style={[styles.done, { color: checkInAccent }]}>✓ {t('day.done')}</Text>
          <Text style={styles.closing}>{tr(closingFor(day, challenge.duration_days))}</Text>
          {justDone ? <Button label={t('day.continue')} accent={checkInAccent} onPress={() => router.back()} /> : null}
        </View>
      ) : null}

      {own?.body ? <Text style={styles.body}>{own.body}</Text> : null}
      {timer ? <DayTimer key={`${challenge.id}:${day}:${timer}`} seconds={timer} accent={accent} paper={breathing} /> : null}
      {audio ? <AudioPlayer path={audio} accent={accent} /> : null}
      {link ? (
        <Button
          label={t('day.openLink')}
          kind="secondary"
          onPress={() => Linking.openURL(link)}
          style={styles.link}
        />
      ) : null}

      <View style={styles.finish}>
        {breathing && (checkin || open) ? <CoverArt source={artwork.notebook} style={styles.cover} /> : null}
        {checkin ? (
          <Done challenge={challenge} checkin={checkin} accent={checkInAccent} />
        ) : open ? (
          <Tick
            challenge={challenge}
            day={day}
            accent={checkInAccent}
            onDone={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              setJustDone(true);
            }}
          />
        ) : (
          <Text style={styles.closed}>
            {!progress
              ? t('day.notJoined')
              : progress.status === 'broken'
                ? t('challenge.brokenLong')
                : day > progress.currentDay || (challenge.missed_rule === 'any_pace' && progress.doneToday)
                  ? t('day.notYet')
                  : t('day.missed')}
          </Text>
        )}
      </View>
    </Screen>
  );
}

function Tick({
  challenge,
  day,
  accent,
  onDone,
}: {
  challenge: Challenge;
  day: number;
  accent: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const checkIn = useCheckIn();
  const [note, setNote] = useState('');
  const [shared, setShared] = useState(false);

  return (
    <>
      <NoteFields note={note} setNote={setNote} shared={shared} setShared={setShared} accent={accent} />
      <Button
        label={t('day.tick')}
        accent={accent}
        busy={checkIn.isPending}
        onPress={() => {
          // The tick shows at once and this component goes with it, so the moment is marked now, not on reply.
          onDone();
          checkIn.mutate(
            { challengeId: challenge.id, day, note: note.trim(), notePublic: shared },
            { onError: () => toast(t('common.failed')) }
          );
        }}
      />
    </>
  );
}

function Done({
  challenge,
  checkin,
  accent,
}: {
  challenge: Challenge;
  checkin: Checkin;
  accent: string;
}) {
  const toast = useToast();
  const update = useUpdateNote();
  const undo = useUndoCheckIn();
  const [note, setNote] = useState(checkin.note);
  const [shared, setShared] = useState(checkin.note_public);
  const changed = note.trim() !== checkin.note || shared !== checkin.note_public;

  return (
    <>
      <NoteFields note={note} setNote={setNote} shared={shared} setShared={setShared} accent={accent} />
      {changed ? (
        <Button
          label={t('common.save')}
          accent={accent}
          busy={update.isPending}
          onPress={() =>
            update.mutate(
              { challengeId: challenge.id, day: checkin.day_number, note: note.trim(), notePublic: shared },
              { onSuccess: () => toast(t('common.saved')), onError: () => toast(t('common.saveFailed')) }
            )
          }
        />
      ) : null}
      <Button
        label={t('day.untick')}
        kind="quiet"
        onPress={() =>
          undo.mutate(
            { challengeId: challenge.id, day: checkin.day_number },
            { onError: () => toast(t('common.failed')) }
          )
        }
      />
    </>
  );
}

function NoteFields({
  note,
  setNote,
  shared,
  setShared,
  accent,
}: {
  note: string;
  setNote: (value: string) => void;
  shared: boolean;
  setShared: (value: boolean) => void;
  accent: string;
}) {
  return (
    <>
      <Input
        label={t('day.note')}
        value={note}
        onChangeText={setNote}
        placeholder={t('day.notePlaceholder')}
        multiline
        maxLength={1000}
      />
      <Toggle
        label={t('day.share')}
        hint={shared ? t('day.shareOn') : t('day.shareOff')}
        value={shared}
        onChange={setShared}
        accent={accent}
      />
      <View style={styles.gap} />
    </>
  );
}

const styles = StyleSheet.create({
  challenge: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
    marginTop: space.md,
  },
  title: { fontFamily: font.display, fontSize: 36, lineHeight: 41, color: color.text, marginTop: space.sm },
  body: {
    fontFamily: font.displayItalic,
    fontSize: 26,
    lineHeight: 36,
    color: color.text,
    marginTop: space.xl,
    marginBottom: space.md,
  },
  link: { marginBottom: space.lg },
  finish: { marginTop: space.xl },
  cover: { width: '100%', height: 116, marginBottom: space.md },
  done: { fontFamily: font.bodyBold, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', marginBottom: space.sm },
  closing: {
    fontFamily: font.displayItalic,
    fontSize: 24,
    lineHeight: 32,
    color: color.text,
    marginBottom: space.lg,
  },
  closingBlock: { marginTop: space.lg, marginBottom: space.sm },
  closed: { fontFamily: font.displayItalic, fontSize: 20, lineHeight: 28, color: color.textFaint },
  gap: { height: space.md },
});
