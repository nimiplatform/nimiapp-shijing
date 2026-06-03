// SJG-ALGO-08 — AstrologyFeatureSnapshot builder under the W02 Mirror
// Architecture v1 shape.
//
// Per-mirror feature snapshot:
//   method_profile, mirror_kind, canonical_window,
//   self_subject (SubjectFeatureSnapshot),
//   related_persons (SubjectFeatureSnapshot[]),
//   stage_drivers, key_windows,
//   yuejing_tendency_drivers (for YueJing),
//   nianjing_phase_drivers + nianjing_inflection_drivers (for NianJing),
//   uncertainty_inputs.

import type { ConcernTag } from '../../domain/concern-tag.ts';
import type { NatalInputs } from '../../domain/person.ts';
import type {
  AstrologyFeatureSnapshot,
  CanonicalMirrorWindow,
  CycleMarker,
  KeyWindowFeature,
  NianJingInflectionDriver,
  NianJingPhaseDriver,
  StageDriver,
  SubjectFeatureSnapshot,
  UncertaintyInput,
  YueJingTendencyDriver,
} from '../../domain/algorithm.ts';
import {
  ASTROLOGY_METHOD_PROFILE_ID,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ALGO_FEATURE_SCHEMA_VERSION,
} from '../../domain/algorithm.ts';
import type { MirrorKind, MirrorScope } from '../../domain/mirror-scope.ts';
import type { TendencyClass } from '../../domain/mirror-output.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { isPersonRef, isSelfRef, type SubjectRef } from '../../domain/subject-ref.ts';
import { canonicalizeNatalInputs } from './canonicalize-natal-inputs.ts';
import { buildCycleSnapshot } from './build-cycle-snapshot.ts';
import { buildNatalChartSnapshot } from './build-natal-chart.ts';
import { computeDayun } from './dayun.ts';
import { resolveCanonicalMirrorWindow } from './mirror-window.ts';
import { type StageResult } from './stage-result.ts';

export interface BuildFeatureSnapshotInput {
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly space: ShiJingSpace;
  readonly related_person_refs: readonly SubjectRef[];
  readonly active_concern_tags: readonly ConcernTag[];
  readonly dayun_required_override?: boolean;
}

function natalInputsForSubject(subject: SubjectRef, space: ShiJingSpace): NatalInputs | undefined {
  if (isSelfRef(subject)) return space.self_subject.natal_inputs;
  if (isPersonRef(subject)) return space.persons.find((p) => p.id === subject.id)?.natal_inputs;
  return undefined;
}

// SJG-ALGO-07 — DaYun is required for NianJing always, for YueJing
// when scope intersects a DaYun boundary (proxy: span > 90 days), for
// ShiJing consultation when cited source requires DaYun (we treat
// `mirror_kind === 'shijing'` as opt-in DaYun-aware), and for any
// daily/rolling scope longer than 90 local days. RiJing/daily never
// requires DaYun, except when calculation deems it required from
// upstream context (override).
function localDateDeltaDays(startDate: string, endDate: string): number {
  const startMs = Date.parse(startDate + 'T00:00:00Z');
  const endMs = Date.parse(endDate + 'T00:00:00Z');
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
}

function deriveDayunRequired(mirrorKind: MirrorKind, scope: MirrorScope): boolean {
  if (mirrorKind === 'nianjing') return true;
  if (scope.kind === 'long_horizon') return true;
  if (scope.kind === 'rolling_30_day') {
    // Yuejing requires DaYun only when the 30-day window intersects a
    // DaYun boundary. v1 proxy: any scope >90 local days. Standard 30-day
    // rolling never triggers; only an unusually long custom rolling
    // would.
    return localDateDeltaDays(scope.start_date, scope.end_date) > 90;
  }
  // ShiJing consultation may require DaYun via cited source readings; the
  // orchestrator passes a `dayun_required_override` based on cited
  // readings. The default here is false to avoid blocking consultations
  // that cite only RiJing/YueJing sources.
  return false;
}

const MARKER_TO_STAGE: Readonly<Record<string, StageDriver['stage_label']>> = {
  dayun_boundary: '转时',
  annual_transition: '转时',
  monthly_transition: '转时',
  clash: '转时',
  combination: '养时',
  storage: '收时',
  constraint: '收时',
  output: '进时',
  wealth: '进时',
  resource: '养时',
};

function buildStageDrivers(markers: readonly CycleMarker[]): StageDriver[] {
  const drivers: StageDriver[] = [];
  for (const marker of markers) {
    const stage = MARKER_TO_STAGE[marker.kind];
    if (!stage) continue;
    drivers.push({
      stage_label: stage,
      marker_refs: [`${marker.kind}@${marker.start_utc}`],
      explanation_key: `marker.${marker.kind}.${marker.source}`,
    });
  }
  return drivers;
}

