// SJG-ALGO-03 — Mirror window canonicalization.
//
// Resolves a MirrorScope to a CanonicalMirrorWindow with UTC start/end
// instants derived from the local civil dates and the captured
// basis_time_zone.

import type {
  CanonicalMirrorWindow,
} from '../../domain/algorithm.ts';
import type {
  ConsultationMirrorScope,
  DailyMirrorScope,
  LongHorizonMirrorScope,
  MirrorScope,
  NatalMirrorScope,
  RelationshipNatalMirrorScope,
  Rolling30DayMirrorScope,
} from '../../domain/mirror-scope.ts';
import { type StageResult } from './stage-result.ts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseLocalDate(value: string): { utcMs: number } | null {
  const m = LOCAL_DATE_PATTERN.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== mo || check.getUTCDate() !== d) {
    return null;
  }
  return { utcMs: ms };
}

function isoFromUtc(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function dailyWindow(scope: DailyMirrorScope): StageResult<CanonicalMirrorWindow> {
  const parsed = parseLocalDate(scope.date);
  if (!parsed) {
    return {
      ok: false,
      error: { stage: 'mirror_window', kind: 'stage_invalid_input', detail: `daily.date invalid: ${scope.date}` },
    };
  }
  return {
    ok: true,
    value: {
      start_utc: isoFromUtc(parsed.utcMs),
      end_utc: isoFromUtc(parsed.utcMs + MS_PER_DAY - 1000),
      basis_time_zone: scope.basis_time_zone,
      scope_kind: 'daily',
    },
  };
}

function rangeWindow(
  scope: Rolling30DayMirrorScope | LongHorizonMirrorScope,
): StageResult<CanonicalMirrorWindow> {
  const start = parseLocalDate(scope.start_date);
  const end = parseLocalDate(scope.end_date);
  if (!start || !end) {
    return {
      ok: false,
      error: {
        stage: 'mirror_window',
        kind: 'stage_invalid_input',
        detail: `${scope.kind} scope has invalid start/end date`,
      },
    };
  }
  return {
    ok: true,
    value: {
      start_utc: isoFromUtc(start.utcMs),
      end_utc: isoFromUtc(end.utcMs + MS_PER_DAY - 1000),
      basis_time_zone: scope.basis_time_zone,
      scope_kind: scope.kind,
    },
  };
}

function consultationWindow(scope: ConsultationMirrorScope): StageResult<CanonicalMirrorWindow> {
  if (scope.question_window) {
    const qwStart = parseLocalDate(scope.question_window.start_date);
    const qwEnd = parseLocalDate(scope.question_window.end_date);
    if (qwStart && qwEnd) {
      return {
        ok: true,
        value: {
          start_utc: isoFromUtc(qwStart.utcMs),
          end_utc: isoFromUtc(qwEnd.utcMs + MS_PER_DAY - 1000),
          basis_time_zone: scope.basis_time_zone,
          scope_kind: 'consultation',
        },
      };
    }
  }
  // No explicit question_window: use a 1-day window anchored to a
  // canonical zero so the canonical_window field is still deterministic
  // (downstream consumers may also union with cited reading windows).
  return {
    ok: true,
    value: {
      start_utc: '1970-01-01T00:00:00Z',
      end_utc: '1970-01-01T23:59:59Z',
      basis_time_zone: scope.basis_time_zone,
      scope_kind: 'consultation',
    },
  };
}

// 命镜 (SJG-ALGO-16): the natal projection spans the whole life, so the canonical
// window is anchored to the reference year only — a deterministic 1-year window
// keyed to anchor_year. The chart's real span lives in MingJingChart, not here.
function natalWindow(scope: NatalMirrorScope | RelationshipNatalMirrorScope): StageResult<CanonicalMirrorWindow> {
  const startMs = Date.UTC(scope.anchor_year, 0, 1);
  const endMs = Date.UTC(scope.anchor_year, 11, 31);
  return {
    ok: true,
    value: {
      start_utc: isoFromUtc(startMs),
      end_utc: isoFromUtc(endMs + MS_PER_DAY - 1000),
      basis_time_zone: scope.basis_time_zone,
      scope_kind: scope.kind,
    },
  };
}

export function resolveCanonicalMirrorWindow(scope: MirrorScope): StageResult<CanonicalMirrorWindow> {
  switch (scope.kind) {
    case 'daily':
      return dailyWindow(scope);
    case 'rolling_30_day':
    case 'long_horizon':
      return rangeWindow(scope);
    case 'natal':
    case 'relationship_natal':
      return natalWindow(scope);
    case 'consultation':
      return consultationWindow(scope);
    default:
      return {
        ok: false,
        error: { stage: 'mirror_window', kind: 'stage_invalid_input', detail: 'unknown scope kind' },
      };
  }
}
