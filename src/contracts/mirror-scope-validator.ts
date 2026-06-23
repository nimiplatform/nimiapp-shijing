// SJG-DATA-08 + SJG-ASTRO-02 + SJG-ALGO-03 — MirrorScope validator.

import {
  CONSULTATION_QUESTION_WINDOW_MAX_LOCAL_DAYS,
  CONSULTATION_QUESTION_WINDOW_MIN_LOCAL_DAYS,
  MIRROR_KIND_SCOPE_MATRIX,
  MIRROR_KINDS,
  MIRROR_SCOPE_KINDS,
  NATAL_ANCHOR_YEAR_MAX,
  NATAL_ANCHOR_YEAR_MIN,
  NIANJING_MAX_LOCAL_YEARS,
  NIANJING_MIN_LOCAL_MONTHS,
  ROLLING_30_DAY_LOCAL_LENGTH,
  type MirrorKind,
  type MirrorScope,
} from '../domain/mirror-scope.ts';
import { isValidIanaTimeZone } from './time-window-validation.ts';

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type MirrorScopeValidationError =
  | { code: 'mirror_scope_kind_invalid'; received: unknown }
  | { code: 'mirror_scope_basis_time_zone_invalid' }
  | { code: 'mirror_scope_local_date_invalid'; field: string; received: unknown }
  | { code: 'mirror_scope_rolling_30_day_length_invalid'; received_days: number }
  | { code: 'mirror_scope_long_horizon_too_short'; min_months: number; received_months: number }
  | { code: 'mirror_scope_long_horizon_too_long'; max_years: number }
  | { code: 'mirror_scope_long_horizon_start_after_end' }
  | { code: 'mirror_scope_natal_anchor_year_invalid'; received: unknown }
  | { code: 'mirror_scope_consultation_source_reading_ids_empty' }
  | { code: 'mirror_scope_consultation_source_reading_id_empty'; index: number }
  | { code: 'mirror_scope_consultation_question_window_invalid_range' }
  | { code: 'mirror_scope_consultation_question_window_out_of_bounds'; received_days: number };

export type MirrorScopeValidationResult =
  | { ok: true }
  | { ok: false; error: MirrorScopeValidationError };

interface LocalDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly utcMs: number;
}

function parseLocalDate(value: unknown): LocalDateParts | null {
  if (typeof value !== 'string') return null;
  const m = LOCAL_DATE_PATTERN.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const utcMs = Date.UTC(year, month - 1, day);
  const d = new Date(utcMs);
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() + 1 !== month ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day, utcMs };
}

function localDayDelta(a: LocalDateParts, b: LocalDateParts): number {
  const ms = b.utcMs - a.utcMs;
  return Math.round(ms / 86_400_000);
}

