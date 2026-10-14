export const ZH_HEJING_SURFACE_COPY = {
  relationshipTypes: [
    { id: 'partner', label: '伴侣' }, { id: 'family', label: '家人' },
    { id: 'parent_child', label: '亲子' }, { id: 'friend', label: '朋友' }, { id: 'collaboration', label: '合作' },
  ],
  relationshipDefaultLabel: '关系',
  relationshipTypeLabel: (label: string) => `${label}关系`,
  workspace: { selector: (name: string) => `我 + ${name}`, headline: (name: string) => `我与 ${name} 的合镜`, self: '我', other: 'TA', selfRole: '本人', disclaimer: '合镜只使用本人和一个关系人物的出生资料，提出待核对的相处观察假设；现实关系以你的真实记录为准。' },
  eyebrow: 'TWO CHARTS · ONE MIRROR',
  mirrorBadge: '合镜',
  relationshipType: '关系类型',
  selectorTitle: '合镜对象',
  selectAria: '切换合镜对象',
  addPersonDialogTitle: '添加关系人物',

  // 页面工具区 ------------------------------------------------------------
  methodLabel: '命理方法',
  statusLabel: '资料与生成状态',
  statusPending: '未生成',
  statusStale: '输入已过期 · 请重新生成',
  statusGenerated: (anchorYear: number, generatedDate: string) =>
    `已生成 · ${anchorYear} 年锚点 · ${generatedDate}`,
  viewReading: '解读',
  viewTrack: '轨迹',
  viewSwitchAria: '切换解读与轨迹视图',
  regenerate: '重新生成',
  recordEntry: '记录一次经历',
  generatingAdvice: '生成中…',
  generatedStatus: '合镜解读已生成。',
  persistenceFailureStatus: "合镜已生成，但尚未确认保存成功。请在关闭前重试保存，以免丢失内容。",

  // 区域一 关系概览 --------------------------------------------------------
  overviewTitle: '关系概览',
  keywordsAria: '本次解读关键词',
  recentUnavailableNote: '本次暂无近期变化解读',

  // 区域二 主要相处模式 ----------------------------------------------------
  patternsTitle: '主要相处模式',
  patternRankLabel: (rank: number) => `模式 ${rank}`,
  selfTendencyLabel: '你',
  scenarioLabel: '值得观察的具体场景',
  alignedLabel: '配合顺利时',
  frictionLabel: '发生分歧时',
  signalsLabel: '可识别的行为信号',
  basisDrawerLabel: '解读依据',
  basisMethodLabel: '计算方法',
  basisEvidenceLabel: '命盘证据',
  basisRuleLabel: '解释规则',
  basisLimitation: "实际相处请以你的真实记录为准；有推演依据，并不代表解释在现实中一定成立。",
  recordPatternEntry: '记录一次实际经历',

  // 区域三 近期变化 --------------------------------------------------------
  recentTitle: '近期变化',
  recentWindowLabel: '依据窗口',
  recentNatureLabel: '窗口性质',
  recentPrecisionNote: "此窗口按年度呈现，不进一步拆分季度或月份。",

  // 区域四 下一次,可以试这一件事 ------------------------------------------
  actionTitle: "下一次，可以试这一件事",
  actionSituationLabel: '适用情境',
  actionStepLabel: '具体做法',
  actionPhraseLabel: '可以直接说',
  actionRationaleLabel: '为什么值得试',
  actionObservationLabel: '可以观察的回应',

  // 轨迹(二级视图) ---------------------------------------------------------
  trackTitle: '轨迹',
  trackNote: "这些内容仅来自你的记录，不表示对方已参与、确认或收到通知。",
  trackEmptyTitle: '还没有与 TA 相关的记录',
  trackEmptyBody:
    "记录一次真实的相处经历——符合或不符合解读都可以。只有记录下来的经历，才能成为核对解读的依据。",
  trackEmptyCta: '记录第一次经历',
  trackEventBadge: '事件',
  trackPlanBadge: '计划',
  trackEditLabel: '编辑这条记录',
  trackDeleteLabel: '删除这条记录',
  trackDeleteConfirmTitle: "删除这条记录？",
  trackDeleteConfirmMessage: (body: string) =>
    `「${body}」将被永久删除，解读与问镜将不再引用。此操作不可撤销。`,
  trackDeleteConfirmLabel: '删除',
  trackDeleteCancelLabel: '取消',
  recordDeletedToast: '记录已删除。',
  recordDeleteError: "没能删除，请稍后重试。",

  // 记录对话框 -------------------------------------------------------------
  recordDialogTitle: '记录一次经历',
  recordDialogEditTitle: '编辑这条经历',
  recordDialogPersonLabel: '相关人物',
  recordDialogPersonFixedHint: "记录将与当前合镜人物关联，保存前请核对。",
  recordDialogDateLabel: '发生日期',
  recordDialogBodyLabel: '发生了什么',
  recordDialogBodyPlaceholder: "例如：因为游戏时间超出约定起了争执，事后一起重新约定了规则。",
  recordDialogSave: '保存记录',
  recordDialogCancel: '取消',
  recordSavedToast: "已保存为真实记录，可在轨迹中查看。",
  recordUpdatedToast: '记录已更新。',
  recordSaveError: "没能保存，请检查内容后再试一次。",

  // 待生成视图 -------------------------------------------------------------
  generateHejing: '生成合镜',
  pendingStatusChip: '待生成',
  pendingReadyNote: '生成时将校验双方出生资料',
  pendingCtaNote: "先根据双方命盘与相处模式规则完成推演，再由 AI 整理成文；若资料不足，会提示你补全。",
  pendingPreviewTitle: "生成合镜后，这里会展开",
  pendingPreviewCards: [
    { id: 'overview', icon: 'overview', title: '关系概览', body: "用简短的标题与概述总结本次选出的相处观察模式，不给关系打分。" },
    { id: 'patterns', icon: 'patterns', title: '主要相处模式', body: "一至四个有依据的相处模式：双方倾向、观察场景、行为信号与解读依据。" },
    { id: 'recent', icon: 'recent', title: '近期变化', body: "仅在推演依据明确时，展示本年度的变化窗口；若无明确依据则不显示。" },
    { id: 'action', icon: 'action', title: "下一次，可以试这一件事", body: "一个与模式对应的具体行动：适用情境、做法、可以直接说的话与可观察的回应。" },
  ],

  // 方法准入 ---------------------------------------------------------------
  patternUnsupportedTitle: "当前命理方法暂不支持相处模式解读",
  patternUnsupportedBody:
    "合镜的相处模式解读目前仅支持八字子平法。当前所选方法可用于生成命镜，但尚不支持对应的合镜模式规则，也不会混用其他方法的规则代为生成。",
  patternUnsupportedHint: "可在「设置」中将推演方法切换为八字子平法后，再回到合镜生成。",
  unsupportedMethodTitle: "当前命理方法暂不支持合镜",
  unsupportedMethodBody:
    "合镜关系合盘要求当前测算引擎支持 relationship_hepan；请先切换到支持合镜的引擎后再生成。",
  patternFailureGuidance:
    "本次未能选出有依据的相处模式：请核对双方出生日期、时间与地点后重试；若资料无误，说明现有证据不足以支持模式解读。",

  // 空状态 -----------------------------------------------------------------
  emptyTypeTitle: (relationshipType: string) => `还没有${relationshipType}合镜`,
  emptyTypeBody: (relationshipType: string) =>
    `添加一位${relationshipType}关系人物后,合镜会以"我 + TA"的出生资料建立分析对象。`,
  emptyTypeAction: (relationshipType: string) => `新建${relationshipType}合镜 +`,
  emptyTypeDisclaimer: "合镜围绕你与一位关系人物的出生资料展开，不创建关系网络、客户档案或项目式关系管理。",
  empty: {
    title: '看见你与 TA 之间的相处节奏',
    lead: "合镜基于双方的出生信息，提出有待现实印证的相处观察假设，帮你看清关系里容易卡住的地方，并给出下一次可以尝试的行动。",
    startCta: '创建第一面合镜',
    existingCta: '从已有档案选择',
    steps: ['选择关系类型', '填写出生信息', '生成合镜解读'],
    valueAria: '合镜创建后能看到什么',
    valueCards: [
      { id: 'overview', index: '01', title: '关系概览', body: "一段聚焦本次相处模式的概述，不打分、不评级，也不预设确定的关系结局。" },
      { id: 'patterns', index: '02', title: '相处模式', body: "呈现双方可能的倾向、值得留意的场景与行为信号，并随附对应的推演依据。" },
      { id: 'action', index: '03', title: '一件可试的事', body: "一个具体的下一次行动：情境、做法、可以直接说的话与可观察的回应。" },
    ],
    visualSelf: '我',
    visualMirror: '合',
    visualOther: 'TA',
    privacy: "资料仅用于当前合镜分析，本地保存，可随时修改或删除。",
  },
} as const;
