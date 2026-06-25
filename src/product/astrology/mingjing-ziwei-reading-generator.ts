// SJG-ALGO-18 - minimal Ziwei Sanhe MingJing natal reading seed.
//
// This generator owns only deterministic Ziwei evidence projection for the
// MingJing route. Runtime AI must fill the prose fields before persistence.

import type {
  AstrologyFeatureSnapshot,
  MethodProfileId,
  ZiweiPalace,
  ZiweiSubjectChart,
} from '../../domain/algorithm.ts';
import type { MingJingZiweiNatalMirrorOutput } from '../../domain/mirror-output.ts';
import type { StageResult } from './stage-result.ts';

function nonEmpty(value: string | undefined): string {
  return value && value.length > 0 ? value : 'unknown';
}

function findSoulPalace(chart: ZiweiSubjectChart): ZiweiPalace | undefined {
  return chart.palaces.find((palace) => palace.is_soul);
}

function findBodyPalace(chart: ZiweiSubjectChart): ZiweiPalace | undefined {
  return chart.palaces.find((palace) => palace.is_body);
}

function sihuaRefs(chart: ZiweiSubjectChart): string[] {
  return chart.palaces.flatMap((palace) =>
    palace.major_stars
      .filter((star) => star.mutagen.length > 0)
      .map((star) => `${star.name}:${star.mutagen}@${palace.name}`),
  );
}

function decadeGuidanceSeed(
  chart: ZiweiSubjectChart,
): MingJingZiweiNatalMirrorOutput['decade_guidance'] {
  return [...chart.palaces]
    .filter((palace) => palace.decadal_start_age >= 0 && palace.decadal_end_age >= palace.decadal_start_age)
    .sort((a, b) => a.decadal_start_age - b.decadal_start_age)
    .map((palace) => ({
      age_range: `${palace.decadal_start_age}-${palace.decadal_end_age}`,
      palace_name: palace.name,
      palace_branch: palace.earthly_branch,
      major_stars: palace.major_stars.map((star) => star.name),
      theme: '',
      strategy: '',
    }));
}

export function generateMingJingZiweiNatalOutput(input: {
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly method_profile_id: MethodProfileId;
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
}): StageResult<MingJingZiweiNatalMirrorOutput> {
  const evidence = input.feature_snapshot.method_evidence;
  if (evidence.method_id !== 'ziwei_sanhe_v1') {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_invalid_input',
        detail: `ziwei_natal_brief requires ziwei_sanhe_v1 evidence, received ${evidence.method_id}`,
      },
    };
  }

  const chart = evidence.ziwei.self_subject;
  const soulPalace = findSoulPalace(chart);
  const bodyPalace = findBodyPalace(chart);
  if (!soulPalace || !bodyPalace || chart.palaces.length !== 12) {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_missing_input',
        subject_ref: 'self',
        detail: 'ziwei_natal_brief requires twelve palaces plus soul/body palace evidence',
      },
    };
  }

  const decadeGuidance = decadeGuidanceSeed(chart);
  if (decadeGuidance.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_missing_input',
        subject_ref: 'self',
        detail: 'ziwei_natal_brief requires decadal palace ranges',
      },
    };
  }

  return {
    ok: true,
    value: {
      mirror_kind: 'mingjing',
      output_kind: 'ziwei_natal_brief',
      summary: '',
      chart_basis: {
        soul_palace_branch: nonEmpty(chart.soul_palace_branch),
        soul_palace_name: nonEmpty(soulPalace.name),
        body_palace_name: nonEmpty(bodyPalace.name),
        five_elements_class: nonEmpty(chart.five_elements_class),
        soul_star: nonEmpty(chart.soul_star),
        body_star: nonEmpty(chart.body_star),
        palace_count: chart.palaces.length,
        sihua_refs: sihuaRefs(chart),
      },
      profile: {
        life_pattern: '',
        strengths: '',
        long_term_theme: '',
        relationship_pattern: '',
        career_inclination: '',
      },
      decade_guidance: decadeGuidance,
      cited_event_memory_refs: input.cited_event_memory_refs,
      cited_plan_item_refs: input.cited_plan_item_refs,
      citations: [{ method: input.method_profile_id, reference: 'mingjing.ziwei_natal_brief.v1' }],
    },
  };
}
