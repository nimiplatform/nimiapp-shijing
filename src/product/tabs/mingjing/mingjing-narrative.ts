// 命镜 · 大白话叙述层 (deterministic narrative).
//
// The 命盘 numbers are deterministic (MingJingChart, SJG-ALGO-16). This module
// turns those numbers into the always-on plain-language wording the 命镜 surface
// shows around them — the hero archetype + persona, the 大运 era labels and
// per-decade guidance, and the 流年 window badges + guidance. It is rule-based
// and bilingual; it NEVER recomputes a tendency, band, or inflection (those come
// from the chart). The deep, history-grounded AI 解读 stays a separate on-demand
// layer (MingJingMirrorOutput).

import { useTranslation } from 'react-i18next';
import { getProductCopy, uiLanguageFromI18nLanguage } from '../../i18n/copy.ts';
import type { UiLanguage } from '../../../domain/settings.ts';
import type {
  MingJingChart,
  DayunPeriodFeature,
  LiuNianWindow,
  BaziPatternName,
} from '../../../domain/mingjing.ts';
import type { FiveElement, HeavenlyStem, StrengthBand } from '../../../domain/algorithm.ts';
import type { TendencyClass } from '../../../domain/mirror-output.ts';
import { STEM_ELEMENT, STEM_HANZI } from './ganzhi-hanzi.ts';

export type StrengthClass = 'weak' | 'balanced' | 'strong';

export function strengthClassOf(band: StrengthBand): StrengthClass {
  if (band === '极弱' || band === '偏弱') return 'weak';
  if (band === '偏强' || band === '极强') return 'strong';
  return 'balanced';
}

// Decade-of-life bucket for the 大运 era label, keyed by the period's 虚岁 start.
function eraBucket(startAge: number): number {
  return Math.min(7, Math.max(0, Math.floor(startAge / 10)));
}

export interface Archetype {
  readonly title: string;
  readonly persona: string;
  readonly dayMaster: string; // 戊土日主 / Wu (Earth) Day Master
  readonly patternTag: string; // 偏财格
  readonly strengthTag: string; // 身弱借力
  readonly strengthClass: StrengthClass;
  readonly favorable: readonly FiveElement[]; // 用 + 喜
  readonly adverse: readonly FiveElement[]; // 忌
  readonly favorableHint: string; // 暖意 · 方向 · 稳定靠山
}

interface NarrativeContent {
  readonly elementJoin: string;
  readonly dayMasterWord: (stemHanzi: string, elementLabel: string) => string;
  readonly strengthTag: Record<StrengthClass, string>;
  readonly archetypeTitle: Record<FiveElement, Record<StrengthClass, string>>;
  readonly stemPersona: Record<HeavenlyStem, string>;
  readonly patternFlavor: Record<BaziPatternName, string>;
  readonly strengthGuidance: Record<StrengthClass, (els: string) => string>;
  readonly favorableHint: Record<StrengthClass, string>;
  readonly eraLabels: readonly string[];
  readonly currentPrefix: string;
  readonly tenGodFlavor: Record<string, string>;
  readonly weakUnderPressure: string;
  readonly natureGuidance: Record<TendencyClass, string>;
  readonly windowBadge: Record<TendencyClass, string>;
  readonly windowNarrative: Record<TendencyClass, string>;
}