function buildKeyWindows(snapshots: readonly SubjectFeatureSnapshot[]): KeyWindowFeature[] {
  const features: KeyWindowFeature[] = [];
  for (const subject of snapshots) {
    for (const marker of subject.cycle_snapshot.markers) {
      if (marker.kind === 'annual_transition' || marker.kind === 'dayun_boundary') {
        features.push({
          start_utc: marker.start_utc,
          end_utc: marker.end_utc,
          label: 'transition',
          driver_refs: [`${marker.kind}@${marker.start_utc}`],
          subject_refs: marker.subject_refs,
        });
      } else if (marker.kind === 'monthly_transition') {
        features.push({
          start_utc: marker.start_utc,
          end_utc: marker.end_utc,
          label: 'support',
          driver_refs: [`${marker.kind}@${marker.start_utc}`],
          subject_refs: marker.subject_refs,
        });
      }
    }
  }
  return features;
}

function classifyDailyTendency(
  marker: CycleMarker | undefined,
): TendencyClass {
  if (!marker) return 'steady';
  switch (marker.kind) {
    case 'clash':
    case 'annual_transition':
    case 'dayun_boundary':
    case 'monthly_transition':
      return 'turning';
    case 'combination':
    case 'resource':
      return 'supportive';
    case 'output':
    case 'wealth':
      return 'supportive';
    case 'constraint':
    case 'storage':
      return 'watch';
    default:
      return 'steady';
  }
}

function buildYueJingDrivers(
  snapshots: readonly SubjectFeatureSnapshot[],
  activeConcernTags: readonly ConcernTag[],
): YueJingTendencyDriver[] {
  if (snapshots.length === 0) return [];
  const drivers: YueJingTendencyDriver[] = [];
  const self = snapshots[0]!;
  const dailyPillars = self.cycle_snapshot.daily_pillars;
  for (const tp of dailyPillars) {
    const date = tp.start_utc.slice(0, 10);
    // pick the strongest marker overlapping this day
    const overlapping = self.cycle_snapshot.markers.find(
      (m) => m.start_utc.slice(0, 10) === date,
    );
    const tendency = classifyDailyTendency(overlapping);
    for (const tag of activeConcernTags) {
      drivers.push({
        date,
        concern_tag_ref: tag.id,
        tendency_class: tendency,
        driver_refs: overlapping
          ? [`${overlapping.kind}@${overlapping.start_utc}`]
          : [`cycle_baseline@${date}`],
      });
    }
  }
  return drivers;
}

function buildNianJingDrivers(
  snapshots: readonly SubjectFeatureSnapshot[],
  scope: MirrorScope,
  activeConcernTags: readonly ConcernTag[],
): { phases: NianJingPhaseDriver[]; inflections: NianJingInflectionDriver[] } {
  if (scope.kind !== 'long_horizon') return { phases: [], inflections: [] };
  const phases: NianJingPhaseDriver[] = [];
  const inflections: NianJingInflectionDriver[] = [];
  const self = snapshots[0];
  if (!self) return { phases, inflections };
  for (const tag of activeConcernTags) {
    phases.push({
      concern_tag_ref: tag.id,
      start_date: scope.start_date,
      end_date: scope.end_date,
      nature: 'steady',
      driver_refs: ['cycle_baseline'],
    });
    // Long-horizon 年镜 inflections are scoped to DaYun + annual markers
    // only. Monthly (流月) transitions fire ~once per 节气 month — over a
    // ~10-year horizon that is 120+ markers per concern, which floods the
    // timeline into an unreadable smear. Monthly granularity belongs to
    // 月镜; the 年镜 timeline legend itself lists only 大运边界 / 流年切换
    // / 多重节点 (never 流月). Dropping monthly here keeps the data shape
    // aligned with what the year view is designed to render.
    for (const marker of self.cycle_snapshot.markers) {
      if (
        marker.kind === 'dayun_boundary' ||
        marker.kind === 'annual_transition'
      ) {
        inflections.push({
          concern_tag_ref: tag.id,
          date: marker.start_utc.slice(0, 10),
          kind: marker.kind,
          driver_refs: [`${marker.kind}@${marker.start_utc}`],
        });
      }
    }
  }
  return { phases, inflections };
}

