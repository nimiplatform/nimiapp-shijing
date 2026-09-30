export const ZH_NIANJING_SURFACE_COPY = {
  duration: {
    years: (count: number) => `约 ${count} 年`,
    months: (count: number) => `约 ${count} 个月`,
    days: (count: number) => `约 ${count} 天`,
  },
  tab: {
  "previousVersion": "上一版生成",
  "previous": "上次生成",
  "busy": "生成中...",
  "update": "更新可引用版本",
  "save": "保存可引用版本",
  "generate": "生成长程相位",
  "current": "回到最新版 →",
  "older": "← 还原上一版",
  "missingNatal": "请先在「设置 → 本人」中填写出生信息,年镜会据此自动推算。",
  "missingConcerns": "还没有激活关注",
  "concernHint": "年镜需要至少一个关注作为长程相位的镜片。",
  "openConcerns": "去设置关注",
  "generating": "正在生成长程相位…",
  "insufficient": "当前资料还无法推导出长程相位，请先补全本命输入与关注。"
},
  eventRecorder: {
  "heading": "发生过的事",
  "future": "这段相位还未到来,暂时没有可记录的经历。等它发生后,可以回到这里把经历记下来。",
  "placeholder": "例如：这段时间换了工作 / 一段关系有了结果……",
  "recordAria": "记一笔发生过的事",
  "date": "发生时间",
  "save": "保存事件",
  "failed": "没能保存,请检查内容后再试一次。",
  "all": "查看全部",
  "empty": "这段时间还没有记录。",
  "listAria": "已记录的事件",
  "editContent": "编辑事件内容",
  "cancel": "取消",
  "saveEdit": "保存",
  "ask": "去问镜问这条",
  "askShort": "问",
  "edit": "编辑",
  "editAria": "编辑这条事件",
  "delete": "删除",
  "deleteAria": "删除这条事件",
  "deleteTitle": "删除这条记录？"
,
intro: (label: string) => `记下这段时间里和「${label}」相关的经历,问镜解读这段相位时可以引用它。`, count: (count: number) => `已记录 (${count})`, deleteMessage: (body: string) => `「${body}」将被永久删除，解读这段相位时不再引用。此操作不可撤销。`
},
  staleMessages: {
  age: '当前长程相位已超过 30 天,请重新生成。',
  mirror_scope_changed: '年镜时间窗已变化,旧长程相位已失效,请重新生成。',
  concern_tag_missing: '年镜关注已变化,旧长程相位已失效,请重新生成。',
  event_memory_refs_changed: '年镜引用资料已变化,旧长程相位已失效,请重新生成。',
  feature_snapshot_failed: '当前资料无法重新验证旧长程相位,请修正资料后重新生成。',
  input_hash_changed: '年镜输入已变化,旧长程相位已失效,请重新生成。',
  feature_snapshot_hash_changed: '年镜算法或输入已更新,旧长程相位已失效,请重新生成。',
},
  notSegmented: '未成段',
  yearLabel: (year: number) => `${year} 年`,
  monthLabel: (month: number) => `${month}月`,
  bodyByNature: {
  supportive: '整体助力,长程红利逐步释放,适合主动布局。',
  steady: '整体平稳,适合按既定方向稳步推进。',
  watch: '需持续观察,留意节奏调整与外缘变化。',
  blocked: '长程阻滞,宜守不宜攻,等待结构松动。',
  turning: '处于转折,留意拐点信号并把握窗口期。',
},
  inflectionDescriptions: {
  dayun_boundary:
    '大运是十年一换的长期周期。「大运边界」标记当前十年格局结束、下一段开始的瞬间——人生主旋律、能量主线在此处发生根本性切换,是最值得关注的长程拐点。',
  annual_transition:
    '流年是一年一换的周期。「流年切换」标记从一个干支年进入下一个的瞬间,影响当年的整体走势与机遇窗口。',
  monthly_transition:
    '流月是一月一换的周期。「流月切换」标记节气交替的时刻,对短期决策与节奏调整有提示作用。',
  marker_cluster:
    '多个不同周期(大运 / 流年 / 流月)的关键节点在短时间内集中出现。「多重节点」意味着叠加效应放大,是格局转换最显著的时间窗。',
},
  natureGuidance: {
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
},
  yearOverview: {
    viewPhase: '查看相位',
    ariaLabel: '年镜年度模块总览',
    title: '年度总览',
    subtitle: '先看整体年度节奏',
    summaryAriaLabel: '总体年度总览',
    summaryMeta: '年度主导',
    summaryCardAriaLabel: (year: number, nature: string) => `${year} 年总体年度 ${nature}`,
    focusAriaLabel: '具体关注年度展开',
    focusTitle: '具体关注',
    focusSubtitle: '按关注主题展开',
    focusedSubtitle: (label: string) => `${label} 的年度展开`,
    concern: '关注',
    now: '现在',
    pathTitle: '年度节奏 · 综合强弱导览',
    pathSubtitle: '先看十年节奏，再选年份查看详情',
    pathLegendAriaLabel: '关注维度导览图例',
    selectedEyebrow: '选中年度 · 主导相位',
    selectedSummaryFallback: '这一年没有可显示的阶段摘要。',
    selectedMeta: '年度主导',
    yearDetailTitle: '年度相位详情',
    favorable: '宜',
    guarded: '忌',
    monthNodes: '关键节点 · 月份',
    noNodes: '本年无显著节点',
    basisTitle: '长程相位摘要 · 生成依据',
    basisSubtitle: '为什么得出以上判断',
    basisLabels: {
      phase_band: '阶段带',
      dayun_boundary: '大运边界',
      annual_transition: '流年切换',
      monthly_transition: '流月切换',
      marker_cluster: '多重节点',
    },
    basisSummary: (count: number, first: string) =>
      first ? `${count} 条证据 · ${first}` : `${count} 条结构化证据`,
    phaseAriaLabel: (year: number, label: string, nature: string) =>
      `${year} ${label} ${nature}阶段`,
    markersAriaLabel: (year: number, label: string) => `${year} ${label} 拐点`,
  },
  timeline: {
    emptyNotice: '当前筛选下没有可显示的相位带。',
    ariaLabel: '按关注标签的长程相位带与拐点时间轴',
    now: '现在',
    currentSuffix: '期',
    clickToView: '点按查看',
    bandAriaLabel: (range: string, nature: string) => `${range} ${nature}期,点按查看说明`,
    markerAriaLabel: (date: string, kind: string) => `${date} ${kind},点按查看说明`,
    legendAriaLabel: '拐点 / 现在 图例',
  },
  readyView: {
    footerSummary: '长程相位摘要与生成依据',
  },
  hero: {
    ariaLabel: '当前长程相位',
    focusedEyebrow: (label: string) => `${label} · 此刻`,
    defaultEyebrow: '当前阶段 · 此刻',
    horizonSuffix: '展望',
    rowsAriaLabel: '各关注当前相位',
  },
  filter: {
    toolbarAriaLabel: '按关注筛选 / 相位图例',
    concernLegend: '关注',
    all: '全部',
    manageConcerns: '✎ 编辑关注',
    legendAriaLabel: '相位图例',
  },
  concernEditor: {
    ariaLabel: '管理关注',
    title: '管理关注',
    subtitle: '激活的关注会出现在时间轴上,独立计算相位带与拐点。',
    activeHeading: '已激活',
    addableHeading: '可添加',
    remove: '移除',
    add: '添加',
    addLimitTitle: (limit: number) => `已达激活上限 ${limit}`,
    customPlaceholder: '自定义关注,如「学业」「创业」',
  },
  detailDrawer: {
    close: '关闭',
    detailSuffix: '详情',
    phaseSuffix: '期',
    mainline: '阶段主线',
    signalsAriaLabel: '这一阶段的信号',
    worthRemembering: (duration: string) => `${duration}里最值得记住的信号`,
    guidanceTitle: '把这段时间用在这里',
    guardrailsTitle: '需要守住的边界',
    timePrefix: '时间',
    basis: (concernLabel: string) => `依据 当前关注「${concernLabel}」与年镜长程相位变化`,
    inflectionQuestion: (kind: string) => `${kind}是什么`,
    promptTitle: '本次提示',
    impactWindow: '影响窗口',
    eventRecorderHeading: '这个拐点前后发生过什么',
  },
} as const;
