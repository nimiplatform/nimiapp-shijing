// 生时校正 — event-based birth-time rectification.
//
// The birth HOUR barely moves the 大运 timeline (起运 spreads only ~4 months
// across a whole day, never a whole boundary YEAR), so 大运-boundary alignment
// CANNOT distinguish 时辰. What genuinely varies by hour is the 时柱 itself: each
// year's 流年支 forms a 冲/刑/害/合 with exactly one branch, so 流年×时支
// interactions discriminate the 时辰, and the 晚子 (23:00) day-pillar roll yields a
// different day master entirely. We score candidates by how strongly the user's
// event years "light up" the candidate's 时柱 + 用神, rank them, and let the user
// confirm. It corrects the uncertain INPUT (the hour); the engine is never
// altered. Gregorian birth date, v1. This narrows the 时辰 — it is an aid, not an
// oracle; confidence stays honest about how separable the candidates are.

import type { NatalInputs } from '../../domain/person.ts';
import type { EventMemory } from '../../domain/event-memory.ts';
import type { BaziBranchRelationKind } from '../../domain/algorithm.ts';
import type {
  RectificationAlignedEvent,
  RectificationCandidate,
  RectificationConfidence,
  RectificationOutcome,
} from '../../domain/rectification.ts';
import { RECTIFICATION_MIN_EVENTS } from '../../domain/rectification.ts';
import { canonicalizeNatalInputs } from './canonicalize-natal-inputs.ts';
import { localWallClockToUtcInstant } from './local-wall-clock.ts';
import { buildBaziNatalChart, wallClockFromTrueSolarIso } from './engines/bazi/bazi-natal.ts';
import {
  computeDayunSequence,
  eightCharOf,
  transitPillarsForCivilDate,
} from './engines/bazi/bazi-calendar.ts';
import { buildBaziInterpretation } from './engines/bazi/bazi-features.ts';
import { baziPeriodNature } from './engines/bazi/bazi-tendency.ts';
import { classifyTransitNatalPair } from './engines/bazi/bazi-transit-relations.ts';

const SELF_REF = 'self' as const;

// 13 representative wall-clock times: the 12 时辰 block midpoints + 晚子时 (23:00),
// which can roll the day pillar and so is a distinct chart from 早子时 (00:00).
const CANDIDATE_TIMES: readonly { readonly time: string; readonly lateZi: boolean }[] = [
  { time: '00:00', lateZi: false },
  { time: '02:00', lateZi: false },
  { time: '04:00', lateZi: false },
  { time: '06:00', lateZi: false },
  { time: '08:00', lateZi: false },
  { time: '10:00', lateZi: false },
  { time: '12:00', lateZi: false },
  { time: '14:00', lateZi: false },
  { time: '16:00', lateZi: false },
  { time: '18:00', lateZi: false },
  { time: '20:00', lateZi: false },
  { time: '22:00', lateZi: false },
  { time: '23:00', lateZi: true },
];

// 流年支 × 时支 interaction weights — 冲 is the strongest "eventful" mark.
const INTERACTION_WEIGHT: Readonly<Record<BaziBranchRelationKind, number>> = {
  相冲: 1.0,
  相刑: 0.7,
  相害: 0.5,
  相破: 0.4,
  六合: 0.6,
  三合: 0.6,
};
const HOUR_WEIGHT = 0.7; // 时支×流年 — the hour-discriminating signal
const YONG_WEIGHT = 0.3; // 用神 swing of the event year — eventful, lightly hour-sensitive

export interface RectifyBirthTimeInput {
  readonly natal_inputs: NatalInputs;
  readonly events: readonly EventMemory[];
}

// Apply a confirmed candidate 时辰 back onto the natal inputs: set the wall-clock
// time to the 时辰 representative time and promote precision to `exact`. This is
// the input correction that makes the chart accurate — the user confirms it.
export function applyRectifiedBirthTime(
  base: NatalInputs,
  representativeTime: string,
): NatalInputs | null {
  const tz = base.birth_location.iana_time_zone;
  const date = base.raw_birth_input.local_date_text;
  const instant = localWallClockToUtcInstant(`${date}T${representativeTime}:00`, tz);
  if (!instant) return null;
  return {
    ...base,
    raw_birth_input: { ...base.raw_birth_input, local_time_text: representativeTime },
    birth_precision: 'exact',
    birth_datetime_utc: instant.toISOString(),
  };
}

function eventYear(event: EventMemory): number | null {
  const m = /^(\d{4})/.exec(event.occurred_at);
  return m ? Number(m[1]) : null;
}

function round(n: number): number {
  return Number(n.toFixed(3));
}

