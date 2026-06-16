// W05/W-i18n — typed bilingual product copy for the four-mirror IA.

import { useTranslation } from 'react-i18next';
import type {
  BirthPrecision,
  CalculationSex,
  CalendarSystem,
  ConsentState,
} from '../../domain/person.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type {
  NianJingInflectionKind,
  TendencyClass,
} from '../../domain/mirror-output.ts';
import type { ConversationRole } from '../../domain/conversation.ts';
import type {
  ResponseLanguage,
  ResponseLength,
  ResponseTone,
  UiLanguage,
} from '../../domain/settings.ts';
import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';
import type { NatalReadinessReason } from '../subjects/natal-readiness.ts';

type LabelMap<K extends string> = Record<K, string>;

type RiJingEmptyStateCopyKind =
  | 'ready_to_generate'
  | 'profile_incomplete'
  | 'missing_focus'
  | 'runtime_ai_failed'
  | 'persistence_pending'
  | 'persistence_failed';

type RiJingHeroEmptyCopy = {
  readonly description: string;
  readonly confidence_note: string;
  readonly reminder: string;
};

type RiJingReadinessCopy = {
  readonly title: string;
  readonly body: string;
};

export interface ProductCopy {
  readonly brandName: string;
  readonly brandSub: string;
  readonly mirrorKindLabels: LabelMap<MirrorKind>;
  readonly tendencyClassLabels: LabelMap<TendencyClass>;
  readonly nianjingInflectionKindLabels: LabelMap<NianJingInflectionKind>;
  readonly calendarSystemLabels: LabelMap<CalendarSystem>;
  readonly birthPrecisionLabels: LabelMap<BirthPrecision>;
  readonly calculationSexLabels: LabelMap<CalculationSex>;
  readonly consentStateLabels: LabelMap<ConsentState>;
  readonly responseToneLabels: LabelMap<ResponseTone>;
  readonly responseLengthLabels: LabelMap<ResponseLength>;
  readonly responseLanguageLabels: LabelMap<ResponseLanguage>;
  readonly conversationRoleLabels: LabelMap<ConversationRole>;
  readonly concernTagStatusLabels: {
    readonly active: string;
    readonly archived: string;
  };
  readonly recordSourceLabels: {
    readonly manual: string;
    readonly rijing: string;
    readonly yuejing: string;
    readonly nianjing: string;
    readonly shijing: string;
  };
  readonly memoryUseLabels: {
    readonly record_only: string;
    readonly eligible_for_retrieval: string;
  };
  readonly settingsSurfaceLabels: {
    readonly self: string;
    readonly people: string;
    readonly concern_tags: string;
    readonly memory_and_plans: string;
    readonly response_preferences: string;
    readonly privacy_local_data: string;
    readonly diagnostics: string;
  };
  readonly settingsPageLabels: LabelMap<ShijingSettingsPageId>;
  readonly readinessBlockerLabels: {
    readonly missing_self_natal_inputs: string;
    readonly invalid_self_natal_inputs: string;
    readonly unresolved_person_mention: string;
    readonly incomplete_related_person_natal_inputs: string;
    readonly stale_reading_inputs: string;
    readonly runtime_ai_failure: string;
    readonly persistence_failure: string;
    readonly hash_mismatch: string;
  };
  readonly uiLanguageLabels: LabelMap<UiLanguage>;
  readonly common: {
    readonly add: string;
    readonly cancel: string;
    readonly close: string;
    readonly delete: string;
    readonly edit: string;
    readonly save: string;
    readonly saving: string;
    readonly optional: string;
    readonly saved: string;
    readonly loading: string;
  };
  readonly shell: {
    readonly navAriaLabel: string;
    readonly accountMenu: string;
    readonly settingsMenu: string;
    readonly languageSwitch: string;
    readonly snapshotInvalid: (code: string) => string;
    readonly persistenceFailed: (detail: string) => string;
    readonly loadingMirror: string;
    readonly loadingSettings: string;
  };
  readonly settings: {
    readonly back: string;
    readonly subnavAriaLabel: string;
    readonly profileIntro: string;
    readonly concernsIntro: string;
    readonly memoryIntro: string;
    readonly settingsIntro: string;
    readonly localOnlyTag: string;
  };
  readonly uiLanguage: {
    readonly title: string;
    readonly description: string;
    readonly saved: (languageLabel: string) => string;
    readonly saveFailed: (code: string) => string;
  };
  readonly responsePreferences: {
    readonly title: string;
    readonly description: string;
    readonly tone: string;
    readonly length: string;
    readonly aiLanguage: string;
    readonly extraInstructions: string;
    readonly extraPlaceholder: string;
    readonly saveButton: string;
    readonly saveFailed: (code: string) => string;
    readonly savedAt: (savedAt: string) => string;
  };
  readonly self: {
    readonly title: string;
    readonly description: string;
    readonly metaLabel: string;
    readonly locationLabel: string;
    readonly complete: string;
    readonly editDialog: string;
    readonly notes: string;
    readonly notesPlaceholder: string;
    readonly missing: string;
    readonly coreLabels: {
      readonly sex: string;
      readonly birthDate: string;
      readonly birthTime: string;
    };
    readonly reminders: {
      readonly missingBirthDate: string;
      readonly missingBirthTime: string;
      readonly missingPlace: string;
      readonly missingSex: string;
    };
    readonly tags: readonly string[];
    readonly saveIncomplete: (kind: string) => string;
    readonly saveFailed: (detail: string) => string;
    readonly validationFailed: (code: string) => string;
  };
  readonly people: {
    readonly title: string;
    readonly description: string;
    readonly empty: string;
    readonly addDialog: string;
    readonly displayName: string;
    readonly displayNamePlaceholder: string;
    readonly relation: string;
    readonly relationPlaceholder: string;
    readonly consentSource: string;
    readonly notes: string;
    readonly notesPlaceholder: string;
    readonly addPerson: string;
    readonly deletePersonAria: (name: string) => string;
    readonly deleteBlocked: string;
    readonly deleteTitle: string;
    readonly deleteMessage: (name: string) => string;
  };
  readonly memory: {
    readonly title: string;
    readonly description: string;
    readonly empty: string;
    readonly addDialog: string;
    readonly occurredAt: string;
    readonly source: string;
    readonly body: string;
    readonly bodyPlaceholder: string;
    readonly concernRefs: string;
    readonly noConcernTags: string;
    readonly useForReading: string;
    readonly saveRecord: string;
    readonly deleteRecordAria: string;
    readonly saveFailed: (code: string) => string;
    readonly cascadeReadings: (count: number) => string;
    readonly cascadeConversations: (count: number) => string;
    readonly deleteMessage: (body: string, extra: string) => string;
    readonly deleteTitle: string;
  };
  readonly natal: {
    readonly calendar: string;
    readonly sex: string;
    readonly birthDate: string;
    readonly birthPlace: string;
    readonly birthPlacePlaceholder: string;
    readonly birthTime: string;
    readonly unknownTime: string;
    readonly dstWarning: string;
    readonly calibration: string;
    readonly calibrationDescription: string;
    readonly latitude: string;
    readonly longitude: string;
    readonly timeZone: string;
    readonly latitudePlaceholder: string;
    readonly longitudePlaceholder: string;
    readonly timeZonePlaceholder: string;
  };
  readonly onboarding: {
    readonly ariaLabel: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly lede: string;
    readonly enter: string;
    readonly readinessAria: string;
    readonly selfTitle: string;
    readonly selfPending: string;
    readonly done: string;
    readonly concernTitle: string;
    readonly activeCount: (active: number, limit: number) => string;
    readonly concernPending: string;
    readonly profileStageEyebrow: string;
    readonly concernStageEyebrow: string;
    readonly profileStageTitle: string;
    readonly concernStageTitle: string;
    readonly continueProfile: string;
    readonly continueConcerns: string;
  };
  readonly concerns: {
    readonly title: string;
    readonly description: (limit: number, active: number, atLimit: boolean) => string;
    readonly activeGroup: string;
    readonly addableGroup: string;
    readonly relatedTo: string;
    readonly resolved: string;
    readonly pending: string;
    readonly remove: string;
    readonly noActive: string;
    readonly addLimitTitle: (limit: number) => string;
    readonly addTitle: string;
    readonly customLabel: string;
    readonly customPlaceholder: string;
    readonly deleteAria: (label: string) => string;
    readonly deleteTitle: string;
    readonly deleteMessage: (label: string) => string;
    readonly focusAria: string;
    readonly focusLabel: string;
    readonly activeCountAria: (active: number, limit: number) => string;
    readonly focusEmpty: string;
    readonly toggleOffTitle: string;
    readonly toggleOnTitle: string;
    readonly manage: string;
  };
  readonly privacy: {
    readonly title: string;
    readonly description: string;
    readonly status: string;
    readonly error: (kind: string) => string;
    readonly clearButton: string;
    readonly clearNoAdapter: string;
    readonly clearing: string;
    readonly cleared: string;
    readonly clearFailed: (kind: string) => string;
  };
  readonly diagnostics: {
    readonly title: string;
    readonly description: string;
    readonly snapshotStatus: string;
    readonly validationCode: string;
  };
  readonly methodProfile: {
    readonly title: string;
    readonly description: string;
    readonly algorithm: string;
    readonly note: string;
    readonly switchedAt: (savedAt: string) => string;
  };
  readonly aiConfig: {
    readonly title: string;
    readonly description: string;
    readonly runtimeNotReady: string;
    readonly runtimeUnavailable: string;
    readonly runtimeBootstrapPending: string;
    readonly needsTarget: string;
    readonly missingTarget: string;
    readonly missingTargetDetail: string;
    readonly configured: string;
    readonly modelConfigured: string;
  };
  readonly readingFailure: {
    readonly headlines: LabelMap<ReadingGenerationFailure['kind']>;
  };
  readonly citationDrawer: {
    readonly ariaLabel: string;
    readonly summary: string;
    readonly method: string;
    readonly citedMemories: string;
    readonly citedPlans: string;
  };
  readonly importToShijing: {
    readonly label: string;
    readonly pendingLabel: string;
    readonly ariaLabel: string;
  };
  readonly rijing: {
    readonly stageHeadlines: LabelMap<string>;
    readonly stageHeadlineFallback: string;
    readonly headlineFallback: string;
    readonly leaningFallback: string;
    readonly eyebrow: string;
    readonly defaultReminder: string;
    readonly defaultConfidenceNote: string;
    readonly confidenceLabels: LabelMap<'high' | 'medium' | 'low'>;
    readonly emptyHero: Record<RiJingEmptyStateCopyKind, RiJingHeroEmptyCopy>;
    readonly emptyActions: Record<Exclude<RiJingEmptyStateCopyKind, 'persistence_pending'>, string>;
    readonly failureActions: {
      readonly runtimeAi: string;
    };
    readonly refreshAria: {
      readonly loading: string;
      readonly persistenceFailed: string;
      readonly persistencePending: string;
      readonly profileIncomplete: string;
      readonly missingFocus: string;
      readonly regenerate: string;
      readonly refresh: string;
    };
    readonly emptyTagsStatus: string;
    readonly loadingStatus: string;
    readonly date: {
      readonly locale: string;
      readonly localTime: string;
      readonly timeZoneLabels: LabelMap<string>;
      readonly timeZoneWithOffset: (tail: string, offset: string) => string;
    };
    readonly hero: {
      readonly focusAria: string;
      readonly focusLabel: string;
      readonly focusEmpty: string;
      readonly manageFocus: string;
      readonly leaningsAria: string;
      readonly confidenceLabel: string;
    };
    readonly heroMemories: {
      readonly ariaLabel: string;
      readonly title: string;
      readonly intro: string;
      readonly editBodyAria: string;
      readonly actionsAria: string;
      readonly editAction: string;
      readonly deleteAction: string;
      readonly emptyBody: string;
      readonly deleteFailed: string;
      readonly deleteTitle: string;
      readonly deleteMessage: (body: string) => string;
    };
    readonly eventInput: {
      readonly ariaLabel: string;
      readonly title: string;
      readonly intro: string;
      readonly placeholder: string;
      readonly emptyHint: string;
      readonly invalidHint: (reason: string) => string;
      readonly successHint: string;
      readonly submit: string;
    };
    readonly readiness: {
      readonly ariaLabel: string;
      readonly button: string;
      readonly fallback: RiJingReadinessCopy;
      readonly reasons: Record<NatalReadinessReason, RiJingReadinessCopy>;
    };
    readonly actions: {
      readonly ariaLabel: string;
      readonly title: string;
      readonly slots: Record<'do' | 'say' | 'avoid', string>;
    };
    readonly projections: {
      readonly ariaLabel: string;
      readonly title: string;
    };
    readonly evidence: {
      readonly title: string;
      readonly emptyChipGroup: string;
      readonly emptyChipValue: string;
    };
  };
  readonly shijing: {
    readonly composerPlaceholder: string;
    readonly suggestedQuestions: readonly string[];
    readonly unrecordedQuestion: string;
    readonly sessionGroups: {
      readonly today: string;
      readonly week: string;
      readonly earlier: string;
    };
    readonly sessionDateLabel: (month: number, day: number) => string;
    readonly sourceMissing: string;
    readonly title: string;
    readonly railAria: string;
    readonly searchPlaceholder: string;
    readonly searchAria: string;
    readonly emptyHistory: string;
    readonly emptySearch: string;
    readonly emptyHistoryDescription: string;
    readonly composerAria: string;
    readonly composerTitle: string;
    readonly seedAria: string;
    readonly seedLabel: string;
    readonly seedKindPlan: string;
    readonly seedKindMemory: string;
    readonly seedRemoveAria: string;
    readonly questionAria: string;
    readonly generateTitle: string;
    readonly generating: string;
    readonly generate: string;
    readonly suggestLabel: string;
    readonly resultAria: string;
    readonly context: {
      readonly aria: string;
      readonly title: string;
      readonly description: string;
      readonly empty: string;
      readonly manage: string;
    };
    readonly citedReadings: (count: number) => string;
  };
  readonly natalErrors: Record<string, string>;
  readonly operationFailed: (code: string) => string;
}

