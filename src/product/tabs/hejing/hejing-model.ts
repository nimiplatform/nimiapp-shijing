import type {
  MethodProfileId,
  RelationshipElementDirection,
  RelationshipHePanEvidence,
} from '../../../domain/algorithm.ts';
import type {
  MingJingRelationshipMirrorOutput,
  RelationshipTimingWindow,
  TendencyClass,
} from '../../../domain/mirror-output.ts';
import type { Person } from '../../../domain/person.ts';
import type { Reading } from '../../../domain/reading.ts';
import {
  mingJingRouteFailCloseDetail,
  validateMingJingRouteSupport,
} from '../../astrology/mingjing-route-support.ts';
import {
  HEJING_DEFAULT_BASIS,
  HEJING_PAGE_COPY,
  HEJING_RELATIONSHIP_TYPES,
  HEJING_RELATIONSHIP_WORKSPACES,
  hejingRelationshipTypeLabel,
} from './hejing-content.ts';

export {
  HEJING_DEFAULT_BASIS,
  HEJING_PAGE_COPY,
  HEJING_RELATIONSHIP_TYPES,
  HEJING_RELATIONSHIP_WORKSPACES,
  hejingRelationshipTypeLabel,
};

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
  // One-line "结论" shown beneath every score, per the redesign brief.
  readonly explanation: string;
}

