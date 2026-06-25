export type HeJingRelationshipType = 'partner' | 'collaboration' | 'family' | 'friend' | 'parent_child';

export interface HeJingRelationshipTypeOption {
  readonly id: HeJingRelationshipType;
  readonly label: string;
}

export type HeJingTone = 'green' | 'gold' | 'blue' | 'red';

export interface HeJingMetric {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly tone: HeJingTone;
}

export interface HeJingPersonProfile {
  readonly label: string;
  readonly name: string;
  readonly structureName?: string;
  readonly initials: string;
  // Short spaced element badge under the hero circle, e.g. '木 火 偏旺'.
  readonly elementTag: string;
  // Longer descriptive lines for the chart-intersection column.
  readonly traits: readonly string[];
  readonly tone: 'self' | 'other';
}

export interface HeJingStructure {
  readonly convergence: readonly string[];
  readonly friction: readonly string[];
}

export interface HeJingInsight {
  readonly id: string;
  readonly iconLabel: string;
  readonly title: string;
  readonly body: string;
  readonly tone: 'green' | 'gold' | 'red';
}

export interface HeJingRepairWindow {
  readonly title: string;
  readonly range: string;
  readonly body: string;
}

export interface HeJingFutureWindow {
  readonly id: string;
  // Timeline node label, e.g. '未来 30 天'.
  readonly title: string;
  // Card badge, e.g. '适合沟通'.
  readonly status: string;
  readonly body: string;
  readonly tone: 'green' | 'gold' | 'blue';
}

export interface HeJingTimelineRecord {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly tag: string;
  readonly insight: string;
}

export interface HeJingWorkspace {
  readonly id: string;
  readonly selectorLabel: string;
  readonly selectedRelationshipType: HeJingRelationshipType;
  readonly self: HeJingPersonProfile;
  readonly other: HeJingPersonProfile;
  readonly keywords: readonly string[];
  readonly headline: string;
  readonly summary: string;
  readonly basis: string;
  readonly phase: string;
  readonly futureHint: string;
  readonly metrics: readonly HeJingMetric[];
  readonly structure: HeJingStructure;
  readonly insights: readonly HeJingInsight[];
  readonly repairWindow: HeJingRepairWindow;
  readonly futureWindows: readonly HeJingFutureWindow[];
  readonly weeklyAdvice: string;
  readonly records: readonly HeJingTimelineRecord[];
  readonly disclaimer: string;
}

export const HEJING_RELATIONSHIP_TYPES: readonly HeJingRelationshipTypeOption[] = [
  { id: 'partner', label: '伴侣' },
  { id: 'collaboration', label: '合作' },
  { id: 'family', label: '家人' },
  { id: 'friend', label: '朋友' },
  { id: 'parent_child', label: '亲子' },
];

export const HEJING_PAGE_COPY = {
  eyebrow: '合 · 镜 — TWO CHARTS, ONE MIRROR',
  introTitleLine1: '看见你与TA',
  introTitleLine2: '之间的相处之道',
  introLead: '合镜以两人的八字为底稿，把吸引、互补与节奏差，照成一面可以一起照的镜子。',
  newHejing: '新建合镜 +',
  relationshipType: '关系类型',
  selectorTitle: '合镜对象',
  selectAria: '切换合镜对象',
  mirrorBadge: '合镜',
  keywordsAria: '关系关键词',
  indexTitle: '关系指数',
  indexTitleEn: 'RELATIONSHIP INDEX',
  radarAria: '关系指数雷达图',
  metricScaleSuffix: '/100',
  intersectionTitle: '命理交汇',
  intersectionTitleEn: 'CHART INTERSECTION',
  convergenceTitle: '共鸣 · 吸引',
  frictionTitle: '潜在 · 摩擦',
  waysTitle: '相处语言',
  waysTitleEn: 'WAYS OF RELATING',
  futureTitle: '未来窗口',
  futureTitleEn: 'FUTURE WINDOWS',
  guidanceTitle: '关系指引',
  guidanceTitleEn: 'GUIDANCE',
  weeklyAdviceLabel: '本周建议',
  regenerateAdvice: '再生成一条 →',
  historyTitle: '关系复盘',
  historyTitleEn: 'SHARED HISTORY',
  writeRecord: '写入关系记录 +',
  aiInsightPrefix: 'AI 洞察：',
  basisLabel: '关系基调',
  phaseLabel: '当前阶段',
  futureHintLabel: '未来走向',
  createStatus: '新的合镜草稿已打开：请选择对象资料与关系类型，再进入正式分析。',
  adviceStatus: '已准备提交给 Runtime AI。当前不会用本地文案伪造新的关系建议。',
  recordStatus: '记录入口已打开：后续会保存为真实关系事件，并进入长期复盘。',
} as const;

const ERIC_SELF: HeJingPersonProfile = {
  label: '我',
  name: 'Eric',
  initials: 'E',
  tone: 'self',
  elementTag: '木 火 偏旺',
  traits: ['木火偏旺，能量外放', '表达直接，行动力强', '推进快，效率优先', '需要独处与空间'],
};

