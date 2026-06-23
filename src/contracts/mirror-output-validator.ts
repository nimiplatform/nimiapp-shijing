// SJG-ASTRO-03..08 — MirrorOutput validator.

import {
  MIRROR_OUTPUT_ALLOWED_CITATION_METHODS,
  NIANJING_INFLECTION_KINDS,
  TENDENCY_CLASSES,
  type MingJingMirrorOutput,
  type MirrorCitation,
  type MirrorOutput,
  type NianJingMirrorOutput,
  type RiJingMirrorOutput,
  type ShiJingMirrorOutput,
  type YueJingMirrorOutput,
} from '../domain/mirror-output.ts';

const COMMON_FORBIDDEN_OUTPUT_FIELDS: readonly string[] = [
  'score',
  'luck_score',
  'luck_curve',
  'luck_rank',
  'percentile',
  'trend_chart',
  'k_line',
  'k_line_bar',
  'kline',
  'curve',
  'numeric_series',
  'report',
  'reports',
  'monthly_report',
  'yearly_report',
  'task_status',
  'progress',
  'gantt',
  'milestone',
  'deadline',
  'priority',
];

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
  | { code: 'mirror_output_mingjing_event_validation_invalid'; index: number; reason: string };

export type MirrorOutputValidationResult =
  | { ok: true }
  | { ok: false; error: MirrorOutputValidationError };

function ensureNoForbiddenFields(
  record: Record<string, unknown>,
): MirrorOutputValidationResult | null {
  for (const field of COMMON_FORBIDDEN_OUTPUT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      return {
        ok: false,
        error: { code: 'mirror_output_forbidden_field_present', field },
      };
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAllowedCitationMethod(
  value: unknown,
): value is MirrorCitation['method'] {
  return (
    typeof value === 'string' &&
    (MIRROR_OUTPUT_ALLOWED_CITATION_METHODS as readonly string[]).includes(value)
  );
}

function isAllowedTendencyClass(value: unknown): boolean {
  return typeof value === 'string' && (TENDENCY_CLASSES as readonly string[]).includes(value);
}

function isAllowedInflectionKind(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    (NIANJING_INFLECTION_KINDS as readonly string[]).includes(value)
  );
}

function isLocalDate(value: unknown): value is string {
  return typeof value === 'string' && LOCAL_DATE_PATTERN.test(value);
}

function validateCitations(
  citations: unknown,
): MirrorOutputValidationResult | null {
  if (!Array.isArray(citations)) {
    return { ok: false, error: { code: 'mirror_output_citations_invalid' } };
  }
  for (let i = 0; i < citations.length; i += 1) {
    const citation = citations[i] as Partial<MirrorCitation>;
    if (!isRecord(citation)) {
      return {
        ok: false,
        error: { code: 'mirror_output_citation_method_invalid', index: i, received: citation },
      };
    }
    if (!isAllowedCitationMethod(citation.method)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_citation_method_invalid',
          index: i,
          received: citation.method,
        },
      };
    }
    if (typeof citation.reference !== 'string' || citation.reference.length === 0) {
      return { ok: false, error: { code: 'mirror_output_citation_reference_empty', index: i } };
    }
  }
  return null;
}

function validateRijing(output: RiJingMirrorOutput): MirrorOutputValidationResult {
  if (typeof output.daily_overview !== 'string' || output.daily_overview.length === 0) {
    return { ok: false, error: { code: 'mirror_output_rijing_daily_overview_empty' } };
  }
  if (!Array.isArray(output.concern_projections)) {
    return { ok: false, error: { code: 'mirror_output_rijing_concern_projections_invalid' } };
  }
  for (let i = 0; i < output.concern_projections.length; i += 1) {
    const projection = output.concern_projections[i]!;
    if (!isRecord(projection)) {
      return {
        ok: false,
        error: { code: 'mirror_output_rijing_concern_projection_concern_tag_ref_empty', index: i },
      };
    }
    if (typeof projection.concern_tag_ref !== 'string' || projection.concern_tag_ref.length === 0) {
      return {
        ok: false,
        error: { code: 'mirror_output_rijing_concern_projection_concern_tag_ref_empty', index: i },
      };
    }
    if (!isAllowedTendencyClass(projection.tendency_class)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_rijing_concern_projection_tendency_class_invalid',
          index: i,
          received: projection.tendency_class,
        },
      };
    }
    if (typeof projection.summary !== 'string' || projection.summary.length === 0) {
      return {
        ok: false,
        error: { code: 'mirror_output_rijing_concern_projection_summary_empty', index: i },
      };
    }
    if (!isStringArray(projection.recommendations)) {
      return {
        ok: false,
        error: { code: 'mirror_output_rijing_concern_projection_recommendations_invalid', index: i },
      };
    }
  }
  return { ok: true };
}

