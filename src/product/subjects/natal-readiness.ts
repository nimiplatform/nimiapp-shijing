// W04 — natal readiness under Mirror Architecture v1.
//
// Classifies whether a subject (self or a person) has enough natal
// inputs to participate in a mirror reading. Surfaces typed readiness
// reasons aligned with SJG-IA-05 readiness blocker codes.

import { validateNatalInputs } from '../../contracts/natal-inputs-validator.ts';
import type { NatalInputs } from '../../domain/person.ts';
import type { MirrorKind, MirrorScope } from '../../domain/mirror-scope.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { isPersonRef, isSelfRef, subjectRefKey, type SubjectRef } from '../../domain/subject-ref.ts';

export type NatalReadinessReason =
  | 'subject_missing'
  | 'natal_inputs_invalid'
  | 'scaffold_default_natal_inputs'
  | 'birth_precision_unknown'
  | 'birth_location_unresolved'
  | 'birth_precision_rough_year_for_mirror'
  | 'birth_precision_rough_month_for_dayun'
  | 'calculation_sex_unspecified_for_dayun';

export type NatalReadiness =
  | { ok: true; inputs: NatalInputs }
  | { ok: false; reason: NatalReadinessReason; detail: string };

export interface SubjectMirrorReadinessInput {
  readonly subject: SubjectRef;
  readonly space: ShiJingSpace;
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
}

export const SCAFFOLD_BIRTH_DATETIME_UTC = '2000-01-01T00:00:00Z';

function localDateDeltaDays(startDate: string, endDate: string): number {
  const startMs = Date.parse(startDate + 'T00:00:00Z');
  const endMs = Date.parse(endDate + 'T00:00:00Z');
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
}

export function deriveDayunRequired(mirrorKind: MirrorKind, scope: MirrorScope): boolean {
  if (mirrorKind === 'nianjing') return true;
  if (scope.kind === 'long_horizon') return true;
  if (scope.kind === 'rolling_30_day') {
    return localDateDeltaDays(scope.start_date, scope.end_date) > 90;
  }
  return false;
}

export function natalInputsForSubject(subject: SubjectRef, space: ShiJingSpace): NatalInputs | null {
  if (isSelfRef(subject)) return space.self_subject.natal_inputs;
  if (isPersonRef(subject)) {
    return space.persons.find((person) => person.id === subject.id)?.natal_inputs ?? null;
  }
  return null;
}

export function isScaffoldNatalInputs(inputs: NatalInputs): boolean {
  const raw = inputs.raw_birth_input;
  const location = inputs.birth_location;
  return (
    raw.calendar_system === 'gregorian' &&
    raw.local_date_text === '2000-01-01' &&
    raw.local_time_text === undefined &&
    raw.place_text === undefined &&
    inputs.birth_datetime_utc === SCAFFOLD_BIRTH_DATETIME_UTC &&
    inputs.birth_precision === 'unknown' &&
    inputs.calendar_system === 'gregorian' &&
    inputs.calculation_sex === 'unspecified' &&
    location.latitude === 0 &&
    location.longitude === 0 &&
    location.iana_time_zone === 'Etc/UTC' &&
    location.place_name === undefined
  );
}

function hasUnresolvedDefaultLocation(inputs: NatalInputs): boolean {
  const location = inputs.birth_location;
  const raw = inputs.raw_birth_input;
  return (
    location.latitude === 0 &&
    location.longitude === 0 &&
    location.iana_time_zone === 'Etc/UTC' &&
    !location.place_name &&
    !raw.place_text
  );
}

export function natalInputsReadiness(inputs: NatalInputs): NatalReadiness {
  const validation = validateNatalInputs(inputs);
  if (!validation.ok) {
    return { ok: false, reason: 'natal_inputs_invalid', detail: validation.error.code };
  }
  if (isScaffoldNatalInputs(inputs)) {
    return {
      ok: false,
      reason: 'scaffold_default_natal_inputs',
      detail: 'scaffold_default_natal_inputs',
    };
  }
  if (inputs.birth_precision === 'unknown') {
    return { ok: false, reason: 'birth_precision_unknown', detail: 'birth_precision_unknown' };
  }
  if (hasUnresolvedDefaultLocation(inputs)) {
    return { ok: false, reason: 'birth_location_unresolved', detail: 'birth_location_unresolved' };
  }
  return { ok: true, inputs };
}

export function subjectNatalReadiness(subject: SubjectRef, space: ShiJingSpace): NatalReadiness {
  const inputs = natalInputsForSubject(subject, space);
  if (!inputs) {
    return {
      ok: false,
      reason: 'subject_missing',
      detail: `subject_missing: ${subjectRefKey(subject)}`,
    };
  }
  return natalInputsReadiness(inputs);
}

export function subjectMirrorReadiness(input: SubjectMirrorReadinessInput): NatalReadiness {
  const base = subjectNatalReadiness(input.subject, input.space);
  if (!base.ok) return base;
  if (base.inputs.birth_precision === 'rough_year') {
    return {
      ok: false,
      reason: 'birth_precision_rough_year_for_mirror',
      detail: 'birth_precision_rough_year_for_mirror',
    };
  }
  const dayunRequired = deriveDayunRequired(input.mirror_kind, input.mirror_scope);
  if (dayunRequired && base.inputs.birth_precision === 'rough_month') {
    return {
      ok: false,
      reason: 'birth_precision_rough_month_for_dayun',
      detail: 'birth_precision_rough_month_for_dayun',
    };
  }
  if (dayunRequired && base.inputs.calculation_sex === 'unspecified') {
    return {
      ok: false,
      reason: 'calculation_sex_unspecified_for_dayun',
      detail: 'calculation_sex_unspecified_for_dayun',
    };
  }
  return base;
}

export type NatalReadinessSeverity = 'blocker' | 'warning';

export function natalReadinessSeverity(reason: NatalReadinessReason): NatalReadinessSeverity {
  switch (reason) {
    case 'subject_missing':
    case 'natal_inputs_invalid':
    case 'scaffold_default_natal_inputs':
      return 'blocker';
    case 'birth_precision_unknown':
    case 'birth_location_unresolved':
    case 'birth_precision_rough_year_for_mirror':
    case 'birth_precision_rough_month_for_dayun':
    case 'calculation_sex_unspecified_for_dayun':
      return 'warning';
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return 'blocker';
    }
  }
}

export function natalReadinessHeadline(readiness: Exclude<NatalReadiness, { ok: true }>): string {
  switch (readiness.reason) {
    case 'subject_missing':
      return '当前观察对象不存在,无法生成解读。';
    case 'natal_inputs_invalid':
      return '生成前需要先完善生辰资料。';
    case 'scaffold_default_natal_inputs':
      return '当前仍是初始占位生辰,请先录入真实资料。';
    case 'birth_precision_unknown':
      return '当前出生时间精度为不详,不能生成解读。';
    case 'birth_location_unresolved':
      return '当前出生地点仍是默认值,请先补全地点和时区。';
    case 'birth_precision_rough_year_for_mirror':
      return '当前出生时间只到年份,不能生成镜面解读。';
    case 'birth_precision_rough_month_for_dayun':
      return '当前出生时间只到月份,不能生成需要大运的解读。';
    case 'calculation_sex_unspecified_for_dayun':
      return '当前缺少用于推算大运方向的性别,不能生成这类解读。';
    default: {
      const exhaustive: never = readiness.reason;
      void exhaustive;
      return '生成前需要先完善生辰资料。';
    }
  }
}
