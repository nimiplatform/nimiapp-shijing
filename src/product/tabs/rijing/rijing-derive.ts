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
import type { DailyMirrorScope } from '../../../domain/mirror-scope.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import type {
  FiveElement,
  ShijingStageLabel,
  StrengthBand,
} from '../../../domain/algorithm.ts';
import { STRENGTH_BANDS } from '../../../domain/algorithm.ts';
import { getProductCopy, type ProductCopy } from '../../i18n/copy.ts';
import { deriveMethodEvidenceChips, type MethodEvidenceChip } from '../shared/method-evidence-chips.ts';
import { BRANCH_HANZI, ELEMENT_HANZI, STEM_HANZI } from '../mingjing/ganzhi-hanzi.ts';

export interface RiJingLeaning {
  readonly label: string;
  readonly tone: TendencyClass;
}

export interface RiJingEnergyMeter {
  // 0..100 dot position on the 收敛蓄力 ←→ 向外扩张 axis, derived from the
  // 旺衰 band index. `band` / `stage` stay raw domain terms (rendered as
  // emphasis); surrounding wording comes from copy.overview.
  readonly percent: number;
  readonly band: StrengthBand;
  readonly stage: ShijingStageLabel;
}

export interface RiJingHeroContent {
  readonly hasReading: boolean;
  readonly eyebrow: string;
  readonly headline: string;
  // Condensed one-glance conclusion shown under the headline (or the
  // empty-state description when there is no reading).
  readonly subtitle: string;
  readonly energyMeter?: RiJingEnergyMeter;
  readonly leanings: readonly RiJingLeaning[];
  readonly confidence_label: string;
  readonly confidence_note: string;
  // 今日基调 (full narrative) + 今日事件解析, revealed behind 展开完整解读.
  readonly theme?: {
    readonly title: string;
    readonly body: string;
  };
  readonly reference_event?: RiJingHeroReferenceEvent;
  readonly closing_label: string;
  readonly closing_wish: string;
}

export interface RiJingHeroFocusTagRef {
  readonly id: string;
  readonly label: string;
}

export interface RiJingHeroPerspective {
  readonly id: string;
  readonly label: string;
  readonly tendency_label: string;
  readonly summary: string;
  readonly recommendations: readonly string[];
}

