// rule.shijing.product.r017 + rule.shijing.data-model.r011 — daily RiJing
// run time arithmetic, schedule (no catch-up), and the Settings field.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDailyRiJingSchedule,
  nextDailyRiJingRun,
  zonedDailyInstant,
} from '../src/product/daily-rijing/daily-rijing-schedule.ts';
import { commitDailyRiJing, dailyRiJingSettingsOf } from '../src/product/daily-rijing/daily-rijing-state.ts';
import { validateSettings } from '../src/contracts/settings-validator.ts';
import { validateShiJingSpace } from '../src/contracts/shijing-space-validator.ts';
import { validShiJingSpace } from './_fixtures.mjs';

const TZ = 'Asia/Shanghai';

function iso(date) {
  return date.toISOString();
}

test('the daily run time is read in the RiJing basis time zone and is strictly in the future', () => {
  // 07:00 Beijing on 2026-09-23 → today 08:00 Beijing.
  const early = nextDailyRiJingRun({ after: new Date('2026-09-22T23:00:00Z'), time: '08:00', timeZone: TZ });
  assert.equal(early.date, '2026-09-23');
  assert.equal(iso(early.at), '2026-09-23T00:00:00.000Z');
  // At or after the time → the next RiJing date.
  for (const after of ['2026-09-23T00:00:00Z', '2026-09-23T00:30:00Z']) {
    const next = nextDailyRiJingRun({ after: new Date(after), time: '08:00', timeZone: TZ });
    assert.equal(next.date, '2026-09-24');
    assert.equal(iso(next.at), '2026-09-24T00:00:00.000Z');
  }
  // 01:30 Beijing is still the previous UTC date; the run date is the Beijing date.
  const afterMidnight = new Date('2026-09-22T17:30:00Z');
  assert.deepEqual(
    [nextDailyRiJingRun({ after: afterMidnight, time: '00:15', timeZone: TZ })].map((run) => [run.date, iso(run.at)]),
    [['2026-09-24', '2026-09-23T16:15:00.000Z']],
  );
  assert.deepEqual(
    [nextDailyRiJingRun({ after: afterMidnight, time: '23:59', timeZone: TZ })].map((run) => [run.date, iso(run.at)]),
    [['2026-09-23', '2026-09-23T15:59:00.000Z']],
  );
});

test('zoned daily instants follow the zone offset of that date', () => {
  assert.equal(iso(zonedDailyInstant('2026-03-07', '09:00', 'America/New_York')), '2026-03-07T14:00:00.000Z');
  assert.equal(iso(zonedDailyInstant('2026-03-09', '09:00', 'America/New_York')), '2026-03-09T13:00:00.000Z');
  assert.equal(iso(zonedDailyInstant('2026-09-23', '08:00', TZ)), '2026-09-23T00:00:00.000Z');
});

function fakeClock(startIso) {
  let now = new Date(startIso).getTime();
  let seq = 0;
  const timers = new Map();
  return {
    now: () => new Date(now),
    setTimer(callback, delayMs) {
      seq += 1;
      timers.set(seq, { at: now + delayMs, callback });
      return seq;
    },
    clearTimer(handle) {
      timers.delete(handle);
    },
    pending: () => timers.size,
    // Moves the clock forward, firing due timers in order.
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = Math.max(now, due[1].at);
        due[1].callback();
      }
      now = until;
    },
    // A suspended process: the clock jumps without timers firing, then the
    // overdue timers fire on resume.
    suspend(ms) {
      now += ms;
      this.advance(0);
    },
  };
}

function schedule(clock) {
  const started = [];
  const missed = [];
  const value = createDailyRiJingSchedule({
    now: clock.now,
    timeZone: TZ,
    setTimer: (callback, delayMs) => clock.setTimer(callback, delayMs),
    clearTimer: (handle) => clock.clearTimer(handle),
    start: (run) => started.push(run.date),
    missed: (run) => missed.push(run.date),
  });
  return { value, started, missed };
}

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

test('an enabled daily run starts once at its time while ShiJing runs and re-arms for the next date', () => {
  const clock = fakeClock('2026-09-22T23:00:00Z'); // 07:00 Beijing
  const { value, started } = schedule(clock);
  value.configure({ enabled: true, time: '08:00' });
  assert.equal(iso(value.armed().at), '2026-09-23T00:00:00.000Z');
  // Re-rendering with the same setting keeps the armed run.
  value.configure({ enabled: true, time: '08:00' });
  assert.equal(clock.pending(), 1);
  clock.advance(HOUR - 1);
  assert.deepEqual(started, []);
  clock.advance(1);
  assert.deepEqual(started, ['2026-09-23']);
  assert.equal(value.armed().date, '2026-09-24');
  clock.advance(24 * HOUR);
  assert.deepEqual(started, ['2026-09-23', '2026-09-24']);
});

