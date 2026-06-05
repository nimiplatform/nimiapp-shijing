// SJG-ALGO-01 — the 紫微斗数 (三合派) MethodEngine. Wraps the iztro astrolabe +
// the projection behind the same MethodEngine port as the 八字 engine. Adding it
// touches neither the common surface, runtime AI, persistence, nor the 八字 engine.

import {
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ALGO_FEATURE_SCHEMA_VERSION,
  ZIWEI_SANHE_V1,
  type MethodEvidence,
  type MethodProfile,
  type UncertaintyInput,
  type ZiweiSubjectChart,
} from '../../../../domain/algorithm.ts';
import type {
  EngineComputeInput,
  EngineDeriveInput,
  MethodEngine,
  MethodEngineCapabilities,
} from '../../method-engine.ts';
import type { StageResult } from '../../stage-result.ts';
import { buildZiweiAstro, ZIWEI_EPHEMERIS_VERSION, type ZiweiAstro } from './ziwei-chart.ts';
import { deriveZiweiCommonDrivers } from './ziwei-derive.ts';

export interface ZiweiEngineEvidence {
  readonly self: ZiweiAstro;
  readonly related_charts: readonly ZiweiSubjectChart[];
  readonly base_uncertainty: readonly UncertaintyInput[];
}

const PROFILE: MethodProfile = {
  id: ZIWEI_SANHE_V1,
  contract_version: SJG_ALGO_CONTRACT_VERSION,
  feature_schema_version: SJG_ALGO_FEATURE_SCHEMA_VERSION,
  ephemeris_version: ZIWEI_EPHEMERIS_VERSION,
};

const CAPABILITIES: MethodEngineCapabilities = {
  requires_calculation_sex: true,
  requires_birth_time: true, // 命宫 placement requires the 时辰: fail closed otherwise
  horizon_unit: 'daxian',
};

export const ziweiEngine: MethodEngine<ZiweiEngineEvidence> = {
  id: ZIWEI_SANHE_V1,
  profile: PROFILE,
  capabilities: CAPABILITIES,

  computeEvidence(input: EngineComputeInput): StageResult<ZiweiEngineEvidence> {
    const selfRes = buildZiweiAstro(
      input.self_subject.subject_ref,
      input.self_subject.canonicalization.true_solar_time_utc,
      input.self_subject.canonicalization.canonical_birth_precision,
      input.self_subject.natal_inputs.calculation_sex,
    );
    if (!selfRes.ok) {
      return {
        ok: false,
        error: {
          stage: 'build_natal_chart',
          kind: selfRes.reason === 'requires_birth_time' ? 'stage_missing_input' : 'stage_invalid_input',
          subject_ref: input.self_subject.subject_ref,
          detail: selfRes.reason === 'requires_birth_time'
            ? '紫微 requires an exact birth time to place 命宫 (SJG-ALGO-10 per-engine fail-close)'
            : 'invalid natal inputs for 紫微 astrolabe',
        },
      };
    }

    const uncertainty: UncertaintyInput[] = [
      { code: 'birth_precision_exact', severity: 'info', subject_ref: input.self_subject.subject_ref },
    ];
    const relatedCharts: ZiweiSubjectChart[] = [];
    for (const rp of input.related_persons) {
      const r = buildZiweiAstro(
        rp.subject_ref,
        rp.canonicalization.true_solar_time_utc,
        rp.canonicalization.canonical_birth_precision,
        rp.natal_inputs.calculation_sex,
      );
      if (r.ok) {
        relatedCharts.push(r.value.chart);
      } else {
        // A related person without an exact time can't enter the 紫微 evidence;
        // caveat and continue rather than failing the self reading.
        uncertainty.push({ code: 'related_person_incomplete', severity: 'caveat', subject_ref: rp.subject_ref });
      }
    }

    return { ok: true, value: { self: selfRes.value, related_charts: relatedCharts, base_uncertainty: uncertainty } };
  },

  deriveCommonDrivers(input: EngineDeriveInput<ZiweiEngineEvidence>) {
    return {
      ok: true,
      value: deriveZiweiCommonDrivers({
        self: input.evidence.self,
        base_uncertainty: input.evidence.base_uncertainty,
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        canonical_window: input.canonical_window,
        active_concern_tags: input.active_concern_tags,
      }),
    };
  },

  toMethodEvidence(evidence: ZiweiEngineEvidence): MethodEvidence {
    return {
      method_id: ZIWEI_SANHE_V1,
      ziwei: { self_subject: evidence.self.chart, related_persons: evidence.related_charts },
    };
  },
};
