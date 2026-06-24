import type { TendencyClass } from '../../../domain/mirror-output.ts';

export interface TendencyLanguage {
  readonly tagline: string;
  readonly body: string;
  readonly mainline: string;
  readonly suitable: string;
  readonly unsuitable: string;
  readonly review: string;
  readonly avoid: readonly string[];
}

export const TENDENCY_LANGUAGE: Record<TendencyClass, TendencyLanguage> = {
  supportive: {
    tagline: '顺势推进，把握窗口',
    body: '本期助力窗口较多，适合把已经确认过的事情放到前台主动推进。',
    mainline: '本轮助力窗口较多，适合把已经确认过的事情放到前台推进。',
    suitable: '适合推进需要表达、确认资源、见面沟通或提交成果的动作。',
    unsuitable: '不适合把所有关键动作挤在同一天，仍要给观察日和阻滞日留缓冲。',
    review: '哪些动作在助力日得到真实反馈，哪些只是因为一时顺手才被放大？',
    avoid: ['把所有关键动作挤在同一天', '只凭一时顺手就连续加码', '忽略观察日与阻滞日的缓冲'],
  },
  steady: {
    tagline: '连续推进，小步见效',
    body: '本期整体节奏平稳，适合有节奏地推进，小步积累看得见的结果。',
    mainline: '本轮主节奏偏稳，适合用连续的小步换取可确认的结果。',
    suitable: '适合固定节奏、维护长期动作、复盘既有安排并小幅推进。',
    unsuitable: '不适合因为单日助力就突然加码，低损耗比短期冲刺更重要。',
    review: '这一阶段最值得保留下来的稳定动作是什么，哪些消耗可以删掉？',
    avoid: ['因为单日顺手就突然加码', '用短期冲刺替代稳定节奏', '在节奏未稳时硬推关键决定'],
  },
  watch: {
    tagline: '先看清楚，再决定',
    body: '本期更适合校准节奏，先看清反馈与细节，再决定是否加速。',
    mainline: '本轮更适合校准节奏，先看清反馈再决定是否加速。',
    suitable: '适合检查沟通、承诺、身体负荷和资源安排里的不确定点。',
    unsuitable: '不适合急着定性、催促结果或把一次反馈当成长期判断。',
    review: '哪些信号重复出现了两次以上，哪些只是单日情绪或环境干扰？',
    avoid: ['急于下结论、做重大决定', '把单次反馈当成长期判断', '在观察日急于给结果定性'],
  },
  turning: {
    tagline: '留意拐点，预留调整',
    body: '本期有转向信号，旧节奏可能需要重新评估，调整时记得预留空间。',
    mainline: '本轮有转向信号，旧节奏可能需要被重新评估。',
    suitable: '适合记录变化点，判断它来自机会、边界变化还是节奏切换。',
    unsuitable: '不适合用过去的处理方式硬套新局面，调整要预留空间。',
    review: '转向日前后，自己的选择、他人的回应或外部条件哪里发生了变化？',
    avoid: ['用旧节奏硬套新局面', '在拐点未明时仓促承诺', '忽略反复出现的变化信号'],
  },
  blocked: {
    tagline: '稳住为先，收束止损',
    body: '本期阻力偏重，优先把重心放在止损、复核和保留余地上。',
    mainline: '本轮阻力偏重，优先级应放在止损、复核和保存余地。',
    suitable: '适合收束高消耗事项、复核关键材料、延后非必要承诺。',
    unsuitable: '不适合硬碰硬、逼问、冲动承诺或一次性投入过多资源。',
    review: '哪些阻力来自外部条件，哪些来自自己本来就可以提前收束的消耗？',
    avoid: ['硬碰硬、逼问或强行推进', '在阻力最重处一次性投入过多', '忽略身体与情绪的透支信号'],
  },
};