export interface RiJingHeroReferenceEvent {
  readonly title: string;
  readonly event_body: string;
  readonly guidance: string;
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
  readonly focus_tags?: readonly RiJingHeroFocusTagRef[];
  readonly reference_memories?: readonly EventMemory[];
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
function leaningsForReading(reading: Reading, copy: ProductCopy): readonly RiJingLeaning[] {
  const output = reading.output as RiJingMirrorOutput;
  if (output.concern_projections.length === 0) {
    return [{ label: copy.rijing.leaningFallback, tone: 'steady' }];
  }
  const counts = new Map<TendencyClass, number>();
  for (const p of output.concern_projections) {
    counts.set(p.tendency_class, (counts.get(p.tendency_class) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tone]) => ({ label: copy.tendencyClassLabels[tone], tone }));
}

function labelForFocusTag(ref: string, focusTags: readonly RiJingHeroFocusTagRef[]): string {
  return focusTags.find((tag) => tag.id === ref)?.label ?? ref;
}

function perspectivesForReading(
  output: RiJingMirrorOutput,
  focusTags: readonly RiJingHeroFocusTagRef[],
  copy: ProductCopy,
): readonly RiJingHeroPerspective[] {
  return output.concern_projections.map((projection) => ({
    id: projection.concern_tag_ref,
    label: labelForFocusTag(projection.concern_tag_ref, focusTags),
    tendency_label: copy.tendencyClassLabels[projection.tendency_class],
    summary: projection.summary,
    recommendations: projection.recommendations,
  }));
}

function referenceEventForReading(
  reading: Reading,
  description: string,
  perspectives: readonly RiJingHeroPerspective[],
  memories: readonly EventMemory[],
  copy: ProductCopy,
): RiJingHeroReferenceEvent | undefined {
  const cited = new Set(reading.cited_event_memory_refs);
  const memory = reading.cited_event_memory_refs
    .map((ref) => memories.find((candidate) => candidate.id === ref))
    .find((candidate): candidate is EventMemory => Boolean(candidate));
  if (!memory || !cited.has(memory.id)) {
    if (reading.cited_event_memory_refs.length > 0) return undefined;
    return {
      title: copy.rijing.hero.eventInsightLabel,
      event_body: copy.rijing.hero.eventFallbackBody,
      guidance: copy.rijing.hero.eventFallbackGuidance,
    };
  }
  const firstRecommendation = perspectives
    .flatMap((perspective) => perspective.recommendations)
    .find((item) => item.trim().length > 0);
  return {
    title: copy.rijing.hero.eventInsightLabel,
    event_body: memory.body,
    guidance: firstRecommendation
      ? `${copy.rijing.hero.eventActionLead}${firstRecommendation}`
      : description,
  };
}

function condense(text: string, max: number): string {
  const cleaned = text.trim().replace(/\s+/g, '');
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}…`;
}

// 旺衰 band → energy-meter position. Only BaZi readings carry a 旺衰 band; for
// other methods the meter is hidden rather than faked. A weaker chart leans to
// the 收敛蓄力 (left) end, a stronger chart to 向外扩张 (right).
export function deriveRiJingEnergyMeter(reading: Reading): RiJingEnergyMeter | undefined {
  const fs = reading.inputs_summary.feature_snapshot;
  const me = fs.method_evidence;
  if (me.method_id !== 'bazi_ziping_v1') return undefined;
  const interpretation = me.bazi.self_subject.interpretation;
  const stage = fs.common.stage_drivers[0]?.stage_label;
  if (!interpretation || !stage) return undefined;
  const band = interpretation.strength.band;
  const index = STRENGTH_BANDS.indexOf(band);
  const ratio = index < 0 ? 0.5 : index / (STRENGTH_BANDS.length - 1);
  return { percent: 10 + ratio * 80, band, stage };
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
      subtitle: emptyCopy.description,
      leanings: [],
      confidence_label: '—',
      confidence_note: emptyCopy.reminder,
      closing_label: copy.rijing.hero.closingLabel,
      closing_wish: copy.rijing.hero.closingWish,
    };
  }
  const output = reading.output as RiJingMirrorOutput;
  // stage_label comes from the feature snapshot's stage_drivers list.
  // We use the first driver's label as the dominant stage for the
  // headline; the full pipeline narrative stays in the theme body.
  const firstStage = reading.inputs_summary.feature_snapshot.common.stage_drivers[0]?.stage_label;
  const headline = firstStage
    ? copy.rijing.stageHeadlines[firstStage] ?? copy.rijing.stageHeadlineFallback
    : copy.rijing.stageHeadlineFallback;
  const summary = output.summary || output.daily_overview || copy.rijing.headlineFallback;
  const description = output.daily_overview || summary;
  const subtitle = output.summary ? condense(output.summary, 78) : condense(description, 78);
  const caveat = reading.uncertainty.caveats[0];
  const dataGap = reading.uncertainty.data_gaps[0];
  const confidence_note = caveat || dataGap || copy.rijing.defaultConfidenceNote;
  const perspectives = perspectivesForReading(output, options.focus_tags ?? [], copy);
  return {
    hasReading: true,
    eyebrow: copy.rijing.eyebrow,
    headline,
    subtitle,
    energyMeter: deriveRiJingEnergyMeter(reading),
    leanings: leaningsForReading(reading, copy),
    confidence_label: copy.rijing.confidenceLabels[reading.uncertainty.confidence],
    confidence_note,
    theme: {
      title: copy.rijing.hero.themeLabel,
      body: description,
    },
    reference_event: referenceEventForReading(
      reading,
      description,
      perspectives,
      options.reference_memories ?? [],
      copy,
    ),
    closing_label: copy.rijing.hero.closingLabel,
    closing_wish: copy.rijing.hero.closingWish,
  };
}

// ----- action cards -----
//
// 今日行动 distils the day into one concrete move (做一件事) and one thing worth
// saying (说一句话). Both are pulled verbatim from generated projection
// recommendations and tagged with the concern they came from — the product
// never synthesizes guidance copy. Empty recommendations → empty section.

export type RiJingActionSlot = 'do' | 'say';

export interface RiJingActionItem {
  readonly slot: RiJingActionSlot;
  readonly eyebrow: string;
  readonly body: string;
  readonly source_tag?: string;
  readonly source_theme?: string;
}

export function deriveRiJingActions(
  reading: Reading | undefined,
  copy: ProductCopy = DEFAULT_COPY,
  focusTags: readonly RiJingHeroFocusTagRef[] = [],
): readonly RiJingActionItem[] {
  if (!reading) return [];
  const output = reading.output as RiJingMirrorOutput;
  const sourced = output.concern_projections.flatMap((projection) =>
    projection.recommendations
      .filter((rec) => rec.trim().length > 0)
      .map((rec) => ({
        rec,
        tag: labelForFocusTag(projection.concern_tag_ref, focusTags),
        theme: condense(projection.summary, 12),
      })),
  );
  const slots: readonly RiJingActionSlot[] = ['do', 'say'];
  const items: RiJingActionItem[] = [];
  for (let i = 0; i < slots.length; i += 1) {
    const entry = sourced[i];
    const slot = slots[i];
    if (!entry || !slot) break;
    items.push({
      slot,
      eyebrow: copy.rijing.actions.slots[slot],
      body: entry.rec,
      source_tag: entry.tag,
      ...(entry.theme ? { source_theme: entry.theme } : {}),
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

function localDateInTimeZone(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Etc/UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Fall through to the UTC date in malformed or unsupported time zones.
  }
  return iso.slice(0, 10);
}

export function deriveRiJingReferenceEventRefs(input: {
  readonly memories: readonly EventMemory[];
  readonly scope: DailyMirrorScope;
  readonly limit?: number;
}): readonly string[] {
  const limit = input.limit ?? 1;
  if (limit <= 0) return [];
  return input.memories
    .filter((memory) =>
      memory.source === 'rijing' &&
      memory.admissible_use === 'eligible_for_retrieval' &&
      localDateInTimeZone(memory.occurred_at, input.scope.basis_time_zone) === input.scope.date
    )
    .slice()
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
    .slice(0, limit)
    .map((memory) => memory.id);
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

// ----- data panel (推演依据与数据说明, expanded) -----
//
// The collapsed bar shows the method evidence chips; the expanded panel adds a
// richer 旺衰 / 用神 / 四柱 / 数据完整度 read for BaZi readings. Every value is
// pulled from `method_evidence` — cards are omitted when their inputs are
// absent rather than filled with placeholders.

export interface RiJingDataElement {
  readonly element: FiveElement;
  readonly char: string;
}

export interface RiJingDataPillar {
  readonly position: 'year' | 'month' | 'day' | 'hour';
  readonly stem: string;
  readonly branch: string;
  readonly emphasis: boolean;
}

export interface RiJingBaziPanel {
  readonly strength?: {
    readonly band: StrengthBand;
    readonly index: number;
    readonly total: number;
  };
  readonly yong: readonly RiJingDataElement[];
  readonly pillars: readonly RiJingDataPillar[];
  readonly completeness: { readonly filled: number; readonly total: number };
  readonly stage?: ShijingStageLabel;
}

export interface RiJingDataPanel {
  readonly chips: readonly RijingEvidenceChip[];
  readonly bazi?: RiJingBaziPanel;
}

// Day pillar first (the 日主 / self pillar, emphasised), then the rest in
// chronological order. Absent pillars are skipped.
const DATA_PILLAR_ORDER: readonly ('year' | 'month' | 'day' | 'hour')[] = [
  'day',
  'year',
  'month',
  'hour',
];

export function deriveRiJingDataPanel(
  reading: Reading | undefined,
  copy: ProductCopy = DEFAULT_COPY,
): RiJingDataPanel {
  const chips = deriveEvidenceChips(reading, copy);
  if (!reading) return { chips };
  const fs = reading.inputs_summary.feature_snapshot;
  const me = fs.method_evidence;
  if (me.method_id !== 'bazi_ziping_v1') return { chips };

  const self = me.bazi.self_subject;
  const chart = self.natal_chart;
  const interpretation = self.interpretation;
  const total = 4;
  const pillarByPosition = {
    year: chart.year_pillar,
    month: chart.month_pillar,
    day: chart.day_pillar,
    hour: chart.hour_pillar,
  } as const;
  const pillars: RiJingDataPillar[] = [];
  for (const position of DATA_PILLAR_ORDER) {
    const pillar = pillarByPosition[position];
    if (!pillar) continue;
    pillars.push({
      position,
      stem: STEM_HANZI[pillar.stem],
      branch: BRANCH_HANZI[pillar.branch],
      emphasis: position === 'day',
    });
  }
  const stage = fs.common.stage_drivers[0]?.stage_label;
  const bazi: RiJingBaziPanel = {
    ...(interpretation
      ? {
          strength: {
            band: interpretation.strength.band,
            index: STRENGTH_BANDS.indexOf(interpretation.strength.band),
            total: STRENGTH_BANDS.length,
          },
        }
      : {}),
    yong: interpretation
      ? interpretation.yong_shen.yong.map((element) => ({ element, char: ELEMENT_HANZI[element] }))
      : [],
    pillars,
    completeness: { filled: total - chart.missing_pillars.length, total },
    ...(stage ? { stage } : {}),
  };
  return { chips, bazi };
}

export type { RiJingConcernProjection };
