// 命镜 · 七政四余 — deterministic narrative layer.
//
// Turns one chart's real placements (落宫 / 宫势 / 黄道度 / 宿) into the always-on
// plain-language wording the surface shows: the hero archetype, per-star and
// per-palace readings, and the rule-based 重点格局. It composes from the universal
// tables in qizheng-content.ts and NEVER recomputes a placement or strength.
// Like mingjing-narrative.ts it is bilingual and rule-based; the history-grounded
// AI 解读 stays a separate on-demand layer.

import { useTranslation } from 'react-i18next';
import { uiLanguageFromI18nLanguage } from '../../i18n/copy.ts';
import type { UiLanguage } from '../../../domain/settings.ts';
import type {
  QizhengSiyuBody,
  QizhengSiyuBodyKey,
  QizhengSiyuHouse,
  QizhengSiyuSubjectChart,
} from '../../../domain/algorithm.ts';
import {
  BODY_ELEMENT,
  BODY_ORDER,
  EL_COLOR,
  QIZHENG_CONTENT,
  rulerKeyForCusp,
  type QizhengContent,
  type QzElement,
  type QzStrength,
} from './qizheng-content.ts';

const STRENGTH_RANK: Record<QzStrength, number> = { 七强: 0, 次强: 1, 闲宫: 2 };

function asStrength(value: string): QzStrength {
  if (value === '七强' || value === '次强') return value;
  return '闲宫';
}

function fmtDeg(value: number): string {
  return `${value.toFixed(2)}°`;
}

function fmtRange(start: number, end: number): string {
  return `${start.toFixed(2)}° – ${end.toFixed(2)}°`;
}

export interface QizhengStarView {
  readonly key: QizhengSiyuBodyKey;
  readonly label: string;
  readonly planet: string;
  readonly element: QzElement;
  readonly color: string;
  readonly bg: string;
  readonly essence: string;
  readonly houseName: string;
  readonly mansion: string;
  readonly strength: QzStrength;
  readonly strengthLabel: string;
  readonly degree: string;
  readonly kind: QizhengSiyuBody['kind'];
  readonly isMing: boolean;
  readonly deep: string;
}

export interface QizhengPalaceView {
  readonly index: number;
  readonly name: string;
  readonly range: string;
  readonly domain: string;
  readonly strength: QzStrength;
  readonly countLabel: string;
  readonly isEmpty: boolean;
  readonly ruler: string;
  readonly occupants: readonly QizhengStarView[];
  readonly deep: string;
}

export interface QizhengHeroView {
  readonly title: string;
  readonly subtitleChips: readonly string[];
  readonly oneLiner: string;
  readonly paragraph: string;
  readonly favorable: readonly string[];
  readonly watch: readonly string[];
  readonly basisLabel: string;
  readonly mingZhuLabel: string;
}

export type QizhengPatternTone = 'accent' | 'gold' | 'warn';

export interface QizhengPatternView {
  readonly id: string;
  readonly tag: string;
  readonly tone: QizhengPatternTone;
  readonly title: string;
  readonly summary: string;
  readonly glyphs: readonly { readonly name: string; readonly color: string }[];
  readonly deep: string;
}

interface Phrases {
  readonly dayNight: Record<'day' | 'night', string>;
  readonly mingSuffix: string; // " · 命主"
  readonly posShort: Record<QzStrength, string>;
  readonly heroFavorablePeak: (label: string) => string;
  readonly heroFavorableMing: (label: string) => string;
  readonly heroWatchIdle: (label: string) => string;
  readonly heroWatchCluster: (house: string, count: number) => string;
  readonly basis: (dayNight: string, asc: string) => string;
  readonly chipCount: (house: string, count: number) => string; // "福德聚四曜"
  readonly chipMing: (house: string) => string; // "命主守命宫"
  readonly chipPeak: (label: string, house: string) => string; // "镇星守田宅"
  readonly countLabel: (count: number) => string; // "4 曜入宫" / "空宫"
  readonly emptyCount: string;
  readonly rulerLine: (label: string, house: string) => string;
  readonly mingZhuLine: string;
  readonly siyuLine: string;
  readonly starDeep: (args: StarDeepArgs) => string;
  readonly palaceDeepOccupied: (args: PalaceDeepArgs) => string;
  readonly palaceDeepEmpty: (args: { house: string; theme: string; ruler: string }) => string;
  readonly heroParagraph: (args: HeroArgs) => string;
  readonly patternCore: (args: CoreArgs) => PatternText;
  readonly patternPeak: (args: PeakArgs) => PatternText;
  readonly patternWatch: (args: WatchArgs) => PatternText;
}

