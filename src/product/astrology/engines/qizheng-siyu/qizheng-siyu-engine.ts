import {
  QIZHENG_SIYU_GUOLAO_V1,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ALGO_FEATURE_SCHEMA_VERSION,
  type MethodEvidence,
  type MethodProfile,
  type QizhengSiyuEvidence,
  type QizhengSiyuSubjectChart,
  type UncertaintyInput,
} from '../../../../domain/algorithm.ts';
import type {
  EngineComputeInput,
  EngineDeriveInput,
  MethodEngine,
  MethodEngineCapabilities,
} from '../../method-engine.ts';
import type { StageResult } from '../../stage-result.ts';
import {
  buildQizhengSiyuSubjectChart,
  QIZHENG_SIYU_EPHEMERIS_VERSION,
} from './qizheng-siyu-chart.ts';
import { deriveQizhengSiyuCommonDrivers } from './qizheng-siyu-derive.ts';

export interface QizhengSiyuEngineEvidence {
  readonly chart: QizhengSiyuEvidence;
  readonly base_uncertainty: readonly UncertaintyInput[];
}

const PROFILE: MethodProfile = {
  id: QIZHENG_SIYU_GUOLAO_V1,
  contract_version: SJG_ALGO_CONTRACT_VERSION,
  feature_schema_version: SJG_ALGO_FEATURE_SCHEMA_VERSION,
  ephemeris_version: QIZHENG_SIYU_EPHEMERIS_VERSION,
  interpretive_profile: 'guolao_xingzong_v1',
};

const CAPABILITIES: MethodEngineCapabilities = {
  requires_calculation_sex: false,
  requires_birth_time: true,
  horizon_unit: 'star_period',
};

export const qizhengSiyuEngine: MethodEngine<QizhengSiyuEngineEvidence> = {
  id: QIZHENG_SIYU_GUOLAO_V1,
  profile: PROFILE,
  capabilities: CAPABILITIES,

  computeEvidence(input: EngineComputeInput): StageResult<QizhengSiyuEngineEvidence> {
    const uncertainty: UncertaintyInput[] = [
      { code: 'birth_precision_exact', severity: 'info', subject_ref: input.self_subject.subject_ref },
    ];
    const selfChart = buildQizhengSiyuSubjectChart({
      subject_ref: input.self_subject.subject_ref,
      canonicalization: input.self_subject.canonicalization,
      natal_inputs: input.self_subject.natal_inputs,
    });
    if (!selfChart.ok) return selfChart;

    const related: QizhengSiyuSubjectChart[] = [];
    for (const rp of input.related_persons) {
      const chart = buildQizhengSiyuSubjectChart({
        subject_ref: rp.subject_ref,
        canonicalization: rp.canonicalization,
        natal_inputs: rp.natal_inputs,
      });
      if (chart.ok) {
        related.push(chart.value);
      } else {
        uncertainty.push({ code: 'related_person_incomplete', severity: 'caveat', subject_ref: rp.subject_ref });
      }
    }

    return {
      ok: true,
      value: {
        chart: { self_subject: selfChart.value, related_persons: related },
        base_uncertainty: uncertainty,
      },
    };
  },

  deriveCommonDrivers(input: EngineDeriveInput<QizhengSiyuEngineEvidence>) {
    return {
      ok: true,
      value: deriveQizhengSiyuCommonDrivers({
        evidence: input.evidence.chart,
        base_uncertainty: input.evidence.base_uncertainty,
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        active_concern_tags: input.active_concern_tags,
      }),
    };
  },

  toMethodEvidence(evidence: QizhengSiyuEngineEvidence): MethodEvidence {
    return {
      method_id: QIZHENG_SIYU_GUOLAO_V1,
      qizheng_siyu: evidence.chart,
    };
  },
};
