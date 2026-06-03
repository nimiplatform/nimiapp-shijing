// SJG-ASTRO-03..08 — MirrorOutput validator.

import {
  MIRROR_OUTPUT_ALLOWED_CITATION_METHODS,
  NIANJING_INFLECTION_KINDS,
  TENDENCY_CLASSES,
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
  | { code: 'mirror_output_citation_method_invalid'; index: number; received: unknown }
  | { code: 'mirror_output_citation_reference_empty'; index: number }
  | { code: 'mirror_output_rijing_daily_overview_empty' }
  | { code: 'mirror_output_rijing_concern_projection_concern_tag_ref_empty'; index: number }
  | { code: 'mirror_output_rijing_concern_projection_tendency_class_invalid'; index: number; received: unknown }
  | { code: 'mirror_output_rijing_concern_projection_summary_empty'; index: number }
  | { code: 'mirror_output_yuejing_range_invalid' }
  | { code: 'mirror_output_yuejing_cell_date_invalid'; index: number }
  | { code: 'mirror_output_yuejing_cell_concern_tag_ref_empty'; index: number }
  | { code: 'mirror_output_yuejing_cell_tendency_class_invalid'; index: number; received: unknown }
  | { code: 'mirror_output_yuejing_cell_summary_empty'; index: number }
  | { code: 'mirror_output_nianjing_horizon_invalid' }
  | { code: 'mirror_output_nianjing_phase_band_invalid'; index: number; reason: string }
  | { code: 'mirror_output_nianjing_inflection_point_invalid'; index: number; reason: string }
  | { code: 'mirror_output_shijing_answer_empty' }
  | { code: 'mirror_output_shijing_cited_reading_ids_empty' };

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

function validateCitations(
  citations: readonly MirrorCitation[],
): MirrorOutputValidationResult | null {
  for (let i = 0; i < citations.length; i += 1) {
    const citation = citations[i]!;
    if (!MIRROR_OUTPUT_ALLOWED_CITATION_METHODS.includes(citation.method)) {
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
  for (let i = 0; i < output.concern_projections.length; i += 1) {
    const projection = output.concern_projections[i]!;
    if (typeof projection.concern_tag_ref !== 'string' || projection.concern_tag_ref.length === 0) {
      return {
        ok: false,
        error: { code: 'mirror_output_rijing_concern_projection_concern_tag_ref_empty', index: i },
      };
    }
    if (!TENDENCY_CLASSES.includes(projection.tendency_class)) {
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
  }
  return { ok: true };
}

function validateYuejing(output: YueJingMirrorOutput): MirrorOutputValidationResult {
  if (
    !LOCAL_DATE_PATTERN.test(output.range.start_date) ||
    !LOCAL_DATE_PATTERN.test(output.range.end_date)
  ) {
    return { ok: false, error: { code: 'mirror_output_yuejing_range_invalid' } };
  }
  for (let i = 0; i < output.cells.length; i += 1) {
    const cell = output.cells[i]!;
    if (!LOCAL_DATE_PATTERN.test(cell.date)) {
      return { ok: false, error: { code: 'mirror_output_yuejing_cell_date_invalid', index: i } };
    }
    if (typeof cell.concern_tag_ref !== 'string' || cell.concern_tag_ref.length === 0) {
      return {
        ok: false,
        error: { code: 'mirror_output_yuejing_cell_concern_tag_ref_empty', index: i },
      };
    }
    if (!TENDENCY_CLASSES.includes(cell.tendency_class)) {
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
    !LOCAL_DATE_PATTERN.test(output.horizon.start_date) ||
    !LOCAL_DATE_PATTERN.test(output.horizon.end_date)
  ) {
    return { ok: false, error: { code: 'mirror_output_nianjing_horizon_invalid' } };
  }
  for (let i = 0; i < output.phase_bands.length; i += 1) {
    const band = output.phase_bands[i]!;
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
    if (!LOCAL_DATE_PATTERN.test(band.start_date) || !LOCAL_DATE_PATTERN.test(band.end_date)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_phase_band_invalid',
          index: i,
          reason: 'date_invalid',
        },
      };
    }
    if (!TENDENCY_CLASSES.includes(band.nature)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_phase_band_invalid',
          index: i,
          reason: 'nature_invalid',
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
  for (let i = 0; i < output.inflection_points.length; i += 1) {
    const inflection = output.inflection_points[i]!;
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
    if (!LOCAL_DATE_PATTERN.test(inflection.date)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_inflection_point_invalid',
          index: i,
          reason: 'date_invalid',
        },
      };
    }
    if (!NIANJING_INFLECTION_KINDS.includes(inflection.kind)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_nianjing_inflection_point_invalid',
          index: i,
          reason: 'kind_invalid',
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
        !LOCAL_DATE_PATTERN.test(inflection.date_window.start_date) ||
        !LOCAL_DATE_PATTERN.test(inflection.date_window.end_date)
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
  if (output.cited_reading_ids.length === 0) {
    return { ok: false, error: { code: 'mirror_output_shijing_cited_reading_ids_empty' } };
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
  const citationsCheck = validateCitations(output.citations);
  if (citationsCheck) return citationsCheck;
  switch (output.mirror_kind) {
    case 'rijing':
      return validateRijing(output);
    case 'yuejing':
      return validateYuejing(output);
    case 'nianjing':
      return validateNianjing(output);
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
