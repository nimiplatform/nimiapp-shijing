import type {
  NianJingMirrorOutput,
  RiJingMirrorOutput,
  ShiJingMirrorOutput,
  YueJingMirrorOutput,
} from '../../domain/mirror-output.ts';
import type { MirrorOutputValidationResult } from '../mirror-output-validator.ts';
import {
  isAllowedInflectionKind,
  isAllowedTendencyClass,
  isLocalDate,
  isRecord,
  isStringArray,
} from './common.ts';

export function validateRijing(output: RiJingMirrorOutput): MirrorOutputValidationResult {
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

export function validateYuejing(output: YueJingMirrorOutput): MirrorOutputValidationResult {
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

export function validateNianjing(output: NianJingMirrorOutput): MirrorOutputValidationResult {
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

export function validateShijing(output: ShiJingMirrorOutput): MirrorOutputValidationResult {
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
