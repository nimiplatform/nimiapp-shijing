// SJG-ASTRO-03..07 — MirrorOutput (discriminated by mirror_kind).

import type { MirrorKind } from './mirror-scope.ts';
import { ADMITTED_METHOD_PROFILE_IDS, type GanzhiPillar, type MethodProfileId } from './algorithm.ts';

export type TendencyClass = 'supportive' | 'steady' | 'watch' | 'blocked' | 'turning';

export const TENDENCY_CLASSES: readonly TendencyClass[] = [
  'supportive',
  'steady',
  'watch',
  'blocked',
  'turning',
] as const;

// Admitted citation methods track the admitted method-profile registry.
export const MIRROR_OUTPUT_ALLOWED_CITATION_METHODS: readonly string[] = ADMITTED_METHOD_PROFILE_IDS;

export interface MirrorCitation {
  readonly method: MethodProfileId;
  readonly reference: string;
}

export interface RiJingConcernProjection {
  readonly concern_tag_ref: string;
  readonly tendency_class: TendencyClass;
  readonly summary: string;
  readonly recommendations: readonly string[];
}

export interface RiJingMirrorOutput {
  readonly mirror_kind: 'rijing';
  readonly summary: string;
  readonly daily_overview: string;
  readonly concern_projections: readonly RiJingConcernProjection[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly citations: readonly MirrorCitation[];
}

export interface YueJingRange {
  readonly start_date: string;
  readonly end_date: string;
}

export interface YueJingCell {
  readonly date: string;
  readonly concern_tag_ref: string;
  readonly tendency_class: TendencyClass;
  readonly summary: string;
}

export interface YueJingMirrorOutput {
  readonly mirror_kind: 'yuejing';
  readonly summary: string;
  readonly range: YueJingRange;
  readonly cells: readonly YueJingCell[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly citations: readonly MirrorCitation[];
}

export type NianJingNature = TendencyClass;

export interface NianJingHorizon {
  readonly start_date: string;
  readonly end_date: string;
}

export interface NianJingPhaseBand {
  readonly concern_tag_ref: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly nature: NianJingNature;
  readonly driver_refs: readonly string[];
  readonly summary: string;
}

export type NianJingInflectionKind =
  | 'dayun_boundary'
  | 'annual_transition'
  | 'monthly_transition'
  | 'marker_cluster';

export const NIANJING_INFLECTION_KINDS: readonly NianJingInflectionKind[] = [
  'dayun_boundary',
  'annual_transition',
  'monthly_transition',
  'marker_cluster',
] as const;

export interface NianJingInflectionWindow {
  readonly start_date: string;
  readonly end_date: string;
}

export interface NianJingInflectionPoint {
  readonly concern_tag_ref: string;
  readonly date: string;
  readonly date_window?: NianJingInflectionWindow;
  readonly kind: NianJingInflectionKind;
  readonly driver_refs: readonly string[];
  readonly summary: string;
}

export interface NianJingMirrorOutput {
  readonly mirror_kind: 'nianjing';
  readonly summary: string;
  readonly horizon: NianJingHorizon;
  readonly phase_bands: readonly NianJingPhaseBand[];
  readonly inflection_points: readonly NianJingInflectionPoint[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly citations: readonly MirrorCitation[];
}

export interface ShiJingMirrorOutput {
  readonly mirror_kind: 'shijing';
  readonly summary: string;
  readonly answer: string;
  readonly cited_reading_ids: readonly string[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly citations: readonly MirrorCitation[];
}

// SJG-ASTRO — 命镜 AI 解读 output. The deterministic natal chart (MingJingChart,
// SJG-ALGO-16) is the evidence; this is the AI-worded narrative + the
// deterministic historical-event resonance. `core` + `life_stage_strategies`
// theme/strategy are AI wording; `event_validations` and each strategy's
// phase_label/age_range/dayun_pillar are deterministic and never AI-patched.
export interface MingJingCore {
  readonly personality: string; // 性格底色
  readonly strengths: string; // 优势能力
  readonly long_term_themes: string; // 长期课题
  readonly relationship_pattern: string; // 关系模式
  readonly career_inclination: string; // 事业倾向
}

export interface MingJingLifeStageStrategy {
  readonly phase_label: string; // e.g. 壬午大运
  readonly age_range: string; // e.g. 33–42
  readonly dayun_pillar: GanzhiPillar;
  readonly theme: string; // AI
  readonly strategy: string; // AI
}

export interface MingJingEventValidation {
  readonly event_memory_ref: string;
  readonly occurred_year: number;
  readonly dayun_pillar?: GanzhiPillar;
  readonly period_nature: TendencyClass;
  readonly note: string; // deterministic templated resonance note
}

export interface MingJingRelationshipSubject {
  readonly primary_subject_ref: 'self';
  readonly related_person_ref: { readonly kind: 'person'; readonly id: string };
  readonly anchor_year: number;
  readonly basis_time_zone: string;
}

// SJG-ALGO — admitted BaZi v1 relationship pattern rules (rule.shijing.algorithm.r019).
// The closed registry lives in the deterministic projection layer; domain keeps
// the id list so contracts can validate membership without importing product code.
export const RELATIONSHIP_PATTERN_RULE_IDS = [
  'bazi_ziping_v1.hepan.day_branch_harmony',
  'bazi_ziping_v1.hepan.day_branch_friction',
  'bazi_ziping_v1.hepan.month_branch_harmony',
  'bazi_ziping_v1.hepan.month_branch_friction',
  'bazi_ziping_v1.hepan.day_master_support',
  'bazi_ziping_v1.hepan.day_master_controlling',
  'bazi_ziping_v1.hepan.yong_shen_complement',
  'bazi_ziping_v1.hepan.yong_shen_depletion',
  'bazi_ziping_v1.hepan.hour_branch_harmony',
  'bazi_ziping_v1.hepan.hour_branch_friction',
  'bazi_ziping_v1.hepan.year_branch_harmony',
  'bazi_ziping_v1.hepan.year_branch_friction',
] as const;

export type RelationshipPatternRuleId = (typeof RELATIONSHIP_PATTERN_RULE_IDS)[number];

export interface MingJingRelationshipOverview {
  readonly title: string; // AI-worded short title
  readonly summary: string; // AI-worded overview of the admitted patterns only
  readonly keywords: readonly string[]; // AI-worded, 0..3
}

export interface MingJingRelationshipPattern {
  readonly pattern_id: string; // deterministic stable id; equals rule_ref (one pattern per rule)
  readonly rule_ref: RelationshipPatternRuleId; // admitted pattern rule id
  readonly rank: number; // deterministic 1-based order, strict permutation 1..n
  readonly driver_refs: readonly string[]; // deterministic evidence refs, non-empty
  readonly evidence_summary: string; // deterministic factual summary; AI must NOT word this
  readonly name: string; // AI-worded
  readonly self_tendency: string; // AI-worded
  readonly related_tendency: string; // AI-worded
  readonly scenario: string; // AI-worded concrete situation to watch
  readonly aligned_expression: string; // AI-worded, when cooperation goes well
  readonly friction_expression: string; // AI-worded, when disagreement happens
  readonly signals: readonly string[]; // AI-worded, 1..3 recognizable behavior signals
}

export const RELATIONSHIP_RECENT_UNAVAILABLE_REASONS = [
  'fallback_year_marker_only',
  'no_anchor_year_window',
] as const;

export type RelationshipRecentUnavailableReason =
  (typeof RELATIONSHIP_RECENT_UNAVAILABLE_REASONS)[number];

export interface RelationshipRecentWindow {
  readonly start_date: string; // anchor-year precision only: {year}-01-01 .. {year}-12-31
  readonly end_date: string;
  readonly nature: TendencyClass;
  readonly driver_refs: readonly string[];
  readonly summary: string; // AI-worded
}

export type MingJingRelationshipRecentStatus =
  | { readonly availability: 'available'; readonly window: RelationshipRecentWindow }
  | { readonly availability: 'unavailable'; readonly reason: RelationshipRecentUnavailableReason };

export type MingJingRelationshipActionTarget =
  | { readonly kind: 'pattern'; readonly pattern_id: string }
  | { readonly kind: 'recent_window' };

export interface MingJingRelationshipAction {
  readonly target: MingJingRelationshipActionTarget; // deterministic
  readonly situation: string; // AI-worded: when to use
  readonly step: string; // AI-worded: what to do concretely
  readonly example_phrase: string; // AI-worded: one directly usable phrasing
  readonly rationale: string; // AI-worded: why worth trying, no improvement promises
  readonly observation: string; // AI-worded: what response to watch for
}

export interface MingJingMirrorOutput {
  readonly mirror_kind: 'mingjing';
  readonly summary: string;
  readonly core: MingJingCore;
  readonly life_stage_strategies: readonly MingJingLifeStageStrategy[];
  readonly event_validations: readonly MingJingEventValidation[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly citations: readonly MirrorCitation[];
}

export interface MingJingRelationshipMirrorOutput {
  readonly mirror_kind: 'mingjing';
  readonly output_kind: 'relationship_hepan';
  readonly relationship_subject: MingJingRelationshipSubject;
  readonly overview: MingJingRelationshipOverview;
  readonly patterns: readonly MingJingRelationshipPattern[]; // deterministically selected, 1..4
  readonly recent_status: MingJingRelationshipRecentStatus;
  readonly action: MingJingRelationshipAction;
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly citations: readonly MirrorCitation[];
}

export interface MingJingZiweiChartBasis {
  readonly soul_palace_branch: string;
  readonly soul_palace_name: string;
  readonly body_palace_name: string;
  readonly five_elements_class: string;
  readonly soul_star: string;
  readonly body_star: string;
  readonly palace_count: number;
  readonly sihua_refs: readonly string[];
}

export interface MingJingZiweiProfile {
  readonly life_pattern: string;
  readonly strengths: string;
  readonly long_term_theme: string;
  readonly relationship_pattern: string;
  readonly career_inclination: string;
}

export interface MingJingZiweiDecadeGuidance {
  readonly age_range: string;
  readonly palace_name: string;
  readonly palace_branch: string;
  readonly major_stars: readonly string[];
  readonly theme: string;
  readonly strategy: string;
}

export interface MingJingZiweiNatalMirrorOutput {
  readonly mirror_kind: 'mingjing';
  readonly output_kind: 'ziwei_natal_brief';
  readonly summary: string;
  readonly chart_basis: MingJingZiweiChartBasis;
  readonly profile: MingJingZiweiProfile;
  readonly decade_guidance: readonly MingJingZiweiDecadeGuidance[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly citations: readonly MirrorCitation[];
}

export interface MingJingQizhengChartBasis {
  readonly ascendant_longitude: number;
  readonly day_night: 'day' | 'night';
  readonly zodiac_model: string;
  readonly house_model: string;
  readonly mansion_model: string;
  readonly siyu_model: string;
  readonly ephemeris_version: string;
  readonly key_body_refs: readonly string[];
}

export interface MingJingQizhengProfile {
  readonly life_pattern: string;
  readonly strengths: string;
  readonly long_term_theme: string;
  readonly relationship_pattern: string;
  readonly career_inclination: string;
}

export interface MingJingQizhengStarGuidance {
  readonly body_key: string;
  readonly body_label: string;
  readonly house_name: string;
  readonly mansion: string;
  readonly position_class: string;
  readonly theme: string;
  readonly strategy: string;
}

export interface MingJingQizhengNatalMirrorOutput {
  readonly mirror_kind: 'mingjing';
  readonly output_kind: 'qizheng_siyu_natal_brief';
  readonly summary: string;
  readonly chart_basis: MingJingQizhengChartBasis;
  readonly profile: MingJingQizhengProfile;
  readonly star_guidance: readonly MingJingQizhengStarGuidance[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly citations: readonly MirrorCitation[];
}

export type MirrorOutput =
  | RiJingMirrorOutput
  | YueJingMirrorOutput
  | NianJingMirrorOutput
  | MingJingMirrorOutput
  | MingJingRelationshipMirrorOutput
  | MingJingZiweiNatalMirrorOutput
  | MingJingQizhengNatalMirrorOutput
  | ShiJingMirrorOutput;

export function mirrorOutputKind(output: MirrorOutput): MirrorKind {
  return output.mirror_kind;
}

export function isMingJingRelationshipMirrorOutput(
  output: MirrorOutput,
): output is MingJingRelationshipMirrorOutput {
  return (
    output.mirror_kind === 'mingjing' &&
    (output as { readonly output_kind?: unknown }).output_kind === 'relationship_hepan'
  );
}

// Relationship HePan output carries its headline under overview.summary instead
// of a root summary; every other output kind keeps the root field.
export function mirrorOutputSummary(output: MirrorOutput): string {
  if (isMingJingRelationshipMirrorOutput(output)) return output.overview.summary;
  return output.summary;
}
