// EN daily RiJing run product copy.

import type { ProductCopy } from '../copy-types.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const EN_DAILY_RIJING_COPY: ProductCopy['dailyRiJing'] = {
  title: 'Daily Mirror schedule',
  enable: 'Generate the Daily Mirror every day',
  time: 'Time',
  note: 'Runs only while ShiJing is open, on Beijing time. A time missed while ShiJing is closed or asleep is not made up.',
  saved: (enabled, time) => (enabled ? `Daily Mirror will be generated every day at ${time}` : 'Daily Mirror schedule turned off'),
  saveFailed: (detail) => `Daily Mirror schedule not saved: ${detail}`,
  pageNote: (time) => `Daily Mirror schedule is on: today's reading is generated at ${time}, and a missed time is not made up. You can also generate it now.`,
  notice: {
    blocked: {
      persistence_unavailable: "Today's Daily Mirror was not generated: local data can't be read or written right now.",
      profile_incomplete: "Today's Daily Mirror was not generated: your profile is incomplete.",
      missing_focus: "Today's Daily Mirror was not generated: no active focus yet.",
    },
    failed: (reason) => `Scheduled Daily Mirror — ${reason}`,
    saveFailed: (detail) => `Today's Daily Mirror was generated but not saved: ${detail}`,
    view: 'Open Daily Mirror',
    unsynced: 'The Daily Mirror is saved but not yet synced to Nimi activity.',
    retrySync: 'Sync again',
  },
  activity: {
    title: (month, day) => `Daily Mirror for ${MONTHS[month - 1] ?? month} ${day} is ready`,
    summary: (dayPillar, methodLabel) => (dayPillar ? `${dayPillar} day · ${methodLabel}` : methodLabel),
  },
};
