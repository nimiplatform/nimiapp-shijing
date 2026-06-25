// SJG-ASTRO-03..08 - MirrorOutput validator.

import type { MirrorOutput } from '../domain/mirror-output.ts';
import { ensureNoForbiddenFields, isStringArray, validateCitations } from './mirror-output/common.ts';
import { validateMingjing } from './mirror-output/mingjing-natal-validator.ts';
import { validateNianjing, validateRijing, validateShijing, validateYuejing } from './mirror-output/time-mirror-validators.ts';

export type MirrorOutputValidationError =
  | { code: 'mirror_output_summary_empty' }
  | { code: 'mirror_output_mirror_kind_invalid'; received: unknown }
  | { code: 'mirror_output_forbidden_field_present'; field: string }
  | { code: 'mirror_output_citations_invalid' }
  | { code: 'mirror_output_citation_method_invalid'; index: number; received: unknown }
  | { code: 'mirror_output_citation_reference_empty'; index: number }
  | { code: 'mirror_output_cited_event_memory_refs_invalid' }
  | { code: 'mirror_output_cited_plan_item_refs_invalid' }
  | { code: 'mirror_output_rijing_daily_overview_empty' }
  | { code: 'mirror_output_rijing_concern_projections_invalid' }
  | { code: 'mirror_output_rijing_concern_projection_concern_tag_ref_empty'; index: number }
  | { code: 'mirror_output_rijing_concern_projection_tendency_class_invalid'; index: number; received: unknown }
  | { code: 'mirror_output_rijing_concern_projection_summary_empty'; index: number }
  | { code: 'mirror_output_rijing_concern_projection_recommendations_invalid'; index: number }
  | { code: 'mirror_output_yuejing_range_invalid' }
  | { code: 'mirror_output_yuejing_cells_invalid' }
  | { code: 'mirror_output_yuejing_cell_date_invalid'; index: number }
  | { code: 'mirror_output_yuejing_cell_concern_tag_ref_empty'; index: number }
  | { code: 'mirror_output_yuejing_cell_tendency_class_invalid'; index: number; received: unknown }
  | { code: 'mirror_output_yuejing_cell_summary_empty'; index: number }
  | { code: 'mirror_output_nianjing_horizon_invalid' }
  | { code: 'mirror_output_nianjing_phase_bands_invalid' }
  | { code: 'mirror_output_nianjing_inflection_points_invalid' }
  | { code: 'mirror_output_nianjing_phase_band_invalid'; index: number; reason: string }
  | { code: 'mirror_output_nianjing_inflection_point_invalid'; index: number; reason: string }
  | { code: 'mirror_output_shijing_answer_empty' }
  | { code: 'mirror_output_shijing_cited_reading_ids_invalid' }
  | { code: 'mirror_output_shijing_cited_reading_ids_empty' }
  | { code: 'mirror_output_mingjing_core_invalid'; field: string }
  | { code: 'mirror_output_mingjing_life_stage_strategies_invalid' }
  | { code: 'mirror_output_mingjing_life_stage_strategy_invalid'; index: number; reason: string }
  | { code: 'mirror_output_mingjing_event_validations_invalid' }
  | { code: 'mirror_output_mingjing_event_validation_invalid'; index: number; reason: string }
  | { code: 'mirror_output_mingjing_relationship_subject_invalid'; reason: string }
  | { code: 'mirror_output_mingjing_relationship_structure_invalid'; field: string }
  | { code: 'mirror_output_mingjing_relationship_timing_invalid' }
  | { code: 'mirror_output_mingjing_relationship_timing_window_invalid'; index?: number; reason?: string }
  | { code: 'mirror_output_mingjing_relationship_practice_invalid'; field: string }
  | { code: 'mirror_output_mingjing_ziwei_chart_basis_invalid'; field: string }
  | { code: 'mirror_output_mingjing_ziwei_profile_invalid'; field: string }
  | { code: 'mirror_output_mingjing_ziwei_decade_guidance_invalid' }
  | { code: 'mirror_output_mingjing_ziwei_decade_guidance_item_invalid'; index: number; reason: string }
  | { code: 'mirror_output_mingjing_qizheng_chart_basis_invalid'; field: string }
  | { code: 'mirror_output_mingjing_qizheng_profile_invalid'; field: string }
  | { code: 'mirror_output_mingjing_qizheng_star_guidance_invalid' }
  | { code: 'mirror_output_mingjing_qizheng_star_guidance_item_invalid'; index: number; reason: string };

export type MirrorOutputValidationResult =
  | { ok: true }
  | { ok: false; error: MirrorOutputValidationError };

export function validateMirrorOutput(output: MirrorOutput): MirrorOutputValidationResult {
  if (typeof output.summary !== 'string' || output.summary.length === 0) {
    return { ok: false, error: { code: 'mirror_output_summary_empty' } };
  }
  const record = output as unknown as Record<string, unknown>;
  const forbidden = ensureNoForbiddenFields(record);
  if (forbidden) return forbidden;
  if (!isStringArray(record.cited_event_memory_refs)) {
    return { ok: false, error: { code: 'mirror_output_cited_event_memory_refs_invalid' } };
  }
  if (!isStringArray(record.cited_plan_item_refs)) {
    return { ok: false, error: { code: 'mirror_output_cited_plan_item_refs_invalid' } };
  }
  const citationsCheck = validateCitations(output.citations);
  if (citationsCheck) return citationsCheck;
  switch (output.mirror_kind) {
    case 'rijing':
      return validateRijing(output);
    case 'yuejing':
      return validateYuejing(output);
    case 'nianjing':
      return validateNianjing(output);
    case 'mingjing':
      return validateMingjing(output);
    case 'shijing':
      return validateShijing(output);
    default:
      return {
        ok: false,
        error: {
          code: 'mirror_output_mirror_kind_invalid',
          received: (output as MirrorOutput).mirror_kind,
        },
      };
  }
}
