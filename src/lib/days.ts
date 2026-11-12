/**
 * Day arithmetic for challenges. Pure, so it can be tested without the app.
 *
 * Day 1 is the calendar date on which a person joined, in their own time zone;
 * dates travel as `YYYY-MM-DD` strings and never as instants, so a challenge
 * does not jump a day when someone flies or the clocks change.
 *
 * The creator picks what a missed day means:
 *   calendar  the challenge ends N days after joining; gaps stay empty.
 *   any_pace  it is complete when N days are ticked, at most one per day.
 *   strict    a missed day breaks it, and the person starts again from day 1.
 */

export type Rule = 'calendar' | 'any_pace' | 'strict';
export type Tick = { day_number: number; local_date: string };

export type Progress = {
  /** Days ticked so far. */
  done: number;
  doneDays: Set<number>;
  /** Where the person is now, 1…duration. */
  currentDay: number;
  /** Days that can be ticked right now. */
  openDays: number[];
  /** Whether today's part is already done. */
  doneToday: boolean;
  /** Consecutive days up to now. */
  streak: number;
  status: 'active' | 'completed' | 'ended' | 'broken';
};

export function localDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function progress(
  rule: Rule,
  duration: number,
  startDate: string,
  ticks: Tick[],
  today: string = localDate()
): Progress {
  const doneDays = new Set(ticks.map((t) => t.day_number));
  const done = doneDays.size;
  const completed = done >= duration;

  if (rule === 'any_pace') {
    const dates = new Set(ticks.map((t) => t.local_date));
    const doneToday = dates.has(today);
    let streak = 0;
    for (let d = doneToday ? today : addDays(today, -1); dates.has(d); d = addDays(d, -1)) streak++;
    const next = Math.min(done + 1, duration);
    return {
      done,
      doneDays,
      currentDay: next,
      openDays: !completed && !doneToday ? [done + 1] : [],
      doneToday,
      streak,
      status: completed ? 'completed' : 'active',
    };
  }

  const calendarDay = daysBetween(startDate, today) + 1;
  const currentDay = Math.min(Math.max(calendarDay, 1), duration);
  const doneToday = calendarDay <= duration && doneDays.has(calendarDay);

  let streak = 0;
  for (let d = doneDays.has(calendarDay) ? calendarDay : calendarDay - 1; d >= 1 && doneDays.has(d); d--) {
    streak++;
  }

  if (rule === 'strict') {
    let missed = false;
    for (let d = 1; d < Math.min(calendarDay, duration + 1); d++) {
      if (!doneDays.has(d)) missed = true;
    }
    const open = !missed && calendarDay >= 1 && calendarDay <= duration && !doneDays.has(calendarDay);
    return {
      done,
      doneDays,
      currentDay,
      openDays: open ? [calendarDay] : [],
      doneToday,
      streak,
      status: completed ? 'completed' : missed ? 'broken' : 'active',
    };
  }

  // calendar: today, and yesterday as a grace day.
  const openDays = [calendarDay - 1, calendarDay].filter(
    (d) => d >= 1 && d <= duration && !doneDays.has(d)
  );
  const over = calendarDay > duration && openDays.length === 0;
  return {
    done,
    doneDays,
    currentDay,
    openDays,
    doneToday,
    streak,
    status: completed ? 'completed' : over ? 'ended' : 'active',
  };
}
