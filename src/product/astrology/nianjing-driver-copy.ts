import type { MethodProfileId } from '../../domain/algorithm.ts';
import type { NianJingInflectionKind, NianJingNature } from '../../domain/mirror-output.ts';
import { TENDENCY_CLASS_LABELS, NIANJING_INFLECTION_KIND_LABELS } from '../i18n/copy.ts';

export interface NianJingDriverGuidance {
  readonly method_label: string;
  readonly basis_label: string;
  readonly favorable: readonly string[];
  readonly guarded: readonly string[];
}

export interface NianJingPhaseDetailCopyItem {
  readonly title: string;
  readonly description: string;
}

export interface NianJingPhaseDetailCopy {
  readonly one_line: string;
  readonly mainline: string;
  readonly keywords: readonly string[];
  readonly suggestions: readonly NianJingPhaseDetailCopyItem[];
  readonly cautions: readonly NianJingPhaseDetailCopyItem[];
}

type ConcernDomain = 'love' | 'career' | 'health' | 'wealth' | 'family' | 'general';

interface DriverFacts {
  readonly domain: ConcernDomain;
  readonly labels: readonly string[];
  readonly method_label: string;
  readonly bazi?: {
    readonly favor: '喜' | '忌' | '平';
    readonly element: string;
    readonly ten_god: keyof typeof TEN_GOD_LABELS;
    readonly relevance: 'focused' | 'background';
  };
  readonly ziwei?: {
    readonly daxian: string;
    readonly concern_palace: string;
    readonly period: string;
    readonly transforms: readonly ZiweiTransformFact[];
  };
}

type ZiweiTransformName = '禄' | '权' | '科' | '忌';

interface ZiweiTransformFact {
  readonly transform: ZiweiTransformName;
  readonly star: string;
  readonly palace: string;
  readonly scope: '本宫' | '三方四正';
  readonly year: string;
}

const DOMAIN_LABELS: Readonly<Record<ConcernDomain, string>> = {
  love: '姻缘',
  career: '事业',
  health: '身体',
  wealth: '财运',
  family: '家宅',
  general: '全局',
};

const ELEMENT_LABELS: Readonly<Record<string, string>> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
};

const TEN_GOD_LABELS: Readonly<Record<string, string>> = {
  wealth: '财星',
  constraint: '官杀',
  resource: '印星',
  output: '食伤',
  same: '比劫',
  unknown: '十神未定',
};

const BODY_LABELS: Readonly<Record<string, string>> = {
  taiyang: '太阳',
  taiyin: '太阴',
  chenxing: '辰星',
  taibai: '太白',
  yinghuo: '荧惑',
  suixing: '岁星',
  zhenxing: '镇星',
  luohou: '罗喉',
  jidu: '计都',
  ziqi: '紫气',
  yuebei: '月孛',
};

const DOMAIN_ACTIONS: Readonly<Record<ConcernDomain, Readonly<Record<NianJingNature, string>>>> = {
  love: {
    supportive: '主动推进关系确认、沟通边界和相处节奏',
    steady: '稳定互动频率，把承诺、期待和分寸说清',
    watch: '先观察对方回应，不急着推进关系定性',
    blocked: '放慢亲密推进，先保护边界和情绪安全',
    turning: '处理关系转折点，决定靠近、修复或止损',
  },
  career: {
    supportive: '争取关键资源、上台面表达和项目推进',
    steady: '夯实职责、流程和可复用的工作成果',
    watch: '观察组织信号，先做低成本试探',
    blocked: '收缩战线，守住核心交付和职场信用',
    turning: '校准职业方向，处理岗位、合作或权责变化',
  },
  health: {
    supportive: '建立作息、运动和修复性的身体节律',
    steady: '维持基础体能，按计划复盘睡眠和精力',
    watch: '留意疲劳信号，先降低消耗再安排增量',
    blocked: '减少透支，把恢复、检查和休息放前面',
    turning: '调整长期习惯，处理身体状态的分界点',
  },
  wealth: {
    supportive: '推动收入渠道、资源配置和现金流优化',
    steady: '稳住预算、储备和可持续的收益节奏',
    watch: '观察市场与支出变化，小额验证再加码',
    blocked: '控制风险敞口，优先保现金流和必要储备',
    turning: '重排资产、支出和收入结构的优先级',
  },
  family: {
    supportive: '修复家中协作、居住安排和照护分工',
    steady: '维护家庭节奏，把规则和责任边界说清',
    watch: '观察家人状态，先缓和气氛再推进决定',
    blocked: '减少硬碰硬，优先守住家宅稳定',
    turning: '处理居住、长辈或家庭角色的变化点',
  },
  general: {
    supportive: '主动打开资源，推进已经成熟的方向',
    steady: '稳步推进基础工作，保持长期节奏',
    watch: '多收集信号，先观察再做大决定',
    blocked: '收缩消耗，守住基本盘',
    turning: '重新校准方向，清理旧结构',
  },
};

