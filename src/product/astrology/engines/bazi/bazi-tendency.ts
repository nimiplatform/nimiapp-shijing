// SJG-ALGO-15 — 用神-driven tendency (replaces the Wave-1 lookup tables).
// A transit element favourable to 用神/喜神 → supportive; the primary 忌神 →
// blocked; other 忌神 → watch; neutral → steady; 冲提纲 / 大运·流年 boundary →
// turning. The concern's life domain selects the relevant 十神 focus so two
// concerns may diverge on the same date, but never overrides 用神 favourability.

import type { ConcernTag } from '../../../../domain/concern-tag.ts';
import type { CalculationSex } from '../../../../domain/person.ts';
import type {
  CycleMarker,
  EarthlyBranch,
  FiveElement,
  GanzhiPillar,
  HeavenlyStem,
  YongShen,
} from '../../../../domain/algorithm.ts';
import type { TendencyClass } from '../../../../domain/mirror-output.ts';
import { STEM_TO_ELEMENT, classifyTransitToDayStem, type TransitElementRelation } from '../../element-relations.ts';
import { classifyBranchPair, isClashPair } from '../../branch-relations.ts';
import { concernDomainFor, type ConcernDomain } from '../concern-domain.ts';

// concern domain → the 十神 categories (transit relation to day master) most
// relevant to that life area. null = always relevant (general).
function domainFocus(domain: ConcernDomain, sex: CalculationSex): ReadonlySet<TransitElementRelation> | null {
  switch (domain) {
    case 'wealth':
      return new Set<TransitElementRelation>(['wealth']); // 财
    case 'career':
      return new Set<TransitElementRelation>(['constraint']); // 官杀
    case 'love':
      return new Set<TransitElementRelation>([sex === 'female' ? 'constraint' : 'wealth']); // 配偶星: 女看官, 男看财
    case 'health':
      return new Set<TransitElementRelation>(['same', 'resource']); // 比劫/印 (日主元气)
    case 'family':
      return new Set<TransitElementRelation>([
        'resource', // parents / elders
        'output', // children / care output
        sex === 'female' ? 'constraint' : 'wealth', // partner star
      ]);
    case 'general':
      return null;
  }
}

function modulateByDomainRelevance(base: TendencyClass, relevant: boolean): TendencyClass {
  if (base === 'turning') return base;
  if (relevant) {
    if (base === 'watch') return 'blocked';
    return base;
  }
  if (base === 'supportive') return 'steady';
  if (base === 'blocked') return 'watch';
  if (base === 'watch') return 'steady';
  return base;
}

// SJG-ALGO-15 — NianJing phase quality. A phase band opens at a 大运/流年 marker;
// its nature is the favourability of THAT period's element to the natal 用神 —
// not the (always-true-at-a-boundary) 转折 signal that dated tendency uses. Same
// 用神 semantics as baziDomainTendency so the two surfaces never contradict.
export interface BaziPeriodNature {
  readonly nature: TendencyClass;
  readonly element: FiveElement;
  readonly favor: '喜' | '忌' | '平';
}

export function baziPeriodNature(periodStem: HeavenlyStem, yong: YongShen): BaziPeriodNature {
  const element = STEM_TO_ELEMENT[periodStem];
  const favorable = yong.yong.includes(element) || yong.xi.includes(element) || yong.tiaohou === element;
  const unfavorable = yong.ji.includes(element);
  let nature: TendencyClass;
  if (favorable) nature = 'supportive';
  else if (unfavorable) nature = yong.ji[0] === element ? 'blocked' : 'watch';
  else nature = 'steady';
  return { nature, element, favor: favorable ? '喜' : unfavorable ? '忌' : '平' };
}

export interface BaziDomainPeriodNature extends BaziPeriodNature {
  readonly domain: ConcernDomain;
  readonly ten_god: TransitElementRelation;
  readonly relevant: boolean;
}

export interface BaziDomainPeriodInput {
  readonly tag: ConcernTag;
  readonly yong: YongShen;
  readonly periodStem: HeavenlyStem;
  readonly dayMaster: HeavenlyStem;
  readonly calculationSex: CalculationSex;
}

export function baziDomainPeriodNature(input: BaziDomainPeriodInput): BaziDomainPeriodNature {
  const base = baziPeriodNature(input.periodStem, input.yong);
  const domain = concernDomainFor(input.tag);
  const tenGod = classifyTransitToDayStem(input.periodStem, input.dayMaster);
  const focus = domainFocus(domain, input.calculationSex);
  const relevant = !focus || focus.has(tenGod);
  return {
    ...base,
    nature: modulateByDomainRelevance(base.nature, relevant),
    domain,
    ten_god: tenGod,
    relevant,
  };
}

export interface BaziTendencyInput {
  readonly tag: ConcernTag;
  readonly yong: YongShen;
  readonly transitDayPillar: GanzhiPillar;
  readonly natalDayBranch: EarthlyBranch;
  readonly dayMaster: HeavenlyStem;
  readonly monthBranch: EarthlyBranch;
  readonly marker?: CycleMarker;
  readonly calculationSex: CalculationSex;
  readonly dateLabel: string;
}

export function baziDomainTendency(input: BaziTendencyInput): { tendency: TendencyClass; driverRefs: string[] } {
  const domain = concernDomainFor(input.tag);
  const transitEl = STEM_TO_ELEMENT[input.transitDayPillar.stem];
  const branchRel = classifyBranchPair(input.transitDayPillar.branch, input.natalDayBranch);
  const chongTigang = isClashPair(input.transitDayPillar.branch, input.monthBranch); // 冲提纲
  const boundary = input.marker
    ? input.marker.kind === 'dayun_boundary' || input.marker.kind === 'annual_transition'
    : false;
  const turning = branchRel === '相冲' || chongTigang || boundary;

  const favorable = input.yong.yong.includes(transitEl) || input.yong.xi.includes(transitEl);
  const unfavorable = input.yong.ji.includes(transitEl);
  const primaryJi = input.yong.ji[0] === transitEl;

  let base: TendencyClass;
  if (turning) base = 'turning';
  else if (favorable) base = 'supportive';
  else if (unfavorable) base = primaryJi ? 'blocked' : 'watch';
  else base = 'steady';

  const category = classifyTransitToDayStem(input.transitDayPillar.stem, input.dayMaster);
  const focus = domainFocus(domain, input.calculationSex);
  const relevant = !focus || focus.has(category);

  // Relevance modulates intensity (per-concern divergence) but not direction.
  const tendency = modulateByDomainRelevance(base, relevant);

  const yongTag = favorable ? '喜' : unfavorable ? '忌' : '平';
  const driverRefs = [
    `bazi:domain.${domain}`,
    `bazi:yongshen.${yongTag}@${transitEl}`,
    `bazi:tenGod.${category}`,
    ...(branchRel ? [`bazi:branch.${branchRel}@${input.dateLabel}`] : []),
    ...(chongTigang ? [`bazi:冲提纲@${input.dateLabel}`] : []),
    ...(input.marker ? [`bazi:${input.marker.kind}@${input.marker.start_utc}`] : []),
  ];
  return { tendency, driverRefs };
}