interface PatternText {
  readonly title: string;
  readonly summary: string;
  readonly deep: string;
}
interface StarDeepArgs {
  readonly essence: string;
  readonly house: string;
  readonly theme: string;
  readonly strength: QzStrength;
  readonly isMing: boolean;
  readonly isSiyu: boolean;
}
interface PalaceDeepArgs {
  readonly house: string;
  readonly theme: string;
  readonly labels: readonly string[];
  readonly count: number;
  readonly strength: QzStrength;
  readonly hasMing: boolean;
}
interface HeroArgs {
  readonly coreHouse: string;
  readonly coreTheme: string;
  readonly coreCount: number;
  readonly mingLabel: string;
  readonly mingHouse: string;
  readonly mingInCore: boolean;
  readonly peakLabel: string;
  readonly peakHouse: string;
  readonly peakStrengthLabel: string;
  readonly watchHouse: string;
  readonly watchLabels: readonly string[];
}
interface CoreArgs {
  readonly house: string;
  readonly theme: string;
  readonly labels: readonly string[];
  readonly count: number;
  readonly mingLabel: string;
  readonly mingInCore: boolean;
}
interface PeakArgs {
  readonly label: string;
  readonly planet: string;
  readonly house: string;
  readonly theme: string;
  readonly strengthLabel: string;
  readonly isPeak: boolean;
}
interface WatchArgs {
  readonly house: string;
  readonly theme: string;
  readonly labels: readonly string[];
  readonly count: number;
  readonly kind: 'health' | 'cluster' | 'idle';
  readonly idleEssence: string;
}

const CN_COUNT: Record<number, string> = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六' };
function cn(count: number): string {
  return CN_COUNT[count] ?? String(count);
}