const DOMAIN_CAUTIONS: Readonly<Record<ConcernDomain, Readonly<Record<NianJingNature, string>>>> = {
  love: {
    supportive: '不要用机会期替代真实沟通和边界确认',
    steady: '不要因为平稳就忽略关系里的小裂缝',
    watch: '不要把暧昧信号直接当成承诺',
    blocked: '不要硬推关系、逼问答案或情绪化摊牌',
    turning: '不要在关系摇摆时逃避关键选择',
  },
  career: {
    supportive: '不要只等机会出现而不主动争取资源',
    steady: '不要在平稳期硬找刺激、频繁换方向',
    watch: '不要在信息不足时押上全部筹码',
    blocked: '不要硬刚组织环境或透支职场信用',
    turning: '不要拖延权责、合作和方向上的取舍',
  },
  health: {
    supportive: '不要把状态好当成可以继续透支',
    steady: '不要因为没有明显问题就放松基础维护',
    watch: '不要忽视睡眠、疼痛和精力波动的早期信号',
    blocked: '不要硬撑、熬夜或用意志力覆盖身体反馈',
    turning: '不要用短期补救替代长期习惯调整',
  },
  wealth: {
    supportive: '不要见到机会就扩大杠杆或承诺过多',
    steady: '不要在平稳现金流里制造高波动决策',
    watch: '不要听单一消息就重仓或冲动消费',
    blocked: '不要逆势扩张、借新补旧或高风险下注',
    turning: '不要在结构调整期混淆投资、消费和安全垫',
  },
  family: {
    supportive: '不要把家人的配合视为理所当然',
    steady: '不要让旧分工在沉默里积累不满',
    watch: '不要急着替家人下结论或做决定',
    blocked: '不要用硬碰硬处理家庭压力',
    turning: '不要回避居住、照护或角色变化的讨论',
  },
  general: {
    supportive: '不要只等外部机会自动成事',
    steady: '不要把平稳误读为停滞',
    watch: '不要把观察当借口',
    blocked: '不要硬刚环境',
    turning: '不要在转折期求旧稳定',
  },
};

const DOMAIN_METRIC: Readonly<Record<ConcernDomain, string>> = {
  love: '互动质量与边界感',
  career: '资源、权责和交付质量',
  health: '睡眠、精力和恢复速度',
  wealth: '现金流、风险敞口和储备',
  family: '家中协作、照护和居住稳定',
  general: '整体节奏和资源消耗',
};

type BaziTenGod = keyof typeof TEN_GOD_LABELS;

const DOMAIN_TEN_GOD_FOCUS: Readonly<
  Record<ConcernDomain, Readonly<Record<BaziTenGod, string>>>
