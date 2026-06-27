import type {
  NianJingInflectionPoint,
  NianJingMirrorOutput,
  NianJingNature,
  NianJingPhaseBand,
} from '../../../domain/mirror-output.ts';
import {
  buildNianJingDriverGuidance,
  type NianJingDriverGuidance,
} from '../../astrology/nianjing-driver-copy.ts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const NATURE_SEVERITY: Record<NianJingNature, number> = {
  blocked: 4,
  turning: 3,
  watch: 2,
  supportive: 1,
  steady: 0,
};

export interface NianJingYearConcernTag {
  readonly id: string;
  readonly label: string;
}

export interface NianJingYearSegment {
  readonly band: NianJingPhaseBand;
  readonly start_date: string;
  readonly end_date: string;
  readonly nature: NianJingNature;
  readonly day_count: number;
  readonly is_current: boolean;
}

export interface NianJingYearCell {
  readonly concern_tag_ref: string;
  readonly label: string;
  readonly year: number;
  readonly is_current_year: boolean;
  readonly primary_nature: NianJingNature | null;
  readonly primary_segment: NianJingYearSegment | null;
  readonly segments: readonly NianJingYearSegment[];
  readonly inflections: readonly NianJingInflectionPoint[];
}

export interface NianJingYearModule {
  readonly year: number;
  readonly start_date: string;
  readonly end_date: string;
  readonly is_current_year: boolean;
  readonly cells: readonly NianJingYearCell[];
}

export interface NianJingAnnualOverviewYear {
  readonly year: number;
  readonly start_date: string;
  readonly end_date: string;
  readonly is_current_year: boolean;
  readonly primary_nature: NianJingNature | null;
  readonly primary_cell: NianJingYearCell | null;
  readonly inflections: readonly NianJingInflectionPoint[];
}

export interface NianJingSelectedYearMonthMarker {
  readonly month: number;
  readonly date: string;
  readonly kind: NianJingInflectionPoint['kind'];
  readonly inflection: NianJingInflectionPoint;
}

export interface NianJingSelectedYearConcernCard {
  readonly concern_tag_ref: string;
  readonly label: string;
  readonly year: number;
  readonly primary_nature: NianJingNature | null;
  readonly primary_segment: NianJingYearSegment | null;
  readonly primary_summary: string;
  readonly driver_guidance: NianJingDriverGuidance;
  readonly segments: readonly NianJingYearSegment[];
  readonly month_markers: readonly NianJingSelectedYearMonthMarker[];
}

export interface NianJingSelectedYearBasisItem {
  readonly kind: 'phase_band' | NianJingInflectionPoint['kind'];
  readonly count: number;
  readonly dates: readonly string[];
  readonly summaries: readonly string[];
}

export interface NianJingSelectedYearDetail {
  readonly year: number;
  readonly start_date: string;
  readonly end_date: string;
  readonly is_current_year: boolean;
  readonly primary_nature: NianJingNature | null;
  readonly primary_concern_tag_ref: string | null;
  readonly concern_cards: readonly NianJingSelectedYearConcernCard[];
  readonly basis_items: readonly NianJingSelectedYearBasisItem[];
}

export interface BuildNianJingYearModulesInput {
  readonly output: NianJingMirrorOutput;
  readonly active_concern_tags: readonly NianJingYearConcernTag[];
  readonly today: string;
}

function dateMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

function yearStart(year: number): string {
  return `${year}-01-01`;
}

function yearEnd(year: number): string {
  return `${year}-12-31`;
}

function maxDate(a: string, b: string): string {
  return dateMs(a) >= dateMs(b) ? a : b;
}

function minDate(a: string, b: string): string {
  return dateMs(a) <= dateMs(b) ? a : b;
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return dateMs(startA) <= dateMs(endB) && dateMs(startB) <= dateMs(endA);
}

function includesDate(start: string, end: string, date: string): boolean {
  return dateMs(start) <= dateMs(date) && dateMs(date) <= dateMs(end);
}

function inclusiveDayCount(start: string, end: string): number {
  return Math.max(1, Math.round((dateMs(end) - dateMs(start)) / MS_PER_DAY) + 1);
}

