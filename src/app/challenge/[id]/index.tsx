import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Aura } from '@/components/aura';
import { Byline } from '@/components/avatar';
import { challengeFacts } from '@/components/challenge-card';
import { CommentList, Entry, shortDate } from '@/components/comment-list';
import { ReportMenu } from '@/components/report-menu';
import { ShareCard, ShareDots, ShareModal, shareStyles } from '@/components/share-card';
import { ActionSheet, Sheet, SheetRow, type Action } from '@/components/sheet';
import { BackBar, Button, Empty, Label, Loading, Screen, useToast } from '@/components/ui';
import { VoteBar } from '@/components/vote-bar';
import { lightColor } from '@/data/chakras';
import {
  useChallenge,
  useDeleteChallenge,
  useJoin,
  useLeave,
  useMyProgress,
  useRestart,
  useSetReminder,
  useSharedNotes,
} from '@/lib/api/challenges';
import { useMe } from '@/lib/auth';
import type { Progress } from '@/lib/days';
import type { Challenge, MissedRule } from '@/lib/db.types';
import { t, type TextKey } from '@/lib/i18n';
import { allowReminders, remindersSupported } from '@/lib/reminders';
import { alpha, color, font, radius, space } from '@/theme/tokens';

const RULE: Record<MissedRule, TextKey> = {
  calendar: 'rule.calendarHint',
  any_pace: 'rule.anyPaceHint',
  strict: 'rule.strictHint',
};