> = {
  love: {
    wealth: '现实投入、承诺兑现与共同资源',
    constraint: '关系承诺、责任边界与稳定性',
    resource: '安全感、照顾方式与被支持感',
    output: '表达、约会互动与情感流动',
    same: '双方自主性、同辈影响与竞争感',
    unknown: '关系中的现实回应',
  },
  career: {
    wealth: '收入结果、预算资源与商业兑现',
    constraint: '职位责任、规则压力与正式授权',
    resource: '学习资质、专业支持与方法沉淀',
    output: '方案表达、作品产出与对外影响',
    same: '团队协作、同行竞争与资源分配',
    unknown: '工作中的权责与交付',
  },
  health: {
    wealth: '饮食享受、物质消耗与身体负担',
    constraint: '压力责任、紧绷感与恢复空间',
    resource: '睡眠补给、恢复支持与稳定节律',
    output: '活动释放、呼吸表达与情绪疏解',
    same: '基础体能、行动惯性与同伴带动',
    unknown: '睡眠、精力与恢复反馈',
  },
  wealth: {
    wealth: '收入机会、交易兑现与现金流',
    constraint: '合同规则、财务责任与合规成本',
    resource: '专业判断、信息支持与长期配置',
    output: '产品变现、表达获客与收入渠道',
    same: '合伙分配、竞争支出与资金占用',
    unknown: '现金流、风险敞口与储备',
  },
  family: {
    wealth: '家庭资源、日常开支与伴侣协作',
    constraint: '家庭责任、规则边界与角色压力',
    resource: '长辈支持、照护承接与家庭安全感',
    output: '子女互动、照料付出与情绪表达',
    same: '手足同辈、家庭分工与意见竞争',
    unknown: '家中分工、照护与居住稳定',
  },
  general: {
    wealth: '资源获取、结果兑现与现实投入',
    constraint: '责任、规则与外部压力',
    resource: '学习、支持与恢复能力',
    output: '表达、创造与成果输出',
    same: '自主行动、同辈协作与竞争',
    unknown: '当前最需要处理的现实议题',
  },
};

const DOMAIN_ELEMENT_ACTION: Readonly<
  Record<ConcernDomain, Readonly<Record<string, string>>>
> = {
  love: {
    wood: '给关系留出成长空间，逐步确认期待',
    fire: '把感受说清，并及时回应对方',
    earth: '用稳定陪伴和可兑现的承诺落地',
    metal: '明确边界，做出清晰取舍',
    water: '先倾听和交换信息，再决定关系节奏',
  },
  career: {
    wood: '做长期规划、补能力，并循序扩展职责',
    fire: '主动表达、争取曝光，并缩短反馈回路',
    earth: '把方案落地，稳住流程与长期承接',
    metal: '明确标准、权责和优先级',
    water: '扩大信息来源、连接资源并灵活调整',
  },
  health: {
    wood: '用舒展活动和渐进训练恢复节律',
    fire: '固定作息启动点，配合日照与适度活动',
    earth: '把饮食、睡眠和基础训练做稳定',
    metal: '减少无效消耗，为休息划清边界',
    water: '补足休息与水分，给恢复留出弹性',
  },
  wealth: {
    wood: '培育收入来源，并分阶段验证增长',
    fire: '主动沟通机会，但用快速反馈控制投入',
    earth: '稳住现金流、预算与长期储备',
    metal: '设定止损、合同边界与配置纪律',
    water: '先收集信息、保持流动性，再择机调整',
  },
  family: {
    wood: '逐步调整分工，让每个人有成长空间',
    fire: '把话说开、及时回应，并主动组织共处',
    earth: '用稳定安排承接照护与家庭责任',
    metal: '明确规则、分工和各自边界',
    water: '多听家人真实需求，再灵活协调安排',
  },
  general: {
    wood: '用规划和渐进试验推动成长',
    fire: '主动表达并及时推进关键动作',
    earth: '把决定落地并稳住长期节奏',
    metal: '明确标准、边界与取舍',
    water: '扩大信息与连接，保留调整空间',
  },
};

const ELEMENT_OVERUSE: Readonly<Record<string, string>> = {
  wood: '摊子铺得过长、只扩张不收口',
  fire: '急推、过度曝光或情绪升温',
  earth: '过度承揽、僵化守成或迟迟不动',
  metal: '控制过严、切割过快或苛责过度',
  water: '信息过载、反复犹豫或节奏失焦',
};

const DOMAIN_VERIFICATION_ACTION: Readonly<Record<ConcernDomain, string>> = {
  love: '安排一次坦诚沟通，确认一项期待或边界',
  career: '提交一份方案、谈清一项权责或争取一次资源',
  health: '连续两周记录睡眠、精力和恢复，再按反馈调整',
  wealth: '重做一次现金流表，并为一项投入设定上限',
  family: '安排一次家庭沟通，明确一项分工或照护责任',
  general: '选一件最重要的事，设定观察指标和复盘日期',
};

