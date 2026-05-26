import { validateNatalInputs } from '../../contracts/natal-inputs-validator.ts';
import type { NatalInputs } from '../../domain/person.ts';
import type { ReadingKind, ReadingScope } from '../../domain/reading-matrix.ts';
import type { ReadingTimeWindow } from '../../domain/reading.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { isPersonRef, isSelfRef, subjectRefKey, type SubjectRef } from '../../domain/subject-ref.ts';
import type { View } from '../../domain/view.ts';
import { deriveDayunRequired } from '../astrology/build-feature-snapshot.ts';

export type NatalReadinessReason =
  | 'subject_missing'
  | 'natal_inputs_invalid'
  | 'scaffold_default_natal_inputs'
  | 'birth_precision_unknown'
  | 'birth_location_unresolved'
  | 'birth_precision_rough_year_for_reading'
  | 'birth_precision_rough_month_for_dayun'
  | 'calculation_sex_unspecified_for_dayun';

export type NatalReadiness =
  | { ok: true; inputs: NatalInputs }
  | { ok: false; reason: NatalReadinessReason; detail: string };

export interface SubjectReadingReadinessInput {
  readonly subject: SubjectRef;
  readonly space: ShiJingSpace;
  readonly kind: ReadingKind;
  readonly scope: ReadingScope;
  readonly time_window: ReadingTimeWindow;
  readonly view?: View;
}

export const SCAFFOLD_BIRTH_DATETIME_UTC = '2000-01-01T00:00:00Z';

function natalInputsForSubject(subject: SubjectRef, space: ShiJingSpace): NatalInputs | null {
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
    return {
      ok: false,
      reason: 'natal_inputs_invalid',
      detail: validation.error.code,
    };
  }
  if (isScaffoldNatalInputs(inputs)) {
    return {
      ok: false,
      reason: 'scaffold_default_natal_inputs',
      detail: 'scaffold_default_natal_inputs: 2000-01-01T00:00:00Z / Etc/UTC / 0,0',
    };
  }
  if (inputs.birth_precision === 'unknown') {
    return {
      ok: false,
      reason: 'birth_precision_unknown',
      detail: 'birth_precision_unknown',
    };
  }
  if (hasUnresolvedDefaultLocation(inputs)) {
    return {
      ok: false,
      reason: 'birth_location_unresolved',
      detail: 'birth_location_unresolved: Etc/UTC with 0,0 and no place evidence',
    };
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

export function subjectReadingReadiness(input: SubjectReadingReadinessInput): NatalReadiness {
  const base = subjectNatalReadiness(input.subject, input.space);
  if (!base.ok) return base;
  if (input.kind !== 'sign' && base.inputs.birth_precision === 'rough_year') {
    return {
      ok: false,
      reason: 'birth_precision_rough_year_for_reading',
      detail: 'birth_precision_rough_year_for_reading: non-sign Reading requires at least month/day precision',
    };
  }
  const dayunRequired = deriveDayunRequired(input.kind, input.scope, input.view, input.time_window);
  if (dayunRequired && base.inputs.birth_precision === 'rough_month') {
    return {
      ok: false,
      reason: 'birth_precision_rough_month_for_dayun',
      detail: 'birth_precision_rough_month_for_dayun: DaYun-dependent Reading requires day precision',
    };
  }
  if (dayunRequired && base.inputs.calculation_sex === 'unspecified') {
    return {
      ok: false,
      reason: 'calculation_sex_unspecified_for_dayun',
      detail: 'calculation_sex_unspecified_for_dayun: SJG-ALGO-07 requires calculation_sex when DaYun is required',
    };
  }
  return base;
}

export function natalReadinessHeadline(readiness: Exclude<NatalReadiness, { ok: true }>): string {
  switch (readiness.reason) {
    case 'subject_missing':
      return '当前观察对象不存在，无法生成解读。';
    case 'natal_inputs_invalid':
      return '生成前需要先完善生辰资料。';
    case 'scaffold_default_natal_inputs':
      return '当前仍是初始占位生辰，请先录入真实资料。';
    case 'birth_precision_unknown':
      return '当前出生时间精度为不详，不能生成这类解读。';
    case 'birth_location_unresolved':
      return '当前出生地点仍是默认值，请先补全地点和时区。';
    case 'birth_precision_rough_year_for_reading':
      return '当前出生时间只到年份，不能生成这类解读。';
    case 'birth_precision_rough_month_for_dayun':
      return '当前出生时间只到月份，不能生成需要大运的解读。';
    case 'calculation_sex_unspecified_for_dayun':
      return '当前缺少用于推算大运方向的性别，不能生成这类解读。';
    default: {
      const exhaustive: never = readiness.reason;
      void exhaustive;
      return '生成前需要先完善生辰资料。';
    }
  }
}