function primarySegmentFor(
  segments: readonly NianJingYearSegment[],
): NianJingYearSegment | null {
  const current = segments.find((segment) => segment.is_current);
  if (current) return current;
  let best: NianJingYearSegment | null = null;
  for (const segment of segments) {
    if (!best) {
      best = segment;
      continue;
    }
    if (segment.day_count > best.day_count) {
      best = segment;
      continue;
    }
    if (
      segment.day_count === best.day_count &&
      NATURE_SEVERITY[segment.nature] > NATURE_SEVERITY[best.nature]
    ) {
      best = segment;
    }
  }
  return best;
}

function buildSegmentsForYear(input: {
  readonly bands: readonly NianJingPhaseBand[];
  readonly yearStartDate: string;
  readonly yearEndDate: string;
  readonly today: string;
}): readonly NianJingYearSegment[] {
  return input.bands
    .filter((band) =>
      overlaps(band.start_date, band.end_date, input.yearStartDate, input.yearEndDate),
    )
    .map((band) => {
      const startDate = maxDate(band.start_date, input.yearStartDate);
      const endDate = minDate(band.end_date, input.yearEndDate);
      return {
        band,
        start_date: startDate,
        end_date: endDate,
        nature: band.nature,
        day_count: inclusiveDayCount(startDate, endDate),
        is_current: includesDate(startDate, endDate, input.today),
      };
    })
    .sort((a, b) => dateMs(a.start_date) - dateMs(b.start_date));
}

export function buildNianJingYearModules(
  input: BuildNianJingYearModulesInput,
): readonly NianJingYearModule[] {
  const startYear = yearOf(input.output.horizon.start_date);
  const endYear = yearOf(input.output.horizon.end_date);
  const todayYear = yearOf(input.today);
  const modules: NianJingYearModule[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    const moduleStart = maxDate(yearStart(year), input.output.horizon.start_date);
    const moduleEnd = minDate(yearEnd(year), input.output.horizon.end_date);
    if (dateMs(moduleStart) > dateMs(moduleEnd)) continue;

    const isCurrentYear = year === todayYear;
    modules.push({
      year,
      start_date: moduleStart,
      end_date: moduleEnd,
      is_current_year: isCurrentYear,
      cells: input.active_concern_tags.map((tag) => {
        const bands = input.output.phase_bands.filter(
          (band) => band.concern_tag_ref === tag.id,
        );
        const segments = buildSegmentsForYear({
          bands,
          yearStartDate: moduleStart,
          yearEndDate: moduleEnd,
          today: input.today,
        });
        const inflections = input.output.inflection_points
          .filter(
            (inflection) =>
              inflection.concern_tag_ref === tag.id &&
              includesDate(moduleStart, moduleEnd, inflection.date),
          )
          .sort((a, b) => dateMs(a.date) - dateMs(b.date));

        const primarySegment = primarySegmentFor(segments);

        return {
          concern_tag_ref: tag.id,
          label: tag.label,
          year,
          is_current_year: isCurrentYear,
          primary_nature: primarySegment?.nature ?? null,
          primary_segment: primarySegment,
          segments,
          inflections,
        };
      }),
    });
  }

  return modules;
}

export function nianjingYearSegmentFlex(segment: NianJingYearSegment): string {
  return String(segment.day_count);
}

function dominantNatureForYear(
  cells: readonly NianJingYearCell[],
): NianJingNature | null {
  const totals = new Map<NianJingNature, number>();
  for (const cell of cells) {
    for (const segment of cell.segments) {
      totals.set(segment.nature, (totals.get(segment.nature) ?? 0) + segment.day_count);
    }
  }

  let best: NianJingNature | null = null;
  let bestDays = -1;
  for (const [nature, days] of totals) {
    if (
      days > bestDays ||
      (days === bestDays && best !== null && NATURE_SEVERITY[nature] > NATURE_SEVERITY[best])
    ) {
      best = nature;
      bestDays = days;
    }
  }
  return best;
}

function cellDaysForNature(cell: NianJingYearCell, nature: NianJingNature): number {
  return cell.segments
    .filter((segment) => segment.nature === nature)
    .reduce((total, segment) => total + segment.day_count, 0);
}

