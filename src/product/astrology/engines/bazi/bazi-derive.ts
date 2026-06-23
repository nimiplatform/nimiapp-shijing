// SJG-ALGO-08/09/11/15 — project the BaZi chart onto the algorithm-agnostic
// common driver surface. Dated tendency (rijing/yuejing) is 用神-driven
// (bazi-tendency.ts); stage labels, key windows, and NianJing phase/inflection
// bands are derived from the cycle markers.

import type { ConcernTag } from '../../../../domain/concern-tag.ts';
import type { CalculationSex } from '../../../../domain/person.ts';
import type {
  BaziEvidence,
  BaziSubjectChart,
  CommonDrivers,
  CycleMarker,
  HeavenlyStem,
  KeyWindowFeature,
  NianJingInflectionDriver,
  NianJingPhaseDriver,
  StageDriver,
  UncertaintyInput,
  YueJingTendencyDriver,
  YongShen,
} from '../../../../domain/algorithm.ts';
import type { MirrorKind, MirrorScope } from '../../../../domain/mirror-scope.ts';
import { baziDomainPeriodNature, baziDomainTendency } from './bazi-tendency.ts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NIANJING_CLUSTER_WINDOW_DAYS = 45;

const MARKER_TO_STAGE: Readonly<Record<string, StageDriver['stage_label']>> = {
  dayun_boundary: '转时',
  annual_transition: '转时',
  monthly_transition: '转时',
  clash: '转时',
  combination: '养时',
  storage: '收时',
  constraint: '收时',
  output: '进时',
  wealth: '进时',
  resource: '养时',
};

function buildStageDrivers(markers: readonly CycleMarker[]): StageDriver[] {
  const drivers: StageDriver[] = [];
  for (const marker of markers) {
    const stage = MARKER_TO_STAGE[marker.kind];
    if (!stage) continue;
    drivers.push({
      stage_label: stage,
      marker_refs: [`bazi:${marker.kind}@${marker.start_utc}`],
      explanation_key: `marker.${marker.kind}.${marker.source}`,
    });
  }
  return drivers;
}

function buildKeyWindows(charts: readonly BaziSubjectChart[]): KeyWindowFeature[] {
  const features: KeyWindowFeature[] = [];
  for (const subject of charts) {
    for (const marker of subject.cycle_snapshot.markers) {
      if (marker.kind === 'annual_transition' || marker.kind === 'dayun_boundary') {
        features.push({ start_utc: marker.start_utc, end_utc: marker.end_utc, label: 'transition', driver_refs: [`bazi:${marker.kind}@${marker.start_utc}`], subject_refs: marker.subject_refs });
      } else if (marker.kind === 'monthly_transition') {
        features.push({ start_utc: marker.start_utc, end_utc: marker.end_utc, label: 'support', driver_refs: [`bazi:${marker.kind}@${marker.start_utc}`], subject_refs: marker.subject_refs });
      }
    }
  }
  return features;
}

// 用神-driven per-concern dated tendency for the generated date (rijing: the
// daily scope date; yuejing: the rolling scope start_date).
function buildDatedTendencyDrivers(
  self: BaziSubjectChart,
  scope: MirrorScope,
  mirrorKind: MirrorKind,
  concernTags: readonly ConcernTag[],
  calculationSex: CalculationSex,
): YueJingTendencyDriver[] {
  const date =
    mirrorKind === 'rijing' && scope.kind === 'daily' ? scope.date
      : mirrorKind === 'yuejing' && scope.kind === 'rolling_30_day' ? scope.start_date
        : null;
  if (!date) return [];
  const natalDay = self.natal_chart.day_pillar;
  const monthBranch = self.natal_chart.month_pillar?.branch;
  const yong = self.interpretation?.yong_shen;
  if (!natalDay || !monthBranch || !yong) return [];

  const transit = self.cycle_snapshot.daily_pillars.find((p) => p.start_utc.slice(0, 10) === date);
  if (!transit) return [];
  const marker = self.cycle_snapshot.markers.find((m) => m.start_utc.slice(0, 10) === date);

  return concernTags.map((tag) => {
    const { tendency, driverRefs } = baziDomainTendency({
      tag,
      yong,
      transitDayPillar: transit.pillar,
      natalDayBranch: natalDay.branch,
      dayMaster: natalDay.stem,
      monthBranch,
      marker,
      calculationSex,
      dateLabel: date,
    });
    return { date, concern_tag_ref: tag.id, tendency_class: tendency, driver_refs: driverRefs };
  });
}

