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

// Severity classification — `blocker` means the deterministic pipeline
// literally cannot produce a chart (invalid date / missing tz / no data
// entered at all); `warning` means the pipeline runs but the resulting
// Reading will carry uncertainty caveats. Tabs use this to decide
// whether to hard-disable the generate button or to allow generation
// with a yellow advisory banner.
export type NatalReadinessSeverity = 'blocker' | 'warning';

export function natalReadinessSeverity(reason: NatalReadinessReason): NatalReadinessSeverity {
  switch (reason) {
    case 'subject_missing':
    case 'natal_inputs_invalid':
    case 'scaffold_default_natal_inputs':
      return 'blocker';
    case 'birth_precision_unknown':
    case 'birth_location_unresolved':
    case 'birth_precision_rough_year_for_reading':
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

// Specific user-facing missing-field hints. Computed independently of
// `subjectReadingReadiness` so the UI can list ALL gaps rather than
// only the first-failing reason. Each gap has a severity so the form
// can sort blockers above warnings and still surface both.
export type NatalGapKey =
  | 'birth_date'
  | 'birth_time_precision'
  | 'birth_location'
  | 'time_zone'
  | 'calculation_sex';

export interface NatalGap {
  readonly key: NatalGapKey;
  readonly label: string;
  readonly help: string;
  readonly severity: NatalReadinessSeverity;
}

export interface EnumerateNatalGapsInput {
  readonly inputs: NatalInputs | null;
  readonly kind: ReadingKind;
  readonly scope: ReadingScope;
  readonly view?: View;
  readonly time_window: ReadingTimeWindow;
}

const GAP_LABEL: Record<NatalGapKey, string> = {
  birth_date: '出生日期',
  birth_time_precision: '出生时间精度',
  birth_location: '出生地点',
  time_zone: '出生时区',
  calculation_sex: '用于大运推算的性别',
};

export function enumerateNatalGaps(input: EnumerateNatalGapsInput): readonly NatalGap[] {
  const gaps: NatalGap[] = [];
  const inputs = input.inputs;
  if (!inputs) {
    return [{
      key: 'birth_date',
      label: GAP_LABEL.birth_date,
      help: '当前观察对象没有生辰资料，请先在「我」中填写。',
      severity: 'blocker',
    }];
  }
  const raw = inputs.raw_birth_input;
  const loc = inputs.birth_location;

  const dateText = typeof raw.local_date_text === 'string' ? raw.local_date_text.trim() : '';
  const datetimeUtcOk = typeof inputs.birth_datetime_utc === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(inputs.birth_datetime_utc);
  if (!dateText || !datetimeUtcOk) {
    gaps.push({
      key: 'birth_date',
      label: GAP_LABEL.birth_date,
      help: '请在「我」中填写出生年月日；时辰可留空，但日期是排盘的基础。',
      severity: 'blocker',
    });
  }

  const tzMissing = typeof loc.iana_time_zone !== 'string' || loc.iana_time_zone.length === 0;
  if (tzMissing) {
    gaps.push({
      key: 'time_zone',
      label: GAP_LABEL.time_zone,
      help: '选择出生地所在 IANA 时区（例如 Asia/Shanghai）以便正确换算 UTC。',
      severity: 'blocker',
    });
  }

  const latNaN = !Number.isFinite(loc.latitude);
  const lngNaN = !Number.isFinite(loc.longitude);
  const locUnresolved =
    !latNaN && !lngNaN &&
    loc.latitude === 0 &&
    loc.longitude === 0 &&
    loc.iana_time_zone === 'Etc/UTC' &&
    !loc.place_name &&
    !raw.place_text;
  if (latNaN || lngNaN) {
    gaps.push({
      key: 'birth_location',
      label: GAP_LABEL.birth_location,
      help: '请提供出生地点（用于真太阳时校正与时区判定）。',
      severity: 'blocker',
    });
  } else if (locUnresolved) {
    gaps.push({
      key: 'birth_location',
      label: GAP_LABEL.birth_location,
      help: '目前地点是默认占位（0°/0°/Etc/UTC），补上真实地点后真太阳时与时区会更准确。',
      severity: 'warning',
    });
  }

  if (inputs.birth_precision === 'unknown') {
    gaps.push({
      key: 'birth_time_precision',
      label: GAP_LABEL.birth_time_precision,
      help: '若知道出生时间，请选择对应精度；不填会按"约到日"近似推算，时柱与大运的精度都会降低。',
      severity: 'warning',
    });
  } else if (inputs.birth_precision === 'rough_year' && input.kind !== 'sign') {
    gaps.push({
      key: 'birth_time_precision',
      label: GAP_LABEL.birth_time_precision,
      help: '当前只到"约到年"，非本命解读会显著受限，建议补到月或日。',
      severity: 'warning',
    });
  } else if (inputs.birth_precision === 'rough_month'
    && deriveDayunRequired(input.kind, input.scope, input.view, input.time_window)) {
    gaps.push({
      key: 'birth_time_precision',
      label: GAP_LABEL.birth_time_precision,
      help: '当前只到"约到月"，需要大运的解读会偏移，建议补到日。',
      severity: 'warning',
    });
  }

  if (inputs.calculation_sex === 'unspecified'
    && deriveDayunRequired(input.kind, input.scope, input.view, input.time_window)) {
    gaps.push({
      key: 'calculation_sex',
      label: GAP_LABEL.calculation_sex,
      help: '大运顺逆方向取决于性别（甲子规则）。不填会无法推算大运起运点。',
      severity: 'warning',
    });
  }

  return gaps;
}