const ZH: Phrases = {
  dayNight: { day: '昼盘', night: '夜盘' },
  mingSuffix: ' · 命主',
  posShort: { 七强: '宫势七强、最为得位', 次强: '宫势次强、稳定可用', 闲宫: '宫势属闲宫、力道偏淡' },
  heroFavorablePeak: (label) => `${label} · 七强`,
  heroFavorableMing: (label) => `${label} · 命主`,
  heroWatchIdle: (label) => `${label} · 闲宫`,
  heroWatchCluster: (house, count) => `${house}${cn(count)}曜`,
  basis: (dayNight, asc) => `${dayNight} · 上升 ${asc}`,
  chipCount: (house, count) => `${house}聚${cn(count)}曜`,
  chipMing: (house) => `命主守${house}`,
  chipPeak: (label, house) => `${label}守${house}`,
  countLabel: (count) => `${count} 曜入宫`,
  emptyCount: '空宫',
  rulerLine: (label, house) => `宫主星 ${label} → ${house}宫`,
  mingZhuLine: '作为你的命主星，它代表「你本人」那条主线，是看盘的第一落点。',
  siyuLine: '它是四余里的虚星，本身无所谓吉凶，关键看你怎么用它。',
  starDeep: ({ essence, house, theme, strength, isMing, isSiyu }) => {
    const role = isMing
      ? '作为你的命主星，它代表「你本人」那条主线，是看盘的第一落点。'
      : isSiyu
        ? '它是四余虚星，本身无吉凶，关键看你怎么用。'
        : '';
    return `${essence}它落在掌管「${theme}」的${house}宫，${ZH.posShort[strength]}。${role}`.trim();
  },
  palaceDeepOccupied: ({ house, theme, labels, count, strength, hasMing }) => {
    const crowd =
      count >= 3
        ? '星气很集中，是你人生戏份很重的一块；'
        : count === 2
          ? '星气不弱，值得多留意；'
          : '主题清晰、不旁逸；';
    const posWord =
      strength === '七强'
        ? '本宫是全盘的强宫之一'
        : strength === '次强'
          ? '本宫力量中上'
          : '本宫属闲宫、力道偏淡';
    const mingNote = hasMing ? '命主也落在这里，更说明它是你的主场之一。' : '';
    return `${house}宫掌管${theme}。这里有 ${labels.join('、')} ${count} 曜入驻——${posWord}，${crowd}把这份能量用在对的地方，就是你最该深耕的方向之一。${mingNote}`.trim();
  },
  palaceDeepEmpty: ({ house, theme, ruler }) =>
    `${house}宫掌管${theme}，是空宫——没有星曜直接进驻。这不代表人生空白，而要看它的宫主星落在哪、状态如何来间接判断。${ruler ? `（${ruler}）` : ''}`.trim(),
  heroParagraph: ({ coreHouse, coreTheme, coreCount, mingLabel, mingHouse, mingInCore, peakLabel, peakHouse, peakStrengthLabel, watchHouse, watchLabels }) => {
    const coreClause = coreCount >= 2 ? `有 ${coreCount} 颗聚在掌管「${coreTheme}」的${coreHouse}宫，` : '星曜分布得相对均匀，';
    const mingClause =
      mingInCore && coreCount >= 2 ? `命主${mingLabel}也在其中——这是你人生明显的重心；` : `命主${mingLabel}落在${mingHouse}宫，定下你性格的主线；`;
    const peakClause = `${peakLabel}又以全盘${peakStrengthLabel}之势坐${peakHouse}，是这张盘最得力的一颗。`;
    const watchClause = watchLabels.length > 0 ? `要留心的是${watchHouse}宫压着${watchLabels.join('、')}，别把内耗当常态。` : '';
    return `十一颗星里，${coreClause}${mingClause}${peakClause}${watchClause}`;
  },
  patternCore: ({ house, theme, labels, count, mingLabel, mingInCore }) => {
    if (count >= 2) {
      return {
        title: `${house}聚${cn(count)}曜 · 重心所在`,
        summary: `${labels.join(' · ')} 同落${house}宫`,
        deep: `全盘十一曜，有 ${count} 颗落在${house}宫${mingInCore ? `，包括你的命主${mingLabel}` : ''}。这一宫掌管${theme}，星气在这里特别集中——${house}的事就是你人生戏份最重的一块。优点是这块格外丰盈，是你最该深耕的主线；风险是同宫星多、容易在这件事上想太多、自我消耗。破局之道是把它往外用、变成看得见的结果。`,
      };
    }
    return {
      title: `命主守${house}`,
      summary: `命主${mingLabel}独立${house}宫`,
      deep: `你的命主${mingLabel}坐在${house}宫，掌管${theme}——这条线就是你这张盘的主轴。星曜分布得比较散，意味着你不是单点爆发型，而是多线并行、各处都有着力点。把命主这条主线认准、稳稳推进，其余的会跟着归位。`,
    };
  },
  patternPeak: ({ label, planet, house, theme, strengthLabel, isPeak }) => ({
    title: `${label}守${house} · ${strengthLabel}`,
    summary: `${planet}以全盘${isPeak ? '最高' : '较高'}之势坐${house}`,
    deep: `${label}以${strengthLabel}之势坐${house}宫，是全盘${isPeak ? '最得位' : '相对最得位'}的一颗星，含金量很高。它把你的力量压在${theme}上：这里是你最稳、最该深耕、也最容易出成果的地方。这类能量走的是「慢而确定」的路——守得住、耐得烦，时间会站在你这边。`,
  }),
  patternWatch: ({ house, theme, labels, count, kind, idleEssence }) => {
    if (kind === 'health') {
      return {
        title: `${house}${cn(count)}曜 · 身心是高频议题`,
        summary: `${labels.join(' · ')} 同宫于${house}`,
        deep: `${house}宫${count >= 2 ? `聚了 ${labels.join('、')}` : `坐着 ${labels.join('、')}`}，让身体与情绪成为你人生反复出现的主题。心里一有事，身体先反应，也容易被放大成内耗。核心功课只有一句：把休息、情绪和身体管理正经当回事，别等问题堆到身体抗议才回头。`,
      };
    }
    if (kind === 'cluster') {
      return {
        title: `${house}聚${cn(count)}曜 · 宜留心`,
        summary: `${labels.join(' · ')} 同落${house}`,
        deep: `${house}宫聚了 ${labels.join('、')}，是这张盘需要多上点心的地方。同宫星多，意味着这块${theme}的事容易盘根错节、牵一发动全身。把它当成提醒：留余地、别孤注一掷，变动里往往也藏着转机。`,
      };
    }
    return {
      title: `${labels[0] ?? ''} · 宜节制`,
      summary: `${labels[0] ?? ''}落${house}、处闲宫`,
      deep: `${labels[0] ?? ''}落在${house}宫、处闲宫，力道偏淡、不太得位。${idleEssence}这一面容易被你收着、不外显，好处是显得好相处；提醒是该争取、该发力时别一味退让，需要时给自己一点正当的冲劲。`,
    };
  },
};

