// SJG-ALGO-07 — DaYun direction + start-age + current period under the
// W02 Mirror Architecture v1 trimmed DayunSnapshot shape.

import type { CalculationSex } from '../../domain/person.ts';
import type { DayunDirection, DayunSnapshot, GanzhiPillar } from '../../domain/algorithm.ts';
import { isStemYang } from './ganzhi.ts';
import { currentJieForInstant } from './solar-terms.ts';

export interface DayunComputeInput {
  readonly required: boolean;
  readonly calculation_sex: CalculationSex;
  readonly year_pillar: GanzhiPillar | undefined;
  readonly true_solar_birth_utc_ms: number;
}

export type DayunComputeOutcome =
  | { ok: true; value: DayunSnapshot }
  | { ok: false; reason: 'calculation_sex_unspecified' | 'year_pillar_missing' };

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365.25 * MS_PER_DAY;
const PERIOD_YEARS = 10;

export function computeDayun(input: DayunComputeInput): DayunComputeOutcome {
  if (!input.required) {
    return { ok: true, value: { required: false } };
  }
  if (input.calculation_sex === 'unspecified') {
    return { ok: false, reason: 'calculation_sex_unspecified' };
  }
  if (!input.year_pillar) {
    return { ok: false, reason: 'year_pillar_missing' };
  }
  const yang = isStemYang(input.year_pillar.stem);
  const direction: DayunDirection =
    (input.calculation_sex === 'male' && yang) || (input.calculation_sex === 'female' && !yang)
      ? 'forward'
      : 'reverse';
  const jie = currentJieForInstant(input.true_solar_birth_utc_ms);
  const referenceMs = direction === 'forward' ? jie.next.utc_ms : jie.jie.utc_ms;
  const distanceMs = Math.abs(input.true_solar_birth_utc_ms - referenceMs);
  const distanceDays = distanceMs / MS_PER_DAY;
  const startAgeYears = distanceDays / 3;
  const startUtcMs = input.true_solar_birth_utc_ms + startAgeYears * MS_PER_YEAR;
  return {
    ok: true,
    value: {
      required: true,
      direction,
      start_age_years: Number(startAgeYears.toFixed(2)),
      current_period_start_utc: new Date(startUtcMs).toISOString(),
      current_period_end_utc: new Date(startUtcMs + PERIOD_YEARS * MS_PER_YEAR).toISOString(),
      current_pillar: input.year_pillar,
    },
  };
}