const ZH_COPY: ProductCopy = {
  brandName: '时镜',
  brandSub: 'ShiJing',
  mirrorKindLabels: {
    rijing: '日镜',
    yuejing: '月镜',
    nianjing: '年镜',
    shijing: '时镜',
  },
  tendencyClassLabels: {
    supportive: '助力',
    steady: '平稳',
    watch: '观察',
    blocked: '阻滞',
    turning: '转折',
  },
  nianjingInflectionKindLabels: {
    dayun_boundary: '大运边界',
    annual_transition: '流年切换',
    monthly_transition: '流月切换',
    marker_cluster: '多重节点',
  },
  calendarSystemLabels: {
    gregorian: '公历',
    lunar_chinese: '农历',
  },
  birthPrecisionLabels: {
    exact: '准确到分钟',
    rough_day: '大概时间或仅日期',
    rough_month: '仅月份',
    rough_year: '仅年份',
    unknown: '不确定',
  },
  calculationSexLabels: {
    female: '女',
    male: '男',
    unspecified: '暂不确定',
  },
  consentStateLabels: {
    owner_recorded: '我代为记录',
    subject_consented: '本人提供',
    withheld: '暂不确定',
  },
  responseToneLabels: {
    neutral: '中立',
    warm: '温和',
    concise: '简洁',
  },
  responseLengthLabels: {
    short: '简短',
    standard: '标准',
    long: '详尽',
  },
  responseLanguageLabels: {
    'zh-Hans': '简体中文',
    'zh-Hant': '繁体中文',
    en: 'English',
  },
  conversationRoleLabels: {
    user: '我',
    ai: '时镜',
  },
  concernTagStatusLabels: {
    active: '关注中',
    archived: '已收起',
  },
  recordSourceLabels: {
    manual: '我自己记的',
    rijing: '来自日镜',
    yuejing: '来自月镜',
    nianjing: '来自年镜',
    shijing: '来自时镜',
  },
  memoryUseLabels: {
    record_only: '只自己留个底',
    eligible_for_retrieval: '可以作为解读参考',
  },
  settingsSurfaceLabels: {
    self: '本人',
    people: '人物',
    concern_tags: '关注标签',
    memory_and_plans: '记忆与计划',
    response_preferences: '回应偏好',
    privacy_local_data: '隐私与本地数据',
    diagnostics: '诊断',
  },
  settingsPageLabels: {
    profile: '档案',
    concerns: '关注',
    memory: '重要经历',
    settings: '设置',
  },
  readinessBlockerLabels: {
    missing_self_natal_inputs: '尚未填写本人生辰',
    invalid_self_natal_inputs: '本人生辰格式有误',
    unresolved_person_mention: '关注中存在未解析的人员提及',
    incomplete_related_person_natal_inputs: '相关人物的本命输入不完整',
    stale_reading_inputs: '解读所基于的输入已过期',
    runtime_ai_failure: 'AI 服务暂不可用',
    persistence_failure: '本地数据读写失败',
    hash_mismatch: '哈希校验未通过,需要重新生成',
  },
  uiLanguageLabels: {
    zh: '中文',
    en: 'English',
  },
  common: {
    add: '添加',
    cancel: '取消',
    close: '关闭',
    delete: '删除',
    edit: '编辑',
    save: '保存',
    saving: '保存中',
    optional: '可选',
    saved: '已保存',
    loading: '加载中',
  },
  shell: {
    navAriaLabel: '时镜四镜',
    accountMenu: '账户菜单',
    settingsMenu: '设置',
    languageSwitch: '界面语言',
    snapshotInvalid: (code) =>
      `数据快照校验未通过: ${code}。请点击右上角头像打开"设置 → 隐私与本地数据"清理已存数据后再试。`,
    persistenceFailed: (detail) => `本地数据读写失败: ${detail}`,
    loadingMirror: '正在加载镜面…',
    loadingSettings: '正在加载设置…',
  },
  settings: {
    back: '返回',
    subnavAriaLabel: '设置分区',
    profileIntro: '管理用于排盘与解读的基础资料和关系人物。',
    concernsIntro: '记下你最近在意的事，它们是时镜看你近况的「镜片」。激活的关注会进入日 / 月 / 年镜的推算。内容只保存在本地。',
    memoryIntro: '记下你经历过的大事，解读时会结合它们，更懂你的处境。内容只保存在本地。',
    settingsIntro: '调整时镜如何回应你，并管理只保存在本设备上的数据。',
    localOnlyTag: '本地保存 · 不会公开',
  },
  uiLanguage: {
    title: '界面语言',
    description: '切换时镜界面拷贝；不会改变 AI 回应语言、推算输入或历史解读。',
    saved: (languageLabel) => `界面语言已切换为 ${languageLabel}`,
    saveFailed: (code) => `语言切换失败: ${code}`,
  },
  responsePreferences: {
    title: '回应偏好',
    description: '调整时镜回应你的语气、长度与 AI 回应语言',
    tone: '语气',
    length: '长度',
    aiLanguage: 'AI 回应语言',
    extraInstructions: '额外指示',
    extraPlaceholder: '例如：更直接一些，少用泛泛提醒',
    saveButton: '保存回应偏好',
    saveFailed: (code) => `保存失败: ${code}`,
    savedAt: (savedAt) => `已保存 (${savedAt})`,
  },
  self: {
    title: '本人资料',
    description: '本命盘与时镜推算所依据的出生信息。',
    metaLabel: '历法 · 地区 · 准确度',
    locationLabel: '地点与时区',
    complete: '资料完整',
    editDialog: '编辑本人资料',
    notes: '备注',
    notesPlaceholder: '补充说明，例如生辰来源、出生证明备注…',
    missing: '未填写',
    coreLabels: {
      sex: '性别',
      birthDate: '出生日期',
      birthTime: '出生时间',
    },
    reminders: {
      missingBirthDate: '出生日期未填写，暂时无法生成完整排盘。',
      missingBirthTime: '出生时间未填写，时柱与大运只能粗略推算。',
      missingPlace: '出生地点未填写，可能影响时区与节气换算。',
      missingSex: '性别未填写，大运方向暂时无法确定。',
    },
    tags: ['本命盘', '日镜', '月镜', '年镜'],
    saveIncomplete: (kind) => `保存未完成（${kind}），请稍后重试。`,
    saveFailed: (detail) => `保存失败：${detail}`,
    validationFailed: (code) => `保存失败：当前资料快照未通过校验（${code}）。`,
  },
  people: {
    title: '关系人物',
    description: '添加家人、伴侣或重要的人，用于关系合盘和事件解读。',
    empty: '暂无关系人物',
    addDialog: '添加关系人物',
    displayName: '称呼',
    displayNamePlaceholder: '例如：阿楠、老张',
    relation: '关系',
    relationPlaceholder: '例如：母亲、合伙人',
    consentSource: '资料来源',
    notes: '备注',
    notesPlaceholder: '关于这个人的补充说明…',
    addPerson: '添加人物',
    deletePersonAria: (name) => `删除 ${name}`,
    deleteBlocked: '无法删除：仍有关注标签等内容引用了该人物，请先解除引用再删除。',
    deleteTitle: '删除这个人物？',
    deleteMessage: (name) => `「${name}」及其排盘资料将被永久删除。此操作不可撤销。`,
  },
  memory: {
    title: '重要经历',
    description: '记下经历过的大事，解读时会作为参考',
    empty: '还没有记录。记下经历过的大事，解读时会作为参考。',
    addDialog: '记一件重要经历',
    occurredAt: '发生时间',
    source: '记录来源',
    body: '发生了什么',
    bodyPlaceholder: '例如：换了新工作 / 和家人聊开了 / 一段关系结束了',
    concernRefs: '关联到哪些关注',
    noConcernTags: '还没有关注标签，可以先在上方添加。',
    useForReading: '要不要用于解读',
    saveRecord: '保存这条记录',
    deleteRecordAria: '删除这条记录',
    saveFailed: (code) => `没能保存，请检查内容后再试一次。 （错误代码 ${code}）`,
    cascadeReadings: (count) => `${count} 条引用它的解读`,
    cascadeConversations: (count) => `${count} 条相关对话`,
    deleteMessage: (body, extra) => `「${body}」将被永久删除，解读时不再引用。${extra}此操作不可撤销。`,
    deleteTitle: '删除这条记录？',
  },
  natal: {
    calendar: '出生日期类型',
    sex: '性别',
    birthDate: '出生日期',
    birthPlace: '出生地',
    birthPlacePlaceholder: '输入城市或区县名，如 广州 / 昆山',
    birthTime: '出生时间',
    unknownTime: '我不知道确切时间',
    dstWarning: '提示：该出生时间处于夏令时期间（中国曾在 1986–1991 年实行夏令时）。请确认这里填的是当时钟表上显示的时间——系统会按夏令时自动 +1 小时换算时区，你无需手动加减。',
    calibration: '地点与时区校准',
    calibrationDescription: '系统会根据「出生地」自动匹配经纬度和时区，一般无需改动。只有当匹配不准、出生地跨时区，或涉及夏令时，才需要在这里手动调整。',
    latitude: '纬度',
    longitude: '经度',
    timeZone: 'IANA 时区',
    latitudePlaceholder: '例如 23.13',
    longitudePlaceholder: '例如 113.26',
    timeZonePlaceholder: '例如 Asia/Shanghai',
  },
  onboarding: {
    ariaLabel: '启动准备',
    eyebrow: '启动准备',
    title: '让日镜先认识你。',
    lede: '完成本人资料和关注，日镜会据此生成今日判断。',
    enter: '进入日镜',
    readinessAria: '准备状态',
    selfTitle: '本人资料',
    selfPending: '建立本命输入',
    done: '已完成',
    concernTitle: '关注',
    activeCount: (active, limit) => `${active}/${limit} 已激活`,
    concernPending: '至少激活 1 项',
    profileStageEyebrow: '出生信息',
    concernStageEyebrow: '关注镜片',
    profileStageTitle: '先确定推算依据。',
    concernStageTitle: '再告诉日镜该看向哪里。',
    continueProfile: '继续完善资料',
    continueConcerns: '继续选择关注',
  },
  concerns: {
    title: '关注的事',
    description: (limit, active, atLimit) =>
      `写下你这阵子最在意的事，解读时会围绕它们来展开 · 最多同时关注 ${limit} 项，正在关注 ${active} 项${atLimit ? '（已满，先收起一项再添加新的）' : ''}`,
    activeGroup: '已激活',
    addableGroup: '可添加',
    relatedTo: '关系到',
    resolved: '已匹配',
    pending: '待匹配',
    remove: '移除',
    noActive: '还没有关注的事。从下面挑一个，或写下你这阵子最在意的。',
    addLimitTitle: (limit) => `已达激活上限 ${limit}`,
    addTitle: '加入关注',
    customLabel: '自定义关注',
    customPlaceholder: '想关注什么？如「创业」「考研」，可 @某人，也可直接写一句话',
    deleteAria: (label) => `彻底删除 ${label}`,
    deleteTitle: '彻底删除这个关注？',
    deleteMessage: (label) => `「${label}」将被永久删除，并从引用它的记录中移除。此操作不可撤销。`,
    focusAria: '关注标签',
    focusLabel: '关注',
    activeCountAria: (active, limit) => `已激活 ${active} / ${limit}`,
    focusEmpty: '还没有关注标签',
    toggleOffTitle: '点按：本次不关注',
    toggleOnTitle: '点按：加入关注',
    manage: '管理',
  },
  privacy: {
    title: '隐私与本地数据',
    description: '你的资料只保存在本设备 · 可在此查看本地存储状态并在需要时清理',
    status: '本地持久化状态',
    error: (kind) => `本地持久化错误: ${kind}。可能原因:本地保存了旧版本架构的快照,新校验拒绝其加载。`,
    clearButton: '清理本地持久化数据',
    clearNoAdapter: '清理失败:当前没有可用的本地持久化适配器',
    clearing: '清理中…',
    cleared: '已清理。请刷新页面以重新加载。',
    clearFailed: (kind) => `清理失败: ${kind}`,
  },
  diagnostics: {
    title: '诊断',
    description: '查看当前数据快照的校验状态,便于排查问题',
    snapshotStatus: '当前快照校验',
    validationCode: '校验错误码',
  },
  methodProfile: {
    title: '推演方法',
    description: '选择命理算法引擎,新生成的日/月/年镜与时镜将采用此方法',
    algorithm: '命理算法',
    note: '切换后立即生效;已生成的解读保留各自方法,可并排对照。',
    switchedAt: (savedAt) => `已切换 (${savedAt})`,
  },
  aiConfig: {
    title: 'AI 模型配置',
    description: '绑定 Runtime text.generate 模型，供四镜解读的 Runtime AI wording 使用',
    runtimeNotReady: 'Runtime 未就绪',
    runtimeUnavailable: 'Runtime 不可用',
    runtimeBootstrapPending: 'Runtime bootstrap 尚未完成。',
    needsTarget: '需要目标',
    missingTarget: '缺少模型目标',
    missingTargetDetail: '四镜生成会在缺少 text.generate targetRef 时 fail-close。',
    configured: '已配置',
    modelConfigured: '模型已配置',
  },
  readingFailure: {
    headlines: {
      runtime_ai_failed: '生成失败:Runtime AI 不可用或解析失败。',
      pipeline_stage_failed: '生成失败:推算阶段出错。',
      validation_failed: '生成失败:解读未通过格式校验。',
      stale_inputs: '生成失败:输入快照已过期,请重新生成。',
      hash_mismatch: '生成失败:哈希校验未通过,请重新生成。',
      algorithm_fail_closed: '生成失败:当前资料精度不足以生成该镜面解读(SJG-ALGO-10 已按规则收口)。',
    },
  },
  citationDrawer: {
    ariaLabel: '生成依据',
    summary: '生成依据 / 引用',
    method: '方法',
    citedMemories: '引用记忆',
    citedPlans: '引用计划',
  },
  importToShijing: {
    label: '导入到时镜咨询',
    pendingLabel: '已加入时镜咨询',
    ariaLabel: '导入到时镜咨询',
  },
  rijing: {
    stageHeadlines: {
      进时: '顺势承担',
      收时: '收束归档',
      养时: '修养蓄力',
      转时: '处于转折',
      守时: '稳中守节',
    },
    stageHeadlineFallback: '如常推进',
    headlineFallback: '尚未生成今日日镜',
    leaningFallback: '平稳',
    eyebrow: '今日总览',
    defaultReminder: '今日可以稳定推进，仍记得在动作前再做一次"是否真的准备好了"的确认。',
    defaultConfidenceNote: '推演基于完整资料，结论可作为节奏参考。',
    confidenceLabels: {
      high: '较高',
      medium: '中等',
      low: '较低',
    },
    emptyHero: {
      ready_to_generate: {
        description: '资料与关注已就绪，点击右上角刷新即可生成今日判断。',
        confidence_note: '今日日镜尚未生成。',
        reminder: '生成前请确认解读视角是否符合你今天真正关心的问题。',
      },
      profile_incomplete: {
        description: '先完善本人生辰资料，日镜才能计算当下时空与命盘关系。',
        confidence_note: '资料未就绪，今日判断尚未生成。',
        reminder: '补全资料后，系统会按当前关注自动生成今日日镜。',
      },
      missing_focus: {
        description: '先添加并激活一个关注，日镜会围绕你正在意的事生成。',
        confidence_note: '缺少解读视角，今日判断尚未生成。',
        reminder: '关注是日镜的镜片；没有关注时，系统不会生成泛化建议。',
      },
      runtime_ai_failed: {
        description: 'Runtime AI wording 未完成，当前不会生成替代解读。',
        confidence_note: 'AI 生成失败，日镜按 fail-close 规则停止。',
        reminder: '请先确认 AI 模型配置，再重新生成今日日镜。',
      },
      persistence_pending: {
        description: '正在加载本地数据，完成后才能生成今日日镜。',
        confidence_note: '本地快照尚未就绪。',
        reminder: '等待本地数据加载完成，可以避免覆盖尚未读取的快照。',
      },
      persistence_failed: {
        description: '本地数据读写失败，日镜已停止生成以保护快照一致性。',
        confidence_note: '本地持久化不可用。',
        reminder: '请到设置检查隐私与本地数据，再重新生成今日日镜。',
      },
    },
    emptyActions: {
      ready_to_generate: '生成今日日镜',
      profile_incomplete: '完善资料',
      missing_focus: '管理关注',
      runtime_ai_failed: '配置 AI 模型',
      persistence_failed: '管理本地数据',
    },
    failureActions: {
      runtimeAi: '配置 AI 模型',
    },
    refreshAria: {
      loading: '生成中…',
      persistenceFailed: '本地数据读写失败,请先在设置中处理',
      persistencePending: '本地数据加载中,暂不能生成今日',
      profileIncomplete: '资料还不足以生成今日',
      missingFocus: '请先在「设置 → 关注标签」中激活至少一个关注',
      regenerate: '重新生成今日',
      refresh: '刷新今日',
    },
    emptyTagsStatus: '请先在「设置 → 关注标签」中激活至少一个关注，今日才能围绕你正在意的事生成。',
    loadingStatus: '正在生成今日日镜…',
    date: {
      locale: 'zh-CN-u-ca-gregory',
      localTime: '本地时间',
      timeZoneLabels: {
        'Etc/UTC': '国际标准时间',
        UTC: '国际标准时间',
        GMT: '国际标准时间',
        'Asia/Shanghai': '北京时间',
        'Asia/Chongqing': '北京时间',
        'Asia/Hong_Kong': '香港时间',
        'Asia/Taipei': '台北时间',
        'Asia/Tokyo': '东京时间',
        'Asia/Seoul': '首尔时间',
        'Asia/Singapore': '新加坡时间',
        'Asia/Bangkok': '曼谷时间',
        'Asia/Dubai': '迪拜时间',
        'Europe/London': '伦敦时间',
        'Europe/Paris': '巴黎时间',
        'Europe/Berlin': '柏林时间',
        'Europe/Moscow': '莫斯科时间',
        'America/New_York': '纽约时间',
        'America/Los_Angeles': '洛杉矶时间',
        'America/Chicago': '芝加哥时间',
        'Australia/Sydney': '悉尼时间',
      },
      timeZoneWithOffset: (tail, offset) => `${tail}（${offset}）`,
    },
    hero: {
      focusAria: '解读视角',
      focusLabel: '解读视角',
      focusEmpty: '尚未选择关注',
      manageFocus: '管理',
      leaningsAria: '今日倾向',
      confidenceLabel: '可信度',
    },
    heroMemories: {
      ariaLabel: '今日参考的事件',
      title: '今日参考的事件',
      intro: '结论已结合下面这些事件来看。',
      editBodyAria: '编辑事件描述',
      actionsAria: '操作',
      editAction: '编辑',
      deleteAction: '删除',
      emptyBody: '描述不能为空。',
      deleteFailed: '删除失败，请稍后再试。',
      deleteTitle: '删除这条事件？',
      deleteMessage: (body) => `「${body}」将不再作为今日推演的参考。此操作不可撤销。`,
    },
    eventInput: {
      ariaLabel: '今日参照',
      title: '今日参照',
      intro: '补充一件今天正在发生的事，系统会结合这件事与当前关注视角整理今日判断。',
      placeholder: '例如：下午要谈一个重要合作，心里有点不确定……',
      emptyHint: '可以先写一句今天发生的事情。',
      invalidHint: (reason) => `这条事件没有加入（${reason}）。请稍后再试或调整描述。`,
      successHint: '已加入今日参照，今日判断会优先结合这件事来看。',
      submit: '加入今日参照',
    },
    readiness: {
      ariaLabel: '资料完整度提示',
      button: '完善资料',
      fallback: { title: '资料完整度：待补充', body: '补充后判断会更精细。' },
      reasons: {
        subject_missing: {
          title: '资料完整度：本人生辰待建立',
          body: '补充后即可生成今日日镜。',
        },
        natal_inputs_invalid: {
          title: '资料完整度：本人生辰待建立',
          body: '补充后即可生成今日日镜。',
        },
        scaffold_default_natal_inputs: {
          title: '资料完整度：本人生辰待建立',
          body: '补充后即可生成今日日镜。',
        },
        birth_precision_unknown: {
          title: '资料完整度：出生时间精度待补充',
          body: '补充后可细化时柱、大运与分镜建议。',
        },
        birth_location_unresolved: {
          title: '资料完整度：出生地点待补充',
          body: '补充后真太阳时与时区会更准确。',
        },
        birth_precision_rough_year_for_mirror: {
          title: '资料完整度：出生时间需补到月或日',
          body: '当前仅约到年，非本命解读会受限。',
        },
        birth_precision_rough_month_for_dayun: {
          title: '资料完整度：出生时间建议补到日',
          body: '当前仅约到月，需要大运的判断会偏移。',
        },
        calculation_sex_unspecified_for_dayun: {
          title: '资料完整度：性别待补充',
          body: '补充后可推算大运起运方向。',
        },
        birth_time_required_for_method: {
          title: '资料完整度：所选方法需精确时辰',
          body: '紫微斗数需精确到时辰才能安命宫，请先补全准确的出生时刻。',
        },
      },
    },
    actions: {
      ariaLabel: '今日行动',
      title: '今日行动',
      slots: {
        do: '今天做一件事',
        say: '今天说一句话',
        avoid: '今天避免一件事',
      },
    },
    projections: {
      ariaLabel: '今日关注分镜',
      title: '今日关注分镜',
    },
    evidence: {
      title: '推演依据与数据说明',
      emptyChipGroup: '数据完整度',
      emptyChipValue: '待生成',
    },
  },
  shijing: {
    composerPlaceholder: [
      '接下来一个月，我该不该换工作?',
      '这段关系现在最需要注意什么?',
      '最近反复焦虑，是阶段变化还是方向不清?',
    ].join('\n'),
    suggestedQuestions: [
      '接下来30天，我最需要注意什么?',
      '现在这个决定，适合推进还是等待?',
      '这段关系真正的卡点是什么?',
    ],
    unrecordedQuestion: '(未记录问题)',
    sessionGroups: {
      today: '今天',
      week: '本周',
      earlier: '更早',
    },
    sessionDateLabel: (month, day) => `${month}月${day}日`,
    sourceMissing: '尚无可引用的解读',
    title: '问时镜',
    railAria: '提问记录',
    searchPlaceholder: '搜索提问',
    searchAria: '搜索提问',
    emptyHistory: '还没有提问记录',
    emptySearch: '没有匹配的提问',
    emptyHistoryDescription: '提问后会在这里形成你的时间脉络。',
    composerAria: '提问',
    composerTitle: '你现在最想问什么？',
    seedAria: '本次提问基于的记录',
    seedLabel: '基于这条记录提问',
    seedKindPlan: '计划',
    seedKindMemory: '事件',
    seedRemoveAria: '移除这条记录',
    questionAria: '你的问题',
    generateTitle: '生成解读',
    generating: '生成中…',
    generate: '✦ 生成解读',
    suggestLabel: '可以这样问',
    resultAria: '解读结果',
    context: {
      aria: '上下文焦点',
      title: '上下文焦点',
      description: '当前激活的关注会自动影响本次问时镜解读。',
      empty: '未设置关注',
      manage: '去设置管理 ›',
    },
    citedReadings: (count) => `引用解读 ${count} 份`,
  },
  natalErrors: {
    birth_location_required: '请选择出生地。系统会自动匹配经纬度和时区。',
    birth_location_unresolved: '请从出生地建议中选择一个地点，或展开「地点与时区校准」手动填写经纬度和 IANA 时区。',
    latitude_invalid: '出生地点纬度无效，请填 -90 ~ 90 之间的数值（例如广州约 23.13）。',
    birth_location_latitude_invalid: '出生地点纬度无效，请填 -90 ~ 90 之间的数值（例如广州约 23.13）。',
    longitude_invalid: '出生地点经度无效，请填 -180 ~ 180 之间的数值（例如广州约 113.26）。',
    birth_location_longitude_invalid: '出生地点经度无效，请填 -180 ~ 180 之间的数值（例如广州约 113.26）。',
    timezone_conversion_failed: '请填写有效的 IANA 时区（例如 Asia/Shanghai）。',
    birth_location_iana_time_zone_invalid: '请填写有效的 IANA 时区（例如 Asia/Shanghai）。',
    birth_location_iana_time_zone_offset_only_forbidden:
      'IANA 时区请填地区名（例如 Asia/Shanghai），不要用 +08:00 这样的偏移量。',
    local_date_invalid: '请填写有效的出生日期。',
    local_time_invalid: '请填写有效的出生时间（HH:MM）。',
    raw_birth_input_local_date_text_empty: '请填写出生日期。',
    natal_inputs_birth_datetime_utc_invalid: '出生时刻无效，请检查日期、时间与时区。',
    lunar_field_invalid: '农历年/月/日填写有误，请检查。',
    raw_birth_input_lunar_field_invalid: '农历年/月/日填写有误，请检查。',
    raw_birth_input_lunar_missing_leap_month_evidence: '请补全农历闰月信息。',
    raw_birth_input_gregorian_must_not_carry_lunar_fields: '公历输入不应携带农历字段。',
    natal_inputs_birth_precision_invalid: '生辰精度无效，请重新选择。',
    natal_inputs_calculation_sex_invalid: '排盘性别无效，请重新选择。',
    natal_inputs_cultural_marker_invalid: '文化标记无效。',
    person_display_name_empty: '请填写人物的称呼。',
    person_id_empty: '人物标识缺失，请点「重置」后重试。',
    person_consent_state_invalid: '同意状态无效，请重新选择。',
    person_duplicate_id: '该人物已存在，请点「重置」后重试。',
  },
  operationFailed: (code) => `操作未成功（${code}）`,
};