/** Half-hour steps through the waking day, for the reminder sheet. */
const TIMES = Array.from({ length: 36 }, (_, i) => {
  const minutes = 5 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

/** A challenge: what it is, where you are in it, and what others say. */
export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenge = useChallenge(id);

  if (challenge.isPending) {
    return (
      <Screen header={<BackBar />}>
        <Loading />
      </Screen>
    );
  }
  if (!challenge.data) {
    return (
      <Screen header={<BackBar />}>
        <Empty>{challenge.isError ? t('common.loadFailed') : t('challenge.missing')}</Empty>
      </Screen>
    );
  }
  return <ChallengeView challenge={challenge.data} />;
}

function ChallengeView({ challenge }: { challenge: Challenge }) {
  const router = useRouter();
  const toast = useToast();
  const me = useMe();
  const accent = lightColor(challenge.light);
  const { membership, progress } = useMyProgress(challenge);
  const notes = useSharedNotes(challenge.id);
  const join = useJoin();
  const leave = useLeave();
  const restart = useRestart();
  const remove = useDeleteChallenge();
  const setReminder = useSetReminder();

  const [sharing, setSharing] = useState(false);
  const [choosingTime, setChoosingTime] = useState(false);
  const [confirming, setConfirming] = useState<'leave' | 'delete' | 'restart' | null>(null);

  const failed = { onError: () => toast(t('common.failed')) };
  const menu: Action[] = [];
  if (membership) {
    menu.push({ label: t('challenge.restart'), onPress: () => setConfirming('restart') });
    menu.push({ label: t('challenge.leave'), destructive: true, onPress: () => setConfirming('leave') });
  }
  if (challenge.creator_id === me) {
    menu.push({ label: t('challenge.delete'), destructive: true, onPress: () => setConfirming('delete') });
  }

  async function chooseTime(time: string | null) {
    setChoosingTime(false);
    if (time && !(await allowReminders())) {
      toast(t('reminder.denied'));
      return;
    }
    setReminder.mutate({ challengeId: challenge.id, time }, failed);
  }

  const today = progress?.openDays.at(-1);

  return (
    <Screen
      header={
        <BackBar
          right={
            <>
              {progress ? (
                <Pressable onPress={() => setSharing(true)} hitSlop={12} accessibilityRole="button">
                  <Text style={styles.link}>{t('share.share')}</Text>
                </Pressable>
              ) : null}
              <ReportMenu type="challenge" id={challenge.id} authorId={challenge.creator_id} extra={menu} />
            </>
          }
        />
      }>
      <View style={styles.glow} pointerEvents="none">
        <Aura color={accent} size={360} intensity={0.9} />
      </View>

      <Text style={styles.facts}>{challengeFacts(challenge)}</Text>
      <Text style={styles.title}>{challenge.title}</Text>
      {challenge.is_official ? (
        <Text style={[styles.official, { color: accent }]}>{t('challenge.byApp')}</Text>
      ) : (
        <Pressable
          style={styles.creator}
          disabled={!challenge.creator}
          onPress={() => challenge.creator && router.push(`/user/${challenge.creator.username}`)}>
          <Byline person={challenge.creator} />
        </Pressable>
      )}
      {challenge.description ? <Text style={styles.description}>{challenge.description}</Text> : null}
      <Text style={styles.rule}>{t(RULE[challenge.missed_rule])}</Text>

      {challenge.hidden_at ? <Text style={styles.warning}>{t('challenge.hiddenNotice')}</Text> : null}

      {!membership || !progress ? (
        <View style={styles.block}>
          <Button
            label={t('challenge.join')}
            accent={accent}
            busy={join.isPending}
            onPress={() => join.mutate(challenge.id, failed)}
          />
          <Text style={styles.hint}>{t('challenge.joinHint')}</Text>
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={styles.status}>{statusLine(challenge, progress)}</Text>
          <DayGrid
            challenge={challenge}
            progress={progress}
            accent={accent}
            onOpen={(day) => router.push(`/challenge/${challenge.id}/day/${day}`)}
          />
          {today ? (
            <Button
              label={t('challenge.doDay', { n: today })}
              accent={accent}
              onPress={() => router.push(`/challenge/${challenge.id}/day/${today}`)}
            />
          ) : progress.status === 'active' ? (
            <Text style={styles.hint}>{t('challenge.comeBack')}</Text>
          ) : (
            <Button
              label={t('challenge.restart')}
              kind="secondary"
              busy={restart.isPending}
              onPress={() => setConfirming('restart')}
            />
          )}

          {remindersSupported && progress.status === 'active' ? (
            <Pressable onPress={() => setChoosingTime(true)} style={styles.reminder} accessibilityRole="button">
              <Text style={styles.reminderLabel}>{t('reminder.label')}</Text>
              <Text style={styles.reminderValue}>
                {membership.reminder_time ? membership.reminder_time.slice(0, 5) : t('reminder.off')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {!challenge.is_official ? (
        <View style={styles.block}>
          <Label>{t('challenge.vote')}</Label>
          <VoteBar challenge={challenge} accent={accent} />
        </View>
      ) : null}

      {notes.data?.length ? (
        <View style={styles.block}>
          <Label>{t('challenge.notes')}</Label>
          {notes.data.map((note) => (
            <Entry
              key={note.id}
              author={note.author}
              detail={`${t('challenge.day', { n: note.day_number })} · ${shortDate(note.done_at)}`}
              body={note.note}
              menu={<ReportMenu type="checkin" id={note.id} authorId={note.user_id} />}
            />
          ))}
        </View>
      ) : null}

      <CommentList challengeId={challenge.id} accent={accent} />

      <Sheet visible={choosingTime} onClose={() => setChoosingTime(false)} title={t('reminder.title')}>
        <SheetRow label={t('reminder.off')} quiet onPress={() => chooseTime(null)} />
        {TIMES.map((time) => (
          <SheetRow key={time} label={time} onPress={() => chooseTime(time)} />
        ))}
      </Sheet>

      <ActionSheet
        visible={confirming !== null}
        onClose={() => setConfirming(null)}
        title={
          confirming === 'leave'
            ? t('challenge.leaveTitle')
            : confirming === 'delete'
              ? t('challenge.deleteTitle')
              : t('challenge.restartTitle')
        }
        message={
          confirming === 'leave'
            ? t('challenge.leaveMessage')
            : confirming === 'delete'
              ? t('challenge.deleteMessage')
              : t('challenge.restartMessage')
        }
        actions={[
          confirming === 'leave'
            ? {
                label: t('challenge.leave'),
                destructive: true,
                onPress: () => leave.mutate(challenge.id, failed),
              }
            : confirming === 'delete'
              ? {
                  label: t('challenge.delete'),
                  destructive: true,
                  onPress: () =>
                    remove.mutate(challenge.id, {
                      onSuccess: () => router.back(),
                      onError: (error) =>
                        toast(error.message === 'has-members' ? t('challenge.deleteRefused') : t('common.failed')),
                    }),
                }
              : {
                  label: t('challenge.restart'),
                  destructive: true,
                  onPress: () => restart.mutate(challenge.id, failed),
                },
        ]}
      />

      {progress ? (
        <ShareModal visible={sharing} onClose={() => setSharing(false)}>
          <ShareCard accent={accent} eyebrow={t('share.challenge')} title={challenge.title}>
            <Text style={shareStyles.big}>
              {progress.done}
              <Text style={shareStyles.small}> / {challenge.duration_days}</Text>
            </Text>
            <ShareDots total={challenge.duration_days} done={progress.doneDays} accent={accent} />
            {progress.streak > 1 ? (
              <Text style={shareStyles.small}>{t('challenge.streak', { n: progress.streak })}</Text>
            ) : null}
          </ShareCard>
        </ShareModal>
      ) : null}
    </Screen>
  );
}

function statusLine(challenge: Challenge, progress: Progress): string {
  const total = challenge.duration_days;
  switch (progress.status) {
    case 'completed':
      return t('challenge.completedLong', { total });
    case 'broken':
      return t('challenge.brokenLong');
    case 'ended':
      return t('challenge.ended', { done: progress.done, total });
    default: {
      const where = t('challenge.dayOf', { day: progress.currentDay, total });
      return progress.streak > 1 ? `${where} · ${t('challenge.streak', { n: progress.streak })}` : where;
    }
  }
}

/** Every day of the challenge as a small numbered light. */
function DayGrid({
  challenge,
  progress,
  accent,
  onOpen,
}: {
  challenge: Challenge;
  progress: Progress;
  accent: string;
  onOpen: (day: number) => void;
}) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: challenge.duration_days }, (_, index) => {
        const day = index + 1;
        const done = progress.doneDays.has(day);
        const open = progress.openDays.includes(day);
        return (
          <Pressable
            key={day}
            onPress={() => onOpen(day)}
            accessibilityRole="button"
            accessibilityLabel={`${t('challenge.day', { n: day })}${done ? `, ${t('day.done')}` : ''}`}
            style={[
              styles.day,
              done && { backgroundColor: accent, borderColor: accent },
              open && { borderColor: accent },
            ]}>
            <Text style={[styles.dayText, done && { color: color.ink }, open && { color: color.text }]}>
              {day}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: -150, right: -150 },
  link: { fontFamily: font.bodyMedium, fontSize: 14, color: color.textSoft },
  facts: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
    marginTop: space.md,
  },
  title: { fontFamily: font.display, fontSize: 36, lineHeight: 41, color: color.text, marginTop: space.sm },
  official: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: space.md,
  },
  creator: { marginTop: space.md, alignSelf: 'flex-start' },
  description: { fontFamily: font.body, fontSize: 16, lineHeight: 25, color: color.textSoft, marginTop: space.lg },
  rule: { fontFamily: font.displayItalic, fontSize: 15, lineHeight: 22, color: color.textFaint, marginTop: space.md },
  warning: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 21,
    color: color.warn,
    borderWidth: 1,
    borderColor: alpha(color.warn, 0.4),
    borderRadius: radius.sm,
    padding: space.md,
    marginTop: space.lg,
  },
  block: { marginTop: space.xl },
  hint: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 19,
    color: color.textFaint,
    textAlign: 'center',
    marginTop: space.sm,
  },
  status: { fontFamily: font.display, fontSize: 22, lineHeight: 28, color: color.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: space.lg },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontFamily: font.bodyMedium, fontSize: 12, color: color.textFaint },
  reminder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    marginTop: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
  },
  reminderLabel: { fontFamily: font.body, fontSize: 15, color: color.text },
  reminderValue: { fontFamily: font.bodyMedium, fontSize: 15, color: color.textSoft },
});