const EN: Phrases = {
  dayNight: { day: 'day chart', night: 'night chart' },
  mingSuffix: ' · 命主',
  posShort: {
    七强: 'angular and best placed (七强)',
    次强: 'succedent and solidly usable (次强)',
    闲宫: 'cadent and off-duty, weaker (闲宫)',
  },
  heroFavorablePeak: (label) => `${label} · 七强`,
  heroFavorableMing: (label) => `${label} · 命主`,
  heroWatchIdle: (label) => `${label} · 闲宫`,
  heroWatchCluster: (house, count) => `${house}×${count}`,
  basis: (dayNight, asc) => `${dayNight} · Asc ${asc}`,
  chipCount: (house, count) => `${house} ×${count}`,
  chipMing: (house) => `命主 in ${house}`,
  chipPeak: (label, house) => `${label} in ${house}`,
  countLabel: (count) => `${count} bodies`,
  emptyCount: 'empty',
  rulerLine: (label, house) => `ruler ${label} → ${house}`,
  mingZhuLine: 'As your 命主, it carries the through-line of “you” — usually the first thing to read.',
  siyuLine: 'It is a 四余 shadow star — neither lucky nor unlucky in itself; what matters is how you use it.',
  starDeep: ({ essence, house, theme, strength, isMing, isSiyu }) => {
    const role = isMing
      ? ' As your 命主, it carries the through-line of “you” — the first thing to read.'
      : isSiyu
        ? ' As a 四余 shadow star it is neither lucky nor unlucky in itself; it’s about how you use it.'
        : '';
    return `${essence} It falls in ${house} (${theme}), ${EN.posShort[strength]}.${role}`.trim();
  },
  palaceDeepOccupied: ({ house, theme, labels, count, strength, hasMing }) => {
    const crowd =
      count >= 3
        ? 'the star-energy is very concentrated — one of the heaviest parts of your life;'
        : count === 2
          ? 'the star-energy here is real and worth watching;'
          : 'the theme is clean and single;';
    const posWord =
      strength === '七强'
        ? 'this is one of the chart’s strong (angular) houses'
        : strength === '次强'
          ? 'this house carries solid strength'
          : 'this house is cadent and runs weaker';
    const mingNote = hasMing ? ' 命主 also lands here, which makes it even more clearly your home turf.' : '';
    return `${house} governs ${theme}. ${count} ${count === 1 ? 'body sits' : 'bodies sit'} here — ${labels.join(', ')}. ${posWord}, and ${crowd} aimed in the right place this is one of the directions most worth deepening.${mingNote}`.trim();
  },
  palaceDeepEmpty: ({ house, theme, ruler }) =>
    `${house} governs ${theme} and is empty — no star sits in it directly. That part of life isn’t blank; read it through where its ruling star falls and how that star fares.${ruler ? ` (${ruler})` : ''}`.trim(),
  heroParagraph: ({ coreHouse, coreTheme, coreCount, mingLabel, mingHouse, mingInCore, peakLabel, peakHouse, peakStrengthLabel, watchHouse, watchLabels }) => {
    const coreClause = coreCount >= 2 ? `${coreCount} of the eleven bodies gather in ${coreHouse} (${coreTheme}), ` : 'the bodies spread fairly evenly, ';
    const mingClause = mingInCore && coreCount >= 2 ? `命主 ${mingLabel} among them — a clear centre of gravity; ` : `命主 ${mingLabel} sits in ${mingHouse}, setting your core line; `;
    const peakClause = `${peakLabel} then holds ${peakHouse} at the chart’s ${peakStrengthLabel} strength — its most capable single body. `;
    const watchClause = watchLabels.length > 0 ? `Watch ${watchHouse}, where ${watchLabels.join(', ')} pile up — don’t let inner drain become the norm.` : '';
    return `Across the eleven bodies, ${coreClause}${mingClause}${peakClause}${watchClause}`;
  },
  patternCore: ({ house, theme, labels, count, mingLabel, mingInCore }) => {
    if (count >= 2) {
      return {
        title: `${house} holds ${count} bodies · centre of gravity`,
        summary: `${labels.join(' · ')} together in ${house}`,
        deep: `${count} of the eleven bodies fall in ${house}${mingInCore ? `, including your 命主 ${mingLabel}` : ''}. This house governs ${theme}, and the energy is unusually concentrated here — ${house} is the heaviest part of your life. The upside is real abundance and a clear main line; the risk is overthinking and self-drain. The way through is to turn it outward into something visible.`,
      };
    }
    return {
      title: `命主 holds ${house}`,
      summary: `命主 ${mingLabel} alone in ${house}`,
      deep: `Your 命主 ${mingLabel} sits in ${house}, governing ${theme} — this line is the spine of the chart. The bodies are fairly spread, so you aren’t a single-point type but run several lines at once. Lock onto this main line and the rest tends to fall into place.`,
    };
  },
  patternPeak: ({ label, planet, house, theme, strengthLabel, isPeak }) => ({
    title: `${label} holds ${house} · ${strengthLabel}`,
    summary: `${planet} at the chart’s ${isPeak ? 'highest' : 'higher'} strength in ${house}`,
    deep: `${label} holds ${house} at ${strengthLabel} strength — the ${isPeak ? 'best-placed' : 'relatively best-placed'} body in the chart, and high-value. It anchors your strength in ${theme}: your steadiest ground, the place most worth deepening and most likely to pay off. This energy runs the “slow but certain” road — hold it, outlast the boredom, and time takes your side.`,
  }),
  patternWatch: ({ house, theme, labels, count, kind, idleEssence }) => {
    if (kind === 'health') {
      return {
        title: `${house} holds ${count} bodies · body & mind run hot`,
        summary: `${labels.join(' · ')} together in ${house}`,
        deep: `${house} ${count >= 2 ? `gathers ${labels.join(', ')}` : `holds ${labels.join(', ')}`}, making body and emotion a recurring theme. When something’s on your mind, your body answers first, and it’s easily amplified into inner drain. The one lesson: treat rest, mood and the body as real work — don’t wait for the body to protest.`,
      };
    }
    if (kind === 'cluster') {
      return {
        title: `${house} holds ${count} bodies · worth watching`,
        summary: `${labels.join(' · ')} together in ${house}`,
        deep: `${house} gathers ${labels.join(', ')}, a place that asks for extra care. Several bodies in one house means this ${theme} can get tangled — pull one thread and the rest moves. Take it as a cue: keep slack, don’t bet it all, and the change usually hides an opening.`,
      };
    }
    return {
      title: `${labels[0] ?? ''} · ease off`,
      summary: `${labels[0] ?? ''} in ${house}, cadent`,
      deep: `${labels[0] ?? ''} falls in ${house}, cadent and off-duty — weaker, not well placed. ${idleEssence} This side tends to stay tucked in rather than shown; the upside is you seem easy to deal with, but when it’s time to push or claim, don’t only give way — give yourself a fair bit of drive.`,
    };
  },
};

