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

function textAfter(ref: string, prefix: string): string | null {
  return ref.startsWith(prefix) ? ref.slice(prefix.length) : null;
}

function textBetween(ref: string, prefix: string): string | null {
  const value = textAfter(ref, prefix);
  if (!value) return null;
  return value.split('@')[0] ?? value;
}

function parseDomain(refs: readonly string[]): ConcernDomain {
  for (const ref of refs) {
    const domain = textAfter(ref, 'bazi:domain.') ?? textAfter(ref, 'qizheng_siyu:domain.');
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

  const ziweiDaxianHua = textAfter(ref, 'ziwei:daxian_hua@');
  if (ziweiDaxianHua) {
    const [palace, year] = ziweiDaxianHua.split('@');
    return `四化入${palace}${year ? ` ${year}` : ''}`;
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

function driverFacts(refs: readonly string[], methodId?: MethodProfileId): DriverFacts {
  return {
    domain: parseDomain(refs),
    labels: driverLabels(refs),
    method_label: methodLabelFromDriverRefs(refs, methodId),
  };
}

export function summarizeNianJingPhaseDrivers(input: {
  readonly nature: NianJingNature;
  readonly driver_refs: readonly string[];
  readonly method_id?: MethodProfileId;
}): string {
  const facts = driverFacts(input.driver_refs, input.method_id);
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
}): NianJingDriverGuidance {
  const facts = driverFacts(input.driver_refs);
  const labels = facts.labels;
  const basis = labels.slice(0, 2).join(' · ') || '长程相位';
  const nature = input.nature ?? 'steady';
  const phase = input.nature ? TENDENCY_CLASS_LABELS[input.nature] : '未成段';
  const domain = DOMAIN_LABELS[facts.domain];
  const metric = DOMAIN_METRIC[facts.domain];
  const evidence = labels.slice(1, 3).join(' · ') || basis;

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
}): NianJingPhaseDetailCopy {
  const concern = plainConcernLabel(input.concern_label);
  const guidance = buildNianJingDriverGuidance({
    nature: input.nature,
    driver_refs: input.driver_refs,
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