const NATURE_FOCUS_ACTION: Readonly<Record<NianJingNature, (focus: string) => string>> = {
  supportive: (focus) => `可主动推进${focus}`,
  steady: (focus) => `适合把${focus}做稳做细`,
  watch: (focus) => `先观察${focus}的真实变化，再低成本试探`,
  blocked: (focus) => `先缩小${focus}的风险暴露，守住底线`,
  turning: (focus) => `需要重新安排${focus}的顺序与边界`,
};

const DOMAIN_ZIWEI_TRANSFORM_FOCUS: Readonly<
  Record<ConcernDomain, Readonly<Record<ZiweiTransformName, string>>>
> = {
  love: {
    禄: '关系中的善意、投入与相处资源',
    权: '关系主导权、承诺推进与责任压力',
    科: '沟通体面、公开确认与被理解感',
    忌: '误读、执着与反复卡住的互动',
  },
  career: {
    禄: '项目资源、收入机会与可用支持',
    权: '岗位权责、决策空间与管理压力',
    科: '专业口碑、方案呈现与资质认可',
    忌: '流程阻力、权责含混与重复返工',
  },
  health: {
    禄: '恢复条件、照护资源与身体舒适度',
    权: '作息纪律、压力负荷与身体紧绷感',
    科: '状态记录、规律维护与求助意识',
    忌: '疲劳累积、恢复拖延与压力反复',
  },
  wealth: {
    禄: '收入来源、交易机会与现金流改善',
    权: '资金调度、财务责任与控制需求',
    科: '专业判断、信用记录与稳健配置',
    忌: '隐性成本、资金卡点与错误执着',
  },
  family: {
    禄: '家庭支持、居住资源与照护余裕',
    权: '家庭分工、角色主导与责任压力',
    科: '沟通体面、规则共识与安排透明度',
    忌: '旧账、误解与难以推进的家庭议题',
  },
  general: {
    禄: '资源、机会与现实支持',
    权: '权责、推进力与压力负荷',
    科: '表达、口碑与方法清晰度',
    忌: '阻力、执着与重复消耗',
  },
};

function textAfter(ref: string, prefix: string): string | null {
  return ref.startsWith(prefix) ? ref.slice(prefix.length) : null;
}

function textBetween(ref: string, prefix: string): string | null {
  const value = textAfter(ref, prefix);
  if (!value) return null;
  return value.split('@')[0] ?? value;
}

function parseZiweiTransformRef(ref: string): ZiweiTransformFact | null {
  const value = textAfter(ref, 'ziwei:daxian_transform.');
  if (!value) return null;
  const [transform, star, palace, scope, year] = value.split('@');
  if (
    (transform !== '禄' && transform !== '权' && transform !== '科' && transform !== '忌') ||
    !star ||
    !palace ||
    (scope !== '本宫' && scope !== '三方四正') ||
    !year
  ) {
    return null;
  }
  return { transform, star, palace, scope, year };
}

function parseDomain(refs: readonly string[]): ConcernDomain {
  for (const ref of refs) {
    const domain = textAfter(ref, 'bazi:domain.')
      ?? textAfter(ref, 'ziwei:domain.')
      ?? textAfter(ref, 'qizheng_siyu:domain.');
    if (
      domain === 'love' ||
      domain === 'career' ||
      domain === 'health' ||
      domain === 'wealth' ||
      domain === 'family' ||
      domain === 'general'
    ) {
      return domain;
    }
  }
  return 'general';
}

export function methodLabelFromDriverRefs(refs: readonly string[], methodId?: MethodProfileId): string {
  if (methodId === 'bazi_ziping_v1' || refs.some((ref) => ref.startsWith('bazi:'))) return '八字';
  if (methodId === 'ziwei_sanhe_v1' || refs.some((ref) => ref.startsWith('ziwei:'))) return '紫微';
  if (methodId === 'qizheng_siyu_guolao_v1' || refs.some((ref) => ref.startsWith('qizheng_siyu:'))) return '七政四余';
  return '命理引擎';
}

