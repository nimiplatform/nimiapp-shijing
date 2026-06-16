// Visual-first derivation helpers for the RiJing tab.
//
// The mirror pipeline gives us a Reading whose `output` is the
// discriminated `RiJingMirrorOutput` (summary / daily_overview /
// concern_projections). The Hero presentation wants a calmer
// register than the raw pipeline output: a short evocative headline,
// a small set of tendency leanings, a confidence note, and a
// reminder line. These helpers shape that presentation without
// inventing claims beyond what the Reading already says.

import type { Reading } from '../../../domain/reading.ts';
import type {
  RiJingConcernProjection,
  RiJingMirrorOutput,
  TendencyClass,
} from '../../../domain/mirror-output.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import { getProductCopy, type ProductCopy } from '../../i18n/copy.ts';
import { deriveMethodEvidenceChips, type MethodEvidenceChip } from '../shared/method-evidence-chips.ts';

export interface RiJingHeroContent {
  readonly hasReading: boolean;
  readonly eyebrow: string;
  readonly headline: string;
  readonly description: string;
  readonly leanings: readonly string[];
  readonly confidence_label: string;
  readonly confidence_note: string;
  readonly reminder: string;
}

export type RiJingEmptyStateKind =
  | 'ready_to_generate'
  | 'profile_incomplete'
  | 'missing_focus'
  | 'runtime_ai_failed'
  | 'persistence_pending'
  | 'persistence_failed';

export interface RiJingHeroDeriveOptions {
  readonly empty_state?: RiJingEmptyStateKind;
  readonly copy?: ProductCopy;
}

export interface RiJingDateLabel {
  readonly date: string;
  readonly weekday: string;
  readonly zone: string;
}

const DEFAULT_COPY = getProductCopy('zh');