function confidenceFor(
  ranked: readonly RectificationCandidate[],
  eventCount: number,
): RectificationConfidence {
  if (ranked.length < 2) return 'low';
  const top = ranked[0]!.fit_score;
  // Lift over the field, not gap-to-second: adjacent 时辰 can tie. What matters is
  // whether the best fit clearly beats a random 时辰. Close neighbours stay
  // visible in the ranked list as alternatives.
  const mean = ranked.reduce((sum, c) => sum + c.fit_score, 0) / ranked.length;
  const lift = top - mean;
  if (eventCount >= 3 && top >= 0.45 && lift >= 0.18) return 'high';
  if (eventCount >= 2 && top >= 0.3 && lift >= 0.1) return 'medium';
  return 'low';
}

export function rectifyBirthTime(input: RectifyBirthTimeInput): RectificationOutcome {
  const base = input.natal_inputs;
  if (base.raw_birth_input.calendar_system !== 'gregorian') {
    return { ok: false, reason: 'calendar_not_gregorian' };
  }
  const date = base.raw_birth_input.local_date_text;
  const birthYearMatch = /^(\d{4})/.exec(date ?? '');
  if (!date || !birthYearMatch) return { ok: false, reason: 'missing_birth_date' };
  if (base.calculation_sex === 'unspecified') {
    return { ok: false, reason: 'calculation_sex_unspecified' };
  }
  const sex = base.calculation_sex;
  const tz = base.birth_location.iana_time_zone;

  const minYear = Number(birthYearMatch[1]);
  const eventPairs = input.events
    .map((e) => ({ ref: e.id, year: eventYear(e) }))
    .filter((p): p is { ref: string; year: number } => p.year !== null && p.year > minYear);
  if (eventPairs.length < RECTIFICATION_MIN_EVENTS) {
    return { ok: false, reason: 'not_enough_events' };
  }

  const candidates: RectificationCandidate[] = [];

  for (const { time, lateZi } of CANDIDATE_TIMES) {
    const instant = localWallClockToUtcInstant(`${date}T${time}:00`, tz);
    if (!instant) continue;
    const candidateNatal: NatalInputs = {
      ...base,
      raw_birth_input: { ...base.raw_birth_input, local_time_text: time },
      birth_precision: 'exact',
      birth_datetime_utc: instant.toISOString(),
    };
    const canon = canonicalizeNatalInputs(candidateNatal);
    if (!canon.ok || !canon.value.true_solar_time_utc) continue;
    const natal = buildBaziNatalChart(SELF_REF, canon.value);
    if (!natal.ok || !natal.value.hour_pillar || !natal.value.day_pillar) continue;
    const wall = wallClockFromTrueSolarIso(canon.value.true_solar_time_utc);
    if (!wall) continue;

    const hourBranch = natal.value.hour_pillar.branch;
    const interpretation = buildBaziInterpretation(eightCharOf(wall), natal.value);
    const sequence = computeDayunSequence(wall, sex);

    const aligned: RectificationAlignedEvent[] = [];
    let sum = 0;
    for (const pair of eventPairs) {
      const yearPillar = transitPillarsForCivilDate(pair.year, 6, 1).year;
      const interaction = classifyTransitNatalPair(yearPillar.branch, hourBranch);
      const hourScore = interaction ? INTERACTION_WEIGHT[interaction] : 0;
      const yongScore =
        interpretation && baziPeriodNature(yearPillar.stem, interpretation.yong_shen).favor !== '平'
          ? 1
          : 0;
      sum += HOUR_WEIGHT * hourScore + YONG_WEIGHT * yongScore;
      aligned.push({ event_memory_ref: pair.ref, year: pair.year, hour_interaction: interaction });
    }

    candidates.push({
      hour_branch: hourBranch,
      is_late_zi: lateZi,
      representative_time: time,
      hour_pillar: natal.value.hour_pillar,
      day_pillar: natal.value.day_pillar,
      start_age_years: sequence.start_age_years,
      boundary_years: sequence.periods.map((p) => p.start_lunar_year),
      fit_score: round(sum / eventPairs.length),
      aligned_events: aligned,
    });
  }

  if (candidates.length === 0) {
    return { ok: false, reason: 'missing_birth_date' };
  }

  const ranked = [...candidates].sort(
    (a, b) => b.fit_score - a.fit_score || a.representative_time.localeCompare(b.representative_time),
  );
  const confidence = confidenceFor(ranked, eventPairs.length);

  return {
    ok: true,
    result: {
      candidates: ranked,
      ...(confidence !== 'low' ? { recommended: ranked[0] } : {}),
      confidence,
      event_years: [...eventPairs.map((p) => p.year)].sort((a, b) => a - b),
    },
  };
}