function driverRefLabel(ref: string): string | null {
  const baziDomain = textAfter(ref, 'bazi:domain.');
  if (baziDomain) return `${DOMAIN_LABELS[parseDomain([ref])]}取象`;

  const baziPeriod = textAfter(ref, 'bazi:period.');
  if (baziPeriod) {
    const [favor, element] = baziPeriod.split('@');
    return `用神${favor ?? ''}${element ? ` ${ELEMENT_LABELS[element] ?? element}` : ''}`.trim();
  }

  const baziTenGod = textAfter(ref, 'bazi:tenGod.');
  if (baziTenGod) return TEN_GOD_LABELS[baziTenGod] ?? baziTenGod;

  const baziRelevance = textAfter(ref, 'bazi:domain_relevance.');
  if (baziRelevance) return baziRelevance === 'focused' ? '领域命中' : '背景参考';

  if (ref.startsWith('bazi:dayun_boundary@')) return '大运边界';
  if (ref.startsWith('bazi:annual_transition@')) return '流年切换';
  if (ref.startsWith('bazi:annual_context@')) return '流年背景';

  const ziweiDaxian = textBetween(ref, 'ziwei:daxian@');
  if (ziweiDaxian) return `大限 ${ziweiDaxian}`;

  const ziweiDomain = textAfter(ref, 'ziwei:domain.');
  if (ziweiDomain) return `${DOMAIN_LABELS[parseDomain([ref])]}取象`;

  const ziweiConcernPalace = textAfter(ref, 'ziwei:concern_palace@');
  if (ziweiConcernPalace) return `${ziweiConcernPalace}宫取象`;

  const ziweiDaxianPeriod = textAfter(ref, 'ziwei:daxian_period@');
  if (ziweiDaxianPeriod) return `大限 ${ziweiDaxianPeriod}`;

  const ziweiTransform = parseZiweiTransformRef(ref);
  if (ziweiTransform) {
    return `${ziweiTransform.star}化${ziweiTransform.transform}入${ziweiTransform.palace}（${ziweiTransform.scope}）`;
  }

  const ziweiLiunian = textAfter(ref, 'ziwei:liunian@');
  if (ziweiLiunian) return `流年 ${ziweiLiunian}`;

  const qizhengDomain = textAfter(ref, 'qizheng_siyu:domain.');
  if (qizhengDomain) return `${DOMAIN_LABELS[parseDomain([ref])]}取象`;

  const qizhengBody = textAfter(ref, 'qizheng_siyu:body.');
  if (qizhengBody) return BODY_LABELS[qizhengBody] ?? qizhengBody;

  const qizhengHouse = textAfter(ref, 'qizheng_siyu:house.');
  if (qizhengHouse) return `宫位 ${qizhengHouse}`;

  const qizhengPositionClass = textAfter(ref, 'qizheng_siyu:position_class.');
  if (qizhengPositionClass) return `宫势 ${qizhengPositionClass}`;

  if (ref.startsWith('qizheng_siyu:period.long_horizon@')) return '长程周期';

  const qizhengAnnual = textAfter(ref, 'qizheng_siyu:annual_transition@');
  if (qizhengAnnual) return `年度交接 ${qizhengAnnual}`;

  return null;
}

function driverLabels(refs: readonly string[]): string[] {
  return [...new Set(refs.map(driverRefLabel).filter((label): label is string => Boolean(label)))];
}

function parseBaziFacts(refs: readonly string[]): DriverFacts['bazi'] | undefined {
  const period = refs
    .map((ref) => textAfter(ref, 'bazi:period.'))
    .find((value): value is string => Boolean(value));
  const [rawFavor, rawElement] = period?.split('@') ?? [];
  const tenGod = refs
    .map((ref) => textAfter(ref, 'bazi:tenGod.'))
    .find((value): value is string => Boolean(value));
  const relevance = refs
    .map((ref) => textAfter(ref, 'bazi:domain_relevance.'))
    .find((value): value is string => Boolean(value));
  if (
    (rawFavor !== '喜' && rawFavor !== '忌' && rawFavor !== '平') ||
    !rawElement ||
    !(rawElement in ELEMENT_LABELS) ||
    !tenGod ||
    !(tenGod in TEN_GOD_LABELS) ||
    (relevance !== 'focused' && relevance !== 'background')
  ) {
    return undefined;
  }
  return {
    favor: rawFavor,
    element: rawElement,
    ten_god: tenGod as BaziTenGod,
    relevance,
  };
}

