// HeJing (合镜) page copy + sample relationship workspace.
//
// Split out of hejing-model.ts so the model file stays focused on types and
// projection logic. The page is a relationship *understanding & management*
// surface — not a divination report — so copy is organised as
// 结论 (conclusion) -> 解释 (explanation) -> 行动 (action) and avoids
// partner-only attraction/intimacy metrics. Astrology evidence lives in a
// collapsed 命理依据 drawer at the very bottom.

import type {
  HeJingBasisChip,
  HeJingFocusCard,
  HeJingPersonProfile,
  HeJingQuarterWindow,
  HeJingRelationshipTypeOption,
  HeJingTimelineRecord,
  HeJingWorkspace,
} from './hejing-model.ts';

export const HEJING_RELATIONSHIP_TYPES: readonly HeJingRelationshipTypeOption[] = [
  { id: 'partner', label: '伴侣' },
  { id: 'family', label: '家人' },
  { id: 'parent_child', label: '亲子' },
  { id: 'friend', label: '朋友' },
  { id: 'collaboration', label: '合作' },
];

// `亲子` → `亲子关系`, `伴侣` → `伴侣关系`, etc. Used for the relationship line
// and the radar section title so they read naturally per relationship type.
export function hejingRelationshipTypeLabel(typeId: string): string {
  const short = HEJING_RELATIONSHIP_TYPES.find((type) => type.id === typeId)?.label ?? '关系';
  return `${short}关系`;
}

export const HEJING_PAGE_COPY = {
  eyebrow: 'TWO CHARTS · ONE MIRROR',
  introTitleLine1: '看见你与 TA',
  introTitleLine2: '之间的相处之道',
  introLead: '合镜不是一份命理报告，而是一处关系理解与经营的空间：关系状态、今年主线、容易摩擦的地方、更适合的相处方式与值得留意的时间窗口，一眼看清。',
  newHejing: '新建合镜 +',
  relationshipType: '关系类型',
  selectorTitle: '合镜对象',
  selectAria: '切换合镜对象',
  mirrorBadge: '合镜',

  // Top overview ----------------------------------------------------------
  statusLabel: '关系状态',
  keywordsLabel: '年度关键词',
  reminderLabel: '最重要提醒',
  todayLabel: '今天可以怎么做',
  regenerate: '重新生成',
  writeRecord: '记录一次事件',
  chat: '聊聊TA',
  generateHejing: '生成合镜',
  generatingAdvice: '生成中…',
  pendingGenerationHint: '生成后会展开相处重点、关系雷达、时间窗口与相处方式。',

  // Sections --------------------------------------------------------------
  focusTitle: '当前相处重点',
  focusStuckTitle: '容易卡住的地方',
  focusBetterTitle: '更适合的方式',
  focusWeeklyTitle: '本周建议',
  radarTitleSuffix: '雷达',
  radarReferenceLabel: '参考均值',
  metricScaleSuffix: '/100',
  windowsTitle: '未来时间窗口',
  windowsStateLabel: '状态',
  windowsWatchLabel: '注意点',
  windowsActionLabel: '建议行动',
  waysTitle: '相处方式',
  recordsTitle: '共同记录',
  recordsLead: '记录关系中的重要时刻，帮助你们看见成长的轨迹。',
  recordsAuthor: '我记录的',
  recordsMenuAria: '记录操作',
  recordsEmpty: '还没有共同记录。记录一次争执、合作、旅行或一次好的谈话，慢慢看见关系的变化。',
  basisTitle: '命理依据',
  basisHint: '默认折叠 · 仅作参考',
  basisConvergenceTitle: '共鸣 · 滋养',
  basisFrictionTitle: '潜在 · 摩擦',

  // Flow / status ---------------------------------------------------------
  generate: '生成合镜',
  addPersonDialogTitle: '添加关系人物',
  createStatus: '新的合镜草稿已打开：请选择对象资料与关系类型，再进入正式分析。',
  recordStatus: '记录入口已打开：后续会保存为真实关系事件，并进入长期复盘。',
  chatStatus: '对话入口已打开：后续会以这面合镜为上下文，和 TA 的关系展开对话。',
  persistenceFailureStatus: '合镜已生成，但本地保存失败；重新打开前不会恢复这次内容，请稍后重试。',
  unsupportedMethodTitle: '当前测算引擎暂不支持合镜',
  unsupportedMethodBody: '合镜关系合盘需要当前引擎声明 relationship_hepan 支持；请先切换到已支持合镜的测算引擎后再生成。',

  // Empty states ----------------------------------------------------------
  emptyTypeTitle: (relationshipType: string) => `还没有${relationshipType}合镜`,
  emptyTypeBody: (relationshipType: string) =>
    `添加一位${relationshipType}关系人物后，合镜会以“我 + TA”的出生资料建立分析对象。`,
  emptyTypeAction: (relationshipType: string) => `新建${relationshipType}合镜 +`,
  emptyTypeHint: '添加后先确认出生日期、时间、地点与授权来源，再生成正式关系分析。',
  emptyTypeDisclaimer: '合镜只使用本人和一个关系人物的出生资料，不创建关系图、客户档案或项目式关系管理。',
  empty: {
    title: '看见你与 TA 之间的相处节奏',
    lead: '合镜基于两个人的出生信息，帮你理解彼此的相处状态、容易卡住的地方与阶段性的相处节奏。',
    primaryCta: '创建第一面合镜',
    valueAria: '合镜创建后能看到什么',
    valueCards: [
      { id: 'baseline', index: '01', title: '关系状态', body: '一眼看清今年的关系主线、状态与最重要的提醒。' },
      { id: 'complement', index: '02', title: '相处方式', body: '理解容易摩擦的地方，找到更适合彼此的沟通与边界。' },
      { id: 'window', index: '03', title: '时间窗口', body: '查看未来各阶段更适合沟通、靠近、放慢或修复的时段。' },
    ],
    visualSelf: '我',
    visualMirror: '合',
    visualOther: 'TA',
    cardTitle: '创建你的第一面合镜',
    cardBody: '选择一位关系对象，填写出生日期、时间与地点后，系统会生成“我 + TA”的关系分析。',
    steps: ['选择关系类型', '填写出生信息', '生成合镜解读'],
    startCta: '开始创建合镜',
    existingCta: '从已有档案选择',
    privacy: '资料仅用于当前合镜分析，本地保存，可随时修改或删除。',
  },
} as const;

