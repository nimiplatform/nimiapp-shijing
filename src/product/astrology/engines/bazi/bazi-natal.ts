// SJG-ALGO-06 — natal four-pillar chart for the 八字 engine. Derives the chart
// from the true-solar wall-clock via tyme4ts, then applies the SJG-ALGO-10
// precision-degradation rules (omit dependent pillars when birth precision is
// rough).

import type {
  GanzhiPillar,
  MissingPillarName,
  NatalCanonicalization,
  NatalChartSnapshot,
} from '../../../../domain/algorithm.ts';
import type { SubjectRef } from '../../../../domain/subject-ref.ts';
import { type StageResult } from '../../stage-result.ts';
import { computeCanonicalHash } from '../../canonical-hash.ts';
import { buildFourPillars, type SolarWallClock } from './bazi-calendar.ts';

// The true-solar instant is stored as a UTC ISO string whose Y/M/D/H/M/S fields
// ARE the apparent-solar wall-clock (R1). Read them back as wall-clock fields.
export function wallClockFromTrueSolarIso(iso: string): SolarWallClock | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

export function buildBaziNatalChart(
  subject_ref: SubjectRef,
  canonicalization: NatalCanonicalization,
): StageResult<NatalChartSnapshot> {
  if (!canonicalization.true_solar_time_utc) {
    return {
      ok: false,
      error: {
        stage: 'build_natal_chart',
        kind: 'stage_missing_input',
        subject_ref,
        detail: 'NatalCanonicalization missing true_solar_time_utc',
      },
    };
  }
  const wall = wallClockFromTrueSolarIso(canonicalization.true_solar_time_utc);
  if (!wall) {
    return {
      ok: false,
      error: {
        stage: 'build_natal_chart',
        kind: 'stage_invalid_input',
        subject_ref,
        detail: 'true_solar_time_utc is not a valid Date instant',
      },
    };
  }

  const pillars = buildFourPillars(wall);
  const precision = canonicalization.canonical_birth_precision;
  const missing: MissingPillarName[] = [];
  let yp: GanzhiPillar | undefined = pillars.year;
  let mp: GanzhiPillar | undefined = pillars.month;
  let dp: GanzhiPillar | undefined = pillars.day;
  let hp: GanzhiPillar | undefined = pillars.hour;
  if (precision !== 'exact') {
    missing.push('hour');
    hp = undefined;
  }
  if (precision === 'rough_month' || precision === 'rough_year' || precision === 'unknown') {
    missing.push('day');
    dp = undefined;
  }
  if (precision === 'rough_year' || precision === 'unknown') {
    missing.push('month');
    mp = undefined;
  }
  if (precision === 'unknown') {
    missing.push('year');
    yp = undefined;
  }

  const snapshot: NatalChartSnapshot = {
    subject_ref,
    canonicalization_hash: computeCanonicalHash(canonicalization),
    ...(yp ? { year_pillar: yp } : {}),
    ...(mp ? { month_pillar: mp } : {}),
    ...(dp ? { day_pillar: dp } : {}),
    ...(hp ? { hour_pillar: hp } : {}),
    ...(dp ? { day_master: dp.stem } : {}),
    missing_pillars: missing,
  };
  return { ok: true, value: snapshot };
}