type BaziMajorNianjingMarker = CycleMarker & {
  readonly kind: 'dayun_boundary' | 'annual_transition';
};

interface BaziInflectionProjection {
  readonly date: string;
  readonly date_window?: { readonly start_date: string; readonly end_date: string };
  readonly kind: NianJingInflectionDriver['kind'];
  readonly driver_refs: readonly string[];
}

function markerDate(marker: CycleMarker): string {
  return marker.start_utc.slice(0, 10);
}

function markerStartMs(marker: CycleMarker): number {
  return Date.parse(`${markerDate(marker)}T00:00:00Z`);
}

function markerDriverRef(marker: CycleMarker): string {
  return `bazi:${marker.kind}@${marker.start_utc}`;
}

function withPeriodNatureRef(
  refs: readonly string[],
  tag: ConcernTag,
  marker: Pick<CycleMarker, 'pillar'>,
  yong: YongShen | undefined,
  dayMaster: HeavenlyStem | undefined,
  calculationSex: CalculationSex,
): { readonly nature: NianJingPhaseDriver['nature']; readonly driver_refs: string[] } {
  const periodNature = marker.pillar && yong && dayMaster
    ? baziDomainPeriodNature({
        tag,
        yong,
        periodStem: marker.pillar.stem,
        dayMaster,
        calculationSex,
      })
    : null;
  const driverRefs = [...refs];
  if (periodNature) {
    driverRefs.push(
      `bazi:period.${periodNature.favor}@${periodNature.element}`,
      `bazi:domain.${periodNature.domain}`,
      `bazi:tenGod.${periodNature.ten_god}`,
      `bazi:domain_relevance.${periodNature.relevant ? 'focused' : 'background'}`,
    );
  }
  return { nature: periodNature ? periodNature.nature : 'steady', driver_refs: driverRefs };
}

function buildInflectionProjections(
  majorMarkers: readonly BaziMajorNianjingMarker[],
): BaziInflectionProjection[] {
  const projections: BaziInflectionProjection[] = [];
  for (let i = 0; i < majorMarkers.length; i += 1) {
    const marker = majorMarkers[i]!;
    const next = majorMarkers[i + 1];
    const sameShortWindow =
      next &&
      marker.kind !== next.kind &&
      Math.abs(markerStartMs(next) - markerStartMs(marker)) <=
        NIANJING_CLUSTER_WINDOW_DAYS * MS_PER_DAY;

    if (sameShortWindow) {
      const startDate = markerDate(marker);
      const endDate = markerDate(next);
      projections.push({
        date: startDate,
        date_window: { start_date: startDate, end_date: endDate },
        kind: 'marker_cluster',
        driver_refs: [markerDriverRef(marker), markerDriverRef(next)],
      });
      i += 1;
      continue;
    }

    projections.push({
      date: markerDate(marker),
      kind: marker.kind,
      driver_refs: [markerDriverRef(marker)],
    });
  }
  return projections;
}

