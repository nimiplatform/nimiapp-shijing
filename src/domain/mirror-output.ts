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

export interface RelationshipTimingWindow {
  readonly start_date: string;
  readonly end_date: string;
  readonly nature: TendencyClass;
  readonly driver_refs: readonly string[];
  readonly summary: string;
}

export interface MingJingRelationshipPractice {
  readonly communication: string;
  readonly boundary: string;
  readonly repair: string;
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
  readonly summary: string;
  readonly structure: {
    readonly baseline_pattern: string;
    readonly attraction_and_support: string;
    readonly friction_and_misread: string;
    readonly communication_rhythm: string;
    readonly boundary_advice: string;
  };
  readonly timing_windows: readonly RelationshipTimingWindow[];
  readonly practice: MingJingRelationshipPractice;
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

export type MirrorOutput =
  | RiJingMirrorOutput
  | YueJingMirrorOutput
  | NianJingMirrorOutput
  | MingJingMirrorOutput
  | MingJingRelationshipMirrorOutput
  | MingJingZiweiNatalMirrorOutput
  | ShiJingMirrorOutput;

export function mirrorOutputKind(output: MirrorOutput): MirrorKind {
  return output.mirror_kind;
}
