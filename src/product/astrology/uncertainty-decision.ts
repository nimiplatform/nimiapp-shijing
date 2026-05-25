// SJG-ALGO-10 — uncertainty decision table.
//
// Maps the deterministic feature snapshot (plus the view context) onto
// a `UncertaintyAnnotation` that the orchestrator stores on the
// persisted Reading. Implements the closed table from the contract:
//
//   - birth_precision_* codes are emitted upstream by
//     build-feature-snapshot.ts; this module only consumes them and
//     adds:
//       * location_missing      (lat/lng zero or undefined)
//       * timezone_missing      (no admitted IANA mapping)
//       * ephemeris_missing     (snapshot pillar ephemeris_version
//                                does not match the active method
//                                profile's bound ephemeris)
//       * view_context_sparse   (scope=view AND view has neither
//                                instructions nor context_items nor
//                                memory.summary)
//       * ai_parse_failed       (emitted by the orchestrator on AI
//                                parse failure; passed through here)
//   - confidence is computed from the union of inputs:
//       * `high`   iff no uncertainty inputs
//       * `low`    iff multiple inputs OR any of {location_missing,
//                  timezone_missing, ephemeris_missing,
//                  calculation_sex_unspecified, ai_parse_failed,
//                  consent_withheld* — handled as caveat-only}
//       * `medium` otherwise (single non-critical input)
//   - caveats[] are human-readable Chinese descriptions (one per code)
//   - data_gaps[] is just the code strings.

import type {
  AstrologyFeatureSnapshot,
  UncertaintyInput,
  UncertaintyInputCode,
} from '../../domain/algorithm.ts';
import type { NatalCanonicalization } from '../../domain/algorithm.ts';
import type { UncertaintyAnnotation, ConfidenceLevel } from '../../domain/reading.ts';
import type { View } from '../../domain/view.ts';
import { standardHoursForTimeZone } from './true-solar-time.ts';
import { EPHEMERIS_VERSION } from './solar-terms.ts';

// SJG-ALGO-10 table rows that force `low` confidence regardless of
// count.
const FORCE_LOW_CODES: ReadonlySet<UncertaintyInputCode> = new Set<UncertaintyInputCode>([
  'location_missing',
  'timezone_missing',
  'ephemeris_missing',
  'calculation_sex_unspecified',
  'ai_parse_failed',
  'birth_precision_rough_month',
  'birth_precision_rough_year',
  'birth_precision_unknown',
]);

// Codes that count as "informational" only and do not by themselves
// degrade confidence below the surrounding context (e.g.
// `birth_precision_exact` is a positive-signal info code, not a gap).
const INFO_ONLY_CODES: ReadonlySet<UncertaintyInputCode> = new Set<UncertaintyInputCode>([
  'birth_precision_exact',
]);

const CAVEAT_TEXT: Readonly<Record<UncertaintyInputCode, string>> = {
  birth_precision_exact: '出生时刻精确,可应用全四柱',
  birth_precision_rough_day: '出生时刻不精确(只到日),时柱已省略',
  birth_precision_rough_month: '出生时刻只到月,日柱与时柱已省略',
  birth_precision_rough_year: '出生时刻只到年,日柱/时柱/月柱已省略',
  birth_precision_unknown: '出生时刻未知,无法生成除签运外的解读',
  location_missing: '出生地缺失,经度修正与真太阳时无法计算',
  timezone_missing: '出生时区缺失或不在支持列表内',
  ephemeris_missing: '历法表与方法档案不一致,需重新生成',
  calculation_sex_unspecified: '大运方向所需性别未指定',
  consent_withheld: '本人未授权,解读以谨慎语气呈现',
  view_context_sparse: '视角缺少指令与上下文资料',
  ai_parse_failed: 'AI 解析失败,解读未能落字',
} as const;

export interface UncertaintyDecisionInput {
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly canonicalizations: ReadonlyArray<NatalCanonicalization | undefined>;
  readonly view?: View;
  readonly ai_parse_failed?: boolean;
}

