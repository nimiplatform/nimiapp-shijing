// Temporary mock RuntimeAiClient — synthesizes a realistic AstrologyOutput
// from the deterministic AstrologyFeatureSnapshot so the UI can be
// previewed before the real Nimi runtime AI adapter is wired. Swap this
// for the SDK-backed adapter in `runtime-ai-sdk-factory.ts` once AI is
// online. The mock NEVER bypasses the deterministic pipeline: hashes,
// uncertainty, validateReading and persistence still run end-to-end.

import type {
  AstrologyFeatureSnapshot,
  EarthlyBranch,
  GanzhiPillar,
  HeavenlyStem,
  KeyWindowFeature,
  ShijingStageLabel,
  SubjectFeatureSnapshot,
} from '../../domain/algorithm.ts';
import type {
  AstrologyCitation,
  AstrologyOutput,
  Highlight,
  Recommendation,
  RecommendationHorizon,
} from '../../domain/reading.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import type {
  RuntimeAiClient,
  RuntimeAiRequest,
  RuntimeAiResult,
} from './runtime-ai-client.ts';

const STEM_CN: Record<HeavenlyStem, string> = {
  jia: '甲', yi: '乙', bing: '丙', ding: '丁', wu: '戊',
  ji: '己', geng: '庚', xin: '辛', ren: '壬', gui: '癸',
};

const BRANCH_CN: Record<EarthlyBranch, string> = {
  zi: '子', chou: '丑', yin: '寅', mao: '卯', chen: '辰', si: '巳',
  wu: '午', wei: '未', shen: '申', you: '酉', xu: '戌', hai: '亥',
};

const STEM_ELEMENT: Record<HeavenlyStem, string> = {
  jia: '木', yi: '木',
  bing: '火', ding: '火',
  wu: '土', ji: '土',
  geng: '金', xin: '金',
  ren: '水', gui: '水',
};

const STAGE_BLURB: Record<ShijingStageLabel, { headline: string; tone: string }> = {
  进时: {
    headline: '势能向前推进',
    tone: '可顺势承担一项之前犹豫的事，但留意节奏不要透支。',
  },
  收时: {
    headline: '宜收束、归档与复盘',
    tone: '把手上的尾巴清理完，比启动新事更有回报。',
  },
  养时: {
    headline: '修复与积蓄的日子',
    tone: '低耗动作为先，把注意力回到睡眠、饮食、关系修补。',
  },
  转时: {
    headline: '处于转折与切换的时刻',
    tone: '决策窗口短而清晰，先确认方向再用力。',
  },
  守时: {
    headline: '保持既定节奏',
    tone: '不必做新动作，把昨日的判断稳定执行即可。',
  },
};

const KEY_WINDOW_LABEL_CN: Record<KeyWindowFeature['label'], string> = {
  transition: '转换窗口',
  support: '承托窗口',
  closure: '收束窗口',
  maintenance: '守成窗口',
};

function pillarLabel(pillar: GanzhiPillar | undefined): string {
  if (!pillar) return '—';
  return `${STEM_CN[pillar.stem]}${BRANCH_CN[pillar.branch]}`;
}

function pillarElement(pillar: GanzhiPillar | undefined): string | undefined {
  if (!pillar) return undefined;
  return STEM_ELEMENT[pillar.stem];
}