// Astrology evidence chips for the collapsed 命理依据 drawer. Generic across
// relationship types; the drawer body pairs these with the chart-intersection
// 共鸣 / 摩擦 lists derived from the generated reading.
export const HEJING_DEFAULT_BASIS: readonly HeJingBasisChip[] = [
  { id: 'wuxing', label: '五行' },
  { id: 'shishen', label: '十神' },
  { id: 'chonghe', label: '冲合' },
  { id: 'liunian', label: '流年' },
  { id: 'dayun', label: '大运' },
];

// Sample parent-child workspace ("我 + Snow"). It is the spread base for
// person-derived workspaces, so its records / basis carry over while the
// hero, metrics and windows are replaced per person and per generated reading.
const SNOW_SELF: HeJingPersonProfile = {
  label: '我',
  name: '我',
  roleLabel: '家长',
  initials: '我',
  tone: 'self',
  elementTag: '紫微斗数 · 命身主轴',
  traits: [
    '紫微斗数以命宫、身宫看你的关系表达底色',
    '主星组合偏向主动照顾与快速回应',
    '四化落点提示：先稳住自己的节奏，再靠近对方',
  ],
};

const SNOW_OTHER: HeJingPersonProfile = {
  label: 'TA',
  name: 'Snow',
  roleLabel: '孩子',
  initials: 'S',
  tone: 'other',
  elementTag: '紫微斗数 · 互动宫位',
  traits: [
    'TA 的命宫、身宫用来观察安全感与表达方式',
    '关系视角：亲子，重点看亲子宫位的牵引',
    '主星与四化落点会影响 TA 如何接收关心',
  ],
};

const SNOW_RECORDS: readonly HeJingTimelineRecord[] = [
  {
    id: 'conflict-game-time',
    date: '2026-04-18',
    title: '关于玩游戏时间的争执',
    tag: '冲突',
    description: '因为游戏时间超出约定，发生了争执。事后一起复盘，重新约定了规则。',
  },
  {
    id: 'science-project',
    date: '2026-06-02',
    title: '一起完成科学小项目',
    tag: '合作',
    description: '你们一起完成了火山喷发模型，分工合作，非常开心。',
  },
];

const SNOW_FOCUS: readonly HeJingFocusCard[] = [
  {
    id: 'stuck',
    kind: 'stuck',
    title: HEJING_PAGE_COPY.focusStuckTitle,
    points: ['权威感与自主需求的拉扯，容易引发对抗或沉默。', '情绪上来时，沟通容易偏离主题。'],
  },
  {
    id: 'better',
    kind: 'better',
    title: HEJING_PAGE_COPY.focusBetterTitle,
    points: ['先共情，后引导；给选择，不直接下命令。', '用稳定的一致性，代替临时的高压。'],
  },
  {
    id: 'weekly',
    kind: 'weekly',
    title: HEJING_PAGE_COPY.focusWeeklyTitle,
    points: ['完成一次“无屏幕”共处活动。', '保持规则的一致与温和。', '每天一句具体的肯定。'],
  },
];

