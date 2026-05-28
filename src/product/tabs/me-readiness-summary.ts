// Derives presentation-level summary state for the "我" tab cards.
//
// `natalInputsReadiness` already gives us a binary ok/not-ok answer plus
// a coarse reason. The redesigned "我" tab wants a softer surface — a
// completeness percentage, a tone label for the time-precision badge,
// and a flag for whether timezone standardization has actually
// resolved. This module derives all three from the same NatalInputs the
// rest of the product uses, so the new cards stay consistent with how
// readers and orchestration interpret birth data.

import type { NatalInputs } from '../../domain/person.ts';
import { isScaffoldNatalInputs, natalInputsReadiness } from '../subjects/natal-readiness.ts';

export type NatalCompletenessTier =
  | 'scaffold'       // 0% — placeholder data, must replace before anything works
  | 'partial_blocker' // ~25–50% — date/location still missing, blocking
  | 'partial_warning' // ~75% — usable but birth_precision/sex marked uncertain
  | 'complete';       // 100% — readiness is ok and precision is not unknown

export interface NatalCompletenessSummary {
  readonly tier: NatalCompletenessTier;
  readonly /** 0..100, monotonic with how much info is filled in. */ percent: number;
  readonly /** True when the data is good enough to call into the pipeline at all. */ usable_for_basic_reading: boolean;
  readonly /** True when the location has been resolved to a real IANA tz (not Etc/UTC). */ time_zone_resolved: boolean;
  readonly /** True when there is still nontrivial uncertainty user could improve. */ has_improvable_uncertainty: boolean;
}

// Weights sum to 100. They reflect the order in which the validator and
// readiness gating actually depend on these fields, not an arbitrary
// equal split. Date is the hardest gate (without it, nothing runs);
// location/tz are the second gate (no tz = no UTC conversion).
const WEIGHTS = {
  birth_date_filled: 25,
  place_resolved: 25,
  precision_known: 20,
  calculation_sex_specified: 15,
  notes_or_time_text: 15,
} as const;

export function summarizeNatalCompleteness(inputs: NatalInputs): NatalCompletenessSummary {
  if (isScaffoldNatalInputs(inputs)) {
    return {
      tier: 'scaffold',
      percent: 0,
      usable_for_basic_reading: false,
      time_zone_resolved: false,
      has_improvable_uncertainty: true,
    };
  }

  const raw = inputs.raw_birth_input;
  const loc = inputs.birth_location;
  const dateFilled = typeof raw.local_date_text === 'string' && raw.local_date_text.trim().length > 0;
  const timeTextFilled = typeof raw.local_time_text === 'string' && raw.local_time_text.trim().length > 0;
  const notesFilled = typeof inputs.notes === 'string' && inputs.notes.trim().length > 0;
  const placeResolved =
    Number.isFinite(loc.latitude) &&
    Number.isFinite(loc.longitude) &&
    typeof loc.iana_time_zone === 'string' &&
    loc.iana_time_zone.length > 0 &&
    loc.iana_time_zone !== 'Etc/UTC';
  const precisionKnown = inputs.birth_precision !== 'unknown';
  const sexSpecified = inputs.calculation_sex !== 'unspecified';

  let percent = 0;
  if (dateFilled) percent += WEIGHTS.birth_date_filled;
  if (placeResolved) percent += WEIGHTS.place_resolved;
  if (precisionKnown) percent += WEIGHTS.precision_known;
  if (sexSpecified) percent += WEIGHTS.calculation_sex_specified;
  if (timeTextFilled || notesFilled) percent += WEIGHTS.notes_or_time_text;

  const readiness = natalInputsReadiness(inputs);
  const usable = readiness.ok || readiness.reason === 'birth_precision_unknown';

  let tier: NatalCompletenessTier;
  if (readiness.ok && precisionKnown && sexSpecified) {
    tier = 'complete';
    percent = 100;
  } else if (usable) {
    tier = 'partial_warning';
  } else {
    tier = 'partial_blocker';
  }

  return {
    tier,
    percent: Math.max(0, Math.min(100, percent)),
    usable_for_basic_reading: usable,
    time_zone_resolved: placeResolved,
    has_improvable_uncertainty: tier !== 'complete',
  };
}

// ---------- Header status badge ----------
//
// The redesigned "我" tab no longer carries a full hero card. The
// readiness signal collapses into a small chip next to the page
// title. `me-status-badge` styling reads the `tone` to color the dot.

export type MeStatusBadgeTone = 'ok' | 'advisory' | 'attention';

export interface MeStatusBadge {
  readonly tone: MeStatusBadgeTone;
  readonly label: string;
}

export function meStatusBadge(summary: NatalCompletenessSummary): MeStatusBadge {
  switch (summary.tier) {
    case 'scaffold':
      return { tone: 'attention', label: '待填写出生信息' };
    case 'partial_blocker':
      return { tone: 'attention', label: '出生信息待补全' };
    case 'partial_warning':
      // Compound label per design: tells the user the pipeline will
      // still produce a reading, but flags that one specific input
      // (time-of-birth precision) is the lever they can still pull.
      return { tone: 'advisory', label: '可使用 · 时间待确认' };
    case 'complete':
      return { tone: 'ok', label: '资料已就绪' };
    default: {
      const exhaustive: never = summary.tier;
      void exhaustive;
      return { tone: 'advisory', label: '出生信息' };
    }
  }
}

// ---------- Natal-card primary action ----------
//
// The natal summary card keeps a single primary button. When the
// data is fully ready there is no primary CTA — the user only sees
// the secondary "查看识别详情" and "编辑" links.

export interface MeNatalPrimaryAction {
  readonly label: string;
}

export function natalCardPrimaryAction(
  summary: NatalCompletenessSummary,
): MeNatalPrimaryAction | null {
  switch (summary.tier) {
    case 'scaffold':
      return { label: '填写出生信息' };
    case 'partial_blocker':
      return { label: '补全出生信息' };
    case 'partial_warning':
      return { label: '确认时间准确度' };
    case 'complete':
      return null;
    default: {
      const exhaustive: never = summary.tier;
      void exhaustive;
      return null;
    }
  }
}
