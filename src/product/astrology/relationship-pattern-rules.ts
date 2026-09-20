// SJG-ALGO — deterministic relationship pattern projection over Relationship
// HePan evidence. The closed BaZi v1 pattern-rule registry selects and ranks
// one to four admitted patterns, decides recent-changes availability from real
// period-marker evidence only, and picks the try-next action target. Ziwei and
// QiZheng pattern mappings are deliberately unadmitted and surface the typed
// patterns_unavailable generation state rather than renamed BaZi rules.
// @nimi-authority: rule.shijing.algorithm.r019

import type {
  MethodProfileId,
  PillarPosition,
  RelationshipHePanEvidence,
} from '../../domain/algorithm.ts';
import type {
  MingJingRelationshipActionTarget,
  RelationshipPatternRuleId,
  RelationshipRecentUnavailableReason,
  TendencyClass,
} from '../../domain/mirror-output.ts';
import { RELATIONSHIP_PATTERN_RULE_IDS } from '../../domain/mirror-output.ts';

export interface RelationshipPatternRuleMatch {
  readonly driver_refs: readonly string[];
  readonly evidence_summary: string;
}

export interface RelationshipPatternRuleSeed {
  readonly name: string;
  readonly self_tendency: string;
  readonly related_tendency: string;
  readonly scenario: string;
  readonly aligned_expression: string;
  readonly friction_expression: string;
  readonly signals: readonly string[];
}

export interface RelationshipPatternRuleBasis {
  readonly title: string;
  readonly body: string;
}

export interface RelationshipPatternRule {
  readonly rule_id: RelationshipPatternRuleId;
  readonly priority: number;
  readonly match: (
    evidence: RelationshipHePanEvidence,
  ) => RelationshipPatternRuleMatch | null;
  readonly seed: RelationshipPatternRuleSeed;
  readonly basis: RelationshipPatternRuleBasis;
}

export interface ProjectedRelationshipPattern {
  readonly pattern_id: string;
  readonly rule_ref: RelationshipPatternRuleId;
  readonly rank: number;
  readonly driver_refs: readonly string[];
  readonly evidence_summary: string;
}

export interface ProjectedRelationshipRecentWindow {
  readonly start_date: string;
  readonly end_date: string;
  readonly nature: TendencyClass;
  readonly driver_refs: readonly string[];
}

export type ProjectedRelationshipRecentStatus =
  | { readonly availability: 'available'; readonly window: ProjectedRelationshipRecentWindow }
  | { readonly availability: 'unavailable'; readonly reason: RelationshipRecentUnavailableReason };

export type RelationshipPatternProjectionFailureDetail =
  | `method_pattern_mapping_pending:${string}`
  | 'no_pattern_rule_matched';

export type RelationshipPatternProjection =
  | {
      readonly ok: true;
      readonly patterns: readonly ProjectedRelationshipPattern[];
      readonly recent_status: ProjectedRelationshipRecentStatus;
      readonly action_target: MingJingRelationshipActionTarget;
    }
  | { readonly ok: false; readonly detail: RelationshipPatternProjectionFailureDetail };

export const RELATIONSHIP_PATTERN_MAX_COUNT = 4;

const HARMONY_KINDS = new Set<string>(['六合', '三合']);
const FRICTION_KINDS = new Set<string>(['相冲', '相害', '相刑', '相破']);

const BRANCH_HANZI_BY_PINYIN: Readonly<Record<string, string>> = {
  zi: '子',
  chou: '丑',
  yin: '寅',
  mao: '卯',
  chen: '辰',
  si: '巳',
  wu: '午',
  wei: '未',
  shen: '申',
  you: '酉',
  xu: '戌',
  hai: '亥',
};

interface BranchPositionLayer {
  readonly pillar_zh: string;
  readonly domain: string;
  readonly domain_zh: string;
  readonly moments: string;
}

