// 命镜 display helpers — render the pinyin-keyed domain 干支 enums as 汉字 and map
// each to its five-element for colour theming. Display-only; no astrology math.

import type { EarthlyBranch, FiveElement, GanzhiPillar, HeavenlyStem } from '../../../domain/algorithm.ts';

export const STEM_HANZI: Readonly<Record<HeavenlyStem, string>> = {
  jia: '甲',
  yi: '乙',
  bing: '丙',
  ding: '丁',
  wu: '戊',
  ji: '己',
  geng: '庚',
  xin: '辛',
  ren: '壬',
  gui: '癸',
};

export const BRANCH_HANZI: Readonly<Record<EarthlyBranch, string>> = {
  zi: '子',
  chou: '丑',
  yin: '寅',
  mao: '卯',
  chen: '辰',
  si: '巳',
  wu: '午',
  wei: '未',
  shen: '申',
  you: '酉',
  xu: '戌',
  hai: '亥',
};

export const ELEMENT_HANZI: Readonly<Record<FiveElement, string>> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
};

export const STEM_ELEMENT: Readonly<Record<HeavenlyStem, FiveElement>> = {
  jia: 'wood',
  yi: 'wood',
  bing: 'fire',
  ding: 'fire',
  wu: 'earth',
  ji: 'earth',
  geng: 'metal',
  xin: 'metal',
  ren: 'water',
  gui: 'water',
};

// A branch's fixed (本气) five-element, used for colour theming only.
export const BRANCH_ELEMENT: Readonly<Record<EarthlyBranch, FiveElement>> = {
  zi: 'water',
  chou: 'earth',
  yin: 'wood',
  mao: 'wood',
  chen: 'earth',
  si: 'fire',
  wu: 'fire',
  wei: 'earth',
  shen: 'metal',
  you: 'metal',
  xu: 'earth',
  hai: 'water',
};

export function pillarHanzi(pillar: GanzhiPillar): string {
  return `${STEM_HANZI[pillar.stem]}${BRANCH_HANZI[pillar.branch]}`;
}
