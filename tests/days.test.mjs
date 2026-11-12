import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, daysBetween, localDate, progress } from '../src/lib/days.ts';

const tick = (day_number, local_date) => ({ day_number, local_date });

test('dates', () => {
  assert.equal(daysBetween('2026-02-27', '2026-03-01'), 2);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(localDate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('calendar: day 1 is the join date', () => {
  const p = progress('calendar', 21, '2026-03-10', [], '2026-03-10');
  assert.equal(p.currentDay, 1);
  assert.deepEqual(p.openDays, [1]);
  assert.equal(p.status, 'active');
});

test('calendar: yesterday stays open, older days are gaps', () => {
  const p = progress('calendar', 21, '2026-03-10', [tick(1, '2026-03-10')], '2026-03-14');
  assert.equal(p.currentDay, 5);
  assert.deepEqual(p.openDays, [4, 5]);
  assert.equal(p.done, 1);
  assert.equal(p.streak, 0);
});

test('calendar: streak counts back from today or yesterday', () => {
  const ticks = [tick(2, '2026-03-11'), tick(3, '2026-03-12'), tick(4, '2026-03-13')];
  assert.equal(progress('calendar', 21, '2026-03-10', ticks, '2026-03-13').streak, 3);
  assert.equal(progress('calendar', 21, '2026-03-10', ticks, '2026-03-14').streak, 3);
  assert.equal(progress('calendar', 21, '2026-03-10', ticks, '2026-03-15').streak, 0);
});

test('calendar: ends after the last day, with one grace day', () => {
  const ticks = [tick(1, '2026-03-10'), tick(2, '2026-03-11')];
  const grace = progress('calendar', 3, '2026-03-10', ticks, '2026-03-13');
  assert.deepEqual(grace.openDays, [3]);
  assert.equal(grace.status, 'active');
  const over = progress('calendar', 3, '2026-03-10', ticks, '2026-03-14');
  assert.equal(over.status, 'ended');
  assert.equal(over.done, 2);
  const all = progress('calendar', 3, '2026-03-10', [...ticks, tick(3, '2026-03-12')], '2026-03-20');
  assert.equal(all.status, 'completed');
});

test('any pace: in order, once a day, never fails', () => {
  const p = progress('any_pace', 3, '2026-03-10', [tick(1, '2026-03-10')], '2026-03-20');
  assert.deepEqual(p.openDays, [2]);
  assert.equal(p.status, 'active');
  const same = progress('any_pace', 3, '2026-03-10', [tick(1, '2026-03-20')], '2026-03-20');
  assert.deepEqual(same.openDays, []);
  assert.equal(same.doneToday, true);
  assert.equal(same.streak, 1);
  const done = progress(
    'any_pace', 3, '2026-03-10',
    [tick(1, '2026-03-10'), tick(2, '2026-03-15'), tick(3, '2026-03-16')], '2026-03-16'
  );
  assert.equal(done.status, 'completed');
  assert.equal(done.streak, 2);
});

test('strict: a missed day breaks it', () => {
  const ok = progress('strict', 21, '2026-03-10', [tick(1, '2026-03-10')], '2026-03-11');
  assert.deepEqual(ok.openDays, [2]);
  assert.equal(ok.status, 'active');
  const broken = progress('strict', 21, '2026-03-10', [tick(1, '2026-03-10')], '2026-03-12');
  assert.equal(broken.status, 'broken');
  assert.deepEqual(broken.openDays, []);
  const full = progress(
    'strict', 2, '2026-03-10', [tick(1, '2026-03-10'), tick(2, '2026-03-11')], '2026-04-01'
  );
  assert.equal(full.status, 'completed');
});