// Tendency class → leaning chip text. We use the i18n labels for the
// dominant tendency (e.g. supportive → 助力) so the leanings strip
// reads as a derived projection summary, not a hand-written phrase.
function leaningsForReading(reading: Reading, copy: ProductCopy): readonly string[] {
  const output = reading.output as RiJingMirrorOutput;
  if (output.concern_projections.length === 0) return [copy.rijing.leaningFallback];
  const counts = new Map<TendencyClass, number>();
  for (const p of output.concern_projections) {
    counts.set(p.tendency_class, (counts.get(p.tendency_class) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => copy.tendencyClassLabels[t]);
}

function condense(text: string, max: number): string {
  const cleaned = text.trim().replace(/\s+/g, '');
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}…`;
}

export function deriveRiJingHero(
  reading: Reading | undefined,
  options: RiJingHeroDeriveOptions = {},
): RiJingHeroContent {
  const copy = options.copy ?? DEFAULT_COPY;
  if (!reading) {
    const emptyCopy = copy.rijing.emptyHero[options.empty_state ?? 'ready_to_generate'];
    return {
      hasReading: false,
      eyebrow: copy.rijing.eyebrow,
      headline: copy.rijing.headlineFallback,
      description: emptyCopy.description,
      leanings: [],
      confidence_label: '—',
      confidence_note: emptyCopy.confidence_note,
      reminder: emptyCopy.reminder,
    };
  }
  const output = reading.output as RiJingMirrorOutput;
  // stage_label comes from the feature snapshot's stage_drivers list.
  // We use the first driver's label as the dominant stage for the
  // headline; downstream copy (description) still carries the full
  // pipeline narrative.
  const firstStage = reading.inputs_summary.feature_snapshot.common.stage_drivers[0]?.stage_label;
  const headline = firstStage
    ? copy.rijing.stageHeadlines[firstStage] ?? copy.rijing.stageHeadlineFallback
    : copy.rijing.stageHeadlineFallback;
  const summary = output.summary || output.daily_overview || copy.rijing.headlineFallback;
  const description = output.daily_overview || summary;
  const caveat = reading.uncertainty.caveats[0];
  const dataGap = reading.uncertainty.data_gaps[0];
  const reminder =
    caveat ||
    dataGap ||
    copy.rijing.defaultReminder;
  const confidence_note =
    caveat ||
    dataGap ||
    copy.rijing.defaultConfidenceNote;
  return {
    hasReading: true,
    eyebrow: copy.rijing.eyebrow,
    headline,
    description,
    leanings: leaningsForReading(reading, copy),
    confidence_label: copy.rijing.confidenceLabels[reading.uncertainty.confidence],
    confidence_note,
    reminder,
  };
}

// ----- action cards -----
//
// Action cards are rendered only from generated Reading content. Empty output
// stays empty; the product must not synthesize guidance copy.

export type RiJingActionSlot = 'do' | 'say' | 'avoid';

export interface RiJingActionItem {
  readonly slot: RiJingActionSlot;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
}

const NON_ACTIONABLE_UNCERTAINTY_CODES = new Set<string>([
  'birth_precision_exact',
]);

function firstActionableCaveat(reading: Reading | undefined): string | undefined {
  if (!reading) return undefined;
  for (let i = 0; i < reading.uncertainty.caveats.length; i += 1) {
    const code = reading.uncertainty.data_gaps[i];
    if (code && NON_ACTIONABLE_UNCERTAINTY_CODES.has(code)) continue;
    return reading.uncertainty.caveats[i];
  }
  return undefined;
}

export function deriveRiJingActions(
  reading: Reading | undefined,
  copy: ProductCopy = DEFAULT_COPY,
): readonly RiJingActionItem[] {
  if (!reading) return [];
  const output = reading?.output as RiJingMirrorOutput | undefined;
  const recs = output
    ? output.concern_projections.flatMap((p) => p.recommendations)
    : [];
  const summaries = output
    ? output.concern_projections.map((p) => p.summary).filter((s) => s.length > 0)
    : [];
  const avoidCaveat = firstActionableCaveat(reading);

  const doText = recs[0];
  const sayText = recs[1] ?? summaries[0];
  const items: RiJingActionItem[] = [];

  if (doText) {
    items.push({
      slot: 'do',
      eyebrow: copy.rijing.actions.slots.do,
      title: condense(doText, 14),
      body: doText,
    });
  }

  if (sayText) {
    items.push({
      slot: 'say',
      eyebrow: copy.rijing.actions.slots.say,
      title: condense(sayText, 14),
      body: sayText,
    });
  }

  if (avoidCaveat) {
    items.push({
      slot: 'avoid',
      eyebrow: copy.rijing.actions.slots.avoid,
      title: condense(avoidCaveat, 14),
      body: avoidCaveat,
    });
  }

  return items;
}

// Friendly names for common IANA timezones; falls back to
// "City (GMT±N)" so the user never sees a raw "Etc/UTC" string.
function gmtOffsetFor(iana: string, now: Date): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'shortOffset' });
    const parts = dtf.formatToParts(now);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

export function friendlyTimeZoneLabel(
  iana: string,
  copy: ProductCopy = DEFAULT_COPY,
  now: Date = new Date(),
): string {
  if (!iana) return copy.rijing.date.localTime;
  if (copy.rijing.date.timeZoneLabels[iana]) return copy.rijing.date.timeZoneLabels[iana]!;
  const segs = iana.split('/');
  const tail = (segs[segs.length - 1] ?? iana).replace(/_/g, ' ');
  const offset = gmtOffsetFor(iana, now);
  return offset ? copy.rijing.date.timeZoneWithOffset(tail, offset) : tail || iana;
}

export function rijingDateLabel(
  basisTimeZone: string,
  copy: ProductCopy = DEFAULT_COPY,
  now: Date = new Date(),
): RiJingDateLabel {
  const tz = basisTimeZone === '' ? 'Etc/UTC' : basisTimeZone;
  if (!copy.rijing.date.locale.startsWith('zh')) {
    const dateFormatter = new Intl.DateTimeFormat(copy.rijing.date.locale, {
      timeZone: tz,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const weekdayFormatter = new Intl.DateTimeFormat(copy.rijing.date.locale, {
      timeZone: tz,
      weekday: 'long',
    });
    return {
      date: dateFormatter.format(now),
      weekday: weekdayFormatter.format(now),
      zone: friendlyTimeZoneLabel(tz, copy, now),
    };
  }
  const formatter = new Intl.DateTimeFormat(copy.rijing.date.locale, {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'long',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  return {
    date: `${year}年${month}月${day}日`,
    weekday,
    zone: friendlyTimeZoneLabel(tz, copy, now),
  };
}

export interface RecentMemoryItem {
  readonly memory: EventMemory;
  readonly date_label: string;
  readonly text: string;
}

export function deriveRecentMemories(
  memories: readonly EventMemory[],
  limit = 3,
): readonly RecentMemoryItem[] {
  return memories
    .slice()
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
    .slice(0, limit)
    .map((memory) => ({
      memory,
      date_label: memory.occurred_at.slice(0, 10),
      text: memory.body,
    }));
}

// ----- evidence chips -----

export type RijingEvidenceChip = MethodEvidenceChip;

export function deriveEvidenceChips(
  reading: Reading | undefined,
  copy: ProductCopy = DEFAULT_COPY,
): readonly RijingEvidenceChip[] {
  if (!reading) {
    return [{ group: copy.rijing.evidence.emptyChipGroup, value: copy.rijing.evidence.emptyChipValue }];
  }
  return deriveMethodEvidenceChips(reading);
}

export type { RiJingConcernProjection };
