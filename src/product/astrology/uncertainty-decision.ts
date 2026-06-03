// SJG-ALGO-10 — Uncertainty decision table.
//
// Maps UncertaintyInput codes from the feature snapshot (plus runtime
// inputs like ai_parse_failed) to a final UncertaintyAnnotation.

import type {
  AstrologyFeatureSnapshot,
  NatalCanonicalization,
  UncertaintyInput,
  UncertaintyInputCode,
} from '../../domain/algorithm.ts';
import type { ConfidenceLevel, UncertaintyAnnotation } from '../../domain/reading.ts';
import { standardHoursForTimeZone } from './true-solar-time.ts';
import { EPHEMERIS_VERSION } from './solar-terms.ts';

const FORCE_LOW_CODES: ReadonlySet<UncertaintyInputCode> = new Set<UncertaintyInputCode>([
  'location_missing',
  'timezone_missing',
  'ephemeris_missing',
  'calculation_sex_unspecified',
  'ai_parse_failed',
  'birth_precision_rough_month',
  'birth_precision_rough_year',
  'birth_precision_unknown',
  'no_active_concern_tags',
]);

const INFO_ONLY_CODES: ReadonlySet<UncertaintyInputCode> = new Set<UncertaintyInputCode>([
  'birth_precision_exact',
]);

const CAVEAT_TEXT: Readonly<Record<UncertaintyInputCode, string>> = {
  birth_precision_exact: '出生时刻精确,可应用全四柱',
  birth_precision_rough_day: '出生时刻不精确(只到日),时柱已省略',
  birth_precision_rough_month: '出生时刻只到月,日柱与时柱已省略',
  birth_precision_rough_year: '出生时刻只到年,日柱/时柱/月柱已省略',
  birth_precision_unknown: '出生时刻未知,无法生成解读',
  location_missing: '出生地缺失,经度修正与真太阳时无法计算',
  timezone_missing: '出生时区缺失或不在支持列表内',
  ephemeris_missing: '历法表与方法档案不一致,需重新生成',
  calculation_sex_unspecified: '大运方向所需性别未指定',
  consent_withheld: '相关人士未授权,解读以谨慎语气呈现',
  unresolved_mention: '关注中存在未解析的人员提及',
  related_person_incomplete: '相关人士的本命输入不完整',
  memory_unavailable: '记忆检索不可用',
  no_active_concern_tags: '当前无激活关注,无法生成解读',
  ai_parse_failed: 'AI 解析失败,解读未能落字',
};

export interface UncertaintyDecisionInput {
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly canonicalizations: ReadonlyArray<NatalCanonicalization | undefined>;
  readonly ai_parse_failed?: boolean;
}

function detectLocationMissing(
  snapshot: AstrologyFeatureSnapshot,
  canonicalizations: ReadonlyArray<NatalCanonicalization | undefined>,
): boolean {
  for (const c of canonicalizations) {
    if (!c) continue;
    if (c.standard_meridian_longitude === undefined) return true;
    if (c.longitude_correction_minutes === undefined) return true;
  }
  if (!snapshot.self_subject.natal_chart.day_pillar && !snapshot.self_subject.natal_chart.month_pillar) {
    return true;
  }
  return false;
}

function detectEphemerisMissing(snapshot: AstrologyFeatureSnapshot): boolean {
  const subjects = [snapshot.self_subject, ...snapshot.related_persons];
  for (const subject of subjects) {
    const pillars = [
      subject.natal_chart.year_pillar,
      subject.natal_chart.month_pillar,
      subject.natal_chart.day_pillar,
      subject.natal_chart.hour_pillar,
    ];
    for (const p of pillars) {
      if (!p) continue;
      if (p.ephemeris_version !== EPHEMERIS_VERSION) return true;
    }
  }
  return false;
}

function detectTimezoneMissing(canonicalizations: ReadonlyArray<NatalCanonicalization | undefined>): boolean {
  if (canonicalizations.length === 0) return true;
  for (const c of canonicalizations) {
    if (!c) return true;
    if (c.standard_meridian_longitude === undefined) return true;
  }
  return false;
}

export function ianaTimeZoneSupported(iana: string): boolean {
  return standardHoursForTimeZone(iana) !== null;
}

export function deriveUncertainty(input: UncertaintyDecisionInput): UncertaintyAnnotation {
  const codes: UncertaintyInputCode[] = [];
  for (const u of input.feature_snapshot.uncertainty_inputs) {
    if (!codes.includes(u.code)) codes.push(u.code);
  }
  if (detectLocationMissing(input.feature_snapshot, input.canonicalizations)) {
    if (!codes.includes('location_missing')) codes.push('location_missing');
  }
  if (detectTimezoneMissing(input.canonicalizations)) {
    if (!codes.includes('timezone_missing')) codes.push('timezone_missing');
  }
  if (detectEphemerisMissing(input.feature_snapshot)) {
    if (!codes.includes('ephemeris_missing')) codes.push('ephemeris_missing');
  }
  if (input.ai_parse_failed && !codes.includes('ai_parse_failed')) {
    codes.push('ai_parse_failed');
  }
  const nonInfo = codes.filter((c) => !INFO_ONLY_CODES.has(c));
  let confidence: ConfidenceLevel;
  if (nonInfo.length === 0) {
    confidence = 'high';
  } else if (nonInfo.some((c) => FORCE_LOW_CODES.has(c)) || nonInfo.length >= 2) {
    confidence = 'low';
  } else {
    confidence = 'medium';
  }
  return {
    confidence,
    caveats: codes.map((c) => CAVEAT_TEXT[c]),
    data_gaps: codes.map((c) => String(c)),
  };
}

export const UNCERTAINTY_CAVEAT_TEXT = CAVEAT_TEXT;

export function appendUncertaintyInput(
  existing: readonly UncertaintyInput[],
  code: UncertaintyInputCode,
): UncertaintyInput[] {
  if (existing.some((u) => u.code === code)) return [...existing];
  return [...existing, { code, severity: 'caveat' }];
}