function detectLocationMissing(
  feature_snapshot: AstrologyFeatureSnapshot,
  canonicalizations: ReadonlyArray<NatalCanonicalization | undefined>,
): boolean {
  for (const c of canonicalizations) {
    if (!c) continue;
    if (c.standard_meridian_longitude === undefined) return true;
    if (c.longitude_correction_minutes === undefined) return true;
  }
  // Defensive: if a feature subject has no day_pillar / month_pillar
  // AND no canonicalization recorded, treat as missing location.
  for (const subj of feature_snapshot.subjects) {
    if (!subj.natal_chart.day_pillar && !subj.natal_chart.month_pillar) {
      return true;
    }
  }
  return false;
}

function detectEphemerisMissing(feature_snapshot: AstrologyFeatureSnapshot): boolean {
  for (const subj of feature_snapshot.subjects) {
    const pillars = [
      subj.natal_chart.year_pillar,
      subj.natal_chart.month_pillar,
      subj.natal_chart.day_pillar,
      subj.natal_chart.hour_pillar,
    ];
    for (const p of pillars) {
      if (!p) continue;
      if (p.ephemeris_version !== EPHEMERIS_VERSION) return true;
    }
  }
  return false;
}

function detectTimezoneMissing(canonicalizations: ReadonlyArray<NatalCanonicalization | undefined>): boolean {
  // If no canonicalization succeeded, treat as missing.
  if (canonicalizations.length === 0) return true;
  for (const c of canonicalizations) {
    if (!c) return true;
    if (!c.raw_birth_input) continue;
    // raw_birth_input doesn't carry IANA TZ directly; that lives on
    // NatalInputs.birth_location. The presence of a non-undefined
    // standard_meridian_longitude is our proxy that the IANA TZ
    // resolved via the admitted standard-hours table.
    if (c.standard_meridian_longitude === undefined) return true;
  }
  return false;
}

function detectViewContextSparse(view: View | undefined): boolean {
  if (!view) return false;
  const hasInstructions = typeof view.instructions === 'string' && view.instructions.trim().length > 0;
  const hasContextItems = view.context_items.length > 0;
  const hasMemorySummary = typeof view.view_memory.summary === 'string' && view.view_memory.summary.trim().length > 0;
  return !hasInstructions && !hasContextItems && !hasMemorySummary;
}

// Public so the renderer / tests can verify the IANA-resolution check
// in isolation.
export function ianaTimeZoneSupported(iana: string): boolean {
  return standardHoursForTimeZone(iana) !== null;
}

export function deriveUncertainty(input: UncertaintyDecisionInput): UncertaintyAnnotation {
  const codes: UncertaintyInputCode[] = [];
  // Pass through deterministic codes already emitted by build-feature-snapshot.
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
  if (detectViewContextSparse(input.view)) {
    if (!codes.includes('view_context_sparse')) codes.push('view_context_sparse');
  }
  if (input.ai_parse_failed && !codes.includes('ai_parse_failed')) {
    codes.push('ai_parse_failed');
  }

  // Confidence mapping:
  //   - all-info codes (only birth_precision_exact) → high
  //   - any force-low code → low
  //   - multiple non-info codes → low
  //   - single non-info code → medium
  const nonInfo = codes.filter((c) => !INFO_ONLY_CODES.has(c));
  let confidence: ConfidenceLevel;
  if (nonInfo.length === 0) {
    confidence = 'high';
  } else if (nonInfo.some((c) => FORCE_LOW_CODES.has(c)) || nonInfo.length >= 2) {
    confidence = 'low';
  } else {
    confidence = 'medium';
  }

  const caveats: string[] = codes.map((c) => CAVEAT_TEXT[c]);
  const data_gaps: string[] = codes.map((c) => String(c));

  return { confidence, caveats, data_gaps };
}

// Expose the caveat text map so renderer copy can reuse it without
// re-declaring the table.
export const UNCERTAINTY_CAVEAT_TEXT = CAVEAT_TEXT;

// Adapter to feed downstream uncertainty inputs back into the v1
// UncertaintyInput envelope when the orchestrator needs to update the
// snapshot. Currently unused by generateReading (the snapshot is
// frozen by buildAstrologyFeatureSnapshot), but exported so future
// orchestrators can append AI-parse-failed without violating SJG-ALGO-10.
export function appendUncertaintyInput(
  existing: readonly UncertaintyInput[],
  code: UncertaintyInputCode,
): UncertaintyInput[] {
  if (existing.some((u) => u.code === code)) return [...existing];
  return [...existing, { code, severity: 'caveat' }];
}
