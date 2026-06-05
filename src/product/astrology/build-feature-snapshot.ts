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
import type { CalculationSex, NatalInputs } from '../../domain/person.ts';
import type {
  AstrologyFeatureSnapshot,
  CanonicalMirrorWindow,
  CycleMarker,
  GanzhiPillar,
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
import { classifyBranchPair } from './branch-relations.ts';
import { canonicalizeNatalInputs } from './canonicalize-natal-inputs.ts';
import { buildCycleSnapshot } from './build-cycle-snapshot.ts';
import { buildNatalChartSnapshot } from './build-natal-chart.ts';
import { computeDayun } from './dayun.ts';
import { classifyTransitToDayStem, type TransitElementRelation } from './element-relations.ts';
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

type ConcernDomain = 'love' | 'career' | 'health' | 'wealth' | 'general';

function textHasAny(value: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

function concernDomainFor(tag: ConcernTag): ConcernDomain {
  const haystack = [
    tag.id,
    tag.label,
    tag.prompt_text,
    ...tag.parsed_topics,
  ].join(' ').toLowerCase();
  if (textHasAny(haystack, ['love', 'relationship', 'romance', 'partner', '姻缘', '婚恋', '感情', '关系'])) {
    return 'love';
  }
  if (textHasAny(haystack, ['career', 'work', 'job', 'office', 'profession', '事业', '工作', '职场', '职业'])) {
    return 'career';
  }
  if (textHasAny(haystack, ['health', 'body', 'sleep', 'wellness', '健康', '身体', '睡眠', '精力'])) {
    return 'health';
  }
  if (textHasAny(haystack, ['wealth', 'money', 'finance', 'income', '财富', '财务', '收入', '金钱'])) {
    return 'wealth';
  }
  return 'general';
}

function transitionMarkerTendency(kind: CycleMarker['kind'], domain: ConcernDomain): TendencyClass | null {
  switch (kind) {
    case 'clash':
    case 'annual_transition':
    case 'dayun_boundary':
      return 'turning';
    case 'monthly_transition':
      return domain === 'career' ? 'supportive' : 'turning';
    case 'combination':
    case 'storage':
      return null;
    default:
      return null;
  }
}

function loveTendency(
  relation: TransitElementRelation,
  calculationSex: CalculationSex,
): TendencyClass {
  if (relation === 'wealth') return calculationSex === 'female' ? 'watch' : 'supportive';
  if (relation === 'constraint') return calculationSex === 'male' ? 'watch' : 'supportive';
  if (relation === 'output') return 'supportive';
  if (relation === 'resource') return 'steady';
  return 'steady';
}

function classifyDomainTendency(input: {
  readonly tag: ConcernTag;
  readonly natalDayPillar: GanzhiPillar;
  readonly transitDayPillar: GanzhiPillar;
  readonly marker: CycleMarker | undefined;
  readonly calculationSex: CalculationSex;
}): { tendency: TendencyClass; driverRefs: readonly string[] } {
  const domain = concernDomainFor(input.tag);
  const branchRelation = classifyBranchPair(
    input.transitDayPillar.branch,
    input.natalDayPillar.branch,
  );
  const relation = classifyTransitToDayStem(
    input.transitDayPillar.stem,
    input.natalDayPillar.stem,
  );
  const date = input.marker?.start_utc.slice(0, 10) ?? 'daily';
  const driverRefs = [
    `domain.${domain}`,
    `daily_relation.${relation}@${date}`,
    ...(branchRelation ? [`branch_relation.${branchRelation}@${date}`] : []),
    ...(input.marker ? [`${input.marker.kind}@${input.marker.start_utc}`] : []),
  ];

  if (branchRelation === '相冲' || branchRelation === '相害') {
    return {
      tendency: domain === 'career' ? 'watch' : 'turning',
      driverRefs,
    };
  }
  if (branchRelation === '六合' || branchRelation === '三合') {
    return {
      tendency: domain === 'health' ? 'steady' : 'supportive',
      driverRefs,
    };
  }

  const transition = input.marker ? transitionMarkerTendency(input.marker.kind, domain) : null;
  if (transition) return { tendency: transition, driverRefs };

  switch (domain) {
    case 'love':
      return { tendency: loveTendency(relation, input.calculationSex), driverRefs };
    case 'career':
      if (relation === 'constraint' || relation === 'resource' || relation === 'output') {
        return { tendency: 'supportive', driverRefs };
      }
      if (relation === 'wealth') return { tendency: 'steady', driverRefs };
      return { tendency: 'steady', driverRefs };
    case 'wealth':
      if (relation === 'wealth') return { tendency: 'supportive', driverRefs };
      if (relation === 'output') return { tendency: 'steady', driverRefs };
      if (relation === 'resource') return { tendency: 'watch', driverRefs };
      if (relation === 'constraint') return { tendency: 'turning', driverRefs };
      return { tendency: 'watch', driverRefs };
    case 'health':
      if (relation === 'resource') return { tendency: 'supportive', driverRefs };
      if (relation === 'output' || relation === 'wealth') return { tendency: 'watch', driverRefs };
      if (relation === 'constraint') return { tendency: 'blocked', driverRefs };
      return { tendency: 'steady', driverRefs };
    case 'general':
      if (relation === 'resource' || relation === 'output') return { tendency: 'supportive', driverRefs };
      if (relation === 'constraint') return { tendency: 'watch', driverRefs };
      if (relation === 'wealth') return { tendency: 'steady', driverRefs };
      return { tendency: 'steady', driverRefs };
  }
}

function buildYueJingDrivers(
  snapshots: readonly SubjectFeatureSnapshot[],
  scope: MirrorScope,
  activeConcernTags: readonly ConcernTag[],
  calculationSex: CalculationSex,
): YueJingTendencyDriver[] {
  if (snapshots.length === 0) return [];
  if (scope.kind !== 'rolling_30_day') return [];
  const drivers: YueJingTendencyDriver[] = [];
  const self = snapshots[0]!;
  const natalDayPillar = self.natal_chart.day_pillar;
  if (!natalDayPillar) return [];
  const targetDate = scope.start_date;
  const dailyPillars = self.cycle_snapshot.daily_pillars;
  for (const tp of dailyPillars) {
    const date = tp.start_utc.slice(0, 10);
    if (date !== targetDate) continue;
    const overlapping = self.cycle_snapshot.markers.find(
      (m) => m.start_utc.slice(0, 10) === date,
    );
    for (const tag of activeConcernTags) {
      const classified = classifyDomainTendency({
        tag,
        natalDayPillar,
        transitDayPillar: tp.pillar,
        marker: overlapping,
        calculationSex,
      });
      drivers.push({
        date,
        concern_tag_ref: tag.id,
        tendency_class: classified.tendency,
        driver_refs: classified.driverRefs.length > 0
          ? classified.driverRefs
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
  const horizonEndMs = Date.parse(`${scope.end_date}T00:00:00Z`);
  const majorMarkers = self.cycle_snapshot.markers
    .filter((marker): marker is CycleMarker & { readonly kind: NianJingInflectionDriver['kind'] } =>
      marker.kind === 'dayun_boundary' ||
      marker.kind === 'annual_transition',
    )
    .sort((a, b) => Date.parse(a.start_utc) - Date.parse(b.start_utc));
  for (const tag of activeConcernTags) {
    // Long-horizon 年镜 inflections are scoped to DaYun + annual markers
    // only. Monthly (流月) transitions fire ~once per 节气 month — over a
    // ~10-year horizon that is 120+ markers per concern, which floods the
    // timeline into an unreadable smear. Monthly granularity belongs to
    // 月镜; the 年镜 timeline legend itself lists only 大运边界 / 流年切换
    // / 多重节点 (never 流月). Dropping monthly here keeps the data shape
    // aligned with what the year view is designed to render.
    for (let i = 0; i < majorMarkers.length; i += 1) {
      const marker = majorMarkers[i]!;
      const markerDate = marker.start_utc.slice(0, 10);
      const markerStartMs = Date.parse(`${markerDate}T00:00:00Z`);
      const nextMarker = majorMarkers[i + 1];
      const nextMarkerStartMs = nextMarker
        ? Date.parse(`${nextMarker.start_utc.slice(0, 10)}T00:00:00Z`)
        : Number.POSITIVE_INFINITY;
      const phaseEndMs = Math.min(
        horizonEndMs,
        markerStartMs + 89 * 24 * 60 * 60 * 1000,
        nextMarkerStartMs - 24 * 60 * 60 * 1000,
      );
      const phaseEndDate = new Date(phaseEndMs).toISOString().slice(0, 10);
      if (phaseEndDate >= markerDate) {
        phases.push({
          concern_tag_ref: tag.id,
          start_date: markerDate,
          end_date: phaseEndDate,
          nature: 'turning',
          driver_refs: [`${marker.kind}@${marker.start_utc}`],
        });
      }
      inflections.push({
        concern_tag_ref: tag.id,
        date: markerDate,
        kind: marker.kind,
        driver_refs: [`${marker.kind}@${marker.start_utc}`],
      });
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
      ? buildYueJingDrivers(
          allSubjectSnapshots,
          input.mirror_scope,
          input.active_concern_tags,
          input.space.self_subject.natal_inputs.calculation_sex,
        )
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
