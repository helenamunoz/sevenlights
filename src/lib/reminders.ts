import * as Notifications from 'expo-notifications';

import { addDays, localDate } from '@/lib/days';

/**
 * Daily challenge reminders, as notifications scheduled on the phone itself —
 * there is no push server. iOS keeps at most 64 pending, and a repeating one
 * could not stop when a challenge ends or skip a day already done, so each
 * challenge gets one dated notification per day for the coming week. They are
 * rebuilt whenever the app opens or something changes.
 */
export const remindersSupported = true;

const DAYS_AHEAD = 7;
const MAX_PENDING = 56;

export type Reminder = {
  title: string;
  body: string;
  /** `HH:MM` or `HH:MM:SS`, in the phone's time zone. */
  time: string;
  /** True when today's part is already done, so today needs no nudge. */
  skipToday: boolean;
  /** Last local date worth reminding on, or null when there is no end. */
  until: string | null;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Asks for permission if needed. False means the person said no. */
export async function allowReminders(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function syncReminders(reminders: Reminder[]): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (reminders.length === 0) return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;

    const today = localDate();
    const now = Date.now();
    let scheduled = 0;
    // Day by day across challenges, so a long list fills the nearest days first.
    for (let offset = 0; offset < DAYS_AHEAD; offset++) {
      const date = addDays(today, offset);
      for (const reminder of reminders) {
        if (scheduled >= MAX_PENDING) return;
        if (offset === 0 && reminder.skipToday) continue;
        if (reminder.until && date > reminder.until) continue;
        const [year, month, day] = date.split('-').map(Number);
        const [hour, minute] = reminder.time.split(':').map(Number);
        const when = new Date(year, month - 1, day, hour, minute);
        if (when.getTime() <= now) continue;
        await Notifications.scheduleNotificationAsync({
          content: { title: reminder.title, body: reminder.body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
        });
        scheduled++;
      }
    }
  } catch {
    // Reminders are a convenience; never let them break the screen that set them.
  }
}
