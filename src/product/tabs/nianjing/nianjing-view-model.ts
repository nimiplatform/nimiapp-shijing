import type {
  NianJingInflectionKind,
  NianJingInflectionPoint,
  NianJingMirrorOutput,
  NianJingNature,
  NianJingPhaseBand,
} from '../../../domain/mirror-output.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import { NIANJING_INFLECTION_KIND_LABELS } from '../../i18n/copy.ts';

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateToMs(date: string): number {
  return Date.parse(date + 'T00:00:00Z');
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

// Severity ordering for picking the dominant *current* phase nature
// across concerns. Higher score = more notable → wins the headline
// slot in the hero card. Matches `yuejing-tab.tsx::TENDENCY_SEVERITY`
// so the cross-mirror "what should the user notice first" priority
// reads identically.
export const NATURE_SEVERITY: Record<NianJingNature, number> = {
  blocked: 4,
  turning: 3,
  watch: 2,
  supportive: 1,
  steady: 0,
};

export const HERO_BODY_BY_NATURE: Record<NianJingNature, string> = {
  supportive: '整体助力,长程红利逐步释放,适合主动布局。',
  steady: '整体平稳,适合按既定方向稳步推进。',
  watch: '需持续观察,留意节奏调整与外缘变化。',
  blocked: '长程阻滞,宜守不宜攻,等待结构松动。',
  turning: '处于转折,留意拐点信号并把握窗口期。',
};

export const INFLECTION_KIND_LABELS = NIANJING_INFLECTION_KIND_LABELS;

// Structured guidance per phase nature. Drives the "结论 → 解释 →
// 行动建议 → 提醒" drawer rendering. `{concern}` placeholders are
// substituted at render time with the active concern's label so each
// sentence reads as if written for that specific area of life.
export interface NatureGuidanceItem {
  readonly title: string;
  readonly description: string;
}

interface NatureGuidance {
  readonly oneLine: string;
  readonly meaning: string;
  readonly keywords: readonly string[];
  readonly suggestions: readonly NatureGuidanceItem[];
  readonly cautions: readonly NatureGuidanceItem[];
}

export const NATURE_GUIDANCE: Record<NianJingNature, NatureGuidance> = {
  supportive: {
    oneLine: '外部机会开始变多,适合主动打开{concern}局面。',
    meaning:
      '这是一段适合主动出击的{concern}助力期。外部环境、人脉机会和资源流动会更容易向你靠近,适合启动新项目、争取合作、扩大影响力。',
    keywords: ['主动出击', '资源靠近', '新机会', '建立连接'],
    suggestions: [
      {
        title: '启动新项目',
        description: '把已经酝酿的想法推到台前,开始试水和验证。',
      },
      {
        title: '争取合作资源',
        description: '主动联系关键人物、寻找合作方,或打开新的业务渠道。',
      },
      {
        title: '扩大{concern}边界',
        description: '适合尝试新的方向、机会窗口、公开表达或个人品牌建设。',
      },
    ],
    cautions: [
      {
        title: '不要只等机会出现',
        description: '助力期更像是顺风,不是自动成功。需要主动表达、主动连接、主动推进。',
      },
      {
        title: '避免过早承诺过多',
        description: '机会变多时,也容易分散精力。建议先判断资源质量,再投入长期成本。',
      },
    ],
  },
  steady: {
    oneLine: '节奏平稳,适合把{concern}基础打扎实。',
    meaning:
      '这是一段{concern}的平稳期。外部环境既没有强助力,也没有明显阻碍,大局已定、节奏可控,是夯实基础、积累实力的好时段,不需要做大的方向调整。',
    keywords: ['稳步推进', '夯实基础', '长期主义', '不慌不躁'],
    suggestions: [
      {
        title: '把基础工作做扎实',
        description: '系统化梳理流程、建立可复用的方法,为下一波动作做准备。',
      },
      {
        title: '巩固现有关系',
        description: '维护核心人脉、深化既有合作,在熟悉的圈子里加深信任。',
      },
      {
        title: '小步迭代',
        description: '不必追求大破大立,通过小幅试验持续优化,降低风险。',
      },
    ],
    cautions: [
      {
        title: '别在平稳期硬找刺激',
        description: '平稳不等于停滞。强行制造变化容易自我消耗,顺势而为更省力。',
      },
      {
        title: '警惕慢性松懈',
        description: '没有明显阻力时最容易掉以轻心。设定可衡量的小目标维持节奏。',
      },
    ],
  },
  watch: {
    oneLine: '外部信号尚不明朗,{concern}先观察、再行动。',
    meaning:
      '这是一段{concern}的观察期。多方因素正在博弈,格局未定。这时候保持耐心与敏锐度,比急于下结论或做大动作更有价值。',
    keywords: ['延后决策', '收集信息', '留意信号', '保持灵活'],
    suggestions: [
      {
        title: '广泛收集信息',
        description: '多接触不同来源的视角,不预设立场,等关键信号自然浮现。',
      },
      {
        title: '保留多个选项',
        description: '不急于把鸡蛋放进任何一个篮子,为变化预留空间。',
      },
      {
        title: '低成本试水',
        description: '用小成本、小动作探路,把"试错"控制在可承受范围内。',
      },
    ],
    cautions: [
      {
        title: '别把观察当借口',
        description: '观察期不是不作为。如果一直拖延,信号过去后机会也走了。',
      },
      {
        title: '小心信息茧房',
        description: '只听想听的会让判断失真。主动接触和自己结论相反的视角。',
      },
    ],
  },
  blocked: {
    oneLine: '大环境逆风,{concern}重在守稳与积蓄。',
    meaning:
      '这是一段{concern}的阻滞期。推进会比平时更费力,资源也容易受限。不宜强行突破,以守为攻、修内功、等待格局松动,会比硬扛更有效。',
    keywords: ['以守为攻', '修内功', '节流', '蓄能'],
    suggestions: [
      {
        title: '收缩战线',
        description: '聚焦核心目标,砍掉边缘的高消耗项目,把资源集中在最关键的事上。',
      },
      {
        title: '修内功',
        description: '用阻滞期补短板:学习、复盘、整理系统。等风向变了才能跑得动。',
      },
      {
        title: '稳住基本盘',
        description: '维护好已有的关键关系和资产,不在低谷时做大决策。',
      },
    ],
    cautions: [
      {
        title: '不要硬刚环境',
        description: '逆风时强行推进容易加速消耗。学会"暂时退一步"不是失败。',
      },
      {
        title: '警惕情绪化决策',
        description: '受挫感容易让人做出冲动的"破局"动作。重大决定建议延后。',
      },
    ],
  },
  turning: {
    oneLine: '格局正在重组,{concern}既是窗口也是分岔点。',
    meaning:
      '这是一段{concern}的转折期。旧的稳态正在解体,新的稳态尚未定型。窗口期内的关键决策会决定下一段走向——既有破局机会,也有结构性风险。',
    keywords: ['关键决策', '窗口期', '破局', '清理旧框'],
    suggestions: [
      {
        title: '审视核心方向',
        description: '借转折期重新评估目标和路径,该校准就校准,该换轨就换轨。',
      },
      {
        title: '果断决断',
        description: '该做的取舍不要拖。转折期的犹豫成本比决策错误更高。',
      },
      {
        title: '清理旧包袱',
        description: '了断不再服务于你的关系、项目、习惯,给新格局腾出空间。',
      },
    ],
    cautions: [
      {
        title: '别在转折期求稳',
        description: '试图维持旧格局往往让动荡时间更长。承认变化,主动调整。',
      },
      {
        title: '不要孤军作战',
        description: '转折期容易自我怀疑。找信得过的人讨论判断,降低盲点。',
      },
    ],
  },
};

export function substituteConcernPlaceholder(text: string, concern: string): string {
  return text.replaceAll('{concern}', concern);
}

export function formatDateDots(iso: string): string {
  return iso.replaceAll('-', '.');
}

export function bandDurationLabel(band: NianJingPhaseBand): string {
  const days = Math.max(1, Math.round((dateToMs(band.end_date) - dateToMs(band.start_date)) / 86_400_000));
  if (days >= 330) {
    const years = Math.max(1, Math.round(days / 365));
    return years === 1 ? '约 1 年' : `约 ${years} 年`;
  }
  if (days >= 60) return `约 ${Math.round(days / 30)} 个月`;
  return `约 ${days} 天`;
}

// User-facing explanations for each inflection kind. Rendered in the
// right-side drawer when the user clicks a marker — surfaces what the
// marker means in plain language without requiring the user to know
// 命理 terminology in advance.
export const INFLECTION_KIND_DESCRIPTIONS: Record<NianJingInflectionKind, string> = {
  dayun_boundary:
    '大运是十年一换的长期周期。「大运边界」标记当前十年格局结束、下一段开始的瞬间——人生主旋律、能量主线在此处发生根本性切换,是最值得关注的长程拐点。',
  annual_transition:
    '流年是一年一换的周期。「流年切换」标记从一个干支年进入下一个的瞬间,影响当年的整体走势与机遇窗口。',
  monthly_transition:
    '流月是一月一换的周期。「流月切换」标记节气交替的时刻,对短期决策与节奏调整有提示作用。',
  marker_cluster:
    '多个不同周期(大运 / 流年 / 流月)的关键节点在短时间内集中出现。「多重节点」意味着叠加效应放大,是格局转换最显著的时间窗。',
};

export function relativeTimeShort(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < 60_000) return '刚刚';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}