function validateYuejing(output: YueJingMirrorOutput): MirrorOutputValidationResult {
  if (
    !isRecord(output.range) ||
    !isLocalDate(output.range.start_date) ||
    !isLocalDate(output.range.end_date)
  ) {
    return { ok: false, error: { code: 'mirror_output_yuejing_range_invalid' } };
  }
  if (!Array.isArray(output.cells)) {
    return { ok: false, error: { code: 'mirror_output_yuejing_cells_invalid' } };
  }
  for (let i = 0; i < output.cells.length; i += 1) {
    const cell = output.cells[i]!;
    if (!isRecord(cell)) {
      return { ok: false, error: { code: 'mirror_output_yuejing_cell_date_invalid', index: i } };
    }
    if (!isLocalDate(cell.date)) {
      return { ok: false, error: { code: 'mirror_output_yuejing_cell_date_invalid', index: i } };
    }
    if (typeof cell.concern_tag_ref !== 'string' || cell.concern_tag_ref.length === 0) {
      return {
        ok: false,
        error: { code: 'mirror_output_yuejing_cell_concern_tag_ref_empty', index: i },
      };
    }
    if (!isAllowedTendencyClass(cell.tendency_class)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_yuejing_cell_tendency_class_invalid',
          index: i,
          received: cell.tendency_class,
        },
      };
    }
    if (typeof cell.summary !== 'string' || cell.summary.length === 0) {
      return { ok: false, error: { code: 'mirror_output_yuejing_cell_summary_empty', index: i } };
    }
  }
  return { ok: true };
}

function validateNianjing(output: NianJingMirrorOutput): MirrorOutputValidationResult {
  if (
    !isRecord(output.horizon) ||
    !isLocalDate(output.horizon.start_date) ||
    !isLocalDate(output.horizon.end_date)
  ) {
    return { ok: false, error: { code: 'mirror_output_nianjing_horizon_invalid' } };
  }
  if (!Array.isArray(output.phase_bands)) {
    return { ok: false, error: { code: 'mirror_output_nianjing_phase_bands_invalid' } };
  }
  for (let i = 0; i < output.phase_bands.length; i += 1) {
    const band = output.phase_bands[i]!;
    if (!isRecord(band)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_phase_band_invalid',
          index: i,
          reason: 'not_object',
        },
      };
    }
    if (typeof band.concern_tag_ref !== 'string' || band.concern_tag_ref.length === 0) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_phase_band_invalid',
          index: i,
          reason: 'concern_tag_ref_empty',
        },
      };
    }
    if (!isLocalDate(band.start_date) || !isLocalDate(band.end_date)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_phase_band_invalid',
          index: i,
          reason: 'date_invalid',
        },
      };
    }
    if (!isAllowedTendencyClass(band.nature)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_phase_band_invalid',
          index: i,
          reason: 'nature_invalid',
        },
      };
    }
    if (!isStringArray(band.driver_refs)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_phase_band_invalid',
          index: i,
          reason: 'driver_refs_invalid',
        },
      };
    }
    if (typeof band.summary !== 'string' || band.summary.length === 0) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_phase_band_invalid',
          index: i,
          reason: 'summary_empty',
        },
      };
    }
  }
  if (!Array.isArray(output.inflection_points)) {
    return { ok: false, error: { code: 'mirror_output_nianjing_inflection_points_invalid' } };
  }
  for (let i = 0; i < output.inflection_points.length; i += 1) {
    const inflection = output.inflection_points[i]!;
    if (!isRecord(inflection)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_inflection_point_invalid',
          index: i,
          reason: 'not_object',
        },
      };
    }
    if (
      typeof inflection.concern_tag_ref !== 'string' ||
      inflection.concern_tag_ref.length === 0
    ) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_inflection_point_invalid',
          index: i,
          reason: 'concern_tag_ref_empty',
        },
      };
    }
    if (!isLocalDate(inflection.date)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_inflection_point_invalid',
          index: i,
          reason: 'date_invalid',
        },
      };
    }
    if (!isAllowedInflectionKind(inflection.kind)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_inflection_point_invalid',
          index: i,
          reason: 'kind_invalid',
        },
      };
    }
    if (!isStringArray(inflection.driver_refs)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_inflection_point_invalid',
          index: i,
          reason: 'driver_refs_invalid',
        },
      };
    }
    if (typeof inflection.summary !== 'string' || inflection.summary.length === 0) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_inflection_point_invalid',
          index: i,
          reason: 'summary_empty',
        },
      };
    }
    if (inflection.date_window) {
      if (
        !isRecord(inflection.date_window) ||
        !isLocalDate(inflection.date_window.start_date) ||
        !isLocalDate(inflection.date_window.end_date)
      ) {
        return {
          ok: false,
          error: {
            code: 'mirror_output_nianjing_inflection_point_invalid',
            index: i,
            reason: 'date_window_invalid',
          },
        };
      }
    }
  }
  return { ok: true };
}