const PHRASES: Record<UiLanguage, Phrases> = { zh: ZH, en: EN };

function strongestBody(bodies: readonly QizhengSiyuBody[]): QizhengSiyuBody {
  return [...bodies].sort((a, b) => {
    const byRank = STRENGTH_RANK[asStrength(a.position_class)] - STRENGTH_RANK[asStrength(b.position_class)];
    if (byRank !== 0) return byRank;
    if (a.kind !== b.kind) return a.kind === 'qizheng' ? -1 : 1;
    return BODY_ORDER.indexOf(a.key) - BODY_ORDER.indexOf(b.key);
  })[0]!;
}

function houseStrength(house: QizhengSiyuHouse, bodies: readonly QizhengSiyuBody[]): QzStrength {
  const occupant = bodies.find((b) => b.house_name === house.name);
  if (occupant) return asStrength(occupant.position_class);
  // Empty houses still carry an angular/succedent/cadent class by name.
  if (['命宫', '田宅', '夫妻', '官禄'].includes(house.name)) return '七强';
  if (['财帛', '男女', '疾厄', '福德'].includes(house.name)) return '次强';
  return '闲宫';
}

export interface QizhengNarrative {
  readonly gloss: QizhengContent['gloss'];
  readonly mingZhuKey: (chart: QizhengSiyuSubjectChart) => QizhengSiyuBodyKey;
  readonly stars: (chart: QizhengSiyuSubjectChart) => readonly QizhengStarView[];
  readonly palaces: (chart: QizhengSiyuSubjectChart) => readonly QizhengPalaceView[];
  readonly hero: (chart: QizhengSiyuSubjectChart) => QizhengHeroView;
  readonly patterns: (chart: QizhengSiyuSubjectChart) => readonly QizhengPatternView[];
}