export interface HeJingPersonProfile {
  readonly label: string;
  readonly name: string;
  // Relationship role pill shown under the hero avatar, e.g. '家长' / '孩子'.
  readonly roleLabel: string;
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

// 当前相处重点 — three "结论 + 行动" cards (容易卡住的地方 / 更适合的方式 / 本周建议).
export interface HeJingFocusCard {
  readonly id: string;
  readonly kind: 'stuck' | 'better' | 'weekly';
  readonly title: string;
  readonly points: readonly string[];
}

// 未来时间窗口 — one card per quarter on the horizontal timeline.
export interface HeJingQuarterWindow {
  readonly id: string;
  readonly label: string; // Q1
  readonly range: string; // 1-3 月
  readonly season: 'spring' | 'summer' | 'autumn' | 'winter';
  readonly state: string; // 状态
  readonly watch: string; // 注意点
  readonly action: string; // 建议行动
  readonly tone: 'green' | 'gold' | 'blue' | 'red';
}

export interface HeJingBasisChip {
  readonly id: string;
  readonly label: string;
}

export interface HeJingRepairWindow {
  readonly title: string;
  readonly range: string;
  readonly body: string;
}

export interface HeJingFutureWindow {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly body: string;
  readonly tone: 'green' | 'gold' | 'blue';
}

export interface HeJingTimelineRecord {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly tag: string;
  readonly description: string;
}

export interface HeJingWorkspace {
  readonly id: string;
  readonly selectorLabel: string;
  readonly selectedRelationshipType: HeJingRelationshipType;
  readonly year: number;
  readonly relationshipTypeLabel: string;
  readonly self: HeJingPersonProfile;
  readonly other: HeJingPersonProfile;
  readonly keywords: readonly string[];
  readonly headline: string;
  // Top overview "结论" fields.
  readonly relationshipStatus: string;
  readonly mainline: string;
  readonly summary: string;
  readonly topReminder: string;
  readonly todayActions: readonly string[];
  readonly basis: string;
  readonly phase: string;
  readonly futureHint: string;
  readonly focusCards: readonly HeJingFocusCard[];
  readonly metrics: readonly HeJingMetric[];
  readonly structure: HeJingStructure;
  readonly quarters: readonly HeJingQuarterWindow[];
  readonly insights: readonly HeJingInsight[];
  readonly repairWindow: HeJingRepairWindow;
  readonly futureWindows: readonly HeJingFutureWindow[];
  readonly weeklyAdvice: string;
  readonly records: readonly HeJingTimelineRecord[];
  readonly astrologyBasis: readonly HeJingBasisChip[];
  readonly disclaimer: string;
}

export interface HeJingMethodSupportState {
  readonly supported: boolean;
  readonly detail: string | null;
}

export function hejingMethodSupportState(
  methodProfileId?: MethodProfileId,
): HeJingMethodSupportState {
  const support = validateMingJingRouteSupport({
    method_profile_id: methodProfileId,
    feature_id: 'relationship_hepan',
  });
  if (support.ok) return { supported: true, detail: null };
  return { supported: false, detail: mingJingRouteFailCloseDetail(support.error) };
}

export function hejingWorkspaceIdForPerson(personId: string): string {
  return `person:${personId}`;
}

export function hejingPersonProfileHeading(profile: HeJingPersonProfile): string {
  const label = profile.label.trim();
  const name = profile.name.trim();
  if (!name || name === label) return label;
  return `${label} · ${name}`;
}

export function initialHeJingWorkspaceIdFromReadings(input: {
  readonly workspaces: readonly HeJingWorkspace[];
  readonly readings: readonly Reading[];
  readonly method_profile_id?: MethodProfileId;
}): string {
  const workspaceIds = new Set(input.workspaces.map((workspace) => workspace.id));
  const latestRelationshipReadings = input.readings
    .filter((reading) => {
      if (reading.mirror_kind !== 'mingjing') return false;
      if (reading.mirror_scope.kind !== 'relationship_natal') return false;
      if (!isRelationshipHePanOutput(reading.output)) return false;
      if (
        input.method_profile_id &&
        reading.inputs_summary.method_profile.id !== input.method_profile_id
      ) {
        return false;
      }
      const relatedPersonId = reading.mirror_scope.related_person_ref.id;
      if (reading.output.relationship_subject.related_person_ref.id !== relatedPersonId) {
        return false;
      }
      const firstRelatedRef = reading.related_person_refs[0];
      return (
        typeof firstRelatedRef === 'object' &&
        firstRelatedRef !== null &&
        firstRelatedRef.kind === 'person' &&
        firstRelatedRef.id === relatedPersonId
      );
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  for (const reading of latestRelationshipReadings) {
    if (reading.mirror_scope.kind !== 'relationship_natal') continue;
    const workspaceId = hejingWorkspaceIdForPerson(reading.mirror_scope.related_person_ref.id);
    if (workspaceIds.has(workspaceId)) return workspaceId;
  }

  return input.workspaces[0]?.id ?? '';
}

export function hejingRelationshipTypeForPerson(person: Person): HeJingRelationshipType {
  const relation = (person.relation ?? '').trim();
  if (/子|女|儿|父|母|亲子|孩子|child|parent/i.test(relation)) return 'parent_child';
  if (/家|亲|兄|弟|姐|妹|family/i.test(relation)) return 'family';
  if (/友|朋友|同学|friend/i.test(relation)) return 'friend';
  if (/合作|同事|伙伴|合伙|partner|collab|work/i.test(relation)) return 'collaboration';
  return 'partner';
}

export function hejingWorkspacesForRelationshipType(
  workspaces: readonly HeJingWorkspace[],
  relationshipType: HeJingRelationshipType,
): readonly HeJingWorkspace[] {
  return workspaces.filter((workspace) => workspace.selectedRelationshipType === relationshipType);
}

export function buildHeJingWorkspaceFromPerson(person: Person): HeJingWorkspace {
  const name = person.display_name.trim() || 'TA';
  const relation = (person.relation ?? '').trim();
  const relationshipType = hejingRelationshipTypeForPerson(person);
  return {
    ...HEJING_RELATIONSHIP_WORKSPACES[0],
    id: hejingWorkspaceIdForPerson(person.id),
    selectorLabel: `我 + ${name}`,
    selectedRelationshipType: relationshipType,
    relationshipTypeLabel: hejingRelationshipTypeLabel(relationshipType),
    self: {
      label: '我',
      name: '我',
      roleLabel: '本人',
      initials: '我',
      tone: 'self',
      elementTag: '紫微斗数 · 命身主轴',
      traits: [
        '紫微斗数以命宫、身宫看你的关系表达底色',
        '主星组合偏向主动照顾与快速回应',
        '四化落点提示：先稳住自己的节奏，再靠近对方',
      ],
    },
    other: {
      label: 'TA',
      name,
      roleLabel: relation || 'TA',
      initials: Array.from(name)[0] ?? 'T',
      tone: 'other',
      elementTag: '紫微斗数 · 互动宫位',
      traits: [
        'TA 的命宫、身宫用来观察安全感与表达方式',
        relation ? `关系视角：${relation}，重点看亲子宫位的牵引` : '关系视角会影响宫位互动的解读重点',
        '主星与四化落点会影响 TA 如何接收关心',
      ],
    },
    // Annual relationship keywords stay curated (陪伴/边界/沟通/节奏 inherited
    // from the sample) rather than echoing the raw relation label.
    headline: `我与 ${name} 的合镜`,
    relationshipStatus: '待生成关系状态',
    mainline: '关系人物已加入。生成合镜后，这里会呈现今年的关系主线。',
    summary: '关系人物已加入。当前合镜对象已切换为“我 + TA”，后续生成会以本人和这位人物的出生资料作为关系分析输入。',
    topReminder: '生成合镜后，会基于双方命盘证据给出最重要的关系提醒，而不会只凭关系标签推断。',
    todayActions: [],
    basis: '待生成关系基调',
    phase: '资料已建立',
    futureHint: '生成合镜后呈现未来时间窗口',
    focusCards: [],
    metrics: [],
    structure: {
      convergence: ['等待生成双方命盘的关系证据', '不会只凭关系标签推断命理结论', '生成后会展示滋养、互补与相处节奏'],
      friction: ['若对方出生资料不完整，会提示补全后再生成', '关系建议会保留不确定性，不把命理当作定论'],
    },
    quarters: [],
    insights: [
      {
        id: 'pending-evidence',
        iconLabel: '证',
        title: '先确认资料，再生成解读',
        tone: 'green',
        body: '合镜对象已经建立为“我 + TA”；具体相处语言会在生成关系分析后出现。',
      },
    ],
    repairWindow: {
      title: '关系窗口待生成',
      range: '未生成',
      body: '未来窗口需要双方命盘证据；资料不足时会提示补全，不会给出臆测结果。',
    },
    futureWindows: [],
    weeklyAdvice: '添加人物后，先确认出生日期、时间、地点与授权来源，再生成合镜。',
    // `records` and `astrologyBasis` carry over from the sample spread above so
    // the 共同记录 / 命理依据 sections stay populated once a reading exists.
    astrologyBasis: HEJING_DEFAULT_BASIS,
    disclaimer: '合镜只使用本人和一个关系人物的出生资料，不创建关系图、客户档案或项目式关系管理。',
  };
}

function isRelationshipHePanOutput(output: Reading['output']): output is MingJingRelationshipMirrorOutput {
  return output.mirror_kind === 'mingjing' && (output as { output_kind?: unknown }).output_kind === 'relationship_hepan';
}

function clampMetric(value: number): number {
  return Math.max(1, Math.min(99, Math.round(value)));
}

function directionWeight(direction: RelationshipElementDirection['label'] | undefined): number {
  switch (direction) {
    case 'supporting':
      return 16;
    case 'same':
      return 10;
    case 'draining':
      return 4;
    case 'controlling':
      return -8;
    case 'unknown':
    case undefined:
      return 0;
  }
}

function natureWeight(nature: TendencyClass): number {
  switch (nature) {
    case 'supportive':
      return 14;
    case 'steady':
      return 8;
    case 'turning':
      return 5;
    case 'watch':
      return -2;
    case 'blocked':
      return -8;
  }
}

function natureLabel(nature: TendencyClass): string {
  switch (nature) {
    case 'supportive':
      return '适合推进';
    case 'steady':
      return '稳中沟通';
    case 'turning':
      return '关系转折';
    case 'watch':
      return '放慢确认';
    case 'blocked':
      return '优先修复';
  }
}

function natureWatch(nature: TendencyClass): string {
  switch (nature) {
    case 'supportive':
      return '把握节奏，避免用力过猛';
    case 'steady':
      return '情绪波动时先暂停再沟通';
    case 'turning':
      return '变化较多，保持沟通频率';
    case 'watch':
      return '放慢确认，减少误读';
    case 'blocked':
      return '先处理情绪，再谈规则';
  }
}

function futureWindowTone(nature: TendencyClass): HeJingFutureWindow['tone'] {
  switch (nature) {
    case 'supportive':
      return 'green';
    case 'steady':
    case 'watch':
      return 'gold';
    case 'blocked':
    case 'turning':
      return 'blue';
  }
}

function quarterToneFor(nature: TendencyClass): HeJingQuarterWindow['tone'] {
  switch (nature) {
    case 'supportive':
      return 'green';
    case 'steady':
      return 'gold';
    case 'watch':
    case 'turning':
      return 'red';
    case 'blocked':
      return 'blue';
  }
}

const QUARTER_META = [
  // `outlook` is the general year-arc 建议行动 shown for a quarter that has no
  // evidenced timing window of its own — forward-looking relationship guidance,
  // not an invented event.
  { label: 'Q1', range: '1-3 月', season: 'spring' as const, outlook: '为这一年定下相处的节奏与基本约定。' },
  { label: 'Q2', range: '4-6 月', season: 'summer' as const, outlook: '在日常里累积信任，把好的相处方式固定下来。' },
  { label: 'Q3', range: '7-9 月', season: 'autumn' as const, outlook: '留意需求的变化，及时调整规则与边界。' },
  { label: 'Q4', range: '10-12 月', season: 'winter' as const, outlook: '回顾这一年的相处，把有效的方式延续到明年。' },
];

function quarterIndexFromDate(date: string): number {
  const month = Number.parseInt(date.slice(5, 7), 10);
  if (!Number.isFinite(month) || month < 1) return 0;
  return Math.min(3, Math.floor((month - 1) / 3));
}

// 结论 splitter: turns a sentence-rich string into up to `max` clean points.
function splitSentences(text: string, max: number): readonly string[] {
  const parts = text
    .split(/(?<=[。！？!?])/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const points = parts.length > 0 ? parts : [text.trim()];
  return points.slice(0, max);
}

function relationshipStatusFor(metrics: readonly HeJingMetric[]): string {
  if (metrics.length === 0) return '稳定中有磨合';
  const average = metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;
  if (average >= 82) return '稳定且彼此滋养';
  if (average >= 70) return '稳定中有磨合';
  if (average >= 58) return '磨合中，逐步建立';
  return '需要更多耐心修复';
}

const METRIC_BLUEPRINT: readonly {
  readonly id: string;
  readonly label: string;
  readonly tone: HeJingTone;
  readonly explanation: string;
}[] = [
  { id: 'understanding', label: '理解度', tone: 'green', explanation: '能站在对方角度看问题。' },
  { id: 'communication', label: '沟通顺畅度', tone: 'blue', explanation: '整体顺畅，偶有情绪打断。' },
  { id: 'consistency', label: '规则一致性', tone: 'gold', explanation: '约定清晰，执行需更稳定。' },
  { id: 'safety', label: '情绪安全感', tone: 'green', explanation: '彼此感到被接纳与支持。' },
  { id: 'growth', label: '成长支持度', tone: 'green', explanation: '持续鼓励，支持彼此探索。' },
  { id: 'repair', label: '修复能力', tone: 'red', explanation: '冲突后能修复，时长可缩短。' },
];

function buildGeneratedMetrics(
  evidence: RelationshipHePanEvidence | undefined,
  output: MingJingRelationshipMirrorOutput,
): readonly HeJingMetric[] {
  const branchCount = evidence?.branch_interactions.length ?? 0;
  const branchLift = Math.min(branchCount, 6) * 4;
  const timingLift = output.timing_windows.reduce((sum, window) => sum + natureWeight(window.nature), 0);
  const timingAverage = output.timing_windows.length > 0 ? timingLift / output.timing_windows.length : 0;
  const dayMaster = directionWeight(evidence?.day_master_relation.label);
  const tenGod = directionWeight(evidence?.ten_god_relation.label);
  const yongShen = directionWeight(evidence?.yong_shen_relation.label);

  const values: Record<string, number> = {
    understanding: 56 + dayMaster + branchLift / 2,
    communication: 58 + timingAverage - Math.max(0, branchCount - 2) * 3,
    consistency: 54 + tenGod + branchLift / 2,
    safety: 56 + yongShen + timingAverage / 2,
    growth: 60 + Math.max(dayMaster, yongShen) / 2 + timingAverage,
    repair: 52 + timingAverage + Math.max(tenGod, yongShen) / 2,
  };

  return METRIC_BLUEPRINT.map((metric) => ({
    id: metric.id,
    label: metric.label,
    tone: metric.tone,
    explanation: metric.explanation,
    value: clampMetric(values[metric.id] ?? 50),
  }));
}

// The future-window timeline always presents a full Q1–Q4 year view. Each
// evidenced timing window is placed into its quarter (state/watch/action from
// the real window); quarters without their own window fall back to the overall
// relationship tendency plus a general year-arc 建议行动 — no invented events.
function buildGeneratedQuarters(
  output: MingJingRelationshipMirrorOutput,
): readonly HeJingQuarterWindow[] {
  const byQuarter = new Map<number, RelationshipTimingWindow>();
  for (const window of output.timing_windows) {
    const quarterIndex = quarterIndexFromDate(window.start_date);
    if (!byQuarter.has(quarterIndex)) byQuarter.set(quarterIndex, window);
  }
  const overallNature = output.timing_windows[0]?.nature ?? 'steady';

  return QUARTER_META.map((meta, index) => {
    const window = byQuarter.get(index);
    const nature = window?.nature ?? overallNature;
    return {
      id: `q${index + 1}`,
      label: meta.label,
      range: meta.range,
      season: meta.season,
      state: natureLabel(nature),
      watch: natureWatch(nature),
      action: window?.summary ?? meta.outlook,
      tone: quarterToneFor(nature),
    };
  });
}

const PENDING_KEYWORDS = new Set(['合镜待生成', '关系人物', '待生成']);

function compactKeywords(workspace: HeJingWorkspace): readonly string[] {
  const filtered = workspace.keywords.filter((keyword) => !PENDING_KEYWORDS.has(keyword));
  return filtered.length > 0 ? filtered : workspace.keywords;
}

export function buildGeneratedHeJingWorkspace(input: {
  readonly workspace: HeJingWorkspace;
  readonly reading: Reading;
}): HeJingWorkspace {
  if (!isRelationshipHePanOutput(input.reading.output)) return input.workspace;
  const output = input.reading.output;
  const evidence = input.reading.inputs_summary.feature_snapshot.common.relationship_hepan;
  const firstWindow = output.timing_windows[0];
  const repairWindow = output.timing_windows.find((window) =>
    window.nature === 'blocked' || window.nature === 'watch' || window.nature === 'turning',
  ) ?? firstWindow;
  const metrics = buildGeneratedMetrics(evidence, output);

  return {
    ...input.workspace,
    relationshipTypeLabel: hejingRelationshipTypeLabel(input.workspace.selectedRelationshipType),
    keywords: compactKeywords(input.workspace),
    headline: input.workspace.headline,
    relationshipStatus: relationshipStatusFor(metrics),
    mainline: output.summary,
    summary: output.summary,
    topReminder: output.structure.baseline_pattern,
    todayActions: [
      output.structure.communication_rhythm,
      output.structure.boundary_advice,
      output.structure.attraction_and_support,
    ],
    basis: output.structure.baseline_pattern,
    phase: firstWindow ? `已生成 · ${natureLabel(firstWindow.nature)}` : '已生成',
    futureHint: firstWindow?.summary ?? output.practice.repair,
    focusCards: [
      {
        id: 'stuck',
        kind: 'stuck',
        title: HEJING_PAGE_COPY.focusStuckTitle,
        points: splitSentences(output.structure.friction_and_misread, 2),
      },
      {
        id: 'better',
        kind: 'better',
        title: HEJING_PAGE_COPY.focusBetterTitle,
        points: splitSentences(output.structure.communication_rhythm, 2),
      },
      {
        id: 'weekly',
        kind: 'weekly',
        title: HEJING_PAGE_COPY.focusWeeklyTitle,
        points: splitSentences(output.practice.communication, 2),
      },
    ],
    metrics,
    structure: {
      convergence: [
        output.structure.baseline_pattern,
        output.structure.attraction_and_support,
        output.structure.communication_rhythm,
      ],
      friction: [
        output.structure.friction_and_misread,
        output.structure.boundary_advice,
      ],
    },
    quarters: buildGeneratedQuarters(output),
    insights: [
      {
        id: 'generated-communication',
        iconLabel: '言',
        title: '沟通方式',
        tone: 'green',
        body: output.practice.communication,
      },
      {
        id: 'generated-boundary',
        iconLabel: '界',
        title: '边界提醒',
        tone: 'gold',
        body: output.practice.boundary,
      },
      {
        id: 'generated-repair',
        iconLabel: '修',
        title: '修复语言',
        tone: 'red',
        body: output.practice.repair,
      },
    ],
    repairWindow: {
      title: repairWindow ? natureLabel(repairWindow.nature) : '关系修复窗口',
      range: repairWindow ? `${repairWindow.start_date} ～ ${repairWindow.end_date}` : '已生成',
      body: output.practice.repair,
    },
    futureWindows: output.timing_windows.map((window) => ({
      id: `${window.start_date}:${window.end_date}:${window.nature}`,
      title: `${window.start_date} ～ ${window.end_date}`,
      status: natureLabel(window.nature),
      tone: futureWindowTone(window.nature),
      body: window.summary,
    })),
    weeklyAdvice: output.practice.communication,
  };
}
