// YueJing 30-day presentation derivation; no report entity or driver internals.

import type { ConcernTag } from '../../domain/concern-tag.ts';
import type { EventMemory } from '../../domain/event-memory.ts';
import type { YueJingCell, TendencyClass } from '../../domain/mirror-output.ts';
import type { PlanItem } from '../../domain/plan-item.ts';
import { trimmedConcernLabel as yuejingTagLabel } from '../concern-tags/concern-presets.ts';
import type { YueJingDayTendency, YueJingMonthConcernInterpretation, YueJingMonthInterpretation, YueJingMonthKeyWindow, YueJingMonthPhase, YueJingTendencyCounts } from './yuejing/yuejing-month-types.ts';
import { YUEJING_TENDENCY_SEVERITY, countYueJingTendencies, emptyYueJingTendencyCounts, primaryYueJingTendencyFromCounts } from './yuejing/yuejing-month-tendency.ts';
import {
  CONCERN_ACTION_BY_LABEL,
  CONCERN_LANGUAGE_BY_LABEL,
  GENERIC_CONCERN_ACTION,
  GENERIC_CONCERN_LANGUAGE,
  KEY_WINDOW_BRIEF,
  PHASE_ARC,
  TENDENCY_LANGUAGE,
  type ConcernAction,
  type ConcernLanguage,
  type PhaseArcRole,
} from './yuejing/yuejing-month-language.ts';

export type {
  YueJingDayTendency,
  YueJingMonthAdvice,
  YueJingMonthConcernInterpretation,
  YueJingMonthInterpretation,
  YueJingMonthKeyWindow,
  YueJingMonthMainline,
  YueJingMonthPhase,
  YueJingTendencyCounts,
} from './yuejing/yuejing-month-types.ts';
export {
  YUEJING_MONTH_TENDENCY_CLASSES,
  YUEJING_TENDENCY_SEVERITY,
  countYueJingTendencies,
  emptyYueJingTendencyCounts,
  primaryYueJingTendencyFromCounts,
} from './yuejing/yuejing-month-tendency.ts';

function shortMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

// Compact slash form (6/22) used for the rhythm-strip axis labels.
function slashMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export function compactYueJingDateRangeLabel(startDate: string, endDate: string): string {
  if (startDate === endDate) return shortMonthDay(startDate);
  return `${shortMonthDay(startDate)}-${shortMonthDay(endDate)}`;
}

// A single date's dominant tendency, by severity - the same rule the calendar
// grid uses to color each day, so the rhythm strip mirrors it exactly. Returns
// null when the date has no generated cells.
function dominantTendencyOfDay(cells: readonly YueJingCell[]): TendencyClass | null {
  let best: TendencyClass | null = null;
  let bestScore = -1;
  for (const cell of cells) {
    const score = YUEJING_TENDENCY_SEVERITY[cell.tendency_class];
    if (score > bestScore) {
      best = cell.tendency_class;
      bestScore = score;
    }
  }
  return best;
}

function cellsForDates(input: {
  readonly dates: readonly string[];
  readonly cellsByDate: ReadonlyMap<string, readonly YueJingCell[]>;
}): YueJingCell[] {
  return input.dates.flatMap((date) => [...(input.cellsByDate.get(date) ?? [])]);
}

function cellsForConcernInWindow(input: {
  readonly dates: readonly string[];
  readonly cellsByDate: ReadonlyMap<string, readonly YueJingCell[]>;
  readonly concernTagId: string;
}): YueJingCell[] {
  const cells: YueJingCell[] = [];
  for (const date of input.dates) {
    const cell = (input.cellsByDate.get(date) ?? []).find(
      (candidate) => candidate.concern_tag_ref === input.concernTagId,
    );
    if (cell) cells.push(cell);
  }
  return cells;
}

