import { useEffect } from 'react';

import { useMemberships, useMyCheckins } from '@/lib/api/challenges';
import { addDays, progress } from '@/lib/days';
import { t } from '@/lib/i18n';
import { syncReminders, type Reminder } from '@/lib/reminders';

/**
 * Keeps the phone's scheduled reminders in step with the challenges the person
 * is doing: rebuilt on launch and whenever a membership or check-in changes.
 * Renders nothing.
 */
export function ReminderSync() {
  const memberships = useMemberships();
  const checkins = useMyCheckins();

  useEffect(() => {
    if (!memberships.data || !checkins.data) return;
    const reminders: Reminder[] = [];
    for (const membership of memberships.data) {
      if (!membership.reminder_time) continue;
      const { challenge } = membership;
      const state = progress(
        challenge.missed_rule,
        challenge.duration_days,
        membership.start_date,
        checkins.data.filter((c) => c.challenge_id === challenge.id)
      );
      if (state.status !== 'active') continue;
      reminders.push({
        title: challenge.title,
        body: t('reminder.body'),
        time: membership.reminder_time,
        skipToday: state.doneToday,
        until:
          challenge.missed_rule === 'any_pace'
            ? null
            : addDays(membership.start_date, challenge.duration_days - 1),
      });
    }
    syncReminders(reminders);
  }, [memberships.data, checkins.data]);

  return null;
}