// ④ 关注行动 — the 30-day window split into four functional phases. The arc
// is position-based (a stable monthly cadence), independent of the tendency
// mix: each phase still derives its own dominant tendency for the accent color
// and dot, but its role, theme and 适合/不适合 come from this table so the
// timeline reads as a coherent "where are we in the month" narrative.
export interface PhaseArcRole {
  readonly name: string;
  readonly theme: string;
  readonly suitable: string;
  readonly unsuitable: string;
}

export const PHASE_ARC: readonly PhaseArcRole[] = [
  {
    name: '记录变化',
    theme: '观察与记录，摸清节奏与变化',
    suitable: '记录变化、收集信息、整理思路',
    unsuitable: '急于下结论、推动关键决策',
  },
  {
    name: '表达确认',
    theme: '表达与澄清，确认共识与方向',
    suitable: '沟通确认、反馈调整、推进协作',
    unsuitable: '冲动表态、强行推进、忽略反馈',
  },
  {
    name: '稳定执行',
    theme: '落实执行，维持节奏与协同',
    suitable: '执行推进、分工协作、稳步落地',
    unsuitable: '频繁变动、临时改方向',
  },
  {
    name: '收束复盘',
    theme: '收尾与复盘，总结成果与调整',
    suitable: '复盘总结、优化流程、收尾收束',
    unsuitable: '新开大项目、重大变动',
  },
];

// Short briefs for the ② 关键日期窗口 cards. One concise line each, distinct
// from the longer TENDENCY_LANGUAGE.suitable used elsewhere.
export const KEY_WINDOW_BRIEF = {
  push: '适合推进重要事项，主动沟通协作。',
  slow: '适合放慢节奏，谨慎判断关键决定。',
  turn: '适合记录变化，判断下一步方向。',
} as const;

export interface ConcernLanguage {
  readonly supportive: string;
  readonly steady: string;
  readonly watch: string;
  readonly turning: string;
  readonly blocked: string;
}

export const GENERIC_CONCERN_LANGUAGE: ConcernLanguage = {
  supportive: '把已经明确的事往前推，让行动落到可确认的节点上。',
  steady: '维持已有节奏，把基础动作做稳定，不必额外制造变化。',
  watch: '多观察反馈与细节，先校准节奏，再决定是否加速。',
  turning: '识别方向变化，把新信号记录下来，避免用旧节奏处理新局面。',
  blocked: '收束、复盘并保留余地，不要在阻力最重的位置硬推。',
};

export const CONCERN_LANGUAGE_BY_LABEL: Record<string, ConcernLanguage> = {
  姻缘: {
    supportive: '增加真实接触，把话说清楚，推进见面、确认边界或修复沟通。',
    steady: '维持稳定互动，让关系在低压节奏里自然显形。',
    watch: '观察对方回应与自己的情绪波动，暂缓给关系下结论。',
    turning: '留意关系角色、距离或表达方式的变化，新信号比旧判断更重要。',
    blocked: '降低拉扯，暂停追问和施压，把边界与期待先放回自己这里。',
  },
  事业: {
    supportive: '推进协作、提交方案、争取资源，把想法落到可执行安排。',
    steady: '维护既有工作流，处理例行产出和长期建设。',
    watch: '检查沟通成本、排期和外部依赖，先把风险点摊开。',
    turning: '识别岗位、项目或合作关系里的换轨信号，预留调整空间。',
    blocked: '减少正面硬碰，把重心放在复盘、补材料和等待结构松动。',
  },
  身体: {
    supportive: '恢复规律作息、温和训练和主动修复，让身体节律回到可持续状态。',
    steady: '维持已经有效的生活作息，不必临时增加负荷。',
    watch: '观察睡眠、饮食和精力波动，及时减少透支。',
    turning: '捕捉身体状态的变化点，调整运动、休息或检查安排。',
    blocked: '优先休整，避免硬扛、熬夜和高强度消耗。',
  },
  财运: {
    supportive: '整理现金流、推进稳妥回款、做理性配置或资源整合。',
    steady: '维持预算纪律，处理固定收支与长期储备。',
    watch: '审查合同、报价、冲动消费和不确定投入。',
    turning: '留意收入结构、资源来源或合作分配方式的变化。',
    blocked: '保守处理大额承诺，先止损、延后和复核。',
  },
  学业: {
    supportive: '推进复习、提交材料、约定讨论，把知识产出落到可检查成果。',
    steady: '维持固定学习时段，做连续积累和错题整理。',
    watch: '检查理解盲区、考试信息和协作节奏，先补缺再加量。',
    turning: '留意方向、导师反馈或研究重点的变化，调整学习路径。',
    blocked: '减少临时抱佛脚和高压刷题，先修正方法与基础漏洞。',
  },
  家人: {
    supportive: '安排一次具体沟通、共同事务或照料动作，让关心落到当天。',
    steady: '维持稳定陪伴和家务节奏，少制造额外情绪波动。',
    watch: '观察家人反馈、自己的耐心和边界，先听清楚再回应。',
    turning: '留意家庭分工、照料责任或相处方式的变化，及时重排期待。',
    blocked: '避免硬劝、翻旧账或替别人做过多决定，先保留缓冲。',
  },
};