function primaryCellForNature(
  cells: readonly NianJingYearCell[],
  nature: NianJingNature | null,
): NianJingYearCell | null {
  if (!nature) return null;

  let best: NianJingYearCell | null = null;
  let bestDays = -1;
  for (const cell of cells) {
    const days = cellDaysForNature(cell, nature);
    if (days <= 0) continue;
    if (days > bestDays) {
      best = cell;
      bestDays = days;
      continue;
    }
    if (
      days === bestDays &&
      cell.primary_segment?.is_current &&
      !best?.primary_segment?.is_current
    ) {
      best = cell;
    }
  }

  return best;
}

export function buildNianJingAnnualOverview(
  modules: readonly NianJingYearModule[],
): readonly NianJingAnnualOverviewYear[] {
  return modules.map((module) => {
    const primaryNature = dominantNatureForYear(module.cells);
    return {
      year: module.year,
      start_date: module.start_date,
      end_date: module.end_date,
      is_current_year: module.is_current_year,
      primary_nature: primaryNature,
      primary_cell: primaryCellForNature(module.cells, primaryNature),
      inflections: module.cells
        .flatMap((cell) => cell.inflections)
        .sort((a, b) => dateMs(a.date) - dateMs(b.date)),
    };
  });
}

export function buildNianJingSelectedYearDetail(input: {
  readonly module: NianJingYearModule;
  readonly active_concern_tags: readonly NianJingYearConcernTag[];
}): NianJingSelectedYearDetail {
  const tagsById = new Map(input.active_concern_tags.map((tag) => [tag.id, tag]));
  const primaryNature = dominantNatureForYear(input.module.cells);
  const primaryCell = primaryCellForNature(input.module.cells, primaryNature);
  const allSegments = input.module.cells.flatMap((cell) => cell.segments);
  const allInflections = input.module.cells.flatMap((cell) => cell.inflections);
  const inflectionsByKind = new Map<NianJingInflectionPoint['kind'], NianJingInflectionPoint[]>();

  for (const inflection of allInflections) {
    const bucket = inflectionsByKind.get(inflection.kind);
    if (bucket) bucket.push(inflection);
    else inflectionsByKind.set(inflection.kind, [inflection]);
  }

  const concernCards: NianJingSelectedYearConcernCard[] = input.module.cells.map((cell) => {
    const tag = tagsById.get(cell.concern_tag_ref);
    const primarySummary =
      cell.primary_segment?.band.summary ??
      cell.primary_segment?.band.driver_refs[0] ??
      '';
    const driverGuidance = buildNianJingDriverGuidance({
      nature: cell.primary_nature,
      driver_refs: cell.primary_segment?.band.driver_refs ?? [],
    });
    return {
      concern_tag_ref: cell.concern_tag_ref,
      label: tag?.label ?? cell.label,
      year: cell.year,
      primary_nature: cell.primary_nature,
      primary_segment: cell.primary_segment,
      primary_summary: primarySummary,
      driver_guidance: driverGuidance,
      segments: cell.segments,
      month_markers: cell.inflections.map((inflection) => ({
        month: monthOf(inflection.date),
        date: inflection.date,
        kind: inflection.kind,
        inflection,
      })),
    };
  });

  const basisItems: NianJingSelectedYearBasisItem[] = [];
  if (allSegments.length > 0) {
    basisItems.push({
      kind: 'phase_band',
      count: allSegments.length,
      dates: [...new Set(allSegments.map((segment) => segment.start_date))],
      summaries: allSegments
        .map((segment) => segment.band.summary)
        .filter((summary) => summary.length > 0),
    });
  }
  for (const [kind, inflections] of inflectionsByKind) {
    basisItems.push({
      kind,
      count: inflections.length,
      dates: inflections.map((inflection) => inflection.date),
      summaries: inflections
        .map((inflection) => inflection.summary)
        .filter((summary) => summary.length > 0),
    });
  }

  return {
    year: input.module.year,
    start_date: input.module.start_date,
    end_date: input.module.end_date,
    is_current_year: input.module.is_current_year,
    primary_nature: primaryNature,
    primary_concern_tag_ref: primaryCell?.concern_tag_ref ?? null,
    concern_cards: concernCards,
    basis_items: basisItems,
  };
}