const ZH: NarrativeContent = {
  elementJoin: '、',
  dayMasterWord: (stem, el) => `${stem}${el}日主`,
  strengthTag: { weak: '身弱借力', balanced: '中和有度', strong: '身旺有力' },
  archetypeTitle: {
    wood: { weak: '扎根蓄势', balanced: '柔韧向上', strong: '挺拔生发' },
    fire: { weak: '守火养光', balanced: '明朗温煦', strong: '光热外放' },
    earth: { weak: '外稳内活', balanced: '稳重持中', strong: '敦厚承载' },
    metal: { weak: '养锋待时', balanced: '内敛锋藏', strong: '刚劲果决' },
    water: { weak: '蓄水养源', balanced: '灵动周流', strong: '奔涌通达' },
  },
  stemPersona: {
    jia: '你像一棵参天大树——正直、有主见，认准方向就一路向上；',
    yi: '你像柔韧的藤蔓花草——灵活、善借力，能在缝隙里生长；',
    bing: '你像正午的太阳——热情、坦荡，照得到的地方都被你点亮；',
    ding: '你像一盏灯烛——温暖、专注，能在细处给人方向；',
    wu: '你像一座厚土山——踏实可靠、能容人容事；',
    ji: '你像一片沃土田园——包容、滋养，默默成全身边的人；',
    geng: '你像未经雕琢的矿石——刚强、果断，关键时刻扛得住；',
    xin: '你像一枚珠玉——敏锐、讲究，在意分寸与质感；',
    ren: '你像奔流的江河——开阔、有格局，向着远方不停歇；',
    gui: '你像细密的雨露——细腻、善察，润物于无声；',
  },
  patternFlavor: {
    正官格: '又带着正官的自律，看重责任与秩序。',
    七杀格: '又带着七杀的魄力，敢闯敢拼、压不垮。',
    正印格: '又带着正印的厚养，重学养也重情义。',
    偏印格: '又带着偏印的巧思，擅长另辟蹊径。',
    正财格: '又带着正财的务实，踏实经营、积少成多。',
    偏财格: '又带着偏财的灵活，善于发现机会。',
    食神格: '又带着食神的从容，享受过程、温和有趣。',
    伤官格: '又带着伤官的才气，表达力强、不愿将就。',
    建禄格: '又带着建禄的自立，靠自己站稳脚跟。',
    阳刃格: '又带着阳刃的劲道，爆发力强、敢下决心。',
  },
  strengthGuidance: {
    weak: (els) => `命局偏弱，最需要「${els}」的暖意和支撑：当你有方向、有依靠时，最能成事。`,
    balanced: (els) => `命局比较均衡，进退都有余地：顺着「${els}」的方向走，会更顺手。`,
    strong: (els) => `命局偏旺、能量足，更需要「${els}」来疏导和发力：把劲用对地方，就能成事。`,
  },
  favorableHint: {
    weak: '暖意 · 方向 · 稳定靠山',
    balanced: '顺势 · 借力 · 稳中求进',
    strong: '出口 · 疏导 · 把劲用对',
  },
  eraLabels: [
    '童年根基期',
    '求学成长期',
    '立业起步期',
    '中坚责任期',
    '盛年发展期',
    '收获延续期',
    '沉淀守成期',
    '颐养通达期',
  ],
  currentPrefix: '当前 · ',
  tenGodFlavor: {
    正官: '正官当令，责任、规则与他人的期待都在加重。',
    七杀: '七杀当道，压力与挑战集中，也最锻炼人。',
    正财: '正财当值，是务实经营、稳扎稳打的阶段。',
    偏财: '偏财当值，机会多、来钱活，也容易分心。',
    正印: '正印护身，贵人、学习与休养的力量变强。',
    偏印: '偏印当值，适合钻研、转型与另辟蹊径。',
    食神: '食神当值，是舒展、专注、享受过程的阶段。',
    伤官: '伤官当值，才华与表达活跃，也容易锋芒外露。',
    比肩: '比肩当值，靠同辈与自己的力量打拼。',
    劫财: '劫财当值，竞争与合作交织，财上需谨慎。',
  },
  weakUnderPressure: '身弱时担当略显吃力，少硬扛、多借力会更稳。',
  natureGuidance: {
    supportive: '顺势而为、主动推进，这是出成果的阶段。',
    steady: '节奏平稳，适合积累与巩固，不必勉强求快。',
    watch: '多观察、稳着走，少冒进，把基础打牢更重要。',
    blocked: '阻力偏大，宜守不宜攻，避免重大冒险决定。',
    turning: '处在转折点上，旧的告一段落，为新阶段做准备。',
  },
  windowBadge: {
    supportive: '机会窗口',
    steady: '平稳推进',
    watch: '放缓观察',
    blocked: '留意阻力',
    turning: '转折窗口',
  },
  windowNarrative: {
    supportive: '能量顺、机会多，是这几年里值得主动把握的窗口。适合推进事业、启动计划，做长期布局。',
    steady: '总体平稳，按部就班推进即可，适合巩固已有的局面、稳步积累。',
    watch: '节奏放缓的过渡期，适合观察、修整与积累，不宜冒进。把握好这段时间，为下一轮蓄力。',
    blocked: '阻力与摩擦偏多，人际或健康容易有波动。宜守成、稳住节奏，避免重大投资与冒险决定。',
    turning: '处在转折窗口，旧局面收尾、新方向开启，重要的决定可以放在这里通盘考虑。',
  },
};

