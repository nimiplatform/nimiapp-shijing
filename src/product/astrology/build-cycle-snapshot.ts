// SJG-ALGO-08 — cycle snapshot derivation. Wave-10 emits annual +
// monthly + daily pillars across the time_window plus boundary
// markers. Wave-13 extends marker detection per SJG-ALGO-08 closed
// `CycleMarkerKind` enum:
//   - dayun_boundary       (emitted via DaYun stage)
//   - annual_transition    (Li Chun crossing)
//   - monthly_transition   (jie crossing)
//   - clash                (transit branch clashes natal day-pillar branch)
//   - combination          (transit branch six-combines natal day-pillar)
//   - resource/output/wealth/constraint  (transit-stem five-element relation
//                                         vs. natal day-master stem)
// Natal-mode CycleSnapshot replaces the wave-10 hash placeholder with
// real natal-anchor data (window_*_utc = canonical birth utc, monthly =
// natal month pillar, daily = natal day pillar).

import type { SubjectRef } from '../../domain/subject-ref.ts';
import type {
  CycleMarker,
  CycleMarkerKind,
  CycleSnapshot,
  GanzhiPillar,
  NatalCanonicalization,
  NatalChartSnapshot,
  ReadingTimeWindow,
  TimedPillar,
} from '../../domain/algorithm.ts';
import { type StageResult } from './stage-result.ts';
import {
  branchFromIndex,
  dayPillarFromInstant,
  stemFromIndex,
} from './ganzhi.ts';
import { EPHEMERIS_VERSION, bagayearStartUtcMs, currentJieForInstant } from './solar-terms.ts';
import {
  classifyBranchPair,
  isClashPair,
  isSixCombinationPair,
} from './branch-relations.ts';
import {
  classifyTransitToDayStem,
  transitRelationToMarkerKind,
} from './element-relations.ts';

export interface BuildCycleSnapshotInput {
  readonly subject: SubjectRef;
  readonly natal_chart: NatalChartSnapshot;
  readonly time_window: ReadingTimeWindow;
  // SJG-ALGO-08 natal-mode: when present, the canonicalization carries
  // the canonical birth UTC instant that replaces the wave-10 hash
  // placeholder in CycleSnapshot.window_*_utc. Required when
  // time_window.mode === 'natal'.
  readonly canonicalization?: NatalCanonicalization;
}