function contiguousDateRanges(
  cells: readonly YueJingCell[],
  dates: readonly string[],
  predicate: (cell: YueJingCell) => boolean,
): string[] {
  const dateIndex = new Map(dates.map((date, index) => [date, index] as const));
  const selected = cells
    .filter(predicate)
    .map((cell) => cell.date)
    .filter((date, index, arr) => arr.indexOf(date) === index)
    .sort((a, b) => (dateIndex.get(a) ?? 0) - (dateIndex.get(b) ?? 0));
  const ranges: string[] = [];
  let start: string | null = null;
  let previous: string | null = null;
  for (const date of selected) {
    if (!start || !previous) {
      start = date;
      previous = date;
      continue;
    }
    if ((dateIndex.get(date) ?? -1) === (dateIndex.get(previous) ?? -3) + 1) {
      previous = date;
      continue;
    }
    ranges.push(compactYueJingDateRangeLabel(start, previous));
    start = date;
    previous = date;
  }
  if (start && previous) ranges.push(compactYueJingDateRangeLabel(start, previous));
  return ranges;
}

function limitedRangeText(ranges: readonly string[], fallback: string): string {
  if (ranges.length === 0) return fallback;
  const head = ranges.slice(0, 3).join('、');
  return ranges.length > 3 ? `${head} 等` : head;
}

