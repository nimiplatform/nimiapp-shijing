// When the in-app daily RiJing run starts. Pure time arithmetic plus a small
// timer owner; nothing here runs while ShiJing is closed, and nothing catches
// up a time that passed before the schedule was armed.

import type { DailyRiJingSettings } from '../../domain/settings.ts';
import { dailyMirrorScopeForToday } from '../tabs/mirror-scope-helpers.ts';

// A suspended ShiJing that resumes later than this after the run time has
// missed that run; timer jitter stays well inside it.
export const DAILY_RIJING_START_ALLOWANCE_MS = 10 * 60 * 1000;

function zonedWallClockMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    calendar: 'gregory',
    numberingSystem: 'latn',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((entry) => entry.type === type)!.value);
  return Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
}

/** The instant at which the wall clock in `timeZone` reads `time` on `date`. */
export function zonedDailyInstant(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const [hour, minute] = time.split(':').map(Number) as [number, number];
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wall - (zonedWallClockMs(new Date(wall), timeZone) - wall);
  guess = wall - (zonedWallClockMs(new Date(guess), timeZone) - guess);
  return new Date(guess);
}

function nextDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export interface DailyRiJingRun {
  // The RiJing date the run generates.
  readonly date: string;
  readonly at: Date;
}

/** The first daily run strictly after `after`. */
export function nextDailyRiJingRun(input: {
  readonly after: Date;
  readonly time: string;
  readonly timeZone: string;
}): DailyRiJingRun {
  let date = dailyMirrorScopeForToday(input.after, input.timeZone).date;
  for (;;) {
    const at = zonedDailyInstant(date, input.time, input.timeZone);
    if (at.getTime() > input.after.getTime()) return { date, at };
    date = nextDate(date);
  }
}

export function dailyRiJingRunMissed(run: DailyRiJingRun, now: Date, timeZone: string): boolean {
  // The allowance permits jitter only within the scheduled RiJing date.
  // A previous day's late timer must never generate the new day early.
  return dailyMirrorScopeForToday(now, timeZone).date !== run.date
    || now.getTime() - run.at.getTime() > DAILY_RIJING_START_ALLOWANCE_MS;
}

export interface DailyRiJingScheduleDeps {
  readonly now: () => Date;
  readonly timeZone: string;
  readonly setTimer: (callback: () => void, delayMs: number) => unknown;
  readonly clearTimer: (handle: unknown) => void;
  // Starts the run for its date; the generation entry decides whether
  // anything needs generating.
  readonly start: (run: DailyRiJingRun) => void;
  // Reports a run that was due while ShiJing was suspended too long.
  readonly missed?: (run: DailyRiJingRun) => void;
}

export interface DailyRiJingSchedule {
  // Arms the next run after now for the given settings; unchanged settings
  // keep the armed run.
  configure(settings: DailyRiJingSettings | undefined): void;
  readonly armed: () => DailyRiJingRun | null;
  stop(): void;
}

// @nimi-authority: rule.shijing.product.r017
export function createDailyRiJingSchedule(deps: DailyRiJingScheduleDeps): DailyRiJingSchedule {
  let armedFor: string | null = null;
  let run: DailyRiJingRun | null = null;
  let timer: unknown = null;

  function clear() {
    if (timer !== null) deps.clearTimer(timer);
    timer = null;
    run = null;
  }

  function arm(time: string, after: Date) {
    clear();
    const next = nextDailyRiJingRun({ after, time, timeZone: deps.timeZone });
    run = next;
    wait(time, next);
  }

  function wait(time: string, next: DailyRiJingRun) {
    timer = deps.setTimer(() => fire(time, next), Math.max(0, next.at.getTime() - deps.now().getTime()));
  }

  function fire(time: string, due: DailyRiJingRun) {
    timer = null;
    const now = deps.now();
    if (now.getTime() < due.at.getTime()) {
      wait(time, due);
      return;
    }
    if (dailyRiJingRunMissed(due, now, deps.timeZone)) deps.missed?.(due);
    else deps.start(due);
    arm(time, now.getTime() > due.at.getTime() ? now : due.at);
  }

  return {
    configure(settings) {
      const key = settings?.enabled ? settings.time : null;
      if (key === armedFor) return;
      armedFor = key;
      if (key === null) clear();
      else arm(key, deps.now());
    },
    armed: () => run,
    stop() {
      armedFor = null;
      clear();
    },
  };
}
