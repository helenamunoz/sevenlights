/** Browsers cannot schedule local notifications, so reminders are phone-only. */
export const remindersSupported = false;

export type Reminder = {
  title: string;
  body: string;
  time: string;
  skipToday: boolean;
  until: string | null;
};

export async function allowReminders(): Promise<boolean> {
  return false;
}

export async function syncReminders(_reminders: Reminder[]): Promise<void> {}