function parseZiweiFacts(refs: readonly string[]): DriverFacts['ziwei'] | undefined {
  const daxian = refs
    .map((ref) => textAfter(ref, 'ziwei:daxian@'))
    .find((value): value is string => Boolean(value));
  const concernPalace = refs
    .map((ref) => textAfter(ref, 'ziwei:concern_palace@'))
    .find((value): value is string => Boolean(value));
  const period = refs
    .map((ref) => textAfter(ref, 'ziwei:daxian_period@'))
    .find((value): value is string => Boolean(value));
  if (!daxian || !concernPalace || !period) return undefined;
  return {
    daxian,
    concern_palace: concernPalace,
    period,
    transforms: refs
      .map(parseZiweiTransformRef)
      .filter((fact): fact is ZiweiTransformFact => Boolean(fact)),
  };
}

function driverFacts(refs: readonly string[], methodId?: MethodProfileId): DriverFacts {
  return {
    domain: parseDomain(refs),
    labels: driverLabels(refs),
    method_label: methodLabelFromDriverRefs(refs, methodId),
    ...(refs.some((ref) => ref.startsWith('bazi:')) ? { bazi: parseBaziFacts(refs) } : {}),
    ...(refs.some((ref) => ref.startsWith('ziwei:')) ? { ziwei: parseZiweiFacts(refs) } : {}),
  };
}

function baziBasisLabels(facts: DriverFacts, exactConcernLabel?: string): readonly string[] {
  if (!facts.bazi) return [];
  const element = ELEMENT_LABELS[facts.bazi.element] ?? facts.bazi.element;
  const tenGod = TEN_GOD_LABELS[facts.bazi.ten_god];
  const relevance = facts.bazi.relevance === 'focused' ? '直接命中' : '背景参考';
  const domain = concernLabel(exactConcernLabel, facts.domain);
  const marker = facts.labels.find((label) =>
    label === '大运边界' || label === '流年切换' || label === '流年背景'
  );
  return [
    `命局${facts.bazi.favor}${element}`,
    tenGod,
    `${domain}${relevance}`,
    ...(marker ? [marker] : []),
  ];
}

function ziweiBasisLabels(facts: DriverFacts, exactConcernLabel?: string): readonly string[] {
  if (!facts.ziwei) return [];
  const concern = concernLabel(exactConcernLabel, facts.domain);
  const transforms = facts.ziwei.transforms.slice(0, 2).map((item) =>
    `${item.star}化${item.transform}入${item.scope}`
  );
  return [
    `大限${facts.ziwei.daxian}`,
    `${concern}取${facts.ziwei.concern_palace}宫`,
    ...(transforms.length > 0 ? transforms : ['三方四正无四化命中']),
    facts.ziwei.period,
  ];
}