function buildSubjectFeatureSnapshot(
  subject: SubjectRef,
  natalInputs: NatalInputs,
  canonicalWindow: CanonicalMirrorWindow,
  dayunRequired: boolean,
): StageResult<{ snapshot: SubjectFeatureSnapshot; uncertainty: readonly UncertaintyInput[] }> {
  const canon = canonicalizeNatalInputs(natalInputs);
  if (!canon.ok) return canon;
  const chart = buildNatalChartSnapshot({ subject_ref: subject, canonicalization: canon.value });
  if (!chart.ok) return chart;
  const cycle = buildCycleSnapshot({
    subject_ref: subject,
    natal_chart: chart.value,
    canonical_window: canonicalWindow,
  });
  if (!cycle.ok) return cycle;
  const trueSolarMs = canon.value.true_solar_time_utc
    ? new Date(canon.value.true_solar_time_utc).getTime()
    : Number.NaN;
  const dayun = computeDayun({
    required: dayunRequired,
    calculation_sex: natalInputs.calculation_sex,
    year_pillar: chart.value.year_pillar,
    true_solar_birth_utc_ms: trueSolarMs,
  });
  if (!dayun.ok) {
    if (dayun.reason === 'calculation_sex_unspecified') {
      return {
        ok: false,
        error: {
          stage: 'build_feature_snapshot',
          kind: 'stage_dayun_calculation_sex_unspecified',
          subject_ref: subject,
          detail: 'SJG-ALGO-07: calculation_sex required when DaYun is required',
        },
      };
    }
    return {
      ok: false,
      error: {
        stage: 'build_feature_snapshot',
        kind: 'stage_invalid_input',
        subject_ref: subject,
        detail: 'DaYun: year_pillar missing (insufficient birth_precision)',
      },
    };
  }
  const uncertainty: UncertaintyInput[] = [];
  const precCode = `birth_precision_${natalInputs.birth_precision}` as UncertaintyInput['code'];
  uncertainty.push({
    code: precCode,
    severity: natalInputs.birth_precision === 'exact' ? 'info' : 'caveat',
    subject_ref: subject,
  });
  return {
    ok: true,
    value: {
      snapshot: {
        subject_ref: subject,
        natal_chart: chart.value,
        dayun: dayun.value,
        cycle_snapshot: cycle.value,
      },
      uncertainty,
    },
  };
}

function consentCaveat(subject: SubjectRef, space: ShiJingSpace): UncertaintyInput | null {
  if (isSelfRef(subject)) return null;
  if (!isPersonRef(subject)) return null;
  const person = space.persons.find((p) => p.id === subject.id);
  if (!person) return null;
  if (person.consent_state === 'withheld') {
    return { code: 'consent_withheld', severity: 'caveat', subject_ref: subject };
  }
  return null;
}

export function buildAstrologyFeatureSnapshot(
  input: BuildFeatureSnapshotInput,
): StageResult<AstrologyFeatureSnapshot> {
  const windowResult = resolveCanonicalMirrorWindow(input.mirror_scope);
  if (!windowResult.ok) return windowResult;
  const canonicalWindow = windowResult.value;
  const dayunRequired = input.dayun_required_override ?? deriveDayunRequired(input.mirror_kind, input.mirror_scope);

  const selfRef: SubjectRef = 'self';
  const selfInputs = input.space.self_subject.natal_inputs;
  const selfResult = buildSubjectFeatureSnapshot(selfRef, selfInputs, canonicalWindow, dayunRequired);
  if (!selfResult.ok) return selfResult;

  const relatedSnapshots: SubjectFeatureSnapshot[] = [];
  const uncertainty: UncertaintyInput[] = [...selfResult.value.uncertainty];
  for (const ref of input.related_person_refs) {
    const inputs = natalInputsForSubject(ref, input.space);
    if (!inputs) {
      return {
        ok: false,
        error: {
          stage: 'build_feature_snapshot',
          kind: 'stage_missing_input',
          subject_ref: ref,
          detail: 'related person not present in ShiJingSpace.persons',
        },
      };
    }
    const personResult = buildSubjectFeatureSnapshot(ref, inputs, canonicalWindow, dayunRequired);
    if (!personResult.ok) return personResult;
    relatedSnapshots.push(personResult.value.snapshot);
    uncertainty.push(...personResult.value.uncertainty);
    const consent = consentCaveat(ref, input.space);
    if (consent) uncertainty.push(consent);
  }

  if (input.active_concern_tags.length === 0 && input.mirror_kind !== 'shijing') {
    uncertainty.push({ code: 'no_active_concern_tags', severity: 'fail_close' });
  }

  const allSubjectSnapshots: SubjectFeatureSnapshot[] = [selfResult.value.snapshot, ...relatedSnapshots];
  const stageDrivers = buildStageDrivers(
    allSubjectSnapshots.flatMap((s) => s.cycle_snapshot.markers),
  );
  const keyWindows = buildKeyWindows(allSubjectSnapshots);
  const yuejingDrivers =
    input.mirror_kind === 'yuejing'
      ? buildYueJingDrivers(allSubjectSnapshots, input.active_concern_tags)
      : [];
  const { phases: nianjingPhases, inflections: nianjingInflections } =
    input.mirror_kind === 'nianjing'
      ? buildNianJingDrivers(allSubjectSnapshots, input.mirror_scope, input.active_concern_tags)
      : { phases: [], inflections: [] };

  const snapshot: AstrologyFeatureSnapshot = {
    method_profile: {
      id: ASTROLOGY_METHOD_PROFILE_ID,
      contract_version: SJG_ALGO_CONTRACT_VERSION,
      feature_schema_version: SJG_ALGO_FEATURE_SCHEMA_VERSION,
    },
    mirror_kind: input.mirror_kind,
    canonical_window: canonicalWindow,
    self_subject: selfResult.value.snapshot,
    related_persons: relatedSnapshots,
    stage_drivers: stageDrivers,
    key_windows: keyWindows,
    yuejing_tendency_drivers: yuejingDrivers,
    nianjing_phase_drivers: nianjingPhases,
    nianjing_inflection_drivers: nianjingInflections,
    uncertainty_inputs: uncertainty,
  };
  return { ok: true, value: snapshot };
}