function meaningfulCellDetails(cells: readonly YueJingCell[]): string[] {
  const seen = new Set<string>();
  const details: string[] = [];
  for (const cell of cells) {
    const detail = cell.summary
      .replace(/^(supportive|steady|watch|blocked|turning)\s*\(.+\)\s*$/, '')
      .replace(/^#[^:：]+[:：]\s*/, '')
      .trim();
    if (!detail || seen.has(detail)) continue;
    seen.add(detail);
    details.push(detail);
    if (details.length >= 2) break;
  }
  return details;
}

function attentionWeight(counts: YueJingTendencyCounts): number {
  return counts.blocked * 5 + counts.turning * 4 + counts.watch * 3 + counts.supportive * 2 + counts.steady;
}

function rangesForTendency(
  cells: readonly YueJingCell[],
  dates: readonly string[],
  tendency: TendencyClass,
): string[] {
  return contiguousDateRanges(cells, dates, (cell) => cell.tendency_class === tendency);
}

function countGeneratedDates(
  dates: readonly string[],
  cellsByDate: ReadonlyMap<string, readonly YueJingCell[]>,
): number {
  return dates.filter((date) => (cellsByDate.get(date) ?? []).length > 0).length;
}

// ① rhythm strip — one dominant tendency per local date (null when pending).
function deriveDaySeries(
  dates: readonly string[],
  cellsByDate: ReadonlyMap<string, readonly YueJingCell[]>,
): YueJingDayTendency[] {
  return dates.map((date) => ({
    date,
    tendency: dominantTendencyOfDay(cellsByDate.get(date) ?? []),
  }));
}

function countDaySeriesTendencies(series: readonly YueJingDayTendency[]): YueJingTendencyCounts {
  const counts = emptyYueJingTendencyCounts();
  for (const day of series) {
    if (day.tendency) counts[day.tendency] += 1;
  }
  return counts;
}

// Map a phase index to its arc role. For a 4-phase month it is 1:1; a 3-phase
// month keeps the narrative bookends (记录 → 表达 → 收束) by dropping 稳定执行.
function phaseRole(index: number, phaseCount: number): PhaseArcRole {
  if (phaseCount >= 4) return PHASE_ARC[Math.min(index, PHASE_ARC.length - 1)] as PhaseArcRole;
  const order = [0, 1, 3];
  return PHASE_ARC[order[Math.min(index, order.length - 1)] as number] as PhaseArcRole;
}

function splitIntoPhases(
  dates: readonly string[],
  cellsByDate: ReadonlyMap<string, readonly YueJingCell[]>,
  rangeLabel: string,
): YueJingMonthPhase[] {
  if (dates.length === 0) {
    const role = PHASE_ARC[0] as PhaseArcRole;
    return [{
      title: '时间阶段',
      name: role.name,
      theme: role.theme,
      window: rangeLabel,
      tendency: 'steady',
      suitable: role.suitable,
      unsuitable: role.unsuitable,
    }];
  }
  const phaseCount = dates.length >= 24 ? 4 : 3;
  const phases: YueJingMonthPhase[] = [];
  for (let i = 0; i < phaseCount; i++) {
    const startIndex = Math.floor((i * dates.length) / phaseCount);
    const endIndex = Math.floor(((i + 1) * dates.length) / phaseCount) - 1;
    const phaseDates = dates.slice(startIndex, endIndex + 1);
    const cells = cellsForDates({ dates: phaseDates, cellsByDate });
    const counts = countYueJingTendencies(cells);
    const primary = cells.length > 0 ? primaryYueJingTendencyFromCounts(counts) : 'steady';
    const role = phaseRole(i, phaseCount);
    phases.push({
      title: `第${i + 1}阶段`,
      name: role.name,
      theme: role.theme,
      window: compactYueJingDateRangeLabel(phaseDates[0], phaseDates[phaseDates.length - 1]),
      tendency: primary,
      suitable: role.suitable,
      unsuitable: role.unsuitable,
    });
  }
  return phases;
}

function keyWindow(
  title: string,
  window: string,
  tendency: TendencyClass | undefined,
  brief: string,
  suitable: string,
  unsuitable: string,
): YueJingMonthKeyWindow {
  return { title, window, tendency, brief, suitable, unsuitable };
}

function contextDateRanges(input: {
  readonly dates: readonly string[];
  readonly eventMemories: readonly EventMemory[];
  readonly planItems: readonly PlanItem[];
}): YueJingMonthKeyWindow[] {
  const dateSet = new Set(input.dates);
  const memoryDates = input.eventMemories
    .map((memory) => memory.occurred_at.slice(0, 10))
    .filter((date) => dateSet.has(date));
  const planDates = input.planItems
    .map((plan) => plan.planned_for.slice(0, 10))
    .filter((date) => dateSet.has(date));
  const dateOnlyCells = (dates: readonly string[]): YueJingCell[] =>
    dates.map((date) => ({
      date,
      concern_tag_ref: '__context__',
      tendency_class: 'steady',
      summary: '',
    }));
  const windows: YueJingMonthKeyWindow[] = [];
  const memoryRanges = contiguousDateRanges(dateOnlyCells(memoryDates), input.dates, () => true);
  if (memoryRanges.length > 0) {
    windows.push(keyWindow(
      '已有事件记忆',
      limitedRangeText(memoryRanges, ''),
      undefined,
      '回看当时真实发生了什么，把经验收进下一步安排。',
      '适合回看当时真实发生了什么，把经验收进下一步安排。',
      '不适合把单次事件放大成整月判断，先看它是否反复出现。',
    ));
  }
  const planRanges = contiguousDateRanges(dateOnlyCells(planDates), input.dates, () => true);
  if (planRanges.length > 0) {
    windows.push(keyWindow(
      '未来计划',
      limitedRangeText(planRanges, ''),
      undefined,
      '提前拆小动作，把关键承诺避开阻力最重的日期。',
      '适合提前拆小动作，尽量把关键承诺避开阻力最重的日期。',
      '不适合把计划压到临近当天才处理，尤其不要在观察日临时加码。',
    ));
  }
  return windows;
}

function concernLanguageFor(tag: ConcernTag): ConcernLanguage {
  const label = yuejingTagLabel(tag);
  return CONCERN_LANGUAGE_BY_LABEL[label] ?? GENERIC_CONCERN_LANGUAGE;
}

function concernActionFor(tag: ConcernTag): ConcernAction {
  const label = yuejingTagLabel(tag);
  return CONCERN_ACTION_BY_LABEL[label] ?? GENERIC_CONCERN_ACTION;
}

function deriveConcernInterpretation(input: {
  readonly tag: ConcernTag;
  readonly dates: readonly string[];
  readonly cellsByDate: ReadonlyMap<string, readonly YueJingCell[]>;
  readonly rangeLabel: string;
}): YueJingMonthConcernInterpretation {
  const cells = cellsForConcernInWindow({
    dates: input.dates,
    cellsByDate: input.cellsByDate,
    concernTagId: input.tag.id,
  });
  const counts = countYueJingTendencies(cells);
  const primary = cells.length > 0 ? primaryYueJingTendencyFromCounts(counts) : 'steady';
  const label = yuejingTagLabel(input.tag);
  const language = concernLanguageFor(input.tag);
  const concernAction = concernActionFor(input.tag);
  const primaryRanges = rangesForTendency(cells, input.dates, primary);
  const supportiveRanges = rangesForTendency(cells, input.dates, 'supportive');
  const watchRanges = [
    ...rangesForTendency(cells, input.dates, 'watch'),
    ...rangesForTendency(cells, input.dates, 'blocked'),
  ];
  const turningRanges = rangesForTendency(cells, input.dates, 'turning');
  const blockedRanges = rangesForTendency(cells, input.dates, 'blocked');
  const actionWindow = limitedRangeText(primaryRanges, input.rangeLabel);
  const keyWindows = [
    keyWindow(
      '适合推进',
      limitedRangeText(supportiveRanges, input.rangeLabel),
      'supportive',
      language.supportive,
      language.supportive,
      '不适合只凭单日助力连续加码，推进后要留下确认点。',
    ),
    keyWindow(
      '先观察',
      limitedRangeText(watchRanges, input.rangeLabel),
      'watch',
      language.watch,
      language.watch,
      '不适合急着定性或逼出结果，先等连续信号出现。',
    ),
    keyWindow(
      '可能转向',
      limitedRangeText(turningRanges, input.rangeLabel),
      'turning',
      language.turning,
      language.turning,
      '不适合用旧节奏处理新反馈，保留调整空间。',
    ),
  ];
  return {
    tag: input.tag,
    tag_label: label,
    has_cells: cells.length > 0,
    primary,
    generated_days: cells.length,
    axis: concernAction.axis,
    summary: concernAction.summary,
    action: {
      window: actionWindow,
      suitable: cells.length > 0
        ? `${language[primary]} ${TENDENCY_LANGUAGE[primary].suitable}`
        : '适合先补齐这个关注在当前窗口的生成结果，再纳入整月判断。',
      unsuitable: blockedRanges.length > 0
        ? `${TENDENCY_LANGUAGE[primary].unsuitable} 阻力集中在 ${limitedRangeText(blockedRanges, input.rangeLabel)}，这些日期不要硬推。`
        : TENDENCY_LANGUAGE[primary].unsuitable,
    },
    key_windows: keyWindows,
    checklist: concernAction.checklist,
    counts,
    detail_examples: meaningfulCellDetails(cells),
  };
}

export function deriveYueJingMonthInterpretation(input: {
  readonly dates: readonly string[];
  readonly cellsByDate: ReadonlyMap<string, readonly YueJingCell[]>;
  readonly activeTags: readonly ConcernTag[];
  readonly eventMemories?: readonly EventMemory[];
  readonly planItems?: readonly PlanItem[];
}): YueJingMonthInterpretation {
  const hasDates = input.dates.length > 0;
  const firstDate = hasDates ? (input.dates[0] as string) : '';
  const lastDate = hasDates ? (input.dates[input.dates.length - 1] as string) : '';
  const rangeLabel = hasDates ? compactYueJingDateRangeLabel(firstDate, lastDate) : '当前窗口';
  const startLabel = hasDates ? slashMonthDay(firstDate) : '';
  const endLabel = hasDates ? slashMonthDay(lastDate) : '';
  const allCells = cellsForDates({ dates: input.dates, cellsByDate: input.cellsByDate });
  const counts = countYueJingTendencies(allCells);
  const daySeries = deriveDaySeries(input.dates, input.cellsByDate);
  const dayCounts = countDaySeriesTendencies(daySeries);
  // The 本期主线 tendency is the dominant *day* tendency (one vote per day),
  // matching the rhythm strip and stat row rather than the per-cell mix.
  const primary = allCells.length > 0 ? primaryYueJingTendencyFromCounts(dayCounts) : 'steady';
  const generatedDayCount = countGeneratedDates(input.dates, input.cellsByDate);
  const primaryLanguage = TENDENCY_LANGUAGE[primary];
  const supportiveRanges = rangesForTendency(allCells, input.dates, 'supportive');
  const watchRanges = rangesForTendency(allCells, input.dates, 'watch');
  const blockedRanges = rangesForTendency(allCells, input.dates, 'blocked');
  const turningRanges = rangesForTendency(allCells, input.dates, 'turning');
  const cautionRanges = [...watchRanges, ...blockedRanges];
  const keyWindows: YueJingMonthKeyWindow[] = [
    keyWindow(
      '主动推进窗口',
      limitedRangeText(supportiveRanges, rangeLabel),
      'supportive',
      KEY_WINDOW_BRIEF.push,
      TENDENCY_LANGUAGE.supportive.suitable,
      TENDENCY_LANGUAGE.supportive.unsuitable,
    ),
    keyWindow(
      '放慢判断窗口',
      limitedRangeText(cautionRanges, rangeLabel),
      'watch',
      KEY_WINDOW_BRIEF.slow,
      TENDENCY_LANGUAGE.watch.suitable,
      TENDENCY_LANGUAGE.watch.unsuitable,
    ),
    keyWindow(
      '转向信号窗口',
      limitedRangeText(turningRanges, rangeLabel),
      'turning',
      KEY_WINDOW_BRIEF.turn,
      TENDENCY_LANGUAGE.turning.suitable,
      TENDENCY_LANGUAGE.turning.unsuitable,
    ),
  ];
  const contextWindows = contextDateRanges({
    dates: input.dates,
    eventMemories: input.eventMemories ?? [],
    planItems: input.planItems ?? [],
  });
  // ⑤ 收尾提醒 — three short avoid bullets (two from the primary tendency,
  // one anchored to the observation windows) and three reflective prompts
  // (the middle one tendency-specific). All process guidance, no prediction.
  const closingAvoid = [
    primaryLanguage.avoid[0] as string,
    primaryLanguage.avoid[1] as string,
    cautionRanges.length > 0 ? '在观察日急于给关系或结果定性' : (primaryLanguage.avoid[2] as string),
  ];
  const reviewPrompts = [
    '本期我最想推进的是什么？',
    primaryLanguage.review,
    '我做得好的是什么？可以保持什么？',
  ];
  const concernInterpretations = input.activeTags
    .map((tag) => deriveConcernInterpretation({
      tag,
      dates: input.dates,
      cellsByDate: input.cellsByDate,
      rangeLabel,
    }))
    .sort((a, b) => attentionWeight(b.counts) - attentionWeight(a.counts));
  const basisItems = [
    `${rangeLabel} 内已生成 ${generatedDayCount}/30 日，覆盖 ${input.activeTags.length} 个激活关注。`,
    `主线来自 ${allCells.length} 条逐日关注结果的聚合，不使用分数、排名或趋势曲线。`,
    '已有事件记忆和未来计划只在被对应 Reading 引用或日期落入窗口时参与解读，不会被补写成未发生的事实。',
    '底层命理依据保留在生成链路与单日依据中，本页只展示可执行节奏。',
  ];
  return {
    range_label: rangeLabel,
    start_label: startLabel,
    end_label: endLabel,
    generated_day_count: generatedDayCount,
    active_tag_count: input.activeTags.length,
    primary,
    counts,
    day_series: daySeries,
    day_counts: dayCounts,
    mainline: {
      title: '30 日主线',
      window: rangeLabel,
      tagline: primaryLanguage.tagline,
      body: primaryLanguage.body,
    },
    phases: splitIntoPhases(input.dates, input.cellsByDate, rangeLabel),
    key_windows: keyWindows,
    context_windows: contextWindows,
    closing_avoid: closingAvoid,
    review_prompts: reviewPrompts,
    concern_interpretations: concernInterpretations,
    basis_items: basisItems,
  };
}