function yearPillarAt(utcMs: number): GanzhiPillar {
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

// Strength heuristic for transit→natal five-element markers. The five
// element kinds in SJG-ALGO-08 carry only low/medium/high; we use
// 'medium' as the default since these markers describe an ongoing
// transit pressure rather than a single boundary instant.
const TRANSIT_ELEMENT_STRENGTH = 'medium' as const;

function buildDailyMarkersAgainstNatal(
  subject: SubjectRef,
  natal_chart: NatalChartSnapshot,
  dailyPillars: readonly TimedPillar[],
): CycleMarker[] {
  const markers: CycleMarker[] = [];
  const dayPillar = natal_chart.day_pillar;
  if (!dayPillar) return markers;
  const seen = new Set<string>();
  for (const dp of dailyPillars) {
    const transit = dp.pillar;
    // Branch interaction with natal day-pillar branch.
    const branchKind = classifyBranchPair(transit.branch, dayPillar.branch);
    if (branchKind === '相冲' || isClashPair(transit.branch, dayPillar.branch)) {
      const key = `clash:${dp.start_utc}`;
      if (!seen.has(key)) {
        seen.add(key);
        markers.push({
          kind: 'clash',
          strength: 'high',
          start_utc: dp.start_utc,
          end_utc: dp.end_utc,
          subjects: [subject],
          source: 'daily',
        });
      }
    } else if (branchKind === '六合' || isSixCombinationPair(transit.branch, dayPillar.branch)) {
      const key = `combination:${dp.start_utc}`;
      if (!seen.has(key)) {
        seen.add(key);
        markers.push({
          kind: 'combination',
          strength: 'medium',
          start_utc: dp.start_utc,
          end_utc: dp.end_utc,
          subjects: [subject],
          source: 'daily',
        });
      }
    }
    // Stem five-element relation against natal day stem.
    const relation = classifyTransitToDayStem(transit.stem, dayPillar.stem);
    const markerKind = transitRelationToMarkerKind(relation);
    if (markerKind !== null) {
      const key = `${markerKind}:${dp.start_utc}`;
      if (!seen.has(key)) {
        seen.add(key);
        markers.push({
          kind: markerKind as CycleMarkerKind,
          strength: TRANSIT_ELEMENT_STRENGTH,
          start_utc: dp.start_utc,
          end_utc: dp.end_utc,
          subjects: [subject],
          source: 'daily',
        });
      }
    }
  }
  return markers;
}

export function buildCycleSnapshot(input: BuildCycleSnapshotInput): StageResult<CycleSnapshot> {
  if (input.time_window.mode === 'natal') {
    // SJG-ALGO-08 — natal-mode anchor. The window collapses to the
    // canonical birth instant; monthly/daily pillars surface the natal
    // chart's own month/day pillars so renderer code can read a
    // consistent shape regardless of mode. Active markers stay empty
    // because there is no transit window to scan.
    if (!input.canonicalization) {
      return {
        ok: false,
        error: {
          stage: 'build_cycle_snapshot',
          kind: 'stage_missing_input',
          subject: input.subject,
          detail: 'natal-mode CycleSnapshot requires canonicalization to anchor window_*_utc',
        },
      };
    }
    const birthUtcIso = input.canonicalization.canonical_birth_datetime_utc;
    const monthly: TimedPillar[] = input.natal_chart.month_pillar
      ? [{ start_utc: birthUtcIso, end_utc: birthUtcIso, pillar: input.natal_chart.month_pillar }]
      : [];
    const daily: TimedPillar[] = input.natal_chart.day_pillar
      ? [{ start_utc: birthUtcIso, end_utc: birthUtcIso, pillar: input.natal_chart.day_pillar }]
      : [];
    const snapshot: CycleSnapshot = {
      window_start_utc: birthUtcIso,
      window_end_utc: birthUtcIso,
      ...(input.natal_chart.year_pillar ? { annual_pillar: input.natal_chart.year_pillar } : {}),
      monthly_pillars: monthly,
      daily_pillars: daily,
      active_markers: [],
    };
    return { ok: true, value: snapshot };
  }
  if (!input.time_window.start_utc || !input.time_window.end_utc) {
    return {
      ok: false,
      error: {
        stage: 'build_cycle_snapshot',
        kind: 'stage_invalid_input',
        subject: input.subject,
        detail: 'bounded time_window requires start_utc + end_utc',
      },
    };
  }
  const startMs = new Date(input.time_window.start_utc).getTime();
  const endMs = new Date(input.time_window.end_utc).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs) {
    return {
      ok: false,
      error: {
        stage: 'build_cycle_snapshot',
        kind: 'stage_invalid_input',
        subject: input.subject,
        detail: 'bounded time_window has invalid start_utc / end_utc',
      },
    };
  }
  const annualPillar = yearPillarAt(startMs);
  const monthlyPillars: TimedPillar[] = [];
  const dailyPillars: TimedPillar[] = [];
  const activeMarkers: CycleMarker[] = [];

  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.min(366, Math.ceil((endMs - startMs) / dayMs));
  let prevDayPillarStem: string | null = null;
  for (let i = 0; i < totalDays; i += 1) {
    const t = startMs + i * dayMs;
    const tEnd = Math.min(t + dayMs, endMs);
    const pillar = dayPillarFromInstant(t);
    dailyPillars.push({ start_utc: new Date(t).toISOString(), end_utc: new Date(tEnd).toISOString(), pillar });
    if (prevDayPillarStem !== null && prevDayPillarStem !== pillar.stem && pillar.stem === 'jia') {
      activeMarkers.push({
        kind: 'monthly_transition',
        strength: 'low',
        start_utc: new Date(t).toISOString(),
        end_utc: new Date(tEnd).toISOString(),
        subjects: [input.subject],
        source: 'daily',
      });
    }
    prevDayPillarStem = pillar.stem;
  }

  let cursor = startMs;
  while (cursor < endMs) {
    const jie = currentJieForInstant(cursor);
    const startsAt = Math.max(jie.jie.utc_ms, cursor);
    const endsAt = Math.min(jie.next.utc_ms, endMs);
    monthlyPillars.push({
      start_utc: new Date(startsAt).toISOString(),
      end_utc: new Date(endsAt).toISOString(),
      pillar: yearPillarAt(jie.jie.utc_ms),
    });
    if (jie.jie.utc_ms >= startMs && jie.jie.utc_ms <= endMs) {
      activeMarkers.push({
        kind: 'monthly_transition',
        strength: 'medium',
        start_utc: new Date(jie.jie.utc_ms).toISOString(),
        end_utc: new Date(jie.jie.utc_ms + dayMs).toISOString(),
        subjects: [input.subject],
        source: 'monthly',
      });
    }
    if (endsAt >= endMs) break;
    cursor = endsAt;
  }

  const startYear = new Date(startMs).getUTCFullYear();
  for (const y of [startYear, startYear + 1]) {
    const liChun = bagayearStartUtcMs(y);
    if (liChun >= startMs && liChun <= endMs) {
      activeMarkers.push({
        kind: 'annual_transition',
        strength: 'high',
        start_utc: new Date(liChun).toISOString(),
        end_utc: new Date(liChun + dayMs).toISOString(),
        subjects: [input.subject],
        source: 'annual',
      });
    }
  }

  // SJG-ALGO-08 — emit per-day clash/combination + five-element
  // relation markers comparing each transit day-pillar against the
  // natal day-pillar (the day-master).
  activeMarkers.push(...buildDailyMarkersAgainstNatal(input.subject, input.natal_chart, dailyPillars));

  const snapshot: CycleSnapshot = {
    window_start_utc: input.time_window.start_utc,
    window_end_utc: input.time_window.end_utc,
    annual_pillar: annualPillar,
    monthly_pillars: monthlyPillars,
    daily_pillars: dailyPillars,
    active_markers: activeMarkers,
  };
  return { ok: true, value: snapshot };
}