const SNOW_QUARTERS: readonly HeJingQuarterWindow[] = [
  {
    id: 'q1',
    label: 'Q1',
    range: '1-3 月',
    season: 'spring',
    state: '适应与调整',
    watch: '情绪波动较多',
    action: '建立稳定的日常节奏',
    tone: 'green',
  },
  {
    id: 'q2',
    label: 'Q2',
    range: '4-6 月',
    season: 'summer',
    state: '能量增长期',
    watch: '学习与专注挑战',
    action: '设定小目标，陪伴复盘',
    tone: 'gold',
  },
  {
    id: 'q3',
    label: 'Q3',
    range: '7-9 月',
    season: 'autumn',
    state: '深化与突破',
    watch: '自我意识增强',
    action: '给选择，少说教',
    tone: 'red',
  },
  {
    id: 'q4',
    label: 'Q4',
    range: '10-12 月',
    season: 'winter',
    state: '收获与稳固',
    watch: '期末压力与节奏',
    action: '复盘成长，正向收尾',
    tone: 'blue',
  },
];

export const HEJING_RELATIONSHIP_WORKSPACES: readonly HeJingWorkspace[] = [
  {
    id: 'sample-snow-parent-child',
    selectorLabel: '我 + Snow',
    selectedRelationshipType: 'parent_child',
    year: 2026,
    relationshipTypeLabel: hejingRelationshipTypeLabel('parent_child'),
    self: SNOW_SELF,
    other: SNOW_OTHER,
    keywords: ['陪伴', '边界', '沟通', '节奏'],
    headline: '我与 Snow 的合镜',
    relationshipStatus: '稳定中有磨合',
    mainline: '这一年，关系的关键词是陪伴与边界，在理解与支持中一起成长。',
    summary: '这一年，关系的关键词是陪伴与边界，在理解与支持中一起成长。',
    topReminder: '孩子在建立独立与自信的过程中，需要被看见和尊重；同时也需要清晰、稳定的边界与规则，帮助他安心成长。',
    todayActions: [
      '抽出 15 分钟，专注倾听他的想法与情绪。',
      '明确一个可执行的规则，与他一起制定并坚持。',
      '给予具体的肯定，看到他的努力与进步。',
    ],
    basis: '亲子之间，陪伴与边界并行',
    phase: '稳定中有磨合',
    futureHint: '保持规则的一致与温和，关系可稳中向好',
    focusCards: SNOW_FOCUS,
    metrics: [
      { id: 'understanding', label: '理解度', value: 85, tone: 'green', explanation: '能站在对方角度看问题。' },
      { id: 'communication', label: '沟通顺畅度', value: 72, tone: 'green', explanation: '整体顺畅，偶有情绪打断。' },
      { id: 'consistency', label: '规则一致性', value: 78, tone: 'green', explanation: '规则清晰，执行需更稳定。' },
      { id: 'safety', label: '情绪安全感', value: 82, tone: 'green', explanation: '孩子感到被接纳与支持。' },
      { id: 'growth', label: '成长支持度', value: 88, tone: 'gold', explanation: '持续鼓励，支持孩子探索。' },
      { id: 'repair', label: '修复能力', value: 74, tone: 'red', explanation: '冲突后能修复，时长可缩短。' },
    ],
    structure: {
      convergence: [
        '日主与用神方向相互滋养，关系底色温和。',
        '彼此愿意为对方调整节奏，信任正在累积。',
        '共同经历会成为关系的重要加分点。',
      ],
      friction: [
        '权威与自主的节奏差，容易在催促时放大。',
        '情绪反应速度不同，需要预留缓冲。',
      ],
    },
    quarters: SNOW_QUARTERS,
    insights: [
      {
        id: 'communication',
        iconLabel: '言',
        title: '沟通方式',
        tone: 'green',
        body: '多用开放式提问，先听后说。表达感受时用“我感到……”句式，减少指责，更能被理解。',
      },
      {
        id: 'boundary',
        iconLabel: '界',
        title: '边界提醒',
        tone: 'green',
        body: '规则清晰、后果一致，给予选择而非命令。尊重他的空间，也保护彼此的底线。',
      },
      {
        id: 'repair',
        iconLabel: '修',
        title: '修复语言',
        tone: 'red',
        body: '冲突后及时修复，真诚道歉并表达理解。可以说：“我刚才语气不好，抱歉。我们一起想办法。”',
      },
    ],
    repairWindow: {
      title: '关系修复窗口',
      range: '2026 下半年',
      body: '冲突后回到具体事件、不给关系贴标签，能显著缩短修复时间。',
    },
    futureWindows: [],
    weeklyAdvice: '本周先共情、再引导：给孩子一个可选择的方案，少一点命令，多一点稳定的陪伴。',
    records: SNOW_RECORDS,
    astrologyBasis: HEJING_DEFAULT_BASIS,
    disclaimer: '合镜以当前测算引擎的命盘证据为基础，结合相处情境与选择，结果仅供参考——关系的未来，由你们共同创造。',
  },
];
