// SJG-ALGO-08 — cycle snapshot derivation under the W02 Mirror
// Architecture v1 shape (CycleSnapshot { window_start_utc,
// window_end_utc, annual_pillar?, monthly_pillars[], daily_pillars[],
// markers[] }; CycleMarker { kind, strength, start_utc, end_utc,
// subject_refs[], source }).

import type { SubjectRef } from '../../domain/subject-ref.ts';
import type {
  CycleMarker,
  CycleSnapshot,
  GanzhiPillar,
  NatalChartSnapshot,
  TimedPillar,
} from '../../domain/algorithm.ts';
import type { CanonicalMirrorWindow } from '../../domain/algorithm.ts';
import { type StageResult } from './stage-result.ts';
import { branchFromIndex, dayPillarFromInstant, stemFromIndex } from './ganzhi.ts';
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
  readonly subject_ref: SubjectRef;
  readonly natal_chart: NatalChartSnapshot;
  readonly canonical_window: CanonicalMirrorWindow;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

function buildDailyMarkersAgainstNatal(
  subject_ref: SubjectRef,
  natal_chart: NatalChartSnapshot,
  dailyPillars: readonly TimedPillar[],
): CycleMarker[] {
  const markers: CycleMarker[] = [];
  const dayPillar = natal_chart.day_pillar;
  if (!dayPillar) return markers;
  const seen = new Set<string>();
  for (const dp of dailyPillars) {
    const transit = dp.pillar;
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
          subject_refs: [subject_ref],
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
          subject_refs: [subject_ref],
          source: 'daily',
        });
      }
    }
    const relation = classifyTransitToDayStem(transit.stem, dayPillar.stem);
    const markerKind = transitRelationToMarkerKind(relation);
    if (markerKind !== null) {
      const key = `${markerKind}:${dp.start_utc}`;
      if (!seen.has(key)) {
        seen.add(key);
        markers.push({
          kind: markerKind,
          strength: 'medium',
          start_utc: dp.start_utc,
          end_utc: dp.end_utc,
          subject_refs: [subject_ref],
          source: 'daily',
        });
      }
    }
  }
  return markers;
}

export function buildCycleSnapshot(input: BuildCycleSnapshotInput): StageResult<CycleSnapshot> {
  const startMs = new Date(input.canonical_window.start_utc).getTime();
  const endMs = new Date(input.canonical_window.end_utc).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs) {
    return {
      ok: false,
      error: {
        stage: 'build_cycle_snapshot',
        kind: 'stage_invalid_input',
        subject_ref: input.subject_ref,
        detail: 'canonical window has invalid start_utc / end_utc',
      },
    };
  }
  const annualPillar = yearPillarAt(startMs);
  const monthlyPillars: TimedPillar[] = [];
  const dailyPillars: TimedPillar[] = [];
  const markers: CycleMarker[] = [];

  const totalDays = Math.min(366, Math.ceil((endMs - startMs) / MS_PER_DAY));
  for (let i = 0; i < totalDays; i += 1) {
    const t = startMs + i * MS_PER_DAY;
    const tEnd = Math.min(t + MS_PER_DAY, endMs);
    const pillar = dayPillarFromInstant(t);
    dailyPillars.push({
      start_utc: new Date(t).toISOString(),
      end_utc: new Date(tEnd).toISOString(),
      pillar,
    });
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
      markers.push({
        kind: 'monthly_transition',
        strength: 'medium',
        start_utc: new Date(jie.jie.utc_ms).toISOString(),
        end_utc: new Date(jie.jie.utc_ms + MS_PER_DAY).toISOString(),
        subject_refs: [input.subject_ref],
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
      markers.push({
        kind: 'annual_transition',
        strength: 'high',
        start_utc: new Date(liChun).toISOString(),
        end_utc: new Date(liChun + MS_PER_DAY).toISOString(),
        subject_refs: [input.subject_ref],
        source: 'annual',
      });
    }
  }

  markers.push(...buildDailyMarkersAgainstNatal(input.subject_ref, input.natal_chart, dailyPillars));

  const snapshot: CycleSnapshot = {
    window_start_utc: input.canonical_window.start_utc,
    window_end_utc: input.canonical_window.end_utc,
    annual_pillar: annualPillar,
    monthly_pillars: monthlyPillars,
    daily_pillars: dailyPillars,
    markers,
  };
  return { ok: true, value: snapshot };
}
