// W06 — helpers that turn the current time into Mirror-Architecture-v1
// MirrorScope shapes for each tab.

import type {
  ConsultationMirrorScope,
  DailyMirrorScope,
  LongHorizonMirrorScope,
  NatalMirrorScope,
  RelationshipNatalMirrorScope,
  Rolling30DayMirrorScope,
} from '../../domain/mirror-scope.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';

const DEFAULT_BASIS_TIME_ZONE = 'Asia/Shanghai';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isoLocalDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dailyMirrorScopeForToday(
  now: Date = new Date(),
  basis_time_zone: string = DEFAULT_BASIS_TIME_ZONE,
): DailyMirrorScope {
  return { kind: 'daily', date: isoLocalDate(now), basis_time_zone };
}

export function rolling30DayMirrorScopeFromToday(
  now: Date = new Date(),
  basis_time_zone: string = DEFAULT_BASIS_TIME_ZONE,
): Rolling30DayMirrorScope {
  return rolling30DayMirrorScopeFromDate(isoLocalDate(now), basis_time_zone);
}

export function rolling30DayMirrorScopeFromDate(
  startDate: string,
  basis_time_zone: string = DEFAULT_BASIS_TIME_ZONE,
): Rolling30DayMirrorScope {
  const start = new Date(`${startDate}T00:00:00Z`);
  const endDate = isoLocalDate(new Date(start.getTime() + 29 * MS_PER_DAY));
  return { kind: 'rolling_30_day', start_date: startDate, end_date: endDate, basis_time_zone };
}

export function longHorizonMirrorScopeNextTenYears(
  now: Date = new Date(),
  basis_time_zone: string = DEFAULT_BASIS_TIME_ZONE,
): LongHorizonMirrorScope {
  const startYear = now.getUTCFullYear();
  return {
    kind: 'long_horizon',
    start_date: `${startYear}-01-01`,
    end_date: `${startYear + 10}-12-31`,
    basis_time_zone,
  };
}

export function natalMirrorScopeForToday(
  now: Date = new Date(),
  basis_time_zone: string = DEFAULT_BASIS_TIME_ZONE,
): NatalMirrorScope {
  return { kind: 'natal', anchor_year: now.getUTCFullYear(), basis_time_zone };
}

export function relationshipNatalMirrorScopeForToday(
  related_person_ref: Extract<SubjectRef, { kind: 'person' }>,
  now: Date = new Date(),
  basis_time_zone: string = DEFAULT_BASIS_TIME_ZONE,
): RelationshipNatalMirrorScope {
  return {
    kind: 'relationship_natal',
    related_person_ref,
    anchor_year: now.getUTCFullYear(),
    basis_time_zone,
  };
}

export function consultationMirrorScopeFor(
  source_reading_ids: readonly string[],
  basis_time_zone: string = DEFAULT_BASIS_TIME_ZONE,
): ConsultationMirrorScope {
  return { kind: 'consultation', source_reading_ids: [...source_reading_ids], basis_time_zone };
}