export function validateMirrorScope(scope: MirrorScope): MirrorScopeValidationResult {
  if (!MIRROR_SCOPE_KINDS.includes(scope.kind)) {
    return { ok: false, error: { code: 'mirror_scope_kind_invalid', received: scope.kind } };
  }
  if (!isValidIanaTimeZone(scope.basis_time_zone)) {
    return { ok: false, error: { code: 'mirror_scope_basis_time_zone_invalid' } };
  }
  if (scope.kind === 'daily') {
    const date = parseLocalDate(scope.date);
    if (!date) {
      return {
        ok: false,
        error: { code: 'mirror_scope_local_date_invalid', field: 'date', received: scope.date },
      };
    }
    return { ok: true };
  }
  if (scope.kind === 'rolling_30_day') {
    const start = parseLocalDate(scope.start_date);
    if (!start) {
      return {
        ok: false,
        error: {
          code: 'mirror_scope_local_date_invalid',
          field: 'start_date',
          received: scope.start_date,
        },
      };
    }
    const end = parseLocalDate(scope.end_date);
    if (!end) {
      return {
        ok: false,
        error: {
          code: 'mirror_scope_local_date_invalid',
          field: 'end_date',
          received: scope.end_date,
        },
      };
    }
    const days = localDayDelta(start, end) + 1;
    if (days !== ROLLING_30_DAY_LOCAL_LENGTH) {
      return {
        ok: false,
        error: { code: 'mirror_scope_rolling_30_day_length_invalid', received_days: days },
      };
    }
    return { ok: true };
  }
  if (scope.kind === 'long_horizon') {
    const start = parseLocalDate(scope.start_date);
    if (!start) {
      return {
        ok: false,
        error: {
          code: 'mirror_scope_local_date_invalid',
          field: 'start_date',
          received: scope.start_date,
        },
      };
    }
    const end = parseLocalDate(scope.end_date);
    if (!end) {
      return {
        ok: false,
        error: {
          code: 'mirror_scope_local_date_invalid',
          field: 'end_date',
          received: scope.end_date,
        },
      };
    }
    if (end.utcMs <= start.utcMs) {
      return { ok: false, error: { code: 'mirror_scope_long_horizon_start_after_end' } };
    }
    const months =
      (end.year - start.year) * 12 + (end.month - start.month) + (end.day >= start.day ? 0 : -1);
    if (months < NIANJING_MIN_LOCAL_MONTHS) {
      return {
        ok: false,
        error: {
          code: 'mirror_scope_long_horizon_too_short',
          min_months: NIANJING_MIN_LOCAL_MONTHS,
          received_months: months,
        },
      };
    }
    const years = end.year - start.year + (end.month >= start.month ? 0 : -1);
    if (years > NIANJING_MAX_LOCAL_YEARS) {
      return {
        ok: false,
        error: {
          code: 'mirror_scope_long_horizon_too_long',
          max_years: NIANJING_MAX_LOCAL_YEARS,
        },
      };
    }
    return { ok: true };
  }
  if (scope.kind === 'natal') {
    if (
      !Number.isInteger(scope.anchor_year) ||
      scope.anchor_year < NATAL_ANCHOR_YEAR_MIN ||
      scope.anchor_year > NATAL_ANCHOR_YEAR_MAX
    ) {
      return {
        ok: false,
        error: { code: 'mirror_scope_natal_anchor_year_invalid', received: scope.anchor_year },
      };
    }
    return { ok: true };
  }
  if (scope.kind === 'consultation') {
    if (scope.source_reading_ids.length === 0) {
      return { ok: false, error: { code: 'mirror_scope_consultation_source_reading_ids_empty' } };
    }
    for (let i = 0; i < scope.source_reading_ids.length; i += 1) {
      const id = scope.source_reading_ids[i]!;
      if (typeof id !== 'string' || id.length === 0) {
        return {
          ok: false,
          error: { code: 'mirror_scope_consultation_source_reading_id_empty', index: i },
        };
      }
    }
    if (scope.question_window) {
      const start = parseLocalDate(scope.question_window.start_date);
      if (!start) {
        return {
          ok: false,
          error: {
            code: 'mirror_scope_local_date_invalid',
            field: 'question_window.start_date',
            received: scope.question_window.start_date,
          },
        };
      }
      const end = parseLocalDate(scope.question_window.end_date);
      if (!end) {
        return {
          ok: false,
          error: {
            code: 'mirror_scope_local_date_invalid',
            field: 'question_window.end_date',
            received: scope.question_window.end_date,
          },
        };
      }
      if (end.utcMs < start.utcMs) {
        return {
          ok: false,
          error: { code: 'mirror_scope_consultation_question_window_invalid_range' },
        };
      }
      const days = localDayDelta(start, end) + 1;
      if (
        days < CONSULTATION_QUESTION_WINDOW_MIN_LOCAL_DAYS ||
        days > CONSULTATION_QUESTION_WINDOW_MAX_LOCAL_DAYS
      ) {
        return {
          ok: false,
          error: {
            code: 'mirror_scope_consultation_question_window_out_of_bounds',
            received_days: days,
          },
        };
      }
    }
    return { ok: true };
  }
  return { ok: false, error: { code: 'mirror_scope_kind_invalid', received: (scope as MirrorScope).kind } };
}

export type MirrorKindScopePairing = 'allowed' | 'forbidden';

export function evaluateMirrorKindScope(
  kind: MirrorKind,
  scope: MirrorScope,
): MirrorKindScopePairing {
  if (!MIRROR_KINDS.includes(kind)) return 'forbidden';
  const row = MIRROR_KIND_SCOPE_MATRIX[kind];
  return row[scope.kind];
}
