import type {
  CommonDrivers,
  QizhengSiyuEvidence,
  QizhengSiyuBody,
  QizhengSiyuBodyKey,
  QizhengSiyuSubjectChart,
  NianJingInflectionDriver,
  NianJingPhaseDriver,
  ShijingStageLabel,
  StageDriver,
  UncertaintyInput,
  YueJingTendencyDriver,
} from '../../../../domain/algorithm.ts';
import type { ConcernTag } from '../../../../domain/concern-tag.ts';
import type { MirrorKind, MirrorScope } from '../../../../domain/mirror-scope.ts';
import type { TendencyClass } from '../../../../domain/mirror-output.ts';
import { concernDomainFor, type ConcernDomain } from '../concern-domain.ts';
import {
  QIZHENG_POSITION_CLASS_STRONG,
  QIZHENG_POSITION_CLASS_SUCCEDENT,
} from './qizheng-siyu-chart.ts';

const DOMAIN_BODY: Readonly<Record<ConcernDomain, QizhengSiyuBodyKey>> = {
  love: 'taibai',
  career: 'taiyang',
  health: 'taiyin',
  wealth: 'chenxing',
  family: 'taiyin',
  general: 'taiyang',
};

function stageFromChart(chart: QizhengSiyuSubjectChart): ShijingStageLabel {
  const sun = chart.bodies.find((body) => body.key === 'taiyang');
  const moon = chart.bodies.find((body) => body.key === 'taiyin');
  const jupiter = chart.bodies.find((body) => body.key === 'suixing');
  const saturn = chart.bodies.find((body) => body.key === 'zhenxing');
  if (sun?.position_class === '七强' || jupiter?.position_class === '七强') return '进时';
  if (moon?.position_class === '七强') return '养时';
  if (saturn?.position_class === '七强') return '守时';
  return chart.chart_basis.day_night === 'day' ? '进时' : '收时';
}

function buildStageDrivers(chart: QizhengSiyuSubjectChart): StageDriver[] {
  const stage = stageFromChart(chart);
  return [
    {
      stage_label: stage,
      marker_refs: [`qizheng_siyu:natal.stage.${stage}`],
      explanation_key: `qizheng_siyu.natal.${stage}`,
    },
  ];
}

function bodyForConcern(chart: QizhengSiyuSubjectChart, tag: ConcernTag): QizhengSiyuBody | undefined {
  const domain = concernDomainFor(tag);
  const key = domain === 'general' && chart.chart_basis.day_night === 'night'
    ? 'taiyin'
    : DOMAIN_BODY[domain];
  return chart.bodies.find((body) => body.key === key) ?? chart.bodies.find((body) => body.key === 'taiyang');
}

function tendencyFromBody(body: QizhengSiyuBody): TendencyClass {
  if (body.position_class === QIZHENG_POSITION_CLASS_STRONG) return body.kind === 'siyu' ? 'turning' : 'supportive';
  if (body.position_class === QIZHENG_POSITION_CLASS_SUCCEDENT) return body.kind === 'siyu' ? 'watch' : 'steady';
  return body.kind === 'siyu' ? 'blocked' : 'watch';
}

function buildDatedTendencyDrivers(
  chart: QizhengSiyuSubjectChart | undefined,
  scope: MirrorScope,
  mirrorKind: MirrorKind,
  concernTags: readonly ConcernTag[],
): YueJingTendencyDriver[] {
  const date =
    mirrorKind === 'rijing' && scope.kind === 'daily'
      ? scope.date
      : mirrorKind === 'yuejing' && scope.kind === 'rolling_30_day'
        ? scope.start_date
        : null;
  if (!date) return [];
  if (!chart) return [];
  const scopeRef = scope.kind === 'rolling_30_day'
    ? 'qizheng_siyu:scope.rolling_30_day_start'
    : 'qizheng_siyu:scope.daily';
  return concernTags.flatMap((tag) => {
    const domain = concernDomainFor(tag);
    const body = bodyForConcern(chart, tag);
    if (!body) return [];
    return [{
      date,
      concern_tag_ref: tag.id,
      tendency_class: tendencyFromBody(body),
      driver_refs: [
        `qizheng_siyu:domain.${domain}`,
        `qizheng_siyu:body.${body.key}`,
        `qizheng_siyu:house.${body.house_name}`,
        `qizheng_siyu:position_class.${body.position_class}`,
        `qizheng_siyu:target_date.${date}`,
        scopeRef,
      ],
    }];
  });
}

function buildNianJingDrivers(
  chart: QizhengSiyuSubjectChart,
  scope: MirrorScope,
  concernTags: readonly ConcernTag[],
): { phases: NianJingPhaseDriver[]; inflections: NianJingInflectionDriver[] } {
  if (scope.kind !== 'long_horizon') return { phases: [], inflections: [] };
  const startYear = Number(scope.start_date.slice(0, 4));
  const endYear = Number(scope.end_date.slice(0, 4));
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear < startYear) {
    return { phases: [], inflections: [] };
  }

  const phases: NianJingPhaseDriver[] = [];
  const inflections: NianJingInflectionDriver[] = [];
  for (const tag of concernTags) {
    const domain = concernDomainFor(tag);
    const body = bodyForConcern(chart, tag);
    if (!body) continue;
    const evidenceRefs = [
      `qizheng_siyu:domain.${domain}`,
      `qizheng_siyu:body.${body.key}`,
      `qizheng_siyu:house.${body.house_name}`,
      `qizheng_siyu:position_class.${body.position_class}`,
    ];
    phases.push({
      concern_tag_ref: tag.id,
      start_date: scope.start_date,
      end_date: scope.end_date,
      nature: tendencyFromBody(body),
      driver_refs: [
        `qizheng_siyu:period.long_horizon@${scope.start_date}..${scope.end_date}`,
        ...evidenceRefs,
      ],
    });
    for (let year = startYear; year <= endYear; year += 1) {
      inflections.push({
        concern_tag_ref: tag.id,
        date: `${year}-01-01`,
        kind: 'annual_transition',
        driver_refs: [
          `qizheng_siyu:annual_transition@${year}`,
          ...evidenceRefs,
        ],
      });
    }
  }

  return { phases, inflections };
}

export function deriveQizhengSiyuCommonDrivers(input: {
  readonly evidence: QizhengSiyuEvidence;
  readonly dated_tendency_chart?: QizhengSiyuSubjectChart;
  readonly base_uncertainty: readonly UncertaintyInput[];
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly active_concern_tags: readonly ConcernTag[];
}): CommonDrivers {
  const nianjing =
    input.mirror_kind === 'nianjing'
      ? buildNianJingDrivers(input.evidence.self_subject, input.mirror_scope, input.active_concern_tags)
      : { phases: [], inflections: [] };
  return {
    stage_drivers: buildStageDrivers(input.evidence.self_subject),
    key_windows: [],
    yuejing_tendency_drivers: buildDatedTendencyDrivers(
      input.dated_tendency_chart,
      input.mirror_scope,
      input.mirror_kind,
      input.active_concern_tags,
    ),
    nianjing_phase_drivers: nianjing.phases,
    nianjing_inflection_drivers: nianjing.inflections,
    uncertainty_inputs: [...input.base_uncertainty],
  };
}