function formatLocalDate(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat('zh-CN-u-ca-gregory', {
      timeZone,
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  } catch {
    return iso;
  }
}

function buildSummary(
  subject: SubjectFeatureSnapshot,
  snapshot: AstrologyFeatureSnapshot,
): string {
  const stage = STAGE_BLURB[snapshot.stage_label];
  const dayMaster = subject.natal_chart.day_master;
  const dayMasterText = dayMaster
    ? `日主${STEM_CN[dayMaster]}（${STEM_ELEMENT[dayMaster]}）`
    : '日主资料未足';
  const annual = subject.cycle_snapshot.annual_pillar;
  const annualText = annual ? `年柱${pillarLabel(annual)}` : '年柱待补';
  const currentDayun = subject.dayun?.current_pillar;
  const dayunText = currentDayun
    ? `当前大运${pillarLabel(currentDayun)}`
    : '大运信息暂不展开';
  return [
    `${dayMasterText}，${annualText}，${dayunText}。`,
    `今日处于「${snapshot.stage_label}」阶段——${stage.headline}。`,
    stage.tone,
  ].join('');
}

function buildHighlights(
  subjectRef: SubjectRef,
  subject: SubjectFeatureSnapshot,
  snapshot: AstrologyFeatureSnapshot,
): Highlight[] {
  const out: Highlight[] = [];
  const todayPillar = subject.cycle_snapshot.daily_pillars[0]?.pillar;
  const monthly = subject.cycle_snapshot.monthly_pillars[0]?.pillar;
  const dayMaster = subject.natal_chart.day_master;

  if (todayPillar) {
    const element = pillarElement(todayPillar);
    out.push({
      label: `今日柱 · ${pillarLabel(todayPillar)}`,
      body: element
        ? `日柱五行偏${element}，与日主${dayMaster ? STEM_CN[dayMaster] : '本气'}互动较突出，关注此类话题的进展。`
        : `今日干支为${pillarLabel(todayPillar)}，可作为日内节奏参考。`,
      subject_ref: subjectRef,
    });
  }

  if (monthly) {
    out.push({
      label: `月令 · ${pillarLabel(monthly)}`,
      body: `本月底层节律由${pillarLabel(monthly)}主导，建议把本周的核心安排对齐到这条主线。`,
      subject_ref: subjectRef,
    });
  }

  const driver = subject.stage_drivers[0];
  if (driver) {
    out.push({
      label: `阶段驱动 · ${driver.stage_label}`,
      body: `主导信号为「${driver.marker_kind}」，强度${driver.strength}。这是当前阶段判断的核心依据。`,
      subject_ref: subjectRef,
    });
  }

  const window = snapshot.key_windows[0];
  if (window) {
    const timeZone = snapshot.time_window.basis_time_zone || 'Asia/Shanghai';
    out.push({
      label: `${KEY_WINDOW_LABEL_CN[window.label]} · ${window.driver}`,
      body: `关注窗口 ${formatLocalDate(window.start_utc, timeZone)} — ${formatLocalDate(window.end_utc, timeZone)}，可在此段内做对应取舍。`,
      subject_ref: subjectRef,
    });
  }

  if (out.length === 0) {
    out.push({
      label: `阶段 · ${snapshot.stage_label}`,
      body: '资料尚未完整，仅以阶段标签作粗判，建议补齐出生时间后重新生成。',
      subject_ref: subjectRef,
    });
  }
  return out;
}

function buildRecommendations(
  subjectRef: SubjectRef,
  stage: ShijingStageLabel,
): Recommendation[] {
  const recsByStage: Record<ShijingStageLabel, ReadonlyArray<{ body: string; horizon: RecommendationHorizon }>> = {
    进时: [
      { body: '挑一件已经准备好的事推进一步，今天的进度比完美度更值钱。', horizon: 'today' },
      { body: '本周可以主动约一次关键人物的对谈，明确彼此预期。', horizon: 'this_week' },
      { body: '为本月留出 1-2 个里程碑节点，避免势头被琐事稀释。', horizon: 'this_month' },
    ],
    收时: [
      { body: '今日把未完结的小事归档：邮件、对账、未回的消息。', horizon: 'today' },
      { body: '本周做一次主动的复盘，识别哪些动作不再带来回报。', horizon: 'this_week' },
      { body: '长期上，整理记录系统，使过往经验更容易被未来取用。', horizon: 'long_term' },
    ],
    养时: [
      { body: '今日把节奏放慢一档，优先恢复睡眠与基础饮食。', horizon: 'today' },
      { body: '本周减少需要高强度社交的场合，留出独处时间。', horizon: 'this_week' },
      { body: '本月里安排一次完整的健康自检或体检。', horizon: 'this_month' },
    ],
    转时: [
      { body: '今日不急于行动，先用半天把方向想清楚再发出指令。', horizon: 'today' },
      { body: '本周内完成关键选择的对比，留出书面记录。', horizon: 'this_week' },
      { body: '长期上，把这次切换的判断标准沉淀成可复用的清单。', horizon: 'long_term' },
    ],
    守时: [
      { body: '今日按既定计划执行，避免临时增减事项。', horizon: 'today' },
      { body: '本周把例行事项的流程再优化一轮，降低未来的摩擦。', horizon: 'this_week' },
      { body: '本月里保持节奏稳定，让积累自然形成。', horizon: 'this_month' },
    ],
  };
  return recsByStage[stage].map((entry) => ({
    body: entry.body,
    subject_ref: subjectRef,
    horizon: entry.horizon,
  }));
}

function buildCitations(): AstrologyCitation[] {
  return [
    { method: 'bazi_ganzhi_jieqi_dayun_v1', reference: '八字干支节气大运法 · 守时阶段判定' },
    { method: 'bazi_ganzhi_jieqi_dayun_v1', reference: '节气分界与日柱五行流转参考' },
  ];
}

function synthesizeAstrologyOutput(request: RuntimeAiRequest): AstrologyOutput {
  const snapshot = request.feature_snapshot;
  const subject = snapshot.subjects[0];
  if (!subject) {
    return {
      summary: '资料尚未足够生成解读，请补齐出生信息后再试。',
      highlights: [],
      recommendations: [],
      citations: buildCitations(),
    };
  }
  const subjectRef = subject.subject;
  return {
    summary: buildSummary(subject, snapshot),
    highlights: buildHighlights(subjectRef, subject, snapshot),
    recommendations: buildRecommendations(subjectRef, snapshot.stage_label),
    citations: buildCitations(),
  };
}

export interface MockRuntimeAiClientOptions {
  readonly delayMs?: number;
}

export class MockRuntimeAiClient implements RuntimeAiClient {
  readonly adapter_kind = 'mock_preview_v1' as const;
  readonly #delayMs: number;

  constructor(options: MockRuntimeAiClientOptions = {}) {
    this.#delayMs = options.delayMs ?? 600;
  }

  async generate(request: RuntimeAiRequest): Promise<RuntimeAiResult> {
    if (this.#delayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, this.#delayMs));
    }
    return { ok: true, output: synthesizeAstrologyOutput(request) };
  }
}