// Find the phase band that contains `today` for a given concern, if
// any. The lookup is a linear scan: phase counts per concern are small
// (≤ ~10 bands across a 10-year horizon).
export function currentBandFor(
  bands: readonly NianJingPhaseBand[],
  today: string,
): NianJingPhaseBand | null {
  for (const band of bands) {
    if (band.start_date <= today && today <= band.end_date) return band;
  }
  return null;
}

export function dominantCurrentNature(
  laneEntries: ReadonlyArray<{ readonly current: NianJingPhaseBand | null }>,
): NianJingNature {
  let best: NianJingNature = 'steady';
  let bestScore = -1;
  for (const entry of laneEntries) {
    if (!entry.current) continue;
    const s = NATURE_SEVERITY[entry.current.nature];
    if (s > bestScore) {
      best = entry.current.nature;
      bestScore = s;
    }
  }
  return best;
}

export function bandYearRangeLabel(band: NianJingPhaseBand): string {
  const s = yearOf(band.start_date);
  const e = yearOf(band.end_date);
  if (s === e) return `${s} 年`;
  return `${s}–${e}`;
}

// Discriminated union driving the right-side detail drawer. One slot
// covers both phase bands and inflection markers so they're mutually
// exclusive — opening one closes the other automatically — and so a
// single drawer component handles both content shapes.
export type SelectedDetail =
  | {
      readonly kind: 'band';
      readonly band: NianJingPhaseBand;
      readonly tag: ConcernTag;
    }
  | {
      readonly kind: 'inflection';
      readonly inflection: NianJingInflectionPoint;
      readonly tag: ConcernTag;
    };