function concernLabel(value: string | undefined, domain: ConcernDomain): string {
  const trimmed = value?.trim().replace(/^#/, '');
  return trimmed || DOMAIN_LABELS[domain];
}

function periodLabel(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return '这段时间';
  const startYear = startDate.slice(0, 4);
  const endYear = endDate.slice(0, 4);
  if (startDate === `${startYear}-01-01` && endDate === `${endYear}-12-31`) {
    return startYear === endYear ? `${startYear} 年` : `${startYear}—${endYear} 年`;
  }
  const start = `${startYear}年${Number(startDate.slice(5, 7))}月`;
  const end = `${endYear}年${Number(endDate.slice(5, 7))}月`;
  return start === end ? start : `${start}—${end}`;
}

export function summarizeNianJingPhaseDrivers(input: {
  readonly nature: NianJingNature;
  readonly driver_refs: readonly string[];
  readonly method_id?: MethodProfileId;
  readonly concern_label?: string;
}): string {
  const facts = driverFacts(input.driver_refs, input.method_id);
  const baziLabels = baziBasisLabels(facts, input.concern_label);
  if (baziLabels.length > 0) {
    return `${TENDENCY_CLASS_LABELS[input.nature]} · ${facts.method_label} · ${baziLabels.join(' · ')}`;
  }
  const ziweiLabels = ziweiBasisLabels(facts, input.concern_label);
  if (ziweiLabels.length > 0) {
    return `${TENDENCY_CLASS_LABELS[input.nature]} · ${facts.method_label} · ${ziweiLabels.join(' · ')}`;
  }
  const labels = facts.labels.slice(0, 3);
  const basis = labels.length > 0 ? labels.join(' · ') : '长程相位';
  return `${TENDENCY_CLASS_LABELS[input.nature]} · ${facts.method_label} · ${basis}`;
}

export function summarizeNianJingInflectionDrivers(input: {
  readonly kind: NianJingInflectionKind;
  readonly date: string;
  readonly driver_refs: readonly string[];
  readonly method_id?: MethodProfileId;
}): string {
  const facts = driverFacts(input.driver_refs, input.method_id);
  const labels = facts.labels.slice(0, 2);
  const basis = labels.length > 0 ? ` · ${labels.join(' · ')}` : '';
  return `${NIANJING_INFLECTION_KIND_LABELS[input.kind]} · ${facts.method_label}${basis} · ${input.date}`;
}

export function buildNianJingDriverGuidance(input: {
  readonly nature: NianJingNature | null;
  readonly driver_refs: readonly string[];
  readonly concern_label?: string;
  readonly start_date?: string;
  readonly end_date?: string;
}): NianJingDriverGuidance {
  const facts = driverFacts(input.driver_refs);
  const labels = facts.labels;
  const baziLabels = baziBasisLabels(facts, input.concern_label);
  const ziweiLabels = ziweiBasisLabels(facts, input.concern_label);
  const basis = (
    baziLabels.length > 0
      ? baziLabels
      : ziweiLabels.length > 0
        ? ziweiLabels
        : labels.slice(0, 2)
  ).join(' · ') || '长程相位';
  const nature = input.nature ?? 'steady';
  const phase = input.nature ? TENDENCY_CLASS_LABELS[input.nature] : '未成段';
  const domain = concernLabel(input.concern_label, facts.domain);
  const metric = DOMAIN_METRIC[facts.domain];
  const evidence = labels.slice(1, 3).join(' · ') || basis;

  if (facts.bazi) {
    const element = ELEMENT_LABELS[facts.bazi.element] ?? facts.bazi.element;
    const tenGod = TEN_GOD_LABELS[facts.bazi.ten_god];
    const focus = DOMAIN_TEN_GOD_FOCUS[facts.domain][facts.bazi.ten_god];
    const elementAction = DOMAIN_ELEMENT_ACTION[facts.domain][facts.bazi.element]
      ?? DOMAIN_ELEMENT_ACTION.general[facts.bazi.element]
      ?? '按现实反馈调整行动方式';
    const overuse = ELEMENT_OVERUSE[facts.bazi.element] ?? '把单一倾向推到过量';
    const period = periodLabel(input.start_date, input.end_date);
    const relevanceLine = facts.bazi.relevance === 'focused'
      ? `${tenGod}在「${domain}」是直接信号，${NATURE_FOCUS_ACTION[nature](focus)}`
      : `${tenGod}在「${domain}」只作背景，先用${metric}验证，不把它当成核心结论`;
    const elementLine = facts.bazi.favor === '喜'
      ? `命局喜${element}，${period}可多用“${elementAction}”的方式；先${DOMAIN_VERIFICATION_ACTION[facts.domain]}`
      : facts.bazi.favor === '忌'
        ? `命局忌${element}，${period}先减少“${overuse}”；再${DOMAIN_VERIFICATION_ACTION[facts.domain]}`
        : `${element}对命局为平，${period}不追求放大它；以${metric}和一次小步验证为准`;
    const elementGuard = facts.bazi.favor === '忌'
      ? `命局忌${element}，忌${overuse}；出现消耗时先降速，再看${metric}`
      : `命局${facts.bazi.favor}${element}不等于越多越好，忌${overuse}；仍以${metric}复核`;

    return {
      method_label: facts.method_label,
      basis_label: basis,
      favorable: [
        `「${domain}」宜：${DOMAIN_ACTIONS[facts.domain][nature]}`,
        relevanceLine,
        elementLine,
      ],
      guarded: [
        `「${domain}」忌：${DOMAIN_CAUTIONS[facts.domain][nature]}`,
        elementGuard,
      ],
    };
  }

  if (facts.ziwei) {
    const transforms = facts.ziwei.transforms;
    const favorableTransforms = transforms.filter((item) => item.transform !== '忌');
    const guardedTransform = transforms.find((item) => item.transform === '忌') ?? null;
    const signalItems = transforms.map((item) =>
      `${item.star}化${item.transform}入${item.scope}`
    );
    const signal = signalItems.length > 0 ? signalItems.join('、') : '三方四正没有四化直接命中';
    const realityFocus = (transforms.length > 0 ? transforms : [{ transform: '科' as const }])
      .map((item) => DOMAIN_ZIWEI_TRANSFORM_FOCUS[facts.domain][item.transform])
      .filter((item, index, all) => all.indexOf(item) === index)
      .join('，同时留意');
    const period = periodLabel(input.start_date, input.end_date);
    const scopeExplanation = favorableTransforms.length > 0
      ? `其中${favorableTransforms.map((item) => `化${item.transform}`).join('、')}提供可用抓手`
      : '本段没有禄、权、科直接提供抓手';
    const guardedLine = guardedTransform
      ? `${guardedTransform.star}化忌落入${guardedTransform.scope}，忌把${DOMAIN_ZIWEI_TRANSFORM_FOCUS[facts.domain].忌}拖成长期消耗；用${metric}设置止损点`
      : `虽未见化忌直接命中，仍忌把${signal}理解成自动顺利；继续用${metric}复核`;

    return {
      method_label: facts.method_label,
      basis_label: basis,
      favorable: [
        `「${domain}」宜：${DOMAIN_ACTIONS[facts.domain][nature]}`,
        `大限${facts.ziwei.daxian}中，${signal}；对「${domain}」主要看${realityFocus}`,
        `${period}${scopeExplanation}；先${DOMAIN_VERIFICATION_ACTION[facts.domain]}`,
      ],
      guarded: [
        `「${domain}」忌：${DOMAIN_CAUTIONS[facts.domain][nature]}`,
        guardedLine,
      ],
    };
  }

  return {
    method_label: facts.method_label,
    basis_label: basis,
    favorable: [
      `${domain}宜：${DOMAIN_ACTIONS[facts.domain][nature]}`,
      `按${facts.method_label}依据复核${metric}，不要只看年度总相位`,
      `${phase}期把${evidence}落到一个可验证的小步骤`,
    ],
    guarded: [
      `${domain}忌：${DOMAIN_CAUTIONS[facts.domain][nature]}`,
      `不要把${basis}套成其他主题的宜忌`,
    ],
  };
}

function plainConcernLabel(label: string): string {
  const trimmed = label.trim().replace(/^#/, '');
  return trimmed.length > 0 ? trimmed : label;
}

function copyItems(lines: readonly string[], fallbackDescription: string): readonly NianJingPhaseDetailCopyItem[] {
  return lines.map((line) => ({
    title: line,
    description: fallbackDescription,
  }));
}

export function buildNianJingPhaseDetailCopy(input: {
  readonly concern_label: string;
  readonly nature: NianJingNature;
  readonly summary: string;
  readonly driver_refs: readonly string[];
  readonly start_date?: string;
  readonly end_date?: string;
}): NianJingPhaseDetailCopy {
  const concern = plainConcernLabel(input.concern_label);
  const guidance = buildNianJingDriverGuidance({
    nature: input.nature,
    driver_refs: input.driver_refs,
    concern_label: concern,
    start_date: input.start_date,
    end_date: input.end_date,
  });
  const facts = driverFacts(input.driver_refs);
  const labels = facts.labels;
  const phase = TENDENCY_CLASS_LABELS[input.nature];
  const summary = input.summary.trim() || `${phase} · ${guidance.method_label} · ${guidance.basis_label}`;
  const evidence = labels.slice(0, 3).join(' · ') || guidance.basis_label;
  const mainline = `${summary}。这段「${concern}」相位由${guidance.method_label}依据 ${evidence} 生成，行动提示优先跟随这组具体驱动，而不是只套用${phase}模板。`;
  const fallbackDescription = `依据 ${guidance.basis_label}，把这条提示落到「${concern}」当前阶段中复核。`;

  return {
    one_line: summary,
    mainline,
    keywords: labels.length > 0 ? labels.slice(0, 4) : [guidance.basis_label],
    suggestions: copyItems(guidance.favorable, fallbackDescription),
    cautions: copyItems(guidance.guarded, fallbackDescription),
  };
}
