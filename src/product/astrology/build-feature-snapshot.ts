// SJG-ALGO-08 — orchestrates per-subject canonicalization → natal chart
// → cycle snapshot → DaYun → stage label → key windows → uncertainty
// inputs. Wave-13 extends:
//   - dayun_required auto-derivation from kind/scope/time_window per
//     SJG-ALGO-07;
//   - stage_drivers populated from active cycle markers;
//   - relation_features populated from natal pillar branch interactions
//     (六合 / 三合 / 相冲 / 相害) using `branch-relations.ts`.

import type { SubjectRef } from '../../domain/subject-ref.ts';
import type {
  AstrologyFeatureSnapshot,
  CycleMarker,
  GanzhiPillar,
  KeyWindowFeature,
  NatalChartSnapshot,
  ReadingTimeWindow,
  RelationFeatureSnapshot,
  StageDriver,
  SubjectFeatureSnapshot,
  UncertaintyInput,
} from '../../domain/algorithm.ts';
import {
  ASTROLOGY_METHOD_PROFILE_ID,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ALGO_FEATURE_SCHEMA_VERSION,
} from '../../domain/algorithm.ts';
import type { NatalInputs } from '../../domain/person.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { ReadingKind, ReadingScope } from '../../domain/reading-matrix.ts';
import type { View } from '../../domain/view.ts';
import type { StageResult } from './stage-result.ts';
import { canonicalizeNatalInputs } from './canonicalize-natal-inputs.ts';
import { buildNatalChartSnapshot } from './build-natal-chart.ts';
import { buildCycleSnapshot } from './build-cycle-snapshot.ts';
import { computeDayun } from './dayun.ts';
import { pickStageLabel } from './stage-label.ts';
import { classifyBranchPair } from './branch-relations.ts';

export interface BuildFeatureSnapshotInput {
  readonly subjects: readonly SubjectRef[];
  readonly time_window: ReadingTimeWindow;
  readonly space: ShiJingSpace;
  // Wave-13 — explicit kind/scope/view drive the dayun_required
  // calculation per SJG-ALGO-07. Optional for back-compat with wave-10
  // call sites; when omitted, dayun_required defaults to false (legacy
  // wave-10 behavior).
  readonly kind?: ReadingKind;
  readonly scope?: ReadingScope;
  readonly view?: View;
  // Explicit override (e.g. tests). When provided, wins over the
  // SJG-ALGO-07 auto-derivation.
  readonly dayun_required?: boolean;
}

function natalInputsForSubject(subject: SubjectRef, space: ShiJingSpace): NatalInputs | undefined {
  if (subject === 'self') return space.self_subject.natal_inputs;
  const person = space.persons.find((entry) => entry.id === subject.id);
  return person?.natal_inputs;
}

function consentCaveat(subject: SubjectRef, space: ShiJingSpace): UncertaintyInput | null {
  if (subject === 'self') return null;
  const person = space.persons.find((entry) => entry.id === subject.id);
  if (!person) return null;
  if (person.consent_state === 'withheld') {
    return { code: 'consent_withheld', severity: 'caveat', subject };
  }
  return null;
}

// SJG-ALGO-07 — DaYun is required when:
//   - kind ∈ {period_outlook, key_window} for any scope; OR
//   - scope === 'view' AND view.time_scope ∈ {bounded, rolling}; OR
//   - kind === 'consultation' AND time_window duration > 90 days; OR
//   - any subject/ad_hoc bounded window > 90 days for period_outlook.
// Note the spec body lists "every View-scoped period_outlook" and
// "every View-scoped key_window" — both are covered by the kind set.
// Sign + today never require DaYun.
export function deriveDayunRequired(
  kind: ReadingKind | undefined,
  scope: ReadingScope | undefined,
  view: View | undefined,
  timeWindow: ReadingTimeWindow,
): boolean {
  if (kind === 'period_outlook' || kind === 'key_window') return true;
  if (kind === 'today' || kind === 'sign') return false;
  if (scope === 'view' && view && (view.time_scope === 'bounded' || view.time_scope === 'rolling')) {
    return true;
  }
  if (timeWindow.mode === 'bounded' && timeWindow.start_utc && timeWindow.end_utc) {
    const startMs = new Date(timeWindow.start_utc).getTime();
    const endMs = new Date(timeWindow.end_utc).getTime();
    if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
      const durationDays = (endMs - startMs) / (24 * 60 * 60 * 1000);
      if (durationDays > 90) return true;
    }
  }
  return false;
}

