// YueJing 30-day presentation derivation; no report entity or driver internals.

import type { ConcernTag } from '../../domain/concern-tag.ts';
import type { EventMemory } from '../../domain/event-memory.ts';
import type { YueJingCell, TendencyClass } from '../../domain/mirror-output.ts';
import type { PlanItem } from '../../domain/plan-item.ts';
import { trimmedConcernLabel as yuejingTagLabel } from '../concern-tags/concern-presets.ts';
import type { YueJingDayTendency, YueJingMonthActionItem, YueJingMonthConcernInterpretation, YueJingMonthDateRange, YueJingMonthInterpretation, YueJingMonthKeyWindow, YueJingMonthPhase, YueJingTendencyCounts } from './yuejing/yuejing-month-types.ts';
import { YUEJING_TENDENCY_SEVERITY, countYueJingTendencies, emptyYueJingTendencyCounts, primaryYueJingTendencyFromCounts } from './yuejing/yuejing-month-tendency.ts';
import type { ConcernAction, ConcernLanguage, PhaseArcRole, YueJingMonthLanguageCopy } from '../i18n/schema/yuejing-language.ts';

export type {
  YueJingMonthActionItem,
  YueJingMonthDateRange,
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

export function deriveYueJingMonthInterpretation(input: {
  readonly dates: readonly string[];
  readonly cellsByDate: ReadonlyMap<string, readonly YueJingCell[]>;
  readonly activeTags: readonly ConcernTag[];
  readonly eventMemories?: readonly EventMemory[];
  readonly planItems?: readonly PlanItem[];
}, copy: YueJingMonthLanguageCopy): YueJingMonthInterpretation {
  const TENDENCY_LANGUAGE = copy.tendency;
  const PHASE_ARC = copy.phases;
  const KEY_WINDOW_BRIEF = copy.brief;
  const CONCERN_LANGUAGE_BY_LABEL = copy.concernByLabel;
  const GENERIC_CONCERN_LANGUAGE = copy.genericConcern;
  const CONCERN_ACTION_BY_LABEL = copy.actionByLabel;
  const GENERIC_CONCERN_ACTION = copy.genericAction;

  function shortMonthDay(dateStr: string): string {
    const [, m, d] = dateStr.split('-');
    return copy.date(Number(m), Number(d));
  }

  function slashMonthDay(dateStr: string): string {
    const [, m, d] = dateStr.split('-');
    return `${Number(m)}/${Number(d)}`;
  }

  function compactYueJingDateRangeLabel(startDate: string, endDate: string): string {
    if (startDate === endDate) return shortMonthDay(startDate);
    return `${shortMonthDay(startDate)}–${shortMonthDay(endDate)}`;
  }

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

  function contiguousDateRangeSegments(
    cells: readonly YueJingCell[],
    dates: readonly string[],
    predicate: (cell: YueJingCell) => boolean,
  ): YueJingMonthDateRange[] {
    const dateIndex = new Map(dates.map((date, index) => [date, index] as const));
    const selected = cells
      .filter(predicate)
      .map((cell) => cell.date)
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort((a, b) => (dateIndex.get(a) ?? 0) - (dateIndex.get(b) ?? 0));
    const ranges: YueJingMonthDateRange[] = [];
    let start: string | null = null;
    let previous: string | null = null;
    let rangeDates: string[] = [];
    for (const date of selected) {
      if (!start || !previous) {
        start = date;
        previous = date;
        rangeDates = [date];
        continue;
      }
      if ((dateIndex.get(date) ?? -1) === (dateIndex.get(previous) ?? -3) + 1) {
        previous = date;
        rangeDates.push(date);
        continue;
      }
      ranges.push({
        label: compactYueJingDateRangeLabel(start, previous),
        start_date: start,
        end_date: previous,
        dates: rangeDates,
      });
      start = date;
      previous = date;
      rangeDates = [date];
    }
    if (start && previous) {
      ranges.push({
        label: compactYueJingDateRangeLabel(start, previous),
        start_date: start,
        end_date: previous,
        dates: rangeDates,
      });
    }
    return ranges;
  }

  function contiguousDateRanges(
    cells: readonly YueJingCell[],
    dates: readonly string[],
    predicate: (cell: YueJingCell) => boolean,
  ): string[] {
    return contiguousDateRangeSegments(cells, dates, predicate).map((range) => range.label);
  }

  function limitedRangeText(ranges: readonly string[], fallback: string): string {
    if (ranges.length === 0) return fallback;
    return copy.labels.rangeList(ranges.slice(0, 3), ranges.length > 3);
  }

  function limitedDateRangeSegments(
    segments: readonly YueJingMonthDateRange[],
    fallback: YueJingMonthDateRange,
  ): readonly YueJingMonthDateRange[] {
    return (segments.length > 0 ? segments : [fallback]).slice(0, 3);
  }

  function dateRangeText(
    segments: readonly YueJingMonthDateRange[],
    fallback: YueJingMonthDateRange,
  ): string {
    return limitedRangeText(limitedDateRangeSegments(segments, fallback).map((range) => range.label), fallback.label);
  }

  function flattenRangeDates(segments: readonly YueJingMonthDateRange[]): string[] {
    return segments.flatMap((range) => [...range.dates]);
  }

  function selectedDateRangeSegment(
    segments: readonly YueJingMonthDateRange[],
    index: number,
  ): readonly YueJingMonthDateRange[] {
    const segment = segments[index] ?? segments[0];
    return segment ? [segment] : [];
  }

  function fullWindowRange(dates: readonly string[], rangeLabel: string): YueJingMonthDateRange {
    const firstDate = dates[0] ?? '';
    const lastDate = dates[dates.length - 1] ?? firstDate;
    return {
      label: rangeLabel,
      start_date: firstDate,
      end_date: lastDate,
      dates: [...dates],
    };
  }

  function singleDateRangeForDates(dates: readonly string[], fallbackLabel: string): YueJingMonthDateRange {
    if (dates.length === 0) return fullWindowRange(dates, fallbackLabel);
    return fullWindowRange(
      dates,
      compactYueJingDateRangeLabel(dates[0] as string, dates[dates.length - 1] as string),
    );
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

  function rangeSegmentsForTendency(
    cells: readonly YueJingCell[],
    dates: readonly string[],
    tendency: TendencyClass,
  ): YueJingMonthDateRange[] {
    return contiguousDateRangeSegments(cells, dates, (cell) => cell.tendency_class === tendency);
  }

  function countGeneratedDates(
    dates: readonly string[],
    cellsByDate: ReadonlyMap<string, readonly YueJingCell[]>,
  ): number {
    return dates.filter((date) => (cellsByDate.get(date) ?? []).length > 0).length;
  }

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
        title: copy.labels.phase,
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
        title: copy.labels.phaseNumber(i + 1),
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
    dateRanges: readonly YueJingMonthDateRange[],
    fallbackRange: YueJingMonthDateRange,
    tendency: TendencyClass | undefined,
    brief: string,
    suitable: string,
    unsuitable: string,
  ): YueJingMonthKeyWindow {
    const visibleRanges = limitedDateRangeSegments(dateRanges, fallbackRange);
    return {
      title,
      window: dateRangeText(dateRanges, fallbackRange),
      date_ranges: visibleRanges,
      target_dates: flattenRangeDates(visibleRanges),
      tendency,
      brief,
      suitable,
      unsuitable,
    };
  }

  function concernLanguageFor(tag: ConcernTag): ConcernLanguage {
    const label = yuejingTagLabel(tag);
    return CONCERN_LANGUAGE_BY_LABEL[label] ?? GENERIC_CONCERN_LANGUAGE;
  }

  function concernActionFor(tag: ConcernTag): ConcernAction {
    const label = yuejingTagLabel(tag);
    return CONCERN_ACTION_BY_LABEL[label] ?? GENERIC_CONCERN_ACTION;
  }

  function actionItemsForConcern(input: {
    readonly action: ConcernAction;
    readonly primary_segments: readonly YueJingMonthDateRange[];
    readonly supportive_segments: readonly YueJingMonthDateRange[];
    readonly watch_segments: readonly YueJingMonthDateRange[];
    readonly turning_segments: readonly YueJingMonthDateRange[];
    readonly after_opening_segments: readonly YueJingMonthDateRange[];
    readonly fallback_range: YueJingMonthDateRange;
  }): YueJingMonthActionItem[] {
    return input.action.actions.map((action) => {
      const segments =
        action.source === 'primary' ? input.primary_segments
          : action.source === 'supportive' ? input.supportive_segments
            : action.source === 'caution' ? input.watch_segments
              : action.source === 'after_opening' ? input.after_opening_segments
                : action.source === 'first_supportive' ? selectedDateRangeSegment(input.supportive_segments, 0)
                  : action.source === 'middle_watch' ? selectedDateRangeSegment(input.watch_segments, 1)
                    : action.source === 'middle_turning' ? selectedDateRangeSegment(input.turning_segments, 1)
                      : input.turning_segments;
      const visibleRanges = limitedDateRangeSegments(segments, input.fallback_range);
      return {
        window: dateRangeText(segments, input.fallback_range),
        label: action.label,
        target_dates: flattenRangeDates(visibleRanges),
      };
    });
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
    const primarySegments = rangeSegmentsForTendency(cells, input.dates, primary);
    const supportiveSegments = rangeSegmentsForTendency(cells, input.dates, 'supportive');
    const watchSegments = rangeSegmentsForTendency(cells, input.dates, 'watch');
    const turningSegments = rangeSegmentsForTendency(cells, input.dates, 'turning');
    const blockedRanges = rangesForTendency(cells, input.dates, 'blocked');
    const fallbackRange = fullWindowRange(input.dates, input.rangeLabel);
    const afterOpeningDates = input.dates.slice(Math.min(3, input.dates.length));
    const afterOpeningSegments = afterOpeningDates.length > 0
      ? [singleDateRangeForDates(afterOpeningDates, input.rangeLabel)]
      : primarySegments;
    const actionWindow = limitedRangeText(primaryRanges, input.rangeLabel);
    const actionItems = actionItemsForConcern({
      action: concernAction,
      primary_segments: primarySegments,
      supportive_segments: supportiveSegments,
      watch_segments: watchSegments,
      turning_segments: turningSegments,
      after_opening_segments: afterOpeningSegments,
      fallback_range: fallbackRange,
    });
    const keyWindows = [
      keyWindow(
        copy.labels.push,
        supportiveSegments,
        fallbackRange,
        'supportive',
        language.supportive,
        language.supportive,
        copy.labels.pushCaution,
      ),
      keyWindow(
        copy.labels.watch,
        watchSegments,
        fallbackRange,
        'watch',
        language.watch,
        language.watch,
        copy.labels.watchCaution,
      ),
      keyWindow(
        copy.labels.turn,
        turningSegments,
        fallbackRange,
        'turning',
        language.turning,
        language.turning,
        copy.labels.turnCaution,
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
          : copy.labels.missingConcern,
        unsuitable: blockedRanges.length > 0
          ? copy.labels.blockedRange(TENDENCY_LANGUAGE[primary].unsuitable, limitedRangeText(blockedRanges, input.rangeLabel))
          : TENDENCY_LANGUAGE[primary].unsuitable,
      },
      key_windows: keyWindows,
      action_items: actionItems,
      reminders: concernAction.reminders,
      checklist: actionItems.map((item) => `${item.window}：${item.label}`),
      counts,
      detail_examples: meaningfulCellDetails(cells),
    };
  }

  const hasDates = input.dates.length > 0;
  const firstDate = hasDates ? (input.dates[0] as string) : '';
  const lastDate = hasDates ? (input.dates[input.dates.length - 1] as string) : '';
  const rangeLabel = hasDates ? compactYueJingDateRangeLabel(firstDate, lastDate) : copy.labels.currentWindow;
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
  const supportiveSegments = rangeSegmentsForTendency(allCells, input.dates, 'supportive');
  const watchSegments = rangeSegmentsForTendency(allCells, input.dates, 'watch');
  const turningSegments = rangeSegmentsForTendency(allCells, input.dates, 'turning');
  const fallbackRange = fullWindowRange(input.dates, rangeLabel);
  const keyWindows: YueJingMonthKeyWindow[] = [
    keyWindow(
      copy.labels.pushWindow,
      supportiveSegments,
      fallbackRange,
      'supportive',
      KEY_WINDOW_BRIEF.push,
      TENDENCY_LANGUAGE.supportive.suitable,
      TENDENCY_LANGUAGE.supportive.unsuitable,
    ),
    keyWindow(
      copy.labels.watchWindow,
      watchSegments,
      fallbackRange,
      'watch',
      KEY_WINDOW_BRIEF.slow,
      TENDENCY_LANGUAGE.watch.suitable,
      TENDENCY_LANGUAGE.watch.unsuitable,
    ),
    keyWindow(
      copy.labels.turnWindow,
      turningSegments,
      fallbackRange,
      'turning',
      KEY_WINDOW_BRIEF.turn,
      TENDENCY_LANGUAGE.turning.suitable,
      TENDENCY_LANGUAGE.turning.unsuitable,
    ),
  ];
  const concernInterpretations = input.activeTags
    .map((tag) => deriveConcernInterpretation({
      tag,
      dates: input.dates,
      cellsByDate: input.cellsByDate,
      rangeLabel,
    }))
    .sort((a, b) => attentionWeight(b.counts) - attentionWeight(a.counts));
  const basisItems = copy.labels.basis(rangeLabel, generatedDayCount, input.activeTags.length, allCells.length);
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
      title: copy.labels.mainline,
      window: rangeLabel,
      tagline: primaryLanguage.tagline,
      body: primaryLanguage.body,
      best_for: primaryLanguage.best_for,
      avoid_tags: primaryLanguage.avoid_tags,
    },
    phases: splitIntoPhases(input.dates, input.cellsByDate, rangeLabel),
    key_windows: keyWindows,
    concern_interpretations: concernInterpretations,
    basis_items: basisItems,
  };
}