const EN: NarrativeContent = {
  elementJoin: ' & ',
  dayMasterWord: (stem, el) => `${stem} (${el}) day master`,
  strengthTag: { weak: 'weak — leans on support', balanced: 'balanced', strong: 'strong & forceful' },
  archetypeTitle: {
    wood: { weak: 'Rooting & gathering', balanced: 'Supple & rising', strong: 'Upright & growing' },
    fire: { weak: 'Tending the flame', balanced: 'Bright & warm', strong: 'Radiant & outward' },
    earth: { weak: 'Steady outside, lively within', balanced: 'Grounded & centred', strong: 'Solid & bearing' },
    metal: { weak: 'Honing the edge', balanced: 'Reserved & keen', strong: 'Firm & decisive' },
    water: { weak: 'Storing the source', balanced: 'Fluid & circulating', strong: 'Surging & far-reaching' },
  },
  stemPersona: {
    jia: 'You are like a towering tree — upright and sure of your direction, climbing steadily once set. ',
    yi: 'You are like a supple vine — adaptable and resourceful, finding room to grow in any gap. ',
    bing: 'You are like the midday sun — warm and open, lighting up whatever you touch. ',
    ding: 'You are like a steady lamp — warm and focused, giving direction in the small things. ',
    wu: 'You are like a broad earthen mountain — dependable and accommodating. ',
    ji: 'You are like fertile soil — nurturing and patient, quietly helping others flourish. ',
    geng: 'You are like unworked ore — strong and decisive, the one who holds firm when it counts. ',
    xin: 'You are like fine jade — sharp and discerning, attentive to nuance and quality. ',
    ren: 'You are like a flowing river — broad-minded and far-sighted, always moving onward. ',
    gui: 'You are like fine rain and dew — perceptive and gentle, nourishing without a sound. ',
  },
  patternFlavor: {
    正官格: 'You also carry the discipline of 正官 — valuing responsibility and order. ',
    七杀格: 'You also carry the drive of 七杀 — bold, daring, hard to knock down. ',
    正印格: 'You also carry the depth of 正印 — valuing learning and loyalty. ',
    偏印格: 'You also carry the ingenuity of 偏印 — good at finding another way through. ',
    正财格: 'You also carry the pragmatism of 正财 — building steadily, little by little. ',
    偏财格: 'You also carry the flexibility of 偏财 — quick to spot an opportunity. ',
    食神格: 'You also carry the ease of 食神 — enjoying the process, warm and good-humoured. ',
    伤官格: 'You also carry the flair of 伤官 — expressive, unwilling to settle. ',
    建禄格: 'You also carry the self-reliance of 建禄 — standing on your own feet. ',
    阳刃格: 'You also carry the force of 阳刃 — strong in a burst, ready to commit. ',
  },
  strengthGuidance: {
    weak: (els) => `The chart leans weak, so it most needs the warmth and support of ${els}: you do your best work with a clear direction and something solid to lean on.`,
    balanced: (els) => `The chart is fairly balanced, with room to move either way: following the direction of ${els} tends to go most smoothly.`,
    strong: (els) => `The chart leans strong and full of energy, so it needs ${els} as an outlet: aim that drive in the right place and things come together.`,
  },
  favorableHint: {
    weak: 'Warmth · direction · solid support',
    balanced: 'Momentum · leverage · steady progress',
    strong: 'Outlets · channels · aimed effort',
  },
  eraLabels: [
    'Childhood foundation',
    'Formative years',
    'Early career',
    'Core responsibility years',
    'Prime growth years',
    'Harvest years',
    'Consolidation years',
    'Later, settled years',
  ],
  currentPrefix: 'Current · ',
  tenGodFlavor: {
    正官: '正官 is in charge — responsibility, rules and others’ expectations all grow heavier. ',
    七杀: '七杀 dominates — pressure and challenge concentrate here, and it tempers you most. ',
    正财: '正财 is in play — a season for pragmatic, steady building. ',
    偏财: '偏财 is in play — opportunities and cash flow are lively, but so are distractions. ',
    正印: '正印 protects you — mentors, study and recovery all grow stronger. ',
    偏印: '偏印 is in play — a good time for deep work, pivots and unconventional paths. ',
    食神: '食神 is in play — an expansive, focused, enjoy-the-process season. ',
    伤官: '伤官 is in play — talent and expression run high, and so does a sharp edge. ',
    比肩: '比肩 is in play — you push forward on your own strength and that of peers. ',
    劫财: '劫财 is in play — competition and cooperation interweave; be careful with money. ',
  },
  weakUnderPressure: 'With a weaker chart the load feels heavy here — lean on others rather than forcing it. ',
  natureGuidance: {
    supportive: 'Move with the current and push actively — this is a season that delivers.',
    steady: 'The pace is even; a time to accumulate and consolidate, without forcing speed.',
    watch: 'Observe and tread steadily, avoid overreaching — laying a firm base matters more.',
    blocked: 'Resistance runs high; hold rather than attack, and avoid major risky decisions.',
    turning: 'You are at a turning point — one chapter closes; prepare for the next.',
  },
  windowBadge: {
    supportive: 'Opportunity',
    steady: 'Steady progress',
    watch: 'Watch & slow',
    blocked: 'Headwinds',
    turning: 'Turning point',
  },
  windowNarrative: {
    supportive: 'Energy flows and opportunities cluster — a window worth taking the initiative in. Good for advancing work, starting plans, and longer-term moves.',
    steady: 'Largely steady; proceed methodically. A good time to consolidate and accumulate.',
    watch: 'A slower transitional stretch — observe, repair and accumulate rather than rush. Use it to build up for the next rise.',
    blocked: 'More friction than usual, with bumps in relationships or health. Hold your ground, keep the pace, and avoid big investments or risky bets.',
    turning: 'A turning window — one situation wraps up and a new direction opens; weigh major decisions here.',
  },
};

