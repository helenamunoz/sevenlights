/** Pure checks: nothing here touches the table, so it can be read as the rulebook. */

export class Refused extends Error {
  constructor(code: string) {
    super(code);
    this.name = 'Refused';
  }
}

export function refuse(code: string): never {
  throw new Refused(code);
}

export const CHAKRAS = [
  'muladhara',
  'svadhisthana',
  'manipura',
  'anahata',
  'vishuddha',
  'ajna',
  'sahasrara',
] as const;
export const LOCALES = ['es', 'en'];
export const RULES = ['calendar', 'any_pace', 'strict'];
export const REPORT_TARGETS = ['board', 'challenge', 'comment', 'checkin', 'profile'];
const RESERVED = ['admin', 'sevenlights', 'siete_luces', 'support', 'soporte'];

export const MAX_IMAGES = 60;
export const MAX_WORDS = 24;
export const CHALLENGES_PER_DAY = 5;
export const COMMENTS_PER_DAY = 100;

export function text(value: unknown, max: number, min = 0, code = 'bad_text'): string {
  if (typeof value !== 'string') refuse(code);
  const length = [...value].length;
  if (length < min || length > max) refuse(code);
  return value;
}

export function oneOf<T extends string>(value: unknown, options: readonly T[] | string[], code: string): T {
  if (typeof value !== 'string' || !(options as string[]).includes(value)) refuse(code);
  return value as T;
}

export function username(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z0-9_]{3,20}$/.test(value) || RESERVED.includes(value)) {
    refuse('bad_username');
  }
  return value;
}

export function words(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_WORDS) refuse('bad_words');
  return value.map((word) => text(word, 60, 1, 'bad_words'));
}

export function timer(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || (value as number) < 10 || (value as number) > 7200) refuse('bad_timer');
  return value as number;
}

export function link(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^https:\/\//.test(value) || value.length > 500) refuse('bad_link');
  return value;
}

export function id(value: unknown, code = 'bad_id'): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(value)) refuse(code);
  return value;
}

const DAY = 86_400_000;

export function utcDate(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

/**
 * The app sends the person's own calendar date. It can only be a day either
 * side of the server's, which covers every time zone and nothing more.
 */
export function localDate(value: unknown, code: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    refuse(code);
  }
  if (Math.abs(daysBetween(utcDate(), value)) > 1) refuse(code);
  return value;
}

/**
 * Lower bound of the Wilson score interval (95%). Unlike up-minus-down it does
 * not let an old challenge with many votes sit on top forever, and a new one
 * with a few good votes can climb.
 */
export function wilson(up: number, down: number): number {
  const n = up + down;
  if (n <= 0) return 0;
  const p = up / n;
  const z2 = 3.8416;
  return (p + z2 / (2 * n) - 1.96 * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n);
}

/**
 * A check-in has to be for a day the member has actually reached, under the
 * rule the challenge's creator chose. `done` is what they have ticked so far.
 */
export function checkDay(
  rule: string,
  duration: number,
  startDate: string,
  done: { day_number: number; local_date: string }[],
  day: number,
  today: string
): void {
  if (!Number.isInteger(day) || day < 1 || day > duration) refuse('day_out_of_range');
  if (done.some((tick) => tick.day_number === day)) refuse('already_done');

  if (rule === 'any_pace') {
    if (day !== done.length + 1) refuse('day_out_of_order');
    if (done.some((tick) => tick.local_date === today)) refuse('already_done_today');
    return;
  }
  // Day n falls on start + n − 1 in the member's calendar.
  const reached = daysBetween(startDate, today) + 1;
  if (day > reached) refuse('day_in_future');
  if (rule === 'calendar' && day < reached - 1) refuse('day_too_old');
  if (rule === 'strict') {
    if (day !== reached) refuse('day_too_old');
    if (day > 1 && !done.some((tick) => tick.day_number === day - 1)) refuse('streak_broken');
  }
}