const EN_COPY: ProductCopy = {
  brandName: 'ShiJing',
  brandSub: 'ShiJing',
  mirrorKindLabels: {
    rijing: 'Daily Mirror',
    yuejing: 'Monthly Mirror',
    nianjing: 'Yearly Mirror',
    shijing: 'Consultation Mirror',
  },
  tendencyClassLabels: {
    supportive: 'Supportive',
    steady: 'Steady',
    watch: 'Watch',
    blocked: 'Blocked',
    turning: 'Turning',
  },
  nianjingInflectionKindLabels: {
    dayun_boundary: 'DaYun boundary',
    annual_transition: 'Annual transition',
    monthly_transition: 'Monthly transition',
    marker_cluster: 'Marker cluster',
  },
  calendarSystemLabels: {
    gregorian: 'Gregorian',
    lunar_chinese: 'Chinese lunar',
  },
  birthPrecisionLabels: {
    exact: 'Exact to minute',
    rough_day: 'Approximate time or date only',
    rough_month: 'Month only',
    rough_year: 'Year only',
    unknown: 'Unknown',
  },
  calculationSexLabels: {
    female: 'Female',
    male: 'Male',
    unspecified: 'Not sure',
  },
  consentStateLabels: {
    owner_recorded: 'Recorded by me',
    subject_consented: 'Provided by them',
    withheld: 'Not sure',
  },
  responseToneLabels: {
    neutral: 'Neutral',
    warm: 'Warm',
    concise: 'Concise',
  },
  responseLengthLabels: {
    short: 'Short',
    standard: 'Standard',
    long: 'Detailed',
  },
  responseLanguageLabels: {
    'zh-Hans': 'Simplified Chinese',
    'zh-Hant': 'Traditional Chinese',
    en: 'English',
  },
  conversationRoleLabels: {
    user: 'Me',
    ai: 'ShiJing',
  },
  concernTagStatusLabels: {
    active: 'Active',
    archived: 'Hidden',
  },
  recordSourceLabels: {
    manual: 'Recorded by me',
    rijing: 'From Daily Mirror',
    yuejing: 'From Monthly Mirror',
    nianjing: 'From Yearly Mirror',
    shijing: 'From Consultation Mirror',
  },
  memoryUseLabels: {
    record_only: 'Keep for my record only',
    eligible_for_retrieval: 'Can inform readings',
  },
  settingsSurfaceLabels: {
    self: 'Self',
    people: 'People',
    concern_tags: 'Concern tags',
    memory_and_plans: 'Memory and plans',
    response_preferences: 'Response preferences',
    privacy_local_data: 'Privacy and local data',
    diagnostics: 'Diagnostics',
  },
  settingsPageLabels: {
    profile: 'Profile',
    concerns: 'Concerns',
    memory: 'Life events',
    settings: 'Settings',
  },
  readinessBlockerLabels: {
    missing_self_natal_inputs: 'Self birth data is missing',
    invalid_self_natal_inputs: 'Self birth data is invalid',
    unresolved_person_mention: 'A concern contains an unresolved person mention',
    incomplete_related_person_natal_inputs: 'Related person birth data is incomplete',
    stale_reading_inputs: 'This reading is based on stale inputs',
    runtime_ai_failure: 'AI service is unavailable',
    persistence_failure: 'Local data read/write failed',
    hash_mismatch: 'Hash verification failed; regenerate the reading',
  },
  uiLanguageLabels: {
    zh: '中文',
    en: 'English',
  },
  common: {
    add: 'Add',
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    saving: 'Saving',
    optional: 'Optional',
    saved: 'Saved',
    loading: 'Loading',
  },
  shell: {
    navAriaLabel: 'ShiJing mirrors',
    accountMenu: 'Account menu',
    settingsMenu: 'Settings',
    languageSwitch: 'Interface language',
    snapshotInvalid: (code) =>
      `Data snapshot validation failed: ${code}. Open Settings -> Privacy and local data from the account menu, clear local data, then try again.`,
    persistenceFailed: (detail) => `Local data read/write failed: ${detail}`,
    loadingMirror: 'Loading mirror...',
    loadingSettings: 'Loading settings...',
  },
  settings: {
    back: 'Back',
    subnavAriaLabel: 'Settings sections',
    profileIntro: 'Manage the birth data and people used for charting and readings.',
    concernsIntro: 'Record what currently matters to you. Active concerns become the lens for Daily, Monthly, and Yearly Mirror generation. Data stays local.',
    memoryIntro: 'Record major events you have lived through so readings can account for your context. Data stays local.',
    settingsIntro: 'Adjust how ShiJing responds and manage data stored only on this device.',
    localOnlyTag: 'Saved locally · Not public',
  },
  uiLanguage: {
    title: 'Interface language',
    description: 'Switch ShiJing interface copy. This does not change AI response language, calculation inputs, or existing readings.',
    saved: (languageLabel) => `Interface language switched to ${languageLabel}`,
    saveFailed: (code) => `Language switch failed: ${code}`,
  },
  responsePreferences: {
    title: 'Response preferences',
    description: 'Adjust ShiJing response tone, length, and AI response language',
    tone: 'Tone',
    length: 'Length',
    aiLanguage: 'AI response language',
    extraInstructions: 'Extra instructions',
    extraPlaceholder: 'For example: be more direct and avoid generic reminders',
    saveButton: 'Save response preferences',
    saveFailed: (code) => `Save failed: ${code}`,
    savedAt: (savedAt) => `Saved (${savedAt})`,
  },
  self: {
    title: 'Self profile',
    description: 'Birth data used for the natal chart and ShiJing calculations.',
    metaLabel: 'Calendar · Place · Precision',
    locationLabel: 'Place and time zone',
    complete: 'Profile complete',
    editDialog: 'Edit self profile',
    notes: 'Notes',
    notesPlaceholder: 'Add context such as birth-data source or birth certificate notes...',
    missing: 'Missing',
    coreLabels: {
      sex: 'Sex',
      birthDate: 'Birth date',
      birthTime: 'Birth time',
    },
    reminders: {
      missingBirthDate: 'Birth date is missing, so a complete chart cannot be generated yet.',
      missingBirthTime: 'Birth time is missing; hour pillar and DaYun can only be approximated.',
      missingPlace: 'Birth place is missing and may affect time-zone and jieqi conversion.',
      missingSex: 'Sex is missing, so DaYun direction cannot be determined yet.',
    },
    tags: ['Natal chart', 'Daily Mirror', 'Monthly Mirror', 'Yearly Mirror'],
    saveIncomplete: (kind) => `Save is not complete (${kind}). Try again later.`,
    saveFailed: (detail) => `Save failed: ${detail}`,
    validationFailed: (code) => `Save failed: current snapshot did not pass validation (${code}).`,
  },
  people: {
    title: 'People',
    description: 'Add family, partners, or important people for relationship charts and event readings.',
    empty: 'No people yet',
    addDialog: 'Add person',
    displayName: 'Name',
    displayNamePlaceholder: 'For example: Anna, Lao Zhang',
    relation: 'Relation',
    relationPlaceholder: 'For example: mother, partner',
    consentSource: 'Data source',
    notes: 'Notes',
    notesPlaceholder: 'Additional context about this person...',
    addPerson: 'Add person',
    deletePersonAria: (name) => `Delete ${name}`,
    deleteBlocked: 'Cannot delete: this person is still referenced by concern tags or other records. Remove those references first.',
    deleteTitle: 'Delete this person?',
    deleteMessage: (name) => `"${name}" and their chart data will be permanently deleted. This cannot be undone.`,
  },
  memory: {
    title: 'Life events',
    description: 'Record major lived events so readings can use them as context',
    empty: 'No records yet. Record major events so readings can use them as context.',
    addDialog: 'Record a life event',
    occurredAt: 'When it happened',
    source: 'Record source',
    body: 'What happened',
    bodyPlaceholder: 'For example: changed jobs / had an honest family talk / a relationship ended',
    concernRefs: 'Related concerns',
    noConcernTags: 'No concern tags yet. Add one above first.',
    useForReading: 'Use for readings',
    saveRecord: 'Save this record',
    deleteRecordAria: 'Delete this record',
    saveFailed: (code) => `Could not save. Check the content and try again. (Error code ${code})`,
    cascadeReadings: (count) => `${count} reading${count === 1 ? '' : 's'} citing it`,
    cascadeConversations: (count) => `${count} related conversation${count === 1 ? '' : 's'}`,
    deleteMessage: (body, extra) => `"${body}" will be permanently deleted and no longer cited by readings. ${extra}This cannot be undone.`,
    deleteTitle: 'Delete this record?',
  },
  natal: {
    calendar: 'Birth calendar',
    sex: 'Sex',
    birthDate: 'Birth date',
    birthPlace: 'Birth place',
    birthPlacePlaceholder: 'Enter a city or district, e.g. Guangzhou / Kunshan',
    birthTime: 'Birth time',
    unknownTime: 'I do not know the exact time',
    dstWarning: 'This birth time falls within daylight saving time. Confirm the time shown on the clock at the time; the system applies the DST offset automatically.',
    calibration: 'Place and time-zone calibration',
    calibrationDescription: 'The system usually fills latitude, longitude, and time zone from the birth place. Adjust this only when the match is inaccurate, the place crosses a time-zone boundary, or daylight saving time is involved.',
    latitude: 'Latitude',
    longitude: 'Longitude',
    timeZone: 'IANA time zone',
    latitudePlaceholder: 'Example: 23.13',
    longitudePlaceholder: 'Example: 113.26',
    timeZonePlaceholder: 'Example: Asia/Shanghai',
  },
  onboarding: {
    ariaLabel: 'Startup readiness',
    eyebrow: 'Startup readiness',
    title: 'Let Daily Mirror know you first.',
    lede: 'Complete your self profile and concerns so Daily Mirror can generate today’s reading.',
    enter: 'Enter Daily Mirror',
    readinessAria: 'Readiness status',
    selfTitle: 'Self profile',
    selfPending: 'Add natal inputs',
    done: 'Done',
    concernTitle: 'Concerns',
    activeCount: (active, limit) => `${active}/${limit} active`,
    concernPending: 'Activate at least 1',
    profileStageEyebrow: 'Birth data',
    concernStageEyebrow: 'Concern lens',
    profileStageTitle: 'First, set the calculation basis.',
    concernStageTitle: 'Then tell Daily Mirror where to look.',
    continueProfile: 'Continue profile',
    continueConcerns: 'Continue concerns',
  },
  concerns: {
    title: 'Concerns',
    description: (limit, active, atLimit) =>
      `Record what matters most right now. Readings will focus around them · Up to ${limit} active concerns, ${active} active now${atLimit ? ' (limit reached; hide one before adding another)' : ''}`,
    activeGroup: 'Active',
    addableGroup: 'Available',
    relatedTo: 'Related to',
    resolved: 'matched',
    pending: 'pending',
    remove: 'Remove',
    noActive: 'No concerns yet. Pick one below or write what currently matters most.',
    addLimitTitle: (limit) => `Active limit reached: ${limit}`,
    addTitle: 'Add to concerns',
    customLabel: 'Custom concern',
    customPlaceholder: 'What do you want to focus on? Use #career, @person, or a sentence',
    deleteAria: (label) => `Permanently delete ${label}`,
    deleteTitle: 'Permanently delete this concern?',
    deleteMessage: (label) => `"${label}" will be permanently deleted and removed from records that cite it. This cannot be undone.`,
    focusAria: 'Concern tags',
    focusLabel: 'Concerns',
    activeCountAria: (active, limit) => `${active} / ${limit} active`,
    focusEmpty: 'No concern tags yet',
    toggleOffTitle: 'Click: ignore this time',
    toggleOnTitle: 'Click: add to focus',
    manage: 'Manage',
  },
  privacy: {
    title: 'Privacy and local data',
    description: 'Your data stays on this device · Review local storage status and clear it when needed',
    status: 'Local persistence status',
    error: (kind) => `Local persistence error: ${kind}. Possible cause: a snapshot from an older schema is stored locally and rejected by current validation.`,
    clearButton: 'Clear local persisted data',
    clearNoAdapter: 'Clear failed: no local persistence adapter is available',
    clearing: 'Clearing...',
    cleared: 'Cleared. Refresh the page to reload.',
    clearFailed: (kind) => `Clear failed: ${kind}`,
  },
  diagnostics: {
    title: 'Diagnostics',
    description: 'Review the current data snapshot validation status for troubleshooting',
    snapshotStatus: 'Current snapshot validation',
    validationCode: 'Validation error code',
  },
  methodProfile: {
    title: 'Calculation method',
    description: 'Choose the astrology engine for newly generated Daily, Monthly, Yearly, and Consultation Mirror readings',
    algorithm: 'Astrology algorithm',
    note: 'Changes take effect immediately; existing readings keep their original method and can be compared side by side.',
    switchedAt: (savedAt) => `Switched (${savedAt})`,
  },
  aiConfig: {
    title: 'AI model configuration',
    description: 'Bind the Runtime text.generate model used by Runtime AI wording for the four mirrors',
    runtimeNotReady: 'Runtime not ready',
    runtimeUnavailable: 'Runtime unavailable',
    runtimeBootstrapPending: 'Runtime bootstrap is not complete.',
    needsTarget: 'Target needed',
    missingTarget: 'Missing model target',
    missingTargetDetail: 'Four-mirror generation fails closed when text.generate targetRef is missing.',
    configured: 'Configured',
    modelConfigured: 'Model configured',
  },
  readingFailure: {
    headlines: {
      runtime_ai_failed: 'Generation failed: Runtime AI is unavailable or could not be parsed.',
      pipeline_stage_failed: 'Generation failed: calculation stage error.',
      validation_failed: 'Generation failed: reading did not pass format validation.',
      stale_inputs: 'Generation failed: input snapshot is stale. Regenerate the reading.',
      hash_mismatch: 'Generation failed: hash verification failed. Regenerate the reading.',
      algorithm_fail_closed: 'Generation failed: current data precision is insufficient for this mirror reading (closed by SJG-ALGO-10).',
    },
  },
  citationDrawer: {
    ariaLabel: 'Generation evidence',
    summary: 'Generation evidence / citations',
    method: 'Method',
    citedMemories: 'Cited memories',
    citedPlans: 'Cited plans',
  },
  importToShijing: {
    label: 'Import to consultation',
    pendingLabel: 'Added to consultation',
    ariaLabel: 'Import to ShiJing consultation',
  },
  rijing: {
    stageHeadlines: {
      进时: 'Act with momentum',
      收时: 'Close and file',
      养时: 'Restore and build',
      转时: 'At a turning point',
      守时: 'Hold steady',
    },
    stageHeadlineFallback: 'Proceed steadily',
    headlineFallback: 'Daily Mirror has not been generated',
    leaningFallback: 'Steady',
    eyebrow: 'Today overview',
    defaultReminder: 'Today can move forward steadily. Before acting, check once more that you are truly ready.',
    defaultConfidenceNote: 'Based on complete data; use it as a rhythm reference.',
    confidenceLabels: {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    },
    emptyHero: {
      ready_to_generate: {
        description: 'Your profile and concerns are ready. Use refresh in the upper right to generate today’s reading.',
        confidence_note: 'Daily Mirror has not been generated yet.',
        reminder: 'Before generating, make sure the lens matches what you truly care about today.',
      },
      profile_incomplete: {
        description: 'Complete your self birth data first so Daily Mirror can calculate the relationship between current time-space and your chart.',
        confidence_note: 'Profile is not ready, so today’s reading has not been generated.',
        reminder: 'After the profile is complete, the system will generate Daily Mirror from your active concerns.',
      },
      missing_focus: {
        description: 'Add and activate one concern first. Daily Mirror is generated around what currently matters to you.',
        confidence_note: 'No reading lens is active, so today’s reading has not been generated.',
        reminder: 'Concerns are the lens for Daily Mirror; without one, the system will not generate generic advice.',
      },
      runtime_ai_failed: {
        description: 'Runtime AI wording did not complete, so no substitute reading is generated.',
        confidence_note: 'AI generation failed; Daily Mirror stopped by fail-close rules.',
        reminder: 'Check AI model configuration, then regenerate Daily Mirror.',
      },
      persistence_pending: {
        description: 'Loading local data. Daily Mirror can be generated after it is ready.',
        confidence_note: 'Local snapshot is not ready yet.',
        reminder: 'Waiting for local data avoids overwriting a snapshot that has not been read yet.',
      },
      persistence_failed: {
        description: 'Local data read/write failed. Daily Mirror stopped to protect snapshot consistency.',
        confidence_note: 'Local persistence is unavailable.',
        reminder: 'Check privacy and local data in Settings, then regenerate Daily Mirror.',
      },
    },
    emptyActions: {
      ready_to_generate: 'Generate Daily Mirror',
      profile_incomplete: 'Complete profile',
      missing_focus: 'Manage concerns',
      runtime_ai_failed: 'Configure AI model',
      persistence_failed: 'Manage local data',
    },
    failureActions: {
      runtimeAi: 'Configure AI model',
    },
    refreshAria: {
      loading: 'Generating...',
      persistenceFailed: 'Local data read/write failed. Handle it in Settings first.',
      persistencePending: 'Local data is loading. Daily Mirror cannot be generated yet.',
      profileIncomplete: 'Profile is not complete enough to generate today.',
      missingFocus: 'Activate at least one concern in Settings -> Concern tags first.',
      regenerate: 'Regenerate today',
      refresh: 'Refresh today',
    },
    emptyTagsStatus: 'Activate at least one concern in Settings -> Concern tags so today can be generated around what matters to you.',
    loadingStatus: 'Generating Daily Mirror...',
    date: {
      locale: 'en-US',
      localTime: 'Local time',
      timeZoneLabels: {
        'Etc/UTC': 'Coordinated Universal Time',
        UTC: 'Coordinated Universal Time',
        GMT: 'Coordinated Universal Time',
        'Asia/Shanghai': 'Beijing time',
        'Asia/Chongqing': 'Beijing time',
        'Asia/Hong_Kong': 'Hong Kong time',
        'Asia/Taipei': 'Taipei time',
        'Asia/Tokyo': 'Tokyo time',
        'Asia/Seoul': 'Seoul time',
        'Asia/Singapore': 'Singapore time',
        'Asia/Bangkok': 'Bangkok time',
        'Asia/Dubai': 'Dubai time',
        'Europe/London': 'London time',
        'Europe/Paris': 'Paris time',
        'Europe/Berlin': 'Berlin time',
        'Europe/Moscow': 'Moscow time',
        'America/New_York': 'New York time',
        'America/Los_Angeles': 'Los Angeles time',
        'America/Chicago': 'Chicago time',
        'Australia/Sydney': 'Sydney time',
      },
      timeZoneWithOffset: (tail, offset) => `${tail} (${offset})`,
    },
    hero: {
      focusAria: 'Reading lens',
      focusLabel: 'Reading lens',
      focusEmpty: 'No concern selected',
      manageFocus: 'Manage',
      leaningsAria: 'Today tendency',
      confidenceLabel: 'Confidence',
    },
    heroMemories: {
      ariaLabel: 'Events referenced today',
      title: 'Events referenced today',
      intro: 'The conclusion has considered these events.',
      editBodyAria: 'Edit event description',
      actionsAria: 'Actions',
      editAction: 'Edit',
      deleteAction: 'Delete',
      emptyBody: 'Description cannot be empty.',
      deleteFailed: 'Delete failed. Try again later.',
      deleteTitle: 'Delete this event?',
      deleteMessage: (body) => `"${body}" will no longer inform today’s reading. This cannot be undone.`,
    },
    eventInput: {
      ariaLabel: 'Today reference',
      title: 'Today reference',
      intro: 'Add one thing happening today. The system will use it with the current concern lens when shaping today’s reading.',
      placeholder: 'Example: I have an important partnership discussion this afternoon and feel unsure...',
      emptyHint: 'Write one sentence about what is happening today first.',
      invalidHint: (reason) => `This event was not added (${reason}). Try again later or adjust the description.`,
      successHint: 'Added as today’s reference. Today’s reading will prioritize this event.',
      submit: 'Add today reference',
    },
    readiness: {
      ariaLabel: 'Profile completeness notice',
      button: 'Complete profile',
      fallback: { title: 'Profile completeness: needs more data', body: 'Completing it will make the reading more precise.' },
      reasons: {
        subject_missing: {
          title: 'Profile completeness: self birth data is missing',
          body: 'Complete it to generate Daily Mirror.',
        },
        natal_inputs_invalid: {
          title: 'Profile completeness: self birth data is missing',
          body: 'Complete it to generate Daily Mirror.',
        },
        scaffold_default_natal_inputs: {
          title: 'Profile completeness: self birth data is missing',
          body: 'Complete it to generate Daily Mirror.',
        },
        birth_precision_unknown: {
          title: 'Profile completeness: birth-time precision is missing',
          body: 'Completing it refines hour pillar, DaYun, and mirror suggestions.',
        },
        birth_location_unresolved: {
          title: 'Profile completeness: birth place is missing',
          body: 'Completing it improves true solar time and time-zone accuracy.',
        },
        birth_precision_rough_year_for_mirror: {
          title: 'Profile completeness: birth time needs month or day precision',
          body: 'Current precision is year-only, so non-natal readings are limited.',
        },
        birth_precision_rough_month_for_dayun: {
          title: 'Profile completeness: birth time should include the day',
          body: 'Current precision is month-only, so DaYun-dependent judgments may shift.',
        },
        calculation_sex_unspecified_for_dayun: {
          title: 'Profile completeness: sex is missing',
          body: 'Completing it allows DaYun direction to be calculated.',
        },
        birth_time_required_for_method: {
          title: 'Profile completeness: selected method requires exact birth hour',
          body: 'Ziwei Doushu needs an exact birth hour to place the soul palace. Add the accurate birth time first.',
        },
      },
    },
    actions: {
      ariaLabel: 'Today actions',
      title: 'Today actions',
      slots: {
        do: 'Do one thing today',
        say: 'Say one thing today',
        avoid: 'Avoid one thing today',
      },
    },
    projections: {
      ariaLabel: 'Today concern frames',
      title: 'Today concern frames',
    },
    evidence: {
      title: 'Calculation evidence and data notes',
      emptyChipGroup: 'Data completeness',
      emptyChipValue: 'Not generated',
    },
  },
  shijing: {
    composerPlaceholder: [
      'Should I change jobs in the next month?',
      'What should I pay attention to in this relationship right now?',
      'Is this repeated anxiety a phase shift or unclear direction?',
    ].join('\n'),
    suggestedQuestions: [
      'What should I watch most closely over the next 30 days?',
      'Is this decision better to push forward or wait on?',
      'What is the real sticking point in this relationship?',
    ],
    unrecordedQuestion: '(Question not recorded)',
    sessionGroups: {
      today: 'Today',
      week: 'This week',
      earlier: 'Earlier',
    },
    sessionDateLabel: (month, day) => `${month}/${day}`,
    sourceMissing: 'No cited reading is available yet',
    title: 'Ask ShiJing',
    railAria: 'Question history',
    searchPlaceholder: 'Search questions',
    searchAria: 'Search questions',
    emptyHistory: 'No question history yet',
    emptySearch: 'No matching questions',
    emptyHistoryDescription: 'Your time-line of questions will appear here after you ask.',
    composerAria: 'Question',
    composerTitle: 'What do you most want to ask now?',
    seedAria: 'Records this question is based on',
    seedLabel: 'Ask from this record',
    seedKindPlan: 'Plan',
    seedKindMemory: 'Event',
    seedRemoveAria: 'Remove this record',
    questionAria: 'Your question',
    generateTitle: 'Generate reading',
    generating: 'Generating...',
    generate: '✦ Generate reading',
    suggestLabel: 'Try asking',
    resultAria: 'Reading result',
    context: {
      aria: 'Context focus',
      title: 'Context focus',
      description: 'Active concerns automatically shape this Consultation Mirror reading.',
      empty: 'No concern set',
      manage: 'Manage in Settings ›',
    },
    citedReadings: (count) => `${count} cited reading${count === 1 ? '' : 's'}`,
  },
  natalErrors: {
    birth_location_required: 'Choose a birth place. The system will match latitude, longitude, and time zone automatically.',
    birth_location_unresolved: 'Select a place from suggestions, or open place/time-zone calibration and enter latitude, longitude, and IANA time zone manually.',
    latitude_invalid: 'Birth latitude is invalid. Enter a value between -90 and 90, for example Guangzhou is about 23.13.',
    birth_location_latitude_invalid: 'Birth latitude is invalid. Enter a value between -90 and 90, for example Guangzhou is about 23.13.',
    longitude_invalid: 'Birth longitude is invalid. Enter a value between -180 and 180, for example Guangzhou is about 113.26.',
    birth_location_longitude_invalid: 'Birth longitude is invalid. Enter a value between -180 and 180, for example Guangzhou is about 113.26.',
    timezone_conversion_failed: 'Enter a valid IANA time zone, for example Asia/Shanghai.',
    birth_location_iana_time_zone_invalid: 'Enter a valid IANA time zone, for example Asia/Shanghai.',
    birth_location_iana_time_zone_offset_only_forbidden: 'Use an IANA region name such as Asia/Shanghai, not an offset like +08:00.',
    local_date_invalid: 'Enter a valid birth date.',
    local_time_invalid: 'Enter a valid birth time (HH:MM).',
    raw_birth_input_local_date_text_empty: 'Enter a birth date.',
    natal_inputs_birth_datetime_utc_invalid: 'Birth instant is invalid. Check date, time, and time zone.',
    lunar_field_invalid: 'Chinese lunar year/month/day is invalid. Check the values.',
    raw_birth_input_lunar_field_invalid: 'Chinese lunar year/month/day is invalid. Check the values.',
    raw_birth_input_lunar_missing_leap_month_evidence: 'Complete the lunar leap-month information.',
    raw_birth_input_gregorian_must_not_carry_lunar_fields: 'Gregorian input must not carry lunar fields.',
    natal_inputs_birth_precision_invalid: 'Birth precision is invalid. Choose again.',
    natal_inputs_calculation_sex_invalid: 'Calculation sex is invalid. Choose again.',
    natal_inputs_cultural_marker_invalid: 'Cultural marker is invalid.',
    person_display_name_empty: 'Enter a name for this person.',
    person_id_empty: 'Person id is missing. Reset and try again.',
    person_consent_state_invalid: 'Consent/data-source state is invalid. Choose again.',
    person_duplicate_id: 'This person already exists. Reset and try again.',
  },
  operationFailed: (code) => `Operation did not complete (${code})`,
};