// ④ 关注行动 — per-concern 主轴 keyword + one-line summary + a concrete
// 本期行动清单. Keyed by the trimmed concern label, with a generic fallback
// for custom concerns. The checklist items reference 助力日 / 观察日 the same
// way the windows do, so the advice stays grounded in the rhythm above.
export interface ConcernAction {
  readonly axis: string;
  readonly summary: string;
  readonly checklist: readonly string[];
}

export const GENERIC_CONCERN_ACTION: ConcernAction = {
  axis: '节奏',
  summary: '以稳定节奏为主，把这个关注的关键动作安排在合适的窗口。',
  checklist: [
    '明确这个关注本期最想推进的一件事',
    '把关键动作安排在助力日',
    '在观察日先观察再决定',
    '避免在阻力日硬推或下定论',
  ],
};

export const CONCERN_ACTION_BY_LABEL: Record<string, ConcernAction> = {
  姻缘: {
    axis: '沟通',
    summary: '以真实沟通为主，让关系在合适的节奏里自然推进。',
    checklist: [
      '安排一次真实接触或深入对话',
      '把重要表达放在助力日',
      '先观察对方回应再下判断',
      '避免在观察日追问或施压',
    ],
  },
  事业: {
    axis: '推进',
    summary: '以稳步推进为主，把想法落到可执行、可确认的安排上。',
    checklist: [
      '拆出一个本期最想推进的关键动作',
      '把对外沟通安排在助力日',
      '在观察日先复核排期与依赖',
      '避免在阻力日强行推进硬碰',
    ],
  },
  身体: {
    axis: '节律',
    summary: '以恢复节律为主，维持可持续的作息与精力管理。',
    checklist: [
      '固定一项可持续的作息或运动',
      '把高强度安排避开观察日',
      '记录一次明显的状态变化',
      '避免在阻力日熬夜或硬扛',
    ],
  },
  财运: {
    axis: '稳健',
    summary: '以稳健为主，理性安排现金流与重要的资源决定。',
    checklist: [
      '梳理一次现金流与近期收支',
      '把重要的资源决定放在助力日',
      '在观察日复核合同与报价',
      '避免在阻力日做大额承诺',
    ],
  },
  学业: {
    axis: '积累',
    summary: '以持续积累为主，把学习落到可检查的成果上。',
    checklist: [
      '固定一段连续的学习时间',
      '把需要产出的任务放在助力日',
      '在观察日补齐理解盲区',
      '避免在阻力日临时抱佛脚',
    ],
  },
  家人: {
    axis: '陪伴',
    summary: '以陪伴和理解为主，维持关系温度与信任感。',
    checklist: [
      '安排一次轻量陪伴',
      '记录一次明显情绪变化',
      '把重要沟通放在助力日',
      '避免在观察日做关系定性',
    ],
  },
};
