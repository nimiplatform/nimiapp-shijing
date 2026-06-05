// SJG-ALGO-01 — the 八字子平 MethodEngine. Wraps the tyme4ts calendar + the
// per-subject chart builder + the common-driver derivation behind the
// MethodEngine port. Engine-private evidence carries the self subject's
// calculation_sex and engine-level uncertainty; toMethodEvidence emits only the
// persisted/hashed domain BaziEvidence.

import {
  BAZI_ZIPING_V1,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ALGO_FEATURE_SCHEMA_VERSION,
  type BaziEvidence,
  type BaziSubjectChart,
  type MethodEvidence,
  type MethodProfile,
  type NatalCanonicalization,
  type UncertaintyInput,
  type UncertaintyInputCode,
} from '../../../../domain/algorithm.ts';
import type { CalculationSex } from '../../../../domain/person.ts';
import type { SubjectRef } from '../../../../domain/subject-ref.ts';
import type {
  EngineComputeInput,
  EngineDeriveInput,
  MethodEngine,
  MethodEngineCapabilities,
} from '../../method-engine.ts';
import type { StageResult } from '../../stage-result.ts';
import { BAZI_EPHEMERIS_VERSION } from './bazi-calendar.ts';
import { buildBaziSubjectChart } from './bazi-chart.ts';
import { deriveBaziCommonDrivers } from './bazi-derive.ts';

export interface BaziEngineEvidence {
  readonly chart: BaziEvidence;
  readonly self_calculation_sex: CalculationSex;
  readonly base_uncertainty: readonly UncertaintyInput[];
}

const PROFILE: MethodProfile = {
  id: BAZI_ZIPING_V1,
  contract_version: SJG_ALGO_CONTRACT_VERSION,
  feature_schema_version: SJG_ALGO_FEATURE_SCHEMA_VERSION,
  ephemeris_version: BAZI_EPHEMERIS_VERSION,
};

const CAPABILITIES: MethodEngineCapabilities = {
  requires_calculation_sex: true, // DaYun direction
  requires_birth_time: false, // 八字 degrades gracefully per SJG-ALGO-10
  horizon_unit: 'dayun',
};

const PRECISION_CODE: Readonly<Record<NatalCanonicalization['canonical_birth_precision'], UncertaintyInputCode>> = {
  exact: 'birth_precision_exact',
  rough_day: 'birth_precision_rough_day',
  rough_month: 'birth_precision_rough_month',
  rough_year: 'birth_precision_rough_year',
  unknown: 'birth_precision_unknown',
};

// SJG-ALGO-10 — 八字 degrades gracefully (rough_day omits the hour pillar at
// medium confidence) but fails closed once the precision drops below the usable
// floor: rough_year for any mirror, rough_month when DaYun is required, and
// unknown always (generate-reading is never the data-entry repair path).
function precisionSeverity(
  precision: NatalCanonicalization['canonical_birth_precision'],
  dayunRequired: boolean,
): UncertaintyInput['severity'] {
  switch (precision) {
    case 'exact':
      return 'info';
    case 'rough_day':
      return 'caveat';
    case 'rough_month':
      return dayunRequired ? 'fail_close' : 'caveat';
    case 'rough_year':
    case 'unknown':
      return 'fail_close';
  }
}

function subjectUncertainty(
  subject_ref: SubjectRef,
  canon: NatalCanonicalization,
  dayunRequired: boolean,
): UncertaintyInput[] {
  const out: UncertaintyInput[] = [];
  const precision = canon.canonical_birth_precision;
  out.push({ code: PRECISION_CODE[precision], severity: precisionSeverity(precision, dayunRequired), subject_ref });
  if (!canon.true_solar_time_utc || canon.standard_meridian_longitude === undefined) {
    out.push({ code: 'location_missing', severity: 'caveat', subject_ref });
    out.push({ code: 'timezone_missing', severity: 'caveat', subject_ref });
  }
  return out;
}

export const baziEngine: MethodEngine<BaziEngineEvidence> = {
  id: BAZI_ZIPING_V1,
  profile: PROFILE,
  capabilities: CAPABILITIES,

  computeEvidence(input: EngineComputeInput): StageResult<BaziEngineEvidence> {
    const uncertainty: UncertaintyInput[] = [];
    const selfChart = buildBaziSubjectChart({
      subject_ref: input.self_subject.subject_ref,
      canonicalization: input.self_subject.canonicalization,
      calculation_sex: input.self_subject.natal_inputs.calculation_sex,
      canonical_window: input.canonical_window,
      dayun_required: input.dayun_required,
    });
    if (!selfChart.ok) return selfChart;
    uncertainty.push(...subjectUncertainty(input.self_subject.subject_ref, input.self_subject.canonicalization, input.dayun_required));

    const related: BaziSubjectChart[] = [];
    for (const rp of input.related_persons) {
      const chart = buildBaziSubjectChart({
        subject_ref: rp.subject_ref,
        canonicalization: rp.canonicalization,
        calculation_sex: rp.natal_inputs.calculation_sex,
        canonical_window: input.canonical_window,
        dayun_required: input.dayun_required,
      });
      if (!chart.ok) return chart;
      related.push(chart.value);
      uncertainty.push(...subjectUncertainty(rp.subject_ref, rp.canonicalization, input.dayun_required));
    }

    return {
      ok: true,
      value: {
        chart: { self_subject: selfChart.value, related_persons: related },
        self_calculation_sex: input.self_subject.natal_inputs.calculation_sex,
        base_uncertainty: uncertainty,
      },
    };
  },

  deriveCommonDrivers(input: EngineDeriveInput<BaziEngineEvidence>) {
    return {
      ok: true,
      value: deriveBaziCommonDrivers({
        evidence: input.evidence.chart,
        self_calculation_sex: input.evidence.self_calculation_sex,
        base_uncertainty: input.evidence.base_uncertainty,
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        active_concern_tags: input.active_concern_tags,
      }),
    };
  },

  toMethodEvidence(evidence: BaziEngineEvidence): MethodEvidence {
    return { method_id: BAZI_ZIPING_V1, bazi: evidence.chart };
  },
};