function validateShijing(output: ShiJingMirrorOutput): MirrorOutputValidationResult {
  if (typeof output.answer !== 'string' || output.answer.length === 0) {
    return { ok: false, error: { code: 'mirror_output_shijing_answer_empty' } };
  }
  if (!isStringArray(output.cited_reading_ids)) {
    return { ok: false, error: { code: 'mirror_output_shijing_cited_reading_ids_invalid' } };
  }
  if (output.cited_reading_ids.length === 0) {
    return { ok: false, error: { code: 'mirror_output_shijing_cited_reading_ids_empty' } };
  }
  return { ok: true };
}

function isGanzhiPillar(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.stem === 'string' &&
    value.stem.length > 0 &&
    typeof value.branch === 'string' &&
    value.branch.length > 0
  );
}

const MINGJING_CORE_FIELDS: readonly string[] = [
  'personality',
  'strengths',
  'long_term_themes',
  'relationship_pattern',
  'career_inclination',
];

function validateMingjing(output: MingJingMirrorOutput): MirrorOutputValidationResult {
  const core = output.core as unknown;
  if (!isRecord(core)) {
    return { ok: false, error: { code: 'mirror_output_mingjing_core_invalid', field: 'core' } };
  }
  for (const field of MINGJING_CORE_FIELDS) {
    if (typeof core[field] !== 'string' || (core[field] as string).length === 0) {
      return { ok: false, error: { code: 'mirror_output_mingjing_core_invalid', field } };
    }
  }

  if (!Array.isArray(output.life_stage_strategies)) {
    return { ok: false, error: { code: 'mirror_output_mingjing_life_stage_strategies_invalid' } };
  }
  for (let i = 0; i < output.life_stage_strategies.length; i += 1) {
    const s = output.life_stage_strategies[i] as unknown;
    if (!isRecord(s)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_life_stage_strategy_invalid', index: i, reason: 'not_object' } };
    }
    for (const key of ['phase_label', 'age_range', 'theme', 'strategy'] as const) {
      if (typeof s[key] !== 'string' || (s[key] as string).length === 0) {
        return { ok: false, error: { code: 'mirror_output_mingjing_life_stage_strategy_invalid', index: i, reason: `${key}_empty` } };
      }
    }
    if (!isGanzhiPillar(s.dayun_pillar)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_life_stage_strategy_invalid', index: i, reason: 'dayun_pillar_invalid' } };
    }
  }

  if (!Array.isArray(output.event_validations)) {
    return { ok: false, error: { code: 'mirror_output_mingjing_event_validations_invalid' } };
  }
  for (let i = 0; i < output.event_validations.length; i += 1) {
    const v = output.event_validations[i] as unknown;
    if (!isRecord(v)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'not_object' } };
    }
    if (typeof v.event_memory_ref !== 'string' || (v.event_memory_ref as string).length === 0) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'event_memory_ref_empty' } };
    }
    if (typeof v.occurred_year !== 'number' || !Number.isInteger(v.occurred_year)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'occurred_year_invalid' } };
    }
    if (!isAllowedTendencyClass(v.period_nature)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'period_nature_invalid' } };
    }
    if (typeof v.note !== 'string' || (v.note as string).length === 0) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'note_empty' } };
    }
    if (v.dayun_pillar !== undefined && !isGanzhiPillar(v.dayun_pillar)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'dayun_pillar_invalid' } };
    }
  }
  return { ok: true };
}

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