export function useQizhengNarrative(): QizhengNarrative {
  const { i18n } = useTranslation();
  const lang = uiLanguageFromI18nLanguage(i18n.resolvedLanguage ?? i18n.language);
  const content = QIZHENG_CONTENT[lang];
  const p = PHRASES[lang];

  const mingZhuKey = (chart: QizhengSiyuSubjectChart): QizhengSiyuBodyKey =>
    rulerKeyForCusp(chart.chart_basis.ascendant_longitude);

  const buildStar = (chart: QizhengSiyuSubjectChart, body: QizhengSiyuBody): QizhengStarView => {
    const element = BODY_ELEMENT[body.key];
    const color = EL_COLOR[element];
    const strength = asStrength(body.position_class);
    const isMing = body.key === mingZhuKey(chart);
    return {
      key: body.key,
      label: body.label,
      planet: content.bodyPlanet[body.key],
      element,
      color,
      bg: `${color}22`,
      essence: content.bodyEssence[body.key],
      houseName: body.house_name,
      mansion: body.mansion,
      strength,
      strengthLabel: content.strengthLabel[strength],
      degree: fmtDeg(body.longitude),
      kind: body.kind,
      isMing,
      deep: p.starDeep({
        essence: content.bodyEssence[body.key],
        house: body.house_name,
        theme: content.palaceTheme[body.house_name] ?? body.house_name,
        strength,
        isMing,
        isSiyu: body.kind === 'siyu',
      }),
    };
  };

  const orderedBodies = (chart: QizhengSiyuSubjectChart): QizhengSiyuBody[] =>
    [...chart.bodies].sort((a, b) => BODY_ORDER.indexOf(a.key) - BODY_ORDER.indexOf(b.key));

  const stars = (chart: QizhengSiyuSubjectChart): QizhengStarView[] =>
    orderedBodies(chart).map((body) => buildStar(chart, body));

  const palaces = (chart: QizhengSiyuSubjectChart): QizhengPalaceView[] => {
    const ming = mingZhuKey(chart);
    return chart.houses.map((house) => {
      const occupants = orderedBodies(chart)
        .filter((body) => body.house_name === house.name)
        .map((body) => buildStar(chart, body));
      const strength = houseStrength(house, chart.bodies);
      const isEmpty = occupants.length === 0;
      const rulerKey = rulerKeyForCusp(house.start_longitude);
      const rulerBody = chart.bodies.find((b) => b.key === rulerKey);
      const ruler = isEmpty && rulerBody ? p.rulerLine(rulerBody.label, rulerBody.house_name) : '';
      return {
        index: house.index,
        name: house.name,
        range: fmtRange(house.start_longitude, house.end_longitude),
        domain: content.palaceDomain[house.name] ?? house.name,
        strength,
        countLabel: isEmpty ? p.emptyCount : p.countLabel(occupants.length),
        isEmpty,
        ruler,
        occupants,
        deep: isEmpty
          ? p.palaceDeepEmpty({ house: house.name, theme: content.palaceTheme[house.name] ?? house.name, ruler })
          : p.palaceDeepOccupied({
              house: house.name,
              theme: content.palaceTheme[house.name] ?? house.name,
              labels: occupants.map((o) => o.label),
              count: occupants.length,
              strength,
              hasMing: occupants.some((o) => o.key === ming),
            }),
      };
    });
  };

  const corePalace = (chart: QizhengSiyuSubjectChart): QizhengSiyuHouse =>
    [...chart.houses].sort((a, b) => {
      if (b.body_keys.length !== a.body_keys.length) return b.body_keys.length - a.body_keys.length;
      const sa = STRENGTH_RANK[houseStrength(a, chart.bodies)];
      const sb = STRENGTH_RANK[houseStrength(b, chart.bodies)];
      if (sa !== sb) return sa - sb;
      return a.index - b.index;
    })[0]!;

  const watchPalace = (chart: QizhengSiyuSubjectChart, coreName: string): QizhengSiyuHouse | null => {
    const ji = chart.houses.find((h) => h.name === '疾厄');
    if (ji && ji.body_keys.length > 0) return ji;
    const cluster = chart.houses
      .filter((h) => h.name !== coreName && h.body_keys.length >= 2)
      .sort((a, b) => b.body_keys.length - a.body_keys.length)[0];
    if (cluster) return cluster;
    const idle = chart.bodies.find((b) => asStrength(b.position_class) === '闲宫');
    return idle ? chart.houses.find((h) => h.name === idle.house_name) ?? null : null;
  };

  const hero = (chart: QizhengSiyuSubjectChart): QizhengHeroView => {
    const ming = mingZhuKey(chart);
    const mingBody = chart.bodies.find((b) => b.key === ming)!;
    const mingLabel = mingBody.label;
    const archetype = content.archetype[mingBody.house_name] ?? content.archetype['命宫'];
    const core = corePalace(chart);
    const peak = strongestBody(chart.bodies);
    const watch = watchPalace(chart, core.name);
    const mingInCore = core.body_keys.includes(ming);

    const subtitleChips = [
      `命主${mingLabel}`,
      core.body_keys.length >= 2 ? p.chipCount(core.name, core.body_keys.length) : p.chipMing(mingBody.house_name),
      p.chipPeak(peak.label, peak.house_name),
    ];

    const favorable: string[] = [];
    const favorableSeen = new Set<QizhengSiyuBodyKey>();
    const peakStrength = asStrength(peak.position_class);
    if (peakStrength === '七强') {
      favorable.push(p.heroFavorablePeak(peak.label));
      favorableSeen.add(peak.key);
    }
    if (!favorableSeen.has(ming)) {
      favorable.push(p.heroFavorableMing(mingLabel));
      favorableSeen.add(ming);
    }
    for (const body of orderedBodies(chart)) {
      if (favorable.length >= 3) break;
      if (favorableSeen.has(body.key)) continue;
      if (asStrength(body.position_class) !== '闲宫' && body.kind === 'qizheng') {
        favorable.push(body.label);
        favorableSeen.add(body.key);
      }
    }

    const watchChips: string[] = [];
    const idle = chart.bodies.find((b) => asStrength(b.position_class) === '闲宫');
    if (idle) watchChips.push(p.heroWatchIdle(idle.label));
    if (watch && watch.body_keys.length >= 2) watchChips.push(p.heroWatchCluster(watch.name, watch.body_keys.length));

    const watchLabels = watch && watch.body_keys.length > 0
      ? watch.body_keys.map((k) => chart.bodies.find((b) => b.key === k)?.label ?? '').filter(Boolean)
      : [];

    return {
      title: archetype.title,
      subtitleChips,
      oneLiner: archetype.oneLiner,
      paragraph: p.heroParagraph({
        coreHouse: core.name,
        coreTheme: content.palaceTheme[core.name] ?? core.name,
        coreCount: core.body_keys.length,
        mingLabel,
        mingHouse: mingBody.house_name,
        mingInCore,
        peakLabel: peak.label,
        peakHouse: peak.house_name,
        peakStrengthLabel: content.strengthLabel[peakStrength],
        watchHouse: watch?.name ?? '',
        watchLabels,
      }),
      favorable: favorable.slice(0, 3),
      watch: watchChips.slice(0, 2),
      basisLabel: p.basis(p.dayNight[chart.chart_basis.day_night], fmtDeg(chart.chart_basis.ascendant_longitude)),
      mingZhuLabel: mingLabel,
    };
  };

  const patterns = (chart: QizhengSiyuSubjectChart): QizhengPatternView[] => {
    const ming = mingZhuKey(chart);
    const mingBody = chart.bodies.find((b) => b.key === ming)!;
    const core = corePalace(chart);
    const peak = strongestBody(chart.bodies);

    const glyphsFor = (keys: readonly QizhengSiyuBodyKey[]) =>
      keys.map((k) => {
        const body = chart.bodies.find((b) => b.key === k)!;
        return { name: body.label, color: EL_COLOR[BODY_ELEMENT[k]] };
      });

    // When no palace holds ≥2 bodies, the "core" is the 命主's own palace, not
    // the arbitrary most-occupied singleton.
    const coreSource =
      core.body_keys.length >= 2
        ? core
        : chart.houses.find((h) => h.name === mingBody.house_name) ?? core;
    const watch = watchPalace(chart, coreSource.name);
    const coreLabels = coreSource.body_keys.map((k) => chart.bodies.find((b) => b.key === k)?.label ?? '');
    const coreText = p.patternCore({
      house: coreSource.name,
      theme: content.palaceTheme[coreSource.name] ?? coreSource.name,
      labels: coreLabels,
      count: coreSource.body_keys.length,
      mingLabel: mingBody.label,
      mingInCore: coreSource.body_keys.includes(ming),
    });

    const peakStrength = asStrength(peak.position_class);
    const peakText = p.patternPeak({
      label: peak.label,
      planet: content.bodyPlanet[peak.key],
      house: peak.house_name,
      theme: content.palaceTheme[peak.house_name] ?? peak.house_name,
      strengthLabel: content.strengthLabel[peakStrength],
      isPeak: peakStrength === '七强',
    });

    const out: QizhengPatternView[] = [
      {
        id: 'core',
        tag: '核心格局',
        tone: 'accent',
        title: coreText.title,
        summary: coreText.summary,
        glyphs: coreSource.body_keys.length >= 2 ? glyphsFor(coreSource.body_keys) : glyphsFor([ming]),
        deep: coreText.deep,
      },
      {
        id: 'peak',
        tag: '最强一星',
        tone: 'gold',
        title: peakText.title,
        summary: peakText.summary,
        glyphs: glyphsFor([peak.key]),
        deep: peakText.deep,
      },
    ];

    if (watch && watch.name !== coreSource.name && watch.body_keys.length > 0) {
      const watchLabels = watch.body_keys.map((k) => chart.bodies.find((b) => b.key === k)?.label ?? '');
      const kind: WatchArgs['kind'] = watch.name === '疾厄' ? 'health' : watch.body_keys.length >= 2 ? 'cluster' : 'idle';
      const idleBody = chart.bodies.find((b) => b.house_name === watch.name);
      const watchText = p.patternWatch({
        house: watch.name,
        theme: content.palaceTheme[watch.name] ?? watch.name,
        labels: watchLabels,
        count: watch.body_keys.length,
        kind,
        idleEssence: idleBody ? content.bodyEssence[idleBody.key] : '',
      });
      out.push({
        id: 'watch',
        tag: '要留心',
        tone: 'warn',
        title: watchText.title,
        summary: watchText.summary,
        glyphs: glyphsFor(watch.body_keys),
        deep: watchText.deep,
      });
    }

    return out;
  };

  return { gloss: content.gloss, mingZhuKey, stars, palaces, hero, patterns };
}

export { EL_COLOR };
