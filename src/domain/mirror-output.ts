// SJG-ASTRO-03..07 — MirrorOutput (discriminated by mirror_kind).

import type { MirrorKind } from './mirror-scope.ts';

export type TendencyClass = 'supportive' | 'steady' | 'watch' | 'blocked' | 'turning';

export const TENDENCY_CLASSES: readonly TendencyClass[] = [
  'supportive',
  'steady',
  'watch',
  'blocked',
  'turning',
] as const;

export const MIRROR_OUTPUT_ALLOWED_CITATION_METHODS: readonly string[] = [
  'bazi_ganzhi_jieqi_dayun_v1',
] as const;

export interface MirrorCitation {
  readonly method: 'bazi_ganzhi_jieqi_dayun_v1';
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

export type MirrorOutput =
  | RiJingMirrorOutput
  | YueJingMirrorOutput
  | NianJingMirrorOutput
  | ShiJingMirrorOutput;

export function mirrorOutputKind(output: MirrorOutput): MirrorKind {
  return output.mirror_kind;
}