export interface LaneViewModel {
  readonly tag: ConcernTag;
  readonly phases: readonly NianJingPhaseBand[];
  readonly inflections: readonly NianJingInflectionPoint[];
  readonly current: NianJingPhaseBand | null;
}

export function buildLanes(
  output: NianJingMirrorOutput,
  activeTags: readonly ConcernTag[],
  today: string,
): readonly LaneViewModel[] {
  const phasesByTag = new Map<string, NianJingPhaseBand[]>();
  const inflectionsByTag = new Map<string, NianJingInflectionPoint[]>();
  for (const phase of output.phase_bands) {
    const arr = phasesByTag.get(phase.concern_tag_ref);
    if (arr) arr.push(phase);
    else phasesByTag.set(phase.concern_tag_ref, [phase]);
  }
  for (const inflection of output.inflection_points) {
    const arr = inflectionsByTag.get(inflection.concern_tag_ref);
    if (arr) arr.push(inflection);
    else inflectionsByTag.set(inflection.concern_tag_ref, [inflection]);
  }
  // Drive lane order from the user's active-concern order (settings)
  // rather than insertion order from the generator output. Inactive
  // tags don't get a lane even if the generator referenced them.
  return activeTags.map((tag) => {
    const phases = phasesByTag.get(tag.id) ?? [];
    const inflections = inflectionsByTag.get(tag.id) ?? [];
    return {
      tag,
      phases,
      inflections,
      current: currentBandFor(phases, today),
    };
  });
}
