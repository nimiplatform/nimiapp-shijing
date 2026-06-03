// SJG-ALGO-06 — natal chart (four-pillar) derivation under the W02
// Mirror Architecture v1 shape (NatalChartSnapshot { subject_ref,
// canonicalization_hash, year/month/day/hour pillars, day_master,
// missing_pillars }).

import type { SubjectRef } from '../../domain/subject-ref.ts';
import type {
  GanzhiPillar,
  HeavenlyStem,
  MissingPillarName,
  NatalCanonicalization,
  NatalChartSnapshot,
} from '../../domain/algorithm.ts';
import { HEAVENLY_STEMS } from '../../domain/algorithm.ts';
import { type StageResult } from './stage-result.ts';
import {
  branchFromIndex,
  dayPillarFromInstant,
  hourBranchFromTrueSolarHour,
  hourStemFromDayStemAndBranch,
  stemFromIndex,
} from './ganzhi.ts';
import { EPHEMERIS_VERSION, bagayearStartUtcMs, currentJieForInstant } from './solar-terms.ts';
import { computeCanonicalHash } from './canonical-hash.ts';

export interface BuildNatalChartInput {
  readonly subject_ref: SubjectRef;
  readonly canonicalization: NatalCanonicalization;
}

function yearPillarFromInstant(utcMs: number): GanzhiPillar {
  const date = new Date(utcMs);
  const civilYear = date.getUTCFullYear();
  const liChun = bagayearStartUtcMs(civilYear);
  const baziYear = utcMs >= liChun ? civilYear : civilYear - 1;
  const cycleOffset = ((baziYear - 1864) % 60 + 60) % 60;
  return {
    stem: stemFromIndex(cycleOffset),
    branch: branchFromIndex(cycleOffset),
    ephemeris_version: EPHEMERIS_VERSION,
  };
}

function monthPillarFromInstant(utcMs: number, yearStem: HeavenlyStem): GanzhiPillar {
  const jie = currentJieForInstant(utcMs);
  const branchIdx = jie.jie.month_branch_index;
  const yearStemIdx = HEAVENLY_STEMS.indexOf(yearStem);
  const yinStartTable = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
  const yinStart = yinStartTable[yearStemIdx]!;
  const monthOffset = (branchIdx - 2 + 12) % 12;
  const stemIdxValue = (yinStart + monthOffset) % 10;
  return {
    stem: stemFromIndex(stemIdxValue),
    branch: branchFromIndex(branchIdx),
    ephemeris_version: EPHEMERIS_VERSION,
  };
}

export function buildNatalChartSnapshot(input: BuildNatalChartInput): StageResult<NatalChartSnapshot> {
  if (!input.canonicalization.true_solar_time_utc) {
    return {
      ok: false,
      error: {
        stage: 'build_natal_chart',
        kind: 'stage_missing_input',
        subject_ref: input.subject_ref,
        detail: 'NatalCanonicalization missing true_solar_time_utc',
      },
    };
  }
  const trueSolarMs = new Date(input.canonicalization.true_solar_time_utc).getTime();
  if (Number.isNaN(trueSolarMs)) {
    return {
      ok: false,
      error: {
        stage: 'build_natal_chart',
        kind: 'stage_invalid_input',
        subject_ref: input.subject_ref,
        detail: 'true_solar_time_utc is not a valid Date instant',
      },
    };
  }
  const yearPillar = yearPillarFromInstant(trueSolarMs);
  const monthPillar = monthPillarFromInstant(trueSolarMs, yearPillar.stem);
  const dayPillar = dayPillarFromInstant(trueSolarMs);
  const trueSolarDate = new Date(trueSolarMs);
  const trueSolarHour = trueSolarDate.getUTCHours() + trueSolarDate.getUTCMinutes() / 60;
  const hourBranch = hourBranchFromTrueSolarHour(trueSolarHour);
  const hourStem = hourStemFromDayStemAndBranch(dayPillar.stem, hourBranch);
  const hourPillar: GanzhiPillar = {
    stem: hourStem,
    branch: hourBranch,
    ephemeris_version: EPHEMERIS_VERSION,
  };
  const precision = input.canonicalization.canonical_birth_precision;
  const missing: MissingPillarName[] = [];
  let yp: GanzhiPillar | undefined = yearPillar;
  let mp: GanzhiPillar | undefined = monthPillar;
  let dp: GanzhiPillar | undefined = dayPillar;
  let hp: GanzhiPillar | undefined = hourPillar;
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
    subject_ref: input.subject_ref,
    canonicalization_hash: computeCanonicalHash(input.canonicalization),
    ...(yp ? { year_pillar: yp } : {}),
    ...(mp ? { month_pillar: mp } : {}),
    ...(dp ? { day_pillar: dp } : {}),
    ...(hp ? { hour_pillar: hp } : {}),
    ...(dp ? { day_master: dp.stem } : {}),
    missing_pillars: missing,
  };
  return { ok: true, value: snapshot };
}
