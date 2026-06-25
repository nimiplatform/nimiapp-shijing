// MingJing QiZheng SiYu / GuoLao natal reading seed.
//
// The deterministic chart basis and star targets come from method evidence.
// Runtime AI may only word the prose fields in the admitted output shape.

import type {
  AstrologyFeatureSnapshot,
  MethodProfileId,
  QizhengSiyuBody,
  QizhengSiyuSubjectChart,
} from '../../domain/algorithm.ts';
import type { MingJingQizhengNatalMirrorOutput } from '../../domain/mirror-output.ts';
import type { StageResult } from './stage-result.ts';

function strongestBodies(chart: QizhengSiyuSubjectChart): QizhengSiyuBody[] {
  const rank = new Map([
    ['七强', 0],
    ['次强', 1],
    ['闲宫', 2],
  ]);
  return [...chart.bodies]
    .sort((a, b) => {
      const byRank = (rank.get(a.position_class) ?? 9) - (rank.get(b.position_class) ?? 9);
      if (byRank !== 0) return byRank;
      if (a.kind !== b.kind) return a.kind === 'qizheng' ? -1 : 1;
      return a.key.localeCompare(b.key);
    })
    .slice(0, 7);
}

function starGuidanceSeed(
  chart: QizhengSiyuSubjectChart,
): MingJingQizhengNatalMirrorOutput['star_guidance'] {
  return strongestBodies(chart).map((body) => ({
    body_key: body.key,
    body_label: body.label,
    house_name: body.house_name,
    mansion: body.mansion,
    position_class: body.position_class,
    theme: '',
    strategy: '',
  }));
}

export function generateMingJingQizhengNatalOutput(input: {
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly method_profile_id: MethodProfileId;
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
}): StageResult<MingJingQizhengNatalMirrorOutput> {
  const evidence = input.feature_snapshot.method_evidence;
  if (evidence.method_id !== 'qizheng_siyu_guolao_v1') {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_invalid_input',
        detail: `qizheng_siyu_natal_brief requires qizheng_siyu_guolao_v1 evidence, received ${evidence.method_id}`,
      },
    };
  }

  const chart = evidence.qizheng_siyu.self_subject;
  if (chart.bodies.length !== 11 || chart.houses.length !== 12) {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_missing_input',
        subject_ref: 'self',
        detail: 'qizheng_siyu_natal_brief requires eleven bodies and twelve houses',
      },
    };
  }

  const starGuidance = starGuidanceSeed(chart);
  if (starGuidance.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_missing_input',
        subject_ref: 'self',
        detail: 'qizheng_siyu_natal_brief requires star guidance targets',
      },
    };
  }

  return {
    ok: true,
    value: {
      mirror_kind: 'mingjing',
      output_kind: 'qizheng_siyu_natal_brief',
      summary: '',
      chart_basis: {
        ascendant_longitude: chart.chart_basis.ascendant_longitude,
        day_night: chart.chart_basis.day_night,
        zodiac_model: chart.chart_basis.zodiac_model,
        house_model: chart.chart_basis.house_model,
        mansion_model: chart.chart_basis.mansion_model,
        siyu_model: chart.chart_basis.siyu_model,
        ephemeris_version: chart.chart_basis.ephemeris_version,
        key_body_refs: strongestBodies(chart).map((body) => `${body.label}@${body.house_name}/${body.mansion}`),
      },
      profile: {
        life_pattern: '',
        strengths: '',
        long_term_theme: '',
        relationship_pattern: '',
        career_inclination: '',
      },
      star_guidance: starGuidance,
      cited_event_memory_refs: input.cited_event_memory_refs,
      cited_plan_item_refs: input.cited_plan_item_refs,
      citations: [{ method: input.method_profile_id, reference: 'mingjing.qizheng_siyu_natal_brief.v1' }],
    },
  };
}
