import type {
  CommonDrivers,
  QizhengSiyuEvidence,
  QizhengSiyuSubjectChart,
  ShijingStageLabel,
  StageDriver,
  UncertaintyInput,
} from '../../../../domain/algorithm.ts';
import type { ConcernTag } from '../../../../domain/concern-tag.ts';
import type { MirrorKind, MirrorScope } from '../../../../domain/mirror-scope.ts';

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

export function deriveQizhengSiyuCommonDrivers(input: {
  readonly evidence: QizhengSiyuEvidence;
  readonly base_uncertainty: readonly UncertaintyInput[];
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly active_concern_tags: readonly ConcernTag[];
}): CommonDrivers {
  void input.mirror_kind;
  void input.mirror_scope;
  void input.active_concern_tags;
  return {
    stage_drivers: buildStageDrivers(input.evidence.self_subject),
    key_windows: [],
    yuejing_tendency_drivers: [],
    nianjing_phase_drivers: [],
    nianjing_inflection_drivers: [],
    uncertainty_inputs: [...input.base_uncertainty],
  };
}
