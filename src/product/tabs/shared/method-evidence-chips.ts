// Method-agnostic evidence chips for a Reading. Switches on method_id to render
// the engine-specific summary (八字: 日柱/月令/旺衰/用神; 紫微: 命宫/命主/五行局) plus
// the shared 阶段驱动 + 数据完整度. Layer-3: binds to common + method_profile and the
// method_id-switched evidence view only — never parses driver_refs.

import type { Reading } from '../../../domain/reading.ts';

export interface MethodEvidenceChip {
  readonly group: string;
  readonly value: string;
}

const STEM_LABELS: Record<string, string> = {
  jia: '甲', yi: '乙', bing: '丙', ding: '丁', wu: '戊',
  ji: '己', geng: '庚', xin: '辛', ren: '壬', gui: '癸',
};
const BRANCH_LABELS: Record<string, string> = {
  zi: '子', chou: '丑', yin: '寅', mao: '卯', chen: '辰', si: '巳',
  wu: '午', wei: '未', shen: '申', you: '酉', xu: '戌', hai: '亥',
};
const ELEMENT_LABELS: Record<string, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
};

function pillarLabel(pillar: { stem: string; branch: string } | undefined): string {
  if (!pillar) return '待补';
  const stem = STEM_LABELS[pillar.stem] ?? pillar.stem;
  const branch = BRANCH_LABELS[pillar.branch] ?? pillar.branch;
  return `${stem}${branch}`;
}

export function deriveMethodEvidenceChips(reading: Reading): MethodEvidenceChip[] {
  const fs = reading.inputs_summary.feature_snapshot;
  const me = fs.method_evidence;
  const chips: MethodEvidenceChip[] = [];
  if (me.method_id === 'bazi_ziping_v1') {
    const self = me.bazi.self_subject;
    const chart = self.natal_chart;
    if (chart.day_pillar) chips.push({ group: '日柱', value: pillarLabel(chart.day_pillar) });
    if (chart.month_pillar) chips.push({ group: '月令', value: pillarLabel(chart.month_pillar) });
    if (self.interpretation) {
      chips.push({ group: '旺衰', value: self.interpretation.strength.band });
      const yong = self.interpretation.yong_shen.yong.map((e) => ELEMENT_LABELS[e] ?? e).join('');
      if (yong) chips.push({ group: '用神', value: yong });
    }
  } else if (me.method_id === 'ziwei_sanhe_v1') {
    const self = me.ziwei.self_subject;
    const ming = self.palaces.find((p) => p.is_soul);
    const star = ming?.major_stars[0]?.name ?? '空宫';
    chips.push({ group: '命宫', value: `${self.soul_palace_branch}·${star}` });
    chips.push({ group: '命主', value: self.soul_star });
    chips.push({ group: '五行局', value: self.five_elements_class });
  } else if (me.method_id === 'qizheng_siyu_guolao_v1') {
    const self = me.qizheng_siyu.self_subject;
    const sun = self.bodies.find((body) => body.key === 'taiyang');
    const moon = self.bodies.find((body) => body.key === 'taiyin');
    chips.push({ group: '上升度', value: `${self.chart_basis.ascendant_longitude.toFixed(1)}°` });
    if (sun) chips.push({ group: '太阳', value: `${sun.house_name}·${sun.mansion}` });
    if (moon) chips.push({ group: '太阴', value: `${moon.house_name}·${moon.mansion}` });
  }
  const firstStage = fs.common.stage_drivers[0]?.stage_label;
  if (firstStage) chips.push({ group: '阶段驱动', value: firstStage });
  if (me.method_id === 'bazi_ziping_v1') {
    const filled = 4 - me.bazi.self_subject.natal_chart.missing_pillars.length;
    chips.push({ group: '数据完整度', value: `约 ${filled}/4` });
  } else {
    chips.push({ group: '数据完整度', value: '完整' });
  }
  return chips;
}