const CONTENT: Record<UiLanguage, NarrativeContent> = { zh: ZH, en: EN };

export interface MingJingNarrative {
  archetype(chart: MingJingChart): Archetype;
  eraLabel(period: DayunPeriodFeature): string;
  phaseNarrative(period: DayunPeriodFeature, strengthClass: StrengthClass): string;
  windowBadge(window: LiuNianWindow): string;
  windowNarrative(window: LiuNianWindow): string;
}

export function useMingJingNarrative(): MingJingNarrative {
  const { i18n } = useTranslation();
  const lang = uiLanguageFromI18nLanguage(i18n.resolvedLanguage ?? i18n.language);
  const c = CONTENT[lang];
  const elementLabels = getProductCopy(lang).mingjing.fiveElements.labels;
  const joinEls = (els: readonly FiveElement[]): string =>
    els.map((el) => elementLabels[el]).join(c.elementJoin);

  return {
    archetype(chart) {
      const dayPillar = chart.natal_chart.day_pillar;
      if (!dayPillar) {
        // A validated MingJingChart always carries the day pillar; fail closed
        // rather than render a placeholder identity.
        throw new Error('MingJingChart missing day_pillar');
      }
      const dayStem = dayPillar.stem;
      const dayElement = STEM_ELEMENT[dayStem];
      const cls = strengthClassOf(chart.interpretation.strength.band);
      const yong = chart.interpretation.yong_shen;
      const favorable = dedupeElements([...yong.yong, ...yong.xi]);
      const adverse = dedupeElements([...yong.ji]);
      const favorableForText = favorable.length > 0 ? favorable : [dayElement];
      return {
        title: c.archetypeTitle[dayElement][cls],
        persona:
          c.stemPersona[dayStem] +
          c.patternFlavor[chart.pattern.name] +
          c.strengthGuidance[cls](joinEls(favorableForText)),
        dayMaster: c.dayMasterWord(STEM_HANZI[dayStem], elementLabels[dayElement]),
        patternTag: chart.pattern.name,
        strengthTag: c.strengthTag[cls],
        strengthClass: cls,
        favorable,
        adverse,
        favorableHint: c.favorableHint[cls],
      };
    },
    eraLabel(period) {
      const label = c.eraLabels[eraBucket(period.start_age)];
      return period.is_current ? `${c.currentPrefix}${label}` : label;
    },
    phaseNarrative(period, strengthClass) {
      const flavor = c.tenGodFlavor[period.stem_ten_god] ?? '';
      const underPressure =
        strengthClass === 'weak' && (period.nature === 'blocked' || period.nature === 'watch')
          ? c.weakUnderPressure
          : '';
      return `${flavor}${underPressure}${c.natureGuidance[period.nature]}`.trim();
    },
    windowBadge(window) {
      return c.windowBadge[window.nature];
    },
    windowNarrative(window) {
      return c.windowNarrative[window.nature];
    },
  };
}

function dedupeElements(els: readonly FiveElement[]): FiveElement[] {
  const out: FiveElement[] = [];
  for (const el of els) if (!out.includes(el)) out.push(el);
  return out;
}