// SJG-ALGO-08 — stage_drivers map active markers onto the
// five-stage label palette. The stage label assigned to the snapshot
// is the one that wins SJG-ALGO-09 tie-break; each driver explains
// *why* that label might be chosen, keyed back to the marker that
// contributed evidence.
const MARKER_TO_STAGE: Readonly<Record<CycleMarker['kind'], StageDriver['stage_label']>> = {
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
} as const;

function buildStageDrivers(markers: readonly CycleMarker[]): StageDriver[] {
  const drivers: StageDriver[] = [];
  for (const marker of markers) {
    drivers.push({
      stage_label: MARKER_TO_STAGE[marker.kind],
      marker_kind: marker.kind,
      strength: marker.strength,
      explanation_key: `marker.${marker.kind}.${marker.source}`,
    });
  }
  return drivers;
}

interface PillarSlot { readonly name: 'year' | 'month' | 'day' | 'hour'; readonly pillar: GanzhiPillar | undefined; }

function pillarSlots(chart: NatalChartSnapshot): PillarSlot[] {
  return [
    { name: 'year', pillar: chart.year_pillar },
    { name: 'month', pillar: chart.month_pillar },
    { name: 'day', pillar: chart.day_pillar },
    { name: 'hour', pillar: chart.hour_pillar },
  ];
}

// SJG-ALGO-08 — natal-pillar branch interactions produce
// `relation_features` describing the static (natal) relation between
// each subject and itself; the from/to subjects are the same subject
// because v1 has no cross-subject pillar diff. Once cross-subject
// astrology is admitted, this same shape can describe person-A vs.
// person-B pillar interactions.
function buildSelfRelationFeatures(
  subject: SubjectRef,
  chart: NatalChartSnapshot,
): RelationFeatureSnapshot[] {
  const features: RelationFeatureSnapshot[] = [];
  const slots = pillarSlots(chart);
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slots[i]!;
      const b = slots[j]!;
      if (!a.pillar || !b.pillar) continue;
      const relation = classifyBranchPair(a.pillar.branch, b.pillar.branch);
      if (!relation) continue;
      features.push({
        from_subject: subject,
        to_subject: subject,
        relation_kind: `natal_pillar_${a.name}_${b.name}_${relation}`,
        interaction_markers: [],
        anchor_relevance: 'primary',
      });
    }
  }
  return features;
}