export const PRODUCT_COPY: Record<UiLanguage, ProductCopy> = {
  zh: ZH_COPY,
  en: EN_COPY,
};

export function uiLanguageFromI18nLanguage(language: string | undefined): UiLanguage {
  return language?.startsWith('en') ? 'en' : 'zh';
}

export function getProductCopy(language: UiLanguage): ProductCopy {
  return PRODUCT_COPY[language];
}

export function useProductCopy(): ProductCopy {
  const { i18n } = useTranslation();
  return getProductCopy(uiLanguageFromI18nLanguage(i18n.resolvedLanguage ?? i18n.language));
}

// Display order for the 资料来源 dropdown (本人提供 first, per product copy).
export const CONSENT_STATE_ORDER: readonly ConsentState[] = [
  'subject_consented',
  'owner_recorded',
  'withheld',
];

// Static zh copy exports for non-hook code paths and explicitly tracked known-debt surfaces.
export const BRAND_NAME = ZH_COPY.brandName;
export const BRAND_SUB = ZH_COPY.brandSub;
export const MIRROR_KIND_LABELS = ZH_COPY.mirrorKindLabels;
export const TENDENCY_CLASS_LABELS = ZH_COPY.tendencyClassLabels;
export const NIANJING_INFLECTION_KIND_LABELS = ZH_COPY.nianjingInflectionKindLabels;
export const CALENDAR_SYSTEM_LABELS = ZH_COPY.calendarSystemLabels;
export const BIRTH_PRECISION_LABELS = ZH_COPY.birthPrecisionLabels;
export const CALCULATION_SEX_LABELS = ZH_COPY.calculationSexLabels;
export const CONSENT_STATE_LABELS = ZH_COPY.consentStateLabels;
export const RESPONSE_TONE_LABELS = ZH_COPY.responseToneLabels;
export const RESPONSE_LENGTH_LABELS = ZH_COPY.responseLengthLabels;
export const RESPONSE_LANGUAGE_LABELS = ZH_COPY.responseLanguageLabels;
export const CONVERSATION_ROLE_LABELS = ZH_COPY.conversationRoleLabels;
export const CONCERN_TAG_STATUS_LABELS = ZH_COPY.concernTagStatusLabels;
export const RECORD_SOURCE_LABELS = ZH_COPY.recordSourceLabels;
export const MEMORY_USE_LABELS = ZH_COPY.memoryUseLabels;
export const SETTINGS_SURFACE_LABELS = ZH_COPY.settingsSurfaceLabels;
export const SETTINGS_PAGE_LABELS = ZH_COPY.settingsPageLabels;
export const READINESS_BLOCKER_LABELS = ZH_COPY.readinessBlockerLabels;
export const UI_LANGUAGE_LABELS = ZH_COPY.uiLanguageLabels;
