// SJG-ASTRO-04 — RiJing daily mirror generator.
//
// Consumes the algorithm-agnostic common driver surface (dated tendency drivers
// + stage drivers) and the active concern tags, emitting a RiJingMirrorOutput.
// It never reads method_evidence; the engine projects per-concern daily tendency
// into common.yuejing_tendency_drivers. Runtime AI may refine prose downstream.

import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { ConcernTag } from '../../domain/concern-tag.ts';
import type {
  RiJingConcernProjection,
  RiJingMirrorOutput,
  TendencyClass,
} from '../../domain/mirror-output.ts';
import { type StageResult } from './stage-result.ts';

export interface RiJingGenerateInput {
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly active_concern_tags: readonly ConcernTag[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
}

const TENDENCY_LABELS: Record<TendencyClass, string> = {
  supportive: '助力',
  steady: '平稳',
  watch: '观照',
  blocked: '整理',
  turning: '转向',
};

const STAGE_SUMMARIES: Record<string, string> = {
  进时: '顺势启程',
  收时: '沉淀收束',
  养时: '修养蓄力',
  转时: '柔和转向',
  守时: '稳守当下',
};

const STAGE_IMAGES: Record<string, string> = {
  进时: '像晨光推开窗，适合把心里已经想清楚的事往前递一步',
  收时: '像把散落在桌面的纸页慢慢归拢，适合复盘、确认与收束',
  养时: '像一方刚浇过水的土壤，真正的力量正在安静地往根部走',
  转时: '像风向轻轻转过街角，适合调整说法、路线和期待',
  守时: '像夜里一盏稳定的灯，提醒你先守住节奏，再看下一步',
};

function stageSummary(stageLabels: readonly string[]): string {
  const first = stageLabels[0] ?? '守时';
  return STAGE_SUMMARIES[first] ?? '稳住节奏';
}

function stageImage(stageLabels: readonly string[]): string {
  const first = stageLabels[0] ?? '守时';
  return STAGE_IMAGES[first] ?? STAGE_IMAGES['守时'];
}

function tendencyTone(tendency: TendencyClass): string {
  switch (tendency) {
    case 'supportive':
      return '外界的回应比想象中更容易形成助力，只要你把请求说清楚，就会有人愿意接住。';
    case 'steady':
      return '稳定不是停滞，而是给判断留出余地，让每一步都有可确认的落点。';
    case 'watch':
      return '需要观察的地方并不是警讯，它更像提醒你慢半拍，看清细节再表态。';
    case 'blocked':
      return '阻力适合被看作清理旧线索的机会，先减掉不必要的承诺，空间自然会回来。';
    case 'turning':
      return '转向正在发生，别急着给变化下结论，先把它当成重新选择姿态的窗口。';
  }
}

function concernText(tag: ConcernTag): string {
  return [tag.label, tag.prompt_text, ...tag.parsed_topics].join(' ').toLowerCase();
}

function concernKind(tag: ConcernTag): 'career' | 'body' | 'family' | 'love' | 'wealth' | 'general' {
  const text = concernText(tag);
  if (text.includes('事业') || text.includes('career') || text.includes('work')) return 'career';
  if (text.includes('身体') || text.includes('健康') || text.includes('body') || text.includes('health')) return 'body';
  if (text.includes('家人') || text.includes('家庭') || text.includes('family')) return 'family';
  if (text.includes('姻缘') || text.includes('关系') || text.includes('love') || text.includes('relationship')) return 'love';
  if (text.includes('财富') || text.includes('金钱') || text.includes('money') || text.includes('wealth')) return 'wealth';
  return 'general';
}

function projectionSummary(tag: ConcernTag, tendency: TendencyClass): string {
  const tone = tendencyTone(tendency);
  switch (concernKind(tag)) {
    case 'career':
      return `工作里的${TENDENCY_LABELS[tendency]}更适合落到清晰表达上。会议发言前先写下三句核心判断，发邮件时把背景、请求和截止点分开说，合作沟通就会少一些猜测、多一些可推进的默契。${tone}`;
    case 'body':
      return `身体会用很细的方式提醒你回到自己这里。喝水、按时吃午餐、在楼下散步十分钟，或者会议间隙做几次深呼吸，都会让神经从紧绷里松开一点。${tone}`;
    case 'family':
      return `家人之间不必靠大道理靠近，今天更适合从一顿晚餐、一个电话或一句“你最近怎么样”开始。把评判先放低，多听对方说完，熟悉的关系会重新长出柔软的空间。${tone}`;
    case 'love':
      return `亲密关系里的重点不在猜对方心意，而在让真实感受有安稳的出口。可以约一次轻松散步，也可以把想说的话写成几句平实的信息，温柔但明确地表达边界和期待。${tone}`;
    case 'wealth':
      return `金钱相关的判断适合慢一点，把账单、订阅和近期想买的东西列出来看。所谓取舍，不是压抑需求，而是把资源留给真正能滋养你生活质量的地方。${tone}`;
    case 'general':
      return `${tag.label} 可以先从一个具体场景切入：一段对话、一封需要回复的信息，或一件拖了很久的小事。不要急着把今天定义成成败，先把能掌握的部分整理好。${tone}`;
  }
}

function projectionRecommendations(tag: ConcernTag): readonly string[] {
  switch (concernKind(tag)) {
    case 'career':
      return ['开会前写下三句最想传达的结论。', '重要邮件先检查请求、边界和下一步是否清楚。'];
    case 'body':
      return ['午后给自己十分钟散步或拉伸。', '把水杯放到手边，先照顾好呼吸和节奏。'];
    case 'family':
      return ['晚餐或睡前给家人一个不催促的电话。', '听完对方的话，再说自己的想法。'];
    case 'love':
      return ['把想确认的感受说具体，不用让对方猜。', '留一点轻松相处的时间，不急着定论。'];
    case 'wealth':
      return ['先整理一项自动扣费或近期账单。', '把想消费的东西分成需要、滋养和冲动三类。'];
    case 'general':
      return [`先为${tag.label}选一个今天能完成的小动作。`, '把复杂感受写成一句能执行的话。'];
  }
}

function dailyOverview(stageLabels: readonly string[], tendencies: readonly TendencyClass[]): string {
  const dominant = tendencies[0] ?? 'steady';
  return [
    `今天的时间气息${stageImage(stageLabels)}。`,
    `${stageSummary(stageLabels)}并不要求你把所有问题立刻解决，它更像一段留白，让心绪沉下来，让真正重要的顺序浮出水面。`,
    `${tendencyTone(dominant)}`,
    '把注意力放回可选择、可沟通、可照顾的小处，运势就会从抽象的判断变成你手里具体的方向。',
  ].join('');
}

export function generateRiJingOutput(
  input: RiJingGenerateInput,
): StageResult<RiJingMirrorOutput> {
  if (input.active_concern_tags.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'rijing_generate',
        kind: 'stage_invalid_input',
        detail: 'RiJing requires at least one active concern tag',
      },
    };
  }
  const common = input.feature_snapshot.common;
  const tendencyByConcern = new Map<string, TendencyClass>(
    common.yuejing_tendency_drivers.map((d) => [d.concern_tag_ref, d.tendency_class]),
  );
  const stageLabels = common.stage_drivers.map((d) => d.stage_label);

  const projections: RiJingConcernProjection[] = input.active_concern_tags.map((tag) => {
    const tendency = tendencyByConcern.get(tag.id) ?? 'steady';
    return {
      concern_tag_ref: tag.id,
      tendency_class: tendency,
      summary: projectionSummary(tag, tendency),
      recommendations: projectionRecommendations(tag),
    };
  });
  const tendencies = projections.map((projection) => projection.tendency_class);

  const output: RiJingMirrorOutput = {
    mirror_kind: 'rijing',
    summary: stageSummary(stageLabels),
    daily_overview: dailyOverview(stageLabels, tendencies),
    concern_projections: projections,
    cited_event_memory_refs: [...input.cited_event_memory_refs],
    cited_plan_item_refs: [...input.cited_plan_item_refs],
    citations: [
      { method: input.feature_snapshot.method_profile.id, reference: 'rijing.daily_tendency_classification' },
    ],
  };
  return { ok: true, value: output };
}
