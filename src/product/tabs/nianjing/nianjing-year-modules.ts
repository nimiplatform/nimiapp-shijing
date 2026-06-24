import type {
  NianJingInflectionPoint,
  NianJingMirrorOutput,
  NianJingNature,
  NianJingPhaseBand,
} from '../../../domain/mirror-output.ts';

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