function buildNianJingDrivers(
  charts: readonly BaziSubjectChart[],
  scope: MirrorScope,
  activeConcernTags: readonly ConcernTag[],
  calculationSex: CalculationSex,
): { phases: NianJingPhaseDriver[]; inflections: NianJingInflectionDriver[] } {
  if (scope.kind !== 'long_horizon') return { phases: [], inflections: [] };
  const phases: NianJingPhaseDriver[] = [];
  const inflections: NianJingInflectionDriver[] = [];
  const self = charts[0];
  if (!self) return { phases, inflections };
  const yong = self.interpretation?.yong_shen;
  const dayMaster = self.natal_chart.day_pillar?.stem;
  const horizonStartMs = Date.parse(`${scope.start_date}T00:00:00Z`);
  const horizonEndMs = Date.parse(`${scope.end_date}T00:00:00Z`);
  // 大运 + 流年 markers only; 流月 belongs to 月镜 and would flood a 10-year timeline.
  const majorMarkers = self.cycle_snapshot.markers
    .filter((marker): marker is BaziMajorNianjingMarker =>
      marker.kind === 'dayun_boundary' || marker.kind === 'annual_transition')
    .sort((a, b) => Date.parse(a.start_utc) - Date.parse(b.start_utc));
  const inflectionProjections = buildInflectionProjections(majorMarkers);
  for (const tag of activeConcernTags) {
    const firstMarker = majorMarkers[0];
    if (firstMarker && self.cycle_snapshot.annual_pillar) {
      const firstMarkerStartMs = markerStartMs(firstMarker);
      const leadingPhaseEndMs = firstMarkerStartMs - MS_PER_DAY;
      if (Number.isFinite(horizonStartMs) && leadingPhaseEndMs >= horizonStartMs) {
        const nature = withPeriodNatureRef(
          [`bazi:annual_context@${scope.start_date}`],
          tag,
          { pillar: self.cycle_snapshot.annual_pillar },
          yong,
          dayMaster,
          calculationSex,
        );
        phases.push({
          concern_tag_ref: tag.id,
          start_date: scope.start_date,
          end_date: new Date(leadingPhaseEndMs).toISOString().slice(0, 10),
          nature: nature.nature,
          driver_refs: nature.driver_refs,
        });
      }
    }

    for (let i = 0; i < majorMarkers.length; i += 1) {
      const marker = majorMarkers[i]!;
      const date = markerDate(marker);
      const nextMarker = majorMarkers[i + 1];
      const nextMarkerStartMs = nextMarker ? markerStartMs(nextMarker) : Number.POSITIVE_INFINITY;
      const phaseEndMs = Math.min(horizonEndMs, nextMarkerStartMs - MS_PER_DAY);
      const phaseEndDate = new Date(phaseEndMs).toISOString().slice(0, 10);
      if (phaseEndDate >= date) {
        // Phase nature from the period's 流年/大运 element vs 用神 — not a blanket
        // 转折. Falls back to 'steady' only when 用神 or the period pillar is
        // unavailable (degraded chart), never to the degenerate all-'turning'.
        const nature = withPeriodNatureRef([markerDriverRef(marker)], tag, marker, yong, dayMaster, calculationSex);
        phases.push({
          concern_tag_ref: tag.id,
          start_date: date,
          end_date: phaseEndDate,
          nature: nature.nature,
          driver_refs: nature.driver_refs,
        });
      }
    }
    for (const projection of inflectionProjections) {
      inflections.push({
        concern_tag_ref: tag.id,
        date: projection.date,
        ...(projection.date_window ? { date_window: { ...projection.date_window } } : {}),
        kind: projection.kind,
        driver_refs: [...projection.driver_refs],
      });
    }
  }
  return { phases, inflections };
}

export interface DeriveBaziCommonDriversInput {
  readonly evidence: BaziEvidence;
  readonly self_calculation_sex: CalculationSex;
  readonly base_uncertainty: readonly UncertaintyInput[];
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly active_concern_tags: readonly ConcernTag[];
}

export function deriveBaziCommonDrivers(input: DeriveBaziCommonDriversInput): CommonDrivers {
  const charts: BaziSubjectChart[] = [input.evidence.self_subject, ...input.evidence.related_persons];
  const allMarkers = charts.flatMap((c) => c.cycle_snapshot.markers);
  const datedTendencies =
    input.mirror_kind === 'rijing' || input.mirror_kind === 'yuejing'
      ? buildDatedTendencyDrivers(input.evidence.self_subject, input.mirror_scope, input.mirror_kind, input.active_concern_tags, input.self_calculation_sex)
      : [];
  const nianjing =
    input.mirror_kind === 'nianjing'
      ? buildNianJingDrivers(charts, input.mirror_scope, input.active_concern_tags, input.self_calculation_sex)
      : { phases: [], inflections: [] };
  return {
    stage_drivers: buildStageDrivers(allMarkers),
    key_windows: buildKeyWindows(charts),
    yuejing_tendency_drivers: datedTendencies,
    nianjing_phase_drivers: nianjing.phases,
    nianjing_inflection_drivers: nianjing.inflections,
    uncertainty_inputs: [...input.base_uncertainty],
  };
}