const BRANCH_POSITION_LAYERS: Readonly<Record<PillarPosition, BranchPositionLayer>> = {
  year: {
    pillar_zh: '年',
    domain: 'roots and family background',
    domain_zh: '根基与家庭背景',
    moments: 'family gatherings, origin-family topics, and long-term security decisions',
  },
  month: {
    pillar_zh: '月',
    domain: 'growth rhythm and daily habits',
    domain_zh: '成长节奏与习惯',
    moments: 'routines, schedules, habits, and who adjusts to whom',
  },
  day: {
    pillar_zh: '日',
    domain: 'core self and close day-to-day interaction',
    domain_zh: '自我核心与近距离相处',
    moments: 'one-on-one time, immediate reactions, and close-range moods',
  },
  hour: {
    pillar_zh: '时',
    domain: 'plans and expression',
    domain_zh: '计划与表达',
    moments: 'future plans, messages, and how things get said',
  },
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function branchHanzi(pinyin: string): string {
  return BRANCH_HANZI_BY_PINYIN[pinyin] ?? pinyin;
}

// The deterministic evidence layer embeds the interacting branches in its own
// driver ref (`...@${selfBranch}-${relatedBranch}`); this layer owns that
// namespace, so reading the suffix back is method-owner work, not UI parsing.
function branchPairLabel(
  position: PillarPosition,
  kind: string,
  driverRef: string,
): string {
  const suffix = /@([a-z]+)-([a-z]+)\s*$/.exec(driverRef);
  if (suffix) {
    return `${position} branch ${branchHanzi(suffix[1]!)} × ${branchHanzi(suffix[2]!)}: ${kind}`;
  }
  return `${position} branch × ${position} branch: ${kind}`;
}

function matchBranchLayer(
  evidence: RelationshipHePanEvidence,
  position: PillarPosition,
  kindSet: ReadonlySet<string>,
): RelationshipPatternRuleMatch | null {
  const matched = evidence.branch_interactions.filter(
    (interaction) =>
      interaction.self_position === position &&
      interaction.related_position === position &&
      kindSet.has(interaction.kind),
  );
  if (matched.length === 0) return null;
  const driverRefs = [...new Set(matched.map((interaction) => interaction.driver_ref))];
  const evidenceSummary = matched
    .map((interaction) => branchPairLabel(position, interaction.kind, interaction.driver_ref))
    .join('; ');
  return { driver_refs: driverRefs, evidence_summary: evidenceSummary };
}

function matchDirection(
  relation: RelationshipHePanEvidence['day_master_relation'],
  labels: ReadonlySet<string>,
  factLabel: string,
): RelationshipPatternRuleMatch | null {
  if (!labels.has(relation.label)) return null;
  return {
    driver_refs: [relation.driver_ref],
    evidence_summary: `${factLabel}: ${relation.label} (${relation.driver_ref})`,
  };
}

function branchHarmonySeed(layer: BranchPositionLayer): RelationshipPatternRuleSeed {
  return {
    name: `${capitalize(layer.domain)} harmony`,
    self_tendency:
      `On the ${layer.domain} layer you may tune in quickly and assume the other side experiences the same ease.`,
    related_tendency:
      `The other person may cooperate smoothly on ${layer.domain} matters and prefer to keep that ease unspoken.`,
    scenario: `Watch concrete ${layer.domain} moments: ${layer.moments}.`,
    aligned_expression:
      `When cooperation goes well, ${layer.domain} matters click into place with little negotiation, and both sides can name what made it easy.`,
    friction_expression:
      `When disagreement happens, it may surface first on the ${layer.domain} layer — small mismatches feeling louder than the stated topic.`,
    signals: [
      `${capitalize(layer.domain)} matters align with little discussion`,
      `Small ${layer.domain} mismatches feel oddly loud`,
      'Ease gets assumed instead of confirmed',
    ],
  };
}

function branchFrictionSeed(layer: BranchPositionLayer): RelationshipPatternRuleSeed {
  return {
    name: `${capitalize(layer.domain)} friction`,
    self_tendency:
      `On the ${layer.domain} layer you may feel rubbed the wrong way and catch yourself reading the other person's style as deliberate.`,
    related_tendency:
      'The other person may feel the same rub from their side and respond by pushing harder or going quiet.',
    scenario: `Watch ${layer.domain} moments where the same misunderstanding keeps returning: ${layer.moments}.`,
    aligned_expression:
      `When cooperation goes well, the same tension becomes complementary: each side notices what the other overlooks on the ${layer.domain} layer.`,
    friction_expression:
      `When disagreement happens, expect faster escalation on ${layer.domain} topics; slowing down to name the exact difference matters more than being right.`,
    signals: [
      `The same ${layer.domain} misunderstanding keeps repeating`,
      'Reactions feel bigger than the topic',
      'Both sides retell the same moment differently',
    ],
  };
}

function branchHarmonyBasis(layer: BranchPositionLayer): RelationshipPatternRuleBasis {
  return {
    title: `${layer.pillar_zh}柱地支相合（六合/三合）`,
    body:
      `双方${layer.pillar_zh}柱地支形成六合或三合，说明两张命盘在${layer.domain_zh}层面存在结构性呼应。` +
      '这是一条待验证的观察假设：它不代表现实关系一定和谐，不测量关系质量，也不证明任何现实行为；' +
      '是否符合你们的相处，需要以真实记录核对。',
  };
}

function branchFrictionBasis(layer: BranchPositionLayer): RelationshipPatternRuleBasis {
  return {
    title: `${layer.pillar_zh}柱地支相冲/相害/相刑/相破`,
    body:
      `双方${layer.pillar_zh}柱地支形成相冲、相害、相刑或相破，说明两张命盘在${layer.domain_zh}层面存在结构性拉扯。` +
      '这是一条待验证的观察假设：它不代表现实关系一定冲突，不测量关系质量，也不证明任何现实行为；' +
      '是否符合你们的相处，需要以真实记录核对。',
  };
}

const DAY_MASTER_SUPPORT_SEED: RelationshipPatternRuleSeed = {
  name: 'One-way support current',
  self_tendency:
    'You may feel backed by the other person and get used to leaning on their push when you hesitate.',
  related_tendency:
    'The other person may instinctively supply resources, ideas, or momentum in your direction — and may over-give without noticing.',
  scenario:
    'Watch decision moments: who naturally steps in to move things forward, and who receives that push.',
  aligned_expression:
    'When cooperation goes well, their drive helps you act, and you can name which form of support actually lands.',
  friction_expression:
    'When disagreement happens, their push can feel like pressure or interference, and your hesitation can read as ingratitude.',
  signals: [
    'One side often initiates solutions for the other',
    'Help arrives before it is asked for',
    'The receiving side goes quiet when pushed',
  ],
};

const DAY_MASTER_CONTROLLING_SEED: RelationshipPatternRuleSeed = {
  name: 'Limit-setting current',
  self_tendency:
    'You may feel managed, corrected, or slowed down by the other person and catch yourself resisting or withdrawing.',
  related_tendency:
    'The other person may instinctively set rules, point out risks, or take charge around you — and read it as care.',
  scenario:
    'Watch moments of rule-setting — curfews, budgets, plans, standards: how are limits proposed and how are they received.',
  aligned_expression:
    'When cooperation goes well, their structure catches what you miss, and you can ask for limits as a resource instead of resisting them.',
  friction_expression:
    'When disagreement happens, limits can land as control and resistance can land as recklessness; name the specific limit, not the person.',
  signals: [
    'Rules arrive without a request',
    'One side says "for your own good"',
    'The other side delays or hides decisions to avoid correction',
  ],
};

const YONG_SHEN_COMPLEMENT_SEED: RelationshipPatternRuleSeed = {
  name: 'Complementary supply',
  self_tendency:
    'You may notice you leave interactions with this person oddly more resourced than the situation itself explains.',
  related_tendency:
    'The other person may naturally bring the exact element your side runs short on, without trying.',
  scenario: 'Watch low-energy days: does time with this person reliably refill something specific.',
  aligned_expression:
    'When cooperation goes well, each side does what costs them little and the other needs most.',
  friction_expression:
    'When disagreement happens, the same supply can feel one-directional; check whether both sides still get to receive.',
  signals: [
    'A specific tiredness eases after contact',
    'You seek them out for one particular kind of help',
    'The exchange feels effortless in one direction',
  ],
};

const YONG_SHEN_DEPLETION_SEED: RelationshipPatternRuleSeed = {
  name: 'Amplified drain',
  self_tendency:
    'You may leave certain interactions more tense or scattered than the topic warrants, and blame yourself for it.',
  related_tendency:
    'The other person may unknowingly amplify the very element your side already has in excess.',
  scenario: 'Watch recurring interactions that reliably end in the same kind of tiredness.',
  aligned_expression:
    'When cooperation goes well, shorter and more structured contact keeps the amplification from building up.',
  friction_expression:
    'When disagreement happens, the drain gets read as the other person being "too much"; separate the dose from the person.',
  signals: [
    'The same tiredness follows the same kind of contact',
    'Small topics cost unusual energy',
    'Recovery takes longer after their intense moments',
  ],
};

const DAY_MASTER_SUPPORT_BASIS: RelationshipPatternRuleBasis = {
  title: '日主相生（对方生我）',
  body:
    '对方日干五行生你的日干五行，两盘在日主层面存在生者方向。' +
    '这是一条待验证的观察假设：相处中可以留意对方是否倾向于推动、供给，以及你是否习惯接住这份推动；' +
    '它不证明对方在现实中一定如此行为，也不测量关系质量。',
};

const DAY_MASTER_CONTROLLING_BASIS: RelationshipPatternRuleBasis = {
  title: '日主相克（对方克我）',
  body:
    '对方日干五行克你的日干五行，两盘在日主层面存在克者方向。' +
    '这是一条待验证的观察假设：可以留意对方的规则感、纠偏或主导，是否在某些时刻被你体验为压力；' +
    '它不等于对方有意压制，不证明任何现实行为，也不测量关系质量。',
};

const YONG_SHEN_COMPLEMENT_BASIS: RelationshipPatternRuleBasis = {
  title: '喜用互补',
  body:
    '对方日干五行落入你命局的用神、喜神或调候。' +
    '这是一条待验证的观察假设：可以留意相处之后你是否更有资源感；' +
    '它只是命理层面的互补提示，不能替代真实体验，也不表示对方为你而存在。',
};

const YONG_SHEN_DEPLETION_BASIS: RelationshipPatternRuleBasis = {
  title: '喜用相耗',
  body:
    '对方日干五行落入你命局的忌神，或与你日主相耗。' +
    '这是一条待验证的观察假设：可以留意某些互动是否稳定地让你更紧绷或更耗散；' +
    '它只是观察入口，不证明对方造成了你的状态，也不测量关系质量。',
};

interface BranchRuleSpec {
  readonly rule_id: RelationshipPatternRuleId;
  readonly position: PillarPosition;
  readonly family: 'harmony' | 'friction';
}

function branchRule(spec: BranchRuleSpec, priority: number): RelationshipPatternRule {
  const layer = BRANCH_POSITION_LAYERS[spec.position];
  const kindSet = spec.family === 'harmony' ? HARMONY_KINDS : FRICTION_KINDS;
  return {
    rule_id: spec.rule_id,
    priority,
    match: (evidence) => matchBranchLayer(evidence, spec.position, kindSet),
    seed: spec.family === 'harmony' ? branchHarmonySeed(layer) : branchFrictionSeed(layer),
    basis: spec.family === 'harmony' ? branchHarmonyBasis(layer) : branchFrictionBasis(layer),
  };
}

// Priority order is the admitted evaluation/rank order; the catalog is closed
// and keyed by the domain RELATIONSHIP_PATTERN_RULE_IDS list.
export const RELATIONSHIP_PATTERN_RULES: readonly RelationshipPatternRule[] = [
  branchRule({ rule_id: 'bazi_ziping_v1.hepan.day_branch_harmony', position: 'day', family: 'harmony' }, 1),
  branchRule({ rule_id: 'bazi_ziping_v1.hepan.day_branch_friction', position: 'day', family: 'friction' }, 2),
  branchRule({ rule_id: 'bazi_ziping_v1.hepan.month_branch_harmony', position: 'month', family: 'harmony' }, 3),
  branchRule({ rule_id: 'bazi_ziping_v1.hepan.month_branch_friction', position: 'month', family: 'friction' }, 4),
  {
    rule_id: 'bazi_ziping_v1.hepan.day_master_support',
    priority: 5,
    match: (evidence) =>
      matchDirection(evidence.day_master_relation, new Set(['supporting']), 'day master relation related→self'),
    seed: DAY_MASTER_SUPPORT_SEED,
    basis: DAY_MASTER_SUPPORT_BASIS,
  },
  {
    rule_id: 'bazi_ziping_v1.hepan.day_master_controlling',
    priority: 6,
    match: (evidence) =>
      matchDirection(evidence.day_master_relation, new Set(['controlling']), 'day master relation related→self'),
    seed: DAY_MASTER_CONTROLLING_SEED,
    basis: DAY_MASTER_CONTROLLING_BASIS,
  },
  {
    rule_id: 'bazi_ziping_v1.hepan.yong_shen_complement',
    priority: 7,
    match: (evidence) =>
      matchDirection(evidence.yong_shen_relation, new Set(['supporting']), 'yong shen element relation'),
    seed: YONG_SHEN_COMPLEMENT_SEED,
    basis: YONG_SHEN_COMPLEMENT_BASIS,
  },
  {
    rule_id: 'bazi_ziping_v1.hepan.yong_shen_depletion',
    priority: 8,
    match: (evidence) =>
      matchDirection(evidence.yong_shen_relation, new Set(['draining', 'controlling']), 'yong shen element relation'),
    seed: YONG_SHEN_DEPLETION_SEED,
    basis: YONG_SHEN_DEPLETION_BASIS,
  },
  branchRule({ rule_id: 'bazi_ziping_v1.hepan.hour_branch_harmony', position: 'hour', family: 'harmony' }, 9),
  branchRule({ rule_id: 'bazi_ziping_v1.hepan.hour_branch_friction', position: 'hour', family: 'friction' }, 10),
  branchRule({ rule_id: 'bazi_ziping_v1.hepan.year_branch_harmony', position: 'year', family: 'harmony' }, 11),
  branchRule({ rule_id: 'bazi_ziping_v1.hepan.year_branch_friction', position: 'year', family: 'friction' }, 12),
];

if (RELATIONSHIP_PATTERN_RULES.length !== RELATIONSHIP_PATTERN_RULE_IDS.length) {
  throw new Error('relationship pattern rule registry must cover every admitted rule id');
}

const RULES_BY_ID: ReadonlyMap<RelationshipPatternRuleId, RelationshipPatternRule> = new Map(
  RELATIONSHIP_PATTERN_RULES.map((rule) => [rule.rule_id, rule]),
);

export function getRelationshipPatternRule(ruleRef: RelationshipPatternRuleId): RelationshipPatternRule {
  const rule = RULES_BY_ID.get(ruleRef);
  if (!rule) {
    throw new Error(`unadmitted relationship pattern rule: ${ruleRef}`);
  }
  return rule;
}

export function relationshipPatternRuleBasis(
  ruleRef: RelationshipPatternRuleId,
): RelationshipPatternRuleBasis {
  return getRelationshipPatternRule(ruleRef).basis;
}

const ANCHOR_YEAR_START = /^(\d{4})-01-01$/;
const ANCHOR_YEAR_END = /^(\d{4})-12-31$/;

function isAnchorYearWindow(window: {
  readonly start_date: string;
  readonly end_date: string;
}): boolean {
  const start = ANCHOR_YEAR_START.exec(window.start_date);
  const end = ANCHOR_YEAR_END.exec(window.end_date);
  return start !== null && end !== null && start[1] === end[1];
}

// A dated recent-changes window is supported only by real period-marker
// evidence (`...period.{dayun_boundary|annual_transition}@...`). A fallback
// anchor-year driver (`.fallback.anchor_year.`), a bare year label, or general
// relationship structure alone never supports availability.
function isRealPeriodMarkerRef(ref: string): boolean {
  return ref.includes('.period.') && !ref.includes('.fallback.');
}

function decideRecentStatus(
  evidence: RelationshipHePanEvidence,
): ProjectedRelationshipRecentStatus {
  const window = evidence.timing_windows.find(isAnchorYearWindow);
  if (!window) {
    return { availability: 'unavailable', reason: 'no_anchor_year_window' };
  }
  if (!window.driver_refs.some(isRealPeriodMarkerRef)) {
    return { availability: 'unavailable', reason: 'fallback_year_marker_only' };
  }
  return {
    availability: 'available',
    window: {
      start_date: window.start_date,
      end_date: window.end_date,
      nature: window.nature,
      driver_refs: [...window.driver_refs],
    },
  };
}

export function projectRelationshipPatterns(input: {
  readonly method_profile_id: MethodProfileId;
  readonly evidence: RelationshipHePanEvidence;
}): RelationshipPatternProjection {
  if (input.method_profile_id !== 'bazi_ziping_v1') {
    return { ok: false, detail: `method_pattern_mapping_pending:${input.method_profile_id}` };
  }
  const matched: Array<{
    readonly rule: RelationshipPatternRule;
    readonly result: RelationshipPatternRuleMatch;
  }> = [];
  for (const rule of RELATIONSHIP_PATTERN_RULES) {
    const result = rule.match(input.evidence);
    if (result) matched.push({ rule, result });
  }
  if (matched.length === 0) {
    return { ok: false, detail: 'no_pattern_rule_matched' };
  }
  const patterns: ProjectedRelationshipPattern[] = matched
    .slice(0, RELATIONSHIP_PATTERN_MAX_COUNT)
    .map((entry, index) => ({
      pattern_id: entry.rule.rule_id,
      rule_ref: entry.rule.rule_id,
      rank: index + 1,
      driver_refs: entry.result.driver_refs,
      evidence_summary: entry.result.evidence_summary,
    }));
  const recentStatus = decideRecentStatus(input.evidence);
  const rankOne = patterns[0]!;
  const actionTarget: MingJingRelationshipActionTarget =
    recentStatus.availability === 'available'
      ? { kind: 'recent_window' }
      : { kind: 'pattern', pattern_id: rankOne.pattern_id };
  return {
    ok: true,
    patterns,
    recent_status: recentStatus,
    action_target: actionTarget,
  };
}
