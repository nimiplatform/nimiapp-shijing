import type {
  NianJingInflectionPoint,
  NianJingMirrorOutput,
  NianJingNature,
  NianJingPhaseBand,
} from '../../../domain/mirror-output.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import { dailyMirrorScopeForToday } from '../mirror-scope-helpers.ts';
import type { NianJingSurfaceCopy } from '../../i18n/schema/nianjing-surface.ts';

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function todayIsoDate(): string {
  return dailyMirrorScopeForToday().date;
}

export function dateToMs(date: string): number {
  return Date.parse(date + 'T00:00:00Z');
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

// Severity ordering for picking the dominant *current* phase nature
// across concerns. Higher score = more notable → wins the headline
// slot in the hero card. Matches `yuejing-tab.tsx::TENDENCY_SEVERITY`
// so the cross-mirror "what should the user notice first" priority
// reads identically.
export const NATURE_SEVERITY: Record<NianJingNature, number> = {
  blocked: 4,
  turning: 3,
  watch: 2,
  supportive: 1,
  steady: 0,
};

// Structured guidance per phase nature. Drives the "结论 → 解释 →
// 行动建议 → 提醒" drawer rendering. `{concern}` placeholders are
// substituted at render time with the active concern's label so each
// sentence reads as if written for that specific area of life.
export function substituteConcernPlaceholder(text: string, concern: string): string {
  return text.replaceAll('{concern}', concern);
}

export function formatDateDots(iso: string): string {
  return iso.replaceAll('-', '.');
}

export function bandDurationLabel(band: NianJingPhaseBand, copy: NianJingSurfaceCopy): string {
  const days = Math.max(1, Math.round((dateToMs(band.end_date) - dateToMs(band.start_date)) / 86_400_000));
  if (days >= 330) {
    const years = Math.max(1, Math.round(days / 365));
    return copy.duration.years(years);
  }
  if (days >= 60) return copy.duration.months(Math.round(days / 30));
  return copy.duration.days(days);
}

// Find the phase band that contains `today` for a given concern, if
// any. The lookup is a linear scan: phase counts per concern are small
// (≤ ~10 bands across a 10-year horizon).
export function currentBandFor(
  bands: readonly NianJingPhaseBand[],
  today: string,
): NianJingPhaseBand | null {
  for (const band of bands) {
    if (band.start_date <= today && today <= band.end_date) return band;
  }
  return null;
}

export function dominantCurrentNature(
  laneEntries: ReadonlyArray<{ readonly current: NianJingPhaseBand | null }>,
): NianJingNature {
  let best: NianJingNature = 'steady';
  let bestScore = -1;
  for (const entry of laneEntries) {
    if (!entry.current) continue;
    const s = NATURE_SEVERITY[entry.current.nature];
    if (s > bestScore) {
      best = entry.current.nature;
      bestScore = s;
    }
  }
  return best;
}

export function bandYearRangeLabel(band: NianJingPhaseBand, copy: NianJingSurfaceCopy): string {
  const s = yearOf(band.start_date);
  const e = yearOf(band.end_date);
  if (s === e) return copy.yearLabel(s);
  return `${s}–${e}`;
}

// Discriminated union driving the right-side detail drawer. One slot
// covers both phase bands and inflection markers so they're mutually
// exclusive — opening one closes the other automatically — and so a
// single drawer component handles both content shapes.
export type SelectedDetail =
  | {
      readonly kind: 'band';
      readonly band: NianJingPhaseBand;
      readonly tag: ConcernTag;
    }
  | {
      readonly kind: 'inflection';
      readonly inflection: NianJingInflectionPoint;
      readonly tag: ConcernTag;
    };

export interface LaneViewModel {
  readonly tag: ConcernTag;
  readonly phases: readonly NianJingPhaseBand[];
  readonly inflections: readonly NianJingInflectionPoint[];
  readonly current: NianJingPhaseBand | null;
}

export function buildLanes(
  output: NianJingMirrorOutput,
  activeTags: readonly ConcernTag[],
  today: string,
): readonly LaneViewModel[] {
  const phasesByTag = new Map<string, NianJingPhaseBand[]>();
  const inflectionsByTag = new Map<string, NianJingInflectionPoint[]>();
  for (const phase of output.phase_bands) {
    const arr = phasesByTag.get(phase.concern_tag_ref);
    if (arr) arr.push(phase);
    else phasesByTag.set(phase.concern_tag_ref, [phase]);
  }
  for (const inflection of output.inflection_points) {
    const arr = inflectionsByTag.get(inflection.concern_tag_ref);
    if (arr) arr.push(inflection);
    else inflectionsByTag.set(inflection.concern_tag_ref, [inflection]);
  }
  // Drive lane order from the user's active-concern order (settings)
  // rather than insertion order from the generator output. Inactive
  // tags don't get a lane even if the generator referenced them.
  return activeTags.map((tag) => {
    const phases = phasesByTag.get(tag.id) ?? [];
    const inflections = inflectionsByTag.get(tag.id) ?? [];
    return {
      tag,
      phases,
      inflections,
      current: currentBandFor(phases, today),
    };
  });
}
