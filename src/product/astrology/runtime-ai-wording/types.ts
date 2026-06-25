import type { MirrorKind } from '../../../domain/mirror-scope.ts';

export const RUNTIME_AI_WORDING_PATCH_KIND = 'shijing.runtime_ai_wording_patch.v1';

type WordingPatchBase = {
  readonly patch_kind: typeof RUNTIME_AI_WORDING_PATCH_KIND;
  readonly mirror_kind: MirrorKind;
  readonly summary?: string;
};

export type RiJingWordingProjectionPatch = {
  readonly concern_tag_ref: string;
  readonly summary?: string;
  readonly recommendations?: readonly string[];
};

export type RiJingWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'rijing';
  readonly daily_overview?: string;
  readonly concern_projections?: readonly RiJingWordingProjectionPatch[];
};

export type YueJingWordingCellPatch = {
  readonly date: string;
  readonly concern_tag_ref: string;
  readonly summary?: string;
};

export type YueJingWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'yuejing';
  readonly cells?: readonly YueJingWordingCellPatch[];
};

export type NianJingWordingPhasePatch = {
  readonly concern_tag_ref: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly summary?: string;
};

export type NianJingWordingInflectionPatch = {
  readonly concern_tag_ref: string;
  readonly date: string;
  readonly summary?: string;
};

export type NianJingWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'nianjing';
  readonly phase_bands?: readonly NianJingWordingPhasePatch[];
  readonly inflection_points?: readonly NianJingWordingInflectionPatch[];
};

export type ShiJingWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'shijing';
  readonly answer?: string;
};

export type MingJingWordingCorePatch = {
  readonly personality?: string;
  readonly strengths?: string;
  readonly long_term_themes?: string;
  readonly relationship_pattern?: string;
  readonly career_inclination?: string;
};

export type MingJingWordingStrategyPatch = {
  readonly phase_label: string;
  readonly theme?: string;
  readonly strategy?: string;
};

export type MingJingWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'mingjing';
  readonly core?: MingJingWordingCorePatch;
  readonly life_stage_strategies?: readonly MingJingWordingStrategyPatch[];
};

export type MingJingRelationshipStructurePatch = {
  readonly baseline_pattern?: string;
  readonly attraction_and_support?: string;
  readonly friction_and_misread?: string;
  readonly communication_rhythm?: string;
  readonly boundary_advice?: string;
};

export type MingJingRelationshipTimingWindowPatch = {
  readonly start_date: string;
  readonly end_date: string;
  readonly summary?: string;
};

export type MingJingRelationshipPracticePatch = {
  readonly communication?: string;
  readonly boundary?: string;
  readonly repair?: string;
};

export type MingJingRelationshipWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'mingjing';
  readonly output_kind: 'relationship_hepan';
  readonly summary: string;
  readonly structure: MingJingRelationshipStructurePatch;
  readonly timing_windows: readonly MingJingRelationshipTimingWindowPatch[];
  readonly practice: MingJingRelationshipPracticePatch;
};

export type MingJingZiweiProfilePatch = {
  readonly life_pattern: string;
  readonly strengths: string;
  readonly long_term_theme: string;
  readonly relationship_pattern: string;
  readonly career_inclination: string;
};

export type MingJingZiweiDecadeGuidancePatch = {
  readonly age_range: string;
  readonly palace_name: string;
  readonly theme: string;
  readonly strategy: string;
};

export type MingJingZiweiNatalWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'mingjing';
  readonly output_kind: 'ziwei_natal_brief';
  readonly summary: string;
  readonly profile: MingJingZiweiProfilePatch;
  readonly decade_guidance: readonly MingJingZiweiDecadeGuidancePatch[];
};

export type MingJingQizhengProfilePatch = {
  readonly life_pattern: string;
  readonly strengths: string;
  readonly long_term_theme: string;
  readonly relationship_pattern: string;
  readonly career_inclination: string;
};

export type MingJingQizhengStarGuidancePatch = {
  readonly body_key: string;
  readonly theme: string;
  readonly strategy: string;
};

export type MingJingQizhengNatalWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'mingjing';
  readonly output_kind: 'qizheng_siyu_natal_brief';
  readonly summary: string;
  readonly profile: MingJingQizhengProfilePatch;
  readonly star_guidance: readonly MingJingQizhengStarGuidancePatch[];
};

export type RuntimeAiWordingPatch =
  | RiJingWordingPatch
  | YueJingWordingPatch
  | NianJingWordingPatch
  | MingJingWordingPatch
  | MingJingRelationshipWordingPatch
  | MingJingZiweiNatalWordingPatch
  | MingJingQizhengNatalWordingPatch
  | ShiJingWordingPatch;

export class RuntimeAiWordingPatchValidationError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = 'RuntimeAiWordingPatchValidationError';
    this.detail = detail;
  }
}
