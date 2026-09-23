// Settings > 每日日镜 — pure-state helper for the daily RiJing run settings
// (rule.shijing.data-model.r011).

import {
  DEFAULT_DAILY_RIJING_TIME,
  isDailyRiJingTime,
  type DailyRiJingSettings,
} from '../../domain/settings.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';

export function dailyRiJingSettingsOf(space: ShiJingSpace): DailyRiJingSettings {
  return space.settings.daily_rijing ?? { enabled: false, time: DEFAULT_DAILY_RIJING_TIME };
}

export type CommitDailyRiJingResult =
  | { readonly ok: true; readonly next_space: ShiJingSpace }
  | { readonly ok: false; readonly code: 'daily_rijing_time_invalid' };

export function commitDailyRiJing(space: ShiJingSpace, next: DailyRiJingSettings): CommitDailyRiJingResult {
  if (!isDailyRiJingTime(next.time)) return { ok: false, code: 'daily_rijing_time_invalid' };
  return {
    ok: true,
    next_space: {
      ...space,
      settings: { ...space.settings, daily_rijing: { enabled: next.enabled === true, time: next.time } },
    },
  };
}