const WENDY_OTHER: HeJingPersonProfile = {
  label: 'TA',
  name: 'Wendy',
  initials: 'W',
  tone: 'other',
  elementTag: '金 水 较重',
  traits: ['金水较重，内在沉稳', '情绪内收，感受细腻', '谨慎观察，再做决定', '需要确认与安全感'],
};

const DEFAULT_INSIGHTS: readonly HeJingInsight[] = [
  {
    id: 'other-to-self',
    iconLabel: '心',
    title: 'TA会激发你的什么',
    tone: 'green',
    body: 'TA让你更懂得耐心与细腻，帮助你放慢脚步，看到更多可能性，也激发你更稳定地规划未来。',
  },
  {
    id: 'self-to-other',
    iconLabel: '星',
    title: '你会带给TA什么',
    tone: 'gold',
    body: '你带来行动力与热情，让TA更敢于尝试与表达，帮助TA打开视野，看到生活中更多的色彩与机会。',
  },
  {
    id: 'stuck-point',
    iconLabel: '言',
    title: '容易卡住的地方',
    tone: 'red',
    body: '当你希望快速解决问题时，TA可能需要更多时间处理情绪；当TA需要安全感时，你可能会觉得被束缚或不被理解。',
  },
];

const DEFAULT_REPAIR_WINDOW: HeJingRepairWindow = {
  title: '关系修复窗口',
  range: '2026-08 ～ 2027-02',
  body: '主动沟通、承担责任，能显著改善关系质量。',
};

const DEFAULT_WINDOWS: readonly HeJingFutureWindow[] = [
  {
    id: 'next-30-days',
    title: '未来 30 天',
    status: '适合沟通',
    tone: 'green',
    body: '适合深入交流与表达感受，误会容易化解，关系有升温机会。建议安排一次高质量的相处时间。',
  },
  {
    id: 'second-half-2026',
    title: '2026 下半年',
    status: '谨慎推进',
    tone: 'gold',
    body: '节奏差异可能放大，需避免情绪化决策。建议稳中求进，先建立更深的信任。',
  },
  {
    id: 'year-2027',
    title: '2027 年',
    status: '关系修复',
    tone: 'blue',
    body: '适合重建连接，修复旧问题，开启新的合作或共同规划，关系有望更上一层楼。',
  },
];

const DEFAULT_RECORDS: readonly HeJingTimelineRecord[] = [
  {
    id: 'communication-conflict',
    date: '2025-05-18',
    title: '一次沟通冲突后，更理解彼此',
    tag: '沟通',
    insight: '这次冲突让你们看清了彼此在节奏与表达上的差异，理解加深，关系更真实。',
  },
  {
    id: 'shared-travel',
    date: '2025-04-03',
    title: '共同旅行，建立信任与安全感',
    tag: '相处',
    insight: '共同经历带来强连接与信任，成为关系的重要加分点。',
  },
];

const DEFAULT_DISCLAIMER =
  '合镜以八字为基础，结合相处情境与选择，结果仅供参考——关系的未来，由你们共同创造。';

export const HEJING_RELATIONSHIP_WORKSPACES: readonly HeJingWorkspace[] = [
  {
    id: 'eric-wendy-partner',
    selectorLabel: '我 · Eric  &  TA · Wendy',
    selectedRelationshipType: 'partner',
    self: ERIC_SELF,
    other: WENDY_OTHER,
    keywords: ['互补', '牵引', '节奏差', '共同成长'],
    headline: '牵引互补，渐进磨合',
    summary:
      '你们彼此有较强的吸引力，容易在价值观与兴趣上产生共鸣。关系中既有互补，也有节奏差异，需要更多理解与耐心。',
    basis: '木火吸引 · 金水调和',
    phase: '相互探索 → 稳定推进',
    futureHint: '用沟通化解节奏差，长期可稳中向好',
    metrics: [
      { id: 'attraction', label: '吸引力', value: 82, tone: 'green' },
      { id: 'stability', label: '稳定性', value: 68, tone: 'gold' },
      { id: 'complement', label: '互补度', value: 76, tone: 'blue' },
      { id: 'communication', label: '沟通难度', value: 61, tone: 'red' },
      { id: 'growth', label: '长期成长性', value: 85, tone: 'green' },
    ],
    structure: {
      convergence: [
        '彼此吸引，能互相激发潜能',
        '价值观基础相近，方向有重合',
        '互相带来新视角与思维扩展',
      ],
      friction: [
        '节奏差异，推进与观望易拉扯',
        '沟通风格不同，容易误解彼此',
        '情绪反应速度不同，需要磨合',
      ],
    },
    insights: DEFAULT_INSIGHTS,
    repairWindow: DEFAULT_REPAIR_WINDOW,
    futureWindows: DEFAULT_WINDOWS,
    weeklyAdvice:
      '本周建议先表达感受，再解决对错。多用“我感觉……”代替指责，让彼此更容易靠近。',
    records: DEFAULT_RECORDS,
    disclaimer: DEFAULT_DISCLAIMER,
  },
];