test('a time that passed before the schedule was armed is never caught up', () => {
  // ShiJing opened (or the setting enabled) at 08:30 with an 08:00 time.
  const clock = fakeClock('2026-09-23T00:30:00Z');
  const { value, started } = schedule(clock);
  value.configure({ enabled: true, time: '08:00' });
  assert.equal(value.armed().date, '2026-09-24');
  clock.advance(23 * HOUR);
  assert.deepEqual(started, []);
  clock.advance(HOUR);
  assert.deepEqual(started, ['2026-09-24']);
});

test('changing the time re-arms from now without running the passed time', () => {
  const clock = fakeClock('2026-09-23T01:00:00Z'); // 09:00 Beijing
  const { value, started } = schedule(clock);
  value.configure({ enabled: true, time: '10:00' });
  value.configure({ enabled: true, time: '08:30' });
  assert.equal(value.armed().date, '2026-09-24');
  clock.advance(2 * HOUR);
  assert.deepEqual(started, []);
});

test('a run resumed too late after suspension is missed, a slightly late one still starts', () => {
  const clock = fakeClock('2026-09-22T23:00:00Z');
  const { value, started, missed } = schedule(clock);
  value.configure({ enabled: true, time: '08:00' });
  clock.suspend(HOUR + 11 * MINUTE); // resumes at 08:11 Beijing
  assert.deepEqual(started, []);
  assert.deepEqual(missed, ['2026-09-23']);
  assert.equal(value.armed().date, '2026-09-24');
  clock.suspend(24 * HOUR - 11 * MINUTE + 4 * MINUTE); // resumes at 08:04 Beijing
  assert.deepEqual(started, ['2026-09-24']);
});

test('a late run never crosses into the next RiJing date, even within the ten-minute allowance', () => {
  const clock = fakeClock('2026-09-23T15:58:00Z'); // 23:58 Beijing
  const { value, started, missed } = schedule(clock);
  value.configure({ enabled: true, time: '23:59' });
  clock.suspend(5 * MINUTE); // 00:03 on September 24
  assert.deepEqual(started, []);
  assert.deepEqual(missed, ['2026-09-23']);
  assert.equal(value.armed().date, '2026-09-24');
  assert.equal(iso(value.armed().at), '2026-09-24T15:59:00.000Z');
  clock.advance(23 * HOUR + 56 * MINUTE);
  assert.deepEqual(started, ['2026-09-24']);
});

test('crossing UTC midnight within the same RiJing date does not discard a timely run', () => {
  const clock = fakeClock('2026-09-22T23:58:00Z'); // 07:58 Beijing
  const { value, started, missed } = schedule(clock);
  value.configure({ enabled: true, time: '07:59' });
  clock.suspend(5 * MINUTE); // 08:03 Beijing
  assert.deepEqual(started, ['2026-09-23']);
  assert.deepEqual(missed, []);
  assert.equal(value.armed().date, '2026-09-24');
});

test('disabling or stopping clears the armed run', () => {
  const clock = fakeClock('2026-09-22T23:00:00Z');
  const { value, started } = schedule(clock);
  value.configure({ enabled: true, time: '08:00' });
  value.configure({ enabled: false, time: '08:00' });
  assert.equal(value.armed(), null);
  assert.equal(clock.pending(), 0);
  value.configure({ enabled: true, time: '08:00' });
  value.stop();
  clock.advance(48 * HOUR);
  assert.deepEqual(started, []);
  assert.equal(clock.pending(), 0);
});

test('Settings.daily_rijing is optional and holds exactly enabled plus an HH:MM time', () => {
  const base = validShiJingSpace().settings;
  assert.deepEqual(validateSettings(base), { ok: true });
  assert.deepEqual(validateSettings({ ...base, daily_rijing: { enabled: true, time: '08:00' } }), { ok: true });
  assert.deepEqual(validateSettings({ ...base, daily_rijing: { enabled: false, time: '23:59' } }), { ok: true });
  for (const daily_rijing of [
    null,
    { enabled: true },
    { enabled: 'yes', time: '08:00' },
    { enabled: true, time: '8:00' },
    { enabled: true, time: '24:00' },
    { enabled: true, time: '08:00', catch_up: true },
  ]) {
    assert.equal(validateSettings({ ...base, daily_rijing }).ok, false, JSON.stringify(daily_rijing));
  }
  const space = validShiJingSpace({ settings: { ...base, daily_rijing: { enabled: true, time: '07:30' } } });
  assert.deepEqual(validateShiJingSpace(space), { ok: true });
});

test('the daily setting is off by default and commits only a valid time', () => {
  const space = validShiJingSpace();
  assert.deepEqual(dailyRiJingSettingsOf(space), { enabled: false, time: '08:00' });
  const committed = commitDailyRiJing(space, { enabled: true, time: '21:45' });
  assert.equal(committed.ok, true);
  assert.deepEqual(committed.next_space.settings.daily_rijing, { enabled: true, time: '21:45' });
  assert.deepEqual(commitDailyRiJing(space, { enabled: true, time: '9:5' }), { ok: false, code: 'daily_rijing_time_invalid' });
});