function buildSubjectSnapshot(
  subject: SubjectRef,
  inputs: NatalInputs,
  timeWindow: ReadingTimeWindow,
  dayunRequired: boolean,
): StageResult<{ snapshot: SubjectFeatureSnapshot; uncertainty: readonly UncertaintyInput[]; relations: readonly RelationFeatureSnapshot[] }> {
  const canon = canonicalizeNatalInputs(inputs);
  if (!canon.ok) return canon;
  const chart = buildNatalChartSnapshot({ subject, canonicalization: canon.value });
  if (!chart.ok) return chart;
  const cycle = buildCycleSnapshot({
    subject,
    natal_chart: chart.value,
    time_window: timeWindow,
    canonicalization: canon.value,
  });
  if (!cycle.ok) return cycle;
  const trueSolarMs = canon.value.true_solar_time_utc
    ? new Date(canon.value.true_solar_time_utc).getTime()
    : Number.NaN;
  const dayun = computeDayun({
    required: dayunRequired,
    calculation_sex: inputs.calculation_sex,
    year_pillar: chart.value.year_pillar,
    true_solar_birth_utc_ms: trueSolarMs,
  });
  if (!dayun.ok) {
    if (dayun.reason === 'calculation_sex_unspecified') {
      return {
        ok: false,
        error: {
          stage: 'build_feature_snapshot',
          kind: 'stage_invalid_input',
          subject,
          detail: 'SJG-ALGO-07: calculation_sex required when DaYun is required',
        },
      };
    }
    return {
      ok: false,
      error: {
        stage: 'build_feature_snapshot',
        kind: 'stage_invalid_input',
        subject,
        detail: 'DaYun: year_pillar missing (insufficient birth_precision)',
      },
    };
  }
  const uncertainty: UncertaintyInput[] = [];
  const precCode = `birth_precision_${inputs.birth_precision}` as UncertaintyInput['code'];
  uncertainty.push({ code: precCode, severity: inputs.birth_precision === 'exact' ? 'info' : 'caveat', subject });
  const stageDrivers = buildStageDrivers(cycle.value.active_markers);
  const snapshot: SubjectFeatureSnapshot = {
    subject,
    natal_chart: chart.value,
    dayun: dayun.value,
    cycle_snapshot: cycle.value,
    stage_drivers: stageDrivers,
  };
  const relations = buildSelfRelationFeatures(subject, chart.value);
  return { ok: true, value: { snapshot, uncertainty, relations } };
}

export function buildAstrologyFeatureSnapshot(
  input: BuildFeatureSnapshotInput,
): StageResult<AstrologyFeatureSnapshot> {
  const subjectsOut: SubjectFeatureSnapshot[] = [];
  const uncertainty: UncertaintyInput[] = [];
  const relationFeatures: RelationFeatureSnapshot[] = [];
  const dayunRequired = input.dayun_required ?? deriveDayunRequired(input.kind, input.scope, input.view, input.time_window);
  for (const subject of input.subjects) {
    const natalInputs = natalInputsForSubject(subject, input.space);
    if (!natalInputs) {
      return {
        ok: false,
        error: {
          stage: 'build_feature_snapshot',
          kind: 'stage_missing_input',
          subject,
          detail: 'subject not present in ShiJingSpace.persons or self_subject',
        },
      };
    }
    const subjectResult = buildSubjectSnapshot(subject, natalInputs, input.time_window, dayunRequired);
    if (!subjectResult.ok) return subjectResult;
    subjectsOut.push(subjectResult.value.snapshot);
    uncertainty.push(...subjectResult.value.uncertainty);
    relationFeatures.push(...subjectResult.value.relations);
    const personCaveat = consentCaveat(subject, input.space);
    if (personCaveat && !uncertainty.some((u) => u.code === 'consent_withheld' && u.subject === subject)) {
      uncertainty.push(personCaveat);
    }
  }
  const stageLabel = pickStageLabel(
    subjectsOut.flatMap((s) => s.cycle_snapshot.active_markers),
  );
  const keyWindows: KeyWindowFeature[] = subjectsOut.flatMap((s) =>
    s.cycle_snapshot.active_markers
      .filter((m) => m.kind === 'annual_transition' || m.kind === 'dayun_boundary')
      .map<KeyWindowFeature>((m) => ({
        start_utc: m.start_utc,
        end_utc: m.end_utc,
        label: 'transition',
        driver: m.kind,
        subjects: m.subjects,
      })),
  );
  const featureSnapshot: AstrologyFeatureSnapshot = {
    method_profile: {
      id: ASTROLOGY_METHOD_PROFILE_ID,
      contract_version: SJG_ALGO_CONTRACT_VERSION,
      feature_schema_version: SJG_ALGO_FEATURE_SCHEMA_VERSION,
    },
    time_window: input.time_window,
    subjects: subjectsOut,
    relation_features: relationFeatures,
    stage_label: stageLabel,
    key_windows: keyWindows,
    uncertainty_inputs: uncertainty,
  };
  return { ok: true, value: featureSnapshot };
}
