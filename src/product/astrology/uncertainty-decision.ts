// SJG-ALGO-10 — Uncertainty decision table.
//
// Maps the engine-emitted UncertaintyInput codes on the common surface (plus
// runtime ai_parse_failed and a stale-ephemeris check) to a final
// UncertaintyAnnotation. It binds to common + method_profile only — never to
// method_evidence / pillars.

import type {
  AstrologyFeatureSnapshot,
  UncertaintyInput,
  UncertaintyInputCode,
} from '../../domain/algorithm.ts';
import type { ConfidenceLevel, UncertaintyAnnotation } from '../../domain/reading.ts';
import { standardHoursForTimeZone } from './true-solar-time.ts';
import { currentEphemerisVersion } from './engines/registry.ts';

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
  readonly ai_parse_failed?: boolean;
}

// Stale persisted reading: the snapshot's recorded ephemeris no longer matches
// the engine's current ephemeris (or the method is no longer admitted).
function detectEphemerisMissing(snapshot: AstrologyFeatureSnapshot): boolean {
  const current = currentEphemerisVersion(snapshot.method_profile.id);
  if (current === null) return true;
  return snapshot.method_profile.ephemeris_version !== current;
}

export function ianaTimeZoneSupported(iana: string): boolean {
  return standardHoursForTimeZone(iana) !== null;
}

export function deriveUncertainty(input: UncertaintyDecisionInput): UncertaintyAnnotation {
  const codes: UncertaintyInputCode[] = [];
  for (const u of input.feature_snapshot.common.uncertainty_inputs) {
    if (!codes.includes(u.code)) codes.push(u.code);
  }
  if (detectEphemerisMissing(input.feature_snapshot) && !codes.includes('ephemeris_missing')) {
    codes.push('ephemeris_missing');
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

export interface FailCloseDecision {
  readonly failed: boolean;
  readonly codes: readonly UncertaintyInputCode[];
}

// SJG-ALGO-10 — the fail-closed rows of the decision table. The producers (each
// MethodEngine + the orchestrator) mark the context-dependent severity, since
// whether e.g. rough_month fails closed depends on dayun_required and on the
// engine's own capabilities (紫微 fails closed earlier for any non-exact time).
// This consumer is method-agnostic: it only reads the severity the producer set.
export function evaluateFailClose(snapshot: AstrologyFeatureSnapshot): FailCloseDecision {
  const codes: UncertaintyInputCode[] = [];
  for (const u of snapshot.common.uncertainty_inputs) {
    if (u.severity === 'fail_close' && !codes.includes(u.code)) codes.push(u.code);
  }
  return { failed: codes.length > 0, codes };
}

export function appendUncertaintyInput(
  existing: readonly UncertaintyInput[],
  code: UncertaintyInputCode,
): UncertaintyInput[] {
  if (existing.some((u) => u.code === code)) return [...existing];
  return [...existing, { code, severity: 'caveat' }];
}
