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
  KeyWindowFeature,
  NianJingInflectionDriver,
  NianJingPhaseDriver,
  StageDriver,
  UncertaintyInput,
  YueJingTendencyDriver,
} from '../../../../domain/algorithm.ts';
import type { MirrorKind, MirrorScope } from '../../../../domain/mirror-scope.ts';
import { baziDomainTendency, baziPeriodNature } from './bazi-tendency.ts';

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

function buildNianJingDrivers(
  charts: readonly BaziSubjectChart[],
  scope: MirrorScope,
  activeConcernTags: readonly ConcernTag[],
): { phases: NianJingPhaseDriver[]; inflections: NianJingInflectionDriver[] } {
  if (scope.kind !== 'long_horizon') return { phases: [], inflections: [] };
  const phases: NianJingPhaseDriver[] = [];
  const inflections: NianJingInflectionDriver[] = [];
  const self = charts[0];
  if (!self) return { phases, inflections };
  const yong = self.interpretation?.yong_shen;
  const horizonEndMs = Date.parse(`${scope.end_date}T00:00:00Z`);
  // 大运 + 流年 markers only; 流月 belongs to 月镜 and would flood a 10-year timeline.
  const majorMarkers = self.cycle_snapshot.markers
    .filter((marker): marker is CycleMarker & { readonly kind: NianJingInflectionDriver['kind'] } =>
      marker.kind === 'dayun_boundary' || marker.kind === 'annual_transition')
    .sort((a, b) => Date.parse(a.start_utc) - Date.parse(b.start_utc));
  for (const tag of activeConcernTags) {
    for (let i = 0; i < majorMarkers.length; i += 1) {
      const marker = majorMarkers[i]!;
      const markerDate = marker.start_utc.slice(0, 10);
      const markerStartMs = Date.parse(`${markerDate}T00:00:00Z`);
      const nextMarker = majorMarkers[i + 1];
      const nextMarkerStartMs = nextMarker ? Date.parse(`${nextMarker.start_utc.slice(0, 10)}T00:00:00Z`) : Number.POSITIVE_INFINITY;
      const phaseEndMs = Math.min(horizonEndMs, markerStartMs + 89 * 24 * 60 * 60 * 1000, nextMarkerStartMs - 24 * 60 * 60 * 1000);
      const phaseEndDate = new Date(phaseEndMs).toISOString().slice(0, 10);
      if (phaseEndDate >= markerDate) {
        // Phase nature from the period's 流年/大运 element vs 用神 — not a blanket
        // 转折. Falls back to 'steady' only when 用神 or the period pillar is
        // unavailable (degraded chart), never to the degenerate all-'turning'.
        const periodNature = marker.pillar && yong ? baziPeriodNature(marker.pillar.stem, yong) : null;
        const driverRefs = [`bazi:${marker.kind}@${marker.start_utc}`];
        if (periodNature) driverRefs.push(`bazi:period.${periodNature.favor}@${periodNature.element}`);
        phases.push({
          concern_tag_ref: tag.id,
          start_date: markerDate,
          end_date: phaseEndDate,
          nature: periodNature ? periodNature.nature : 'steady',
          driver_refs: driverRefs,
        });
      }
      inflections.push({ concern_tag_ref: tag.id, date: markerDate, kind: marker.kind, driver_refs: [`bazi:${marker.kind}@${marker.start_utc}`] });
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
      ? buildNianJingDrivers(charts, input.mirror_scope, input.active_concern_tags)
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
