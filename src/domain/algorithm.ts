// SJG-ALGO-* — Astrology Algorithm Contract v1 source mirror.
//
// This module exposes ONLY type aliases + closed enums + structural shapes
// mirroring `.nimi/spec/shijing/kernel/algorithm-contract.md`. Validators
// that consume these types live in `src/contracts/**`; the deterministic
// pipeline implementation lives in `src/product/astrology/**`.

import type { RawBirthInput } from './person.ts';
import type { SubjectRef } from './subject-ref.ts';

export const SJG_ALGO_CONTRACT_VERSION = 'SJG-ALGO-v1' as const;
export const SJG_ALGO_FEATURE_SCHEMA_VERSION = 'SJG-FEATURE-v1' as const;
export const SJG_ASTRO_CONTRACT_VERSION = 'SJG-ASTRO-v1' as const;

export const ASTROLOGY_METHOD_PROFILE_ID = 'bazi_ganzhi_jieqi_dayun_v1' as const;

export interface AstrologyMethodProfile {
  readonly id: typeof ASTROLOGY_METHOD_PROFILE_ID;
  readonly contract_version: typeof SJG_ALGO_CONTRACT_VERSION;
  readonly feature_schema_version: typeof SJG_ALGO_FEATURE_SCHEMA_VERSION;
}

export type HeavenlyStem =
  | 'jia'
  | 'yi'
  | 'bing'
  | 'ding'
  | 'wu'
  | 'ji'
  | 'geng'
  | 'xin'
  | 'ren'
  | 'gui';

export const HEAVENLY_STEMS: readonly HeavenlyStem[] = [
  'jia',
  'yi',
  'bing',
  'ding',
  'wu',
  'ji',
  'geng',
  'xin',
  'ren',
  'gui',
] as const;

export type EarthlyBranch =
  | 'zi'
  | 'chou'
  | 'yin'
  | 'mao'
  | 'chen'
  | 'si'
  | 'wu'
  | 'wei'
  | 'shen'
  | 'you'
  | 'xu'
  | 'hai';

export const EARTHLY_BRANCHES: readonly EarthlyBranch[] = [
  'zi',
  'chou',
  'yin',
  'mao',
  'chen',
  'si',
  'wu',
  'wei',
  'shen',
  'you',
  'xu',
  'hai',
] as const;

export interface GanzhiPillar {
  readonly stem: HeavenlyStem;
  readonly branch: EarthlyBranch;
  // SJG-ALGO-06 + SJG-ALGO-11 — every emitted pillar records the
  // ephemeris table that resolved its boundary instant. Algorithm
  // contract v1 ties this to the admitted `bazi_ganzhi_jieqi_dayun_v1`
  // method profile via `shijing-approx-v1` while the high-precision
  // ephemeris is admitted; downstream consumers MUST refuse pillars
  // whose ephemeris_version does not match the active profile.
  readonly ephemeris_version: string;
}

export type NatalCanonicalizationStatus = 'exact' | 'approximate' | 'insufficient';

export const NATAL_CANONICALIZATION_STATUSES: readonly NatalCanonicalizationStatus[] = [
  'exact',
  'approximate',
  'insufficient',
] as const;

export type CalendarConversionSource = 'input_gregorian' | 'lunar_to_gregorian';

export const CALENDAR_CONVERSION_SOURCES: readonly CalendarConversionSource[] = [
  'input_gregorian',
  'lunar_to_gregorian',
] as const;

export interface NatalCanonicalization {
  // SJG-ALGO-04: the spec body lists `raw_birth_input: RawBirthInput`
  // verbatim, and the spec rules require the canonicalization output to
  // preserve raw input as evidence (including lunar leap-month evidence,
  // place_text, etc.). The companion `raw_birth_input_hash` is retained
  // for compact reference / storage / canonical-hash inputs.
  readonly raw_birth_input: RawBirthInput;
  readonly raw_birth_input_hash: string;
  readonly canonical_birth_datetime_utc: string;
  readonly canonical_birth_precision:
    | 'exact'
    | 'rough_day'
    | 'rough_month'
    | 'rough_year'
    | 'unknown';
  readonly true_solar_time_utc?: string;
  readonly standard_meridian_longitude?: number;
  readonly longitude_correction_minutes?: number;
  readonly equation_of_time_minutes?: number;
  readonly calendar_conversion_source: CalendarConversionSource;
  readonly ephemeris_version: string;
  readonly status: NatalCanonicalizationStatus;
}

export type MissingPillarName = 'year' | 'month' | 'day' | 'hour';

export const MISSING_PILLAR_NAMES: readonly MissingPillarName[] = ['year', 'month', 'day', 'hour'] as const;

export interface NatalChartSnapshot {
  readonly subject: SubjectRef;
  readonly method_profile: AstrologyMethodProfile;
  readonly canonicalization_hash: string;
  readonly year_pillar?: GanzhiPillar;
  readonly month_pillar?: GanzhiPillar;
  readonly day_pillar?: GanzhiPillar;
  readonly hour_pillar?: GanzhiPillar;
  readonly day_master?: HeavenlyStem;
  readonly missing_pillars: readonly MissingPillarName[];
}

export type DayunDirection = 'forward' | 'reverse';

export const DAYUN_DIRECTIONS: readonly DayunDirection[] = ['forward', 'reverse'] as const;

export interface DayunSnapshot {
  readonly required: boolean;
  readonly direction?: DayunDirection;
  readonly start_age_years?: number;
  readonly start_utc?: string;
  readonly current_period_start_utc?: string;
  readonly current_period_end_utc?: string;
  readonly current_pillar?: GanzhiPillar;
  readonly next_boundary_utc?: string;
}

export interface TimedPillar {
  readonly start_utc: string;
  readonly end_utc: string;
  readonly pillar: GanzhiPillar;
}

export type CycleMarkerKind =
  | 'dayun_boundary'
  | 'annual_transition'
  | 'monthly_transition'
  | 'clash'
  | 'combination'
  | 'storage'
  | 'resource'
  | 'output'
  | 'wealth'
  | 'constraint';

export const CYCLE_MARKER_KINDS: readonly CycleMarkerKind[] = [
  'dayun_boundary',
  'annual_transition',
  'monthly_transition',
  'clash',
  'combination',
  'storage',
  'resource',
  'output',
  'wealth',
  'constraint',
] as const;

export type MarkerStrength = 'low' | 'medium' | 'high';

export const MARKER_STRENGTHS: readonly MarkerStrength[] = ['low', 'medium', 'high'] as const;

export type CycleMarkerSource = 'natal' | 'dayun' | 'annual' | 'monthly' | 'daily';

export const CYCLE_MARKER_SOURCES: readonly CycleMarkerSource[] = [
  'natal',
  'dayun',
  'annual',
  'monthly',
  'daily',
] as const;

export interface CycleMarker {
  readonly kind: CycleMarkerKind;
  readonly strength: MarkerStrength;
  readonly start_utc: string;
  readonly end_utc: string;
  readonly subjects: readonly SubjectRef[];
  readonly source: CycleMarkerSource;
}

export interface CycleSnapshot {
  readonly window_start_utc: string;
  readonly window_end_utc: string;
  readonly annual_pillar?: GanzhiPillar;
  readonly monthly_pillars: readonly TimedPillar[];
  readonly daily_pillars: readonly TimedPillar[];
  readonly active_markers: readonly CycleMarker[];
}

export type ShijingStageLabel = '进时' | '收时' | '养时' | '转时' | '守时';

export const SHIJING_STAGE_LABELS: readonly ShijingStageLabel[] = [
  '进时',
  '收时',
  '养时',
  '转时',
  '守时',
] as const;

export interface StageDriver {
  readonly stage_label: ShijingStageLabel;
  readonly marker_kind: CycleMarkerKind;
  readonly strength: MarkerStrength;
  readonly explanation_key: string;
}

export interface SubjectFeatureSnapshot {
  readonly subject: SubjectRef;
  readonly natal_chart: NatalChartSnapshot;
  readonly dayun?: DayunSnapshot;
  readonly cycle_snapshot: CycleSnapshot;
  readonly stage_drivers: readonly StageDriver[];
}

export type RelationFeatureAnchorRelevance = 'primary' | 'context';

export const RELATION_FEATURE_ANCHOR_RELEVANCES: readonly RelationFeatureAnchorRelevance[] = [
  'primary',
  'context',
] as const;

export interface RelationFeatureSnapshot {
  readonly from_subject: SubjectRef;
  readonly to_subject: SubjectRef;
  readonly relation_kind: string;
  readonly interaction_markers: readonly CycleMarker[];
  readonly anchor_relevance: RelationFeatureAnchorRelevance;
}

export type KeyWindowLabel = 'transition' | 'support' | 'closure' | 'maintenance';

export const KEY_WINDOW_LABELS: readonly KeyWindowLabel[] = [
  'transition',
  'support',
  'closure',
  'maintenance',
] as const;

export interface KeyWindowFeature {
  readonly start_utc: string;
  readonly end_utc: string;
  readonly label: KeyWindowLabel;
  readonly driver: string;
  readonly subjects: readonly SubjectRef[];
}

export type UncertaintyInputCode =
  | 'birth_precision_exact'
  | 'birth_precision_rough_day'
  | 'birth_precision_rough_month'
  | 'birth_precision_rough_year'
  | 'birth_precision_unknown'
  | 'location_missing'
  | 'timezone_missing'
  | 'ephemeris_missing'
  | 'calculation_sex_unspecified'
  | 'consent_withheld'
  | 'view_context_sparse'
  | 'ai_parse_failed';

export const UNCERTAINTY_INPUT_CODES: readonly UncertaintyInputCode[] = [
  'birth_precision_exact',
  'birth_precision_rough_day',
  'birth_precision_rough_month',
  'birth_precision_rough_year',
  'birth_precision_unknown',
  'location_missing',
  'timezone_missing',
  'ephemeris_missing',
  'calculation_sex_unspecified',
  'consent_withheld',
  'view_context_sparse',
  'ai_parse_failed',
] as const;

export type UncertaintySeverity = 'info' | 'caveat' | 'degrade' | 'fail_close';

export const UNCERTAINTY_SEVERITIES: readonly UncertaintySeverity[] = [
  'info',
  'caveat',
  'degrade',
  'fail_close',
] as const;

export interface UncertaintyInput {
  readonly code: UncertaintyInputCode;
  readonly severity: UncertaintySeverity;
  readonly subject?: SubjectRef;
}

// Forward-declared here so `Reading.time_window` and
// `AstrologyFeatureSnapshot.time_window` share the same shape. The full
// alias is re-exported from `./reading.ts` for consumer ergonomics.
export type ReadingTimeWindowMode = 'bounded' | 'natal';

export const READING_TIME_WINDOW_MODES: readonly ReadingTimeWindowMode[] = ['bounded', 'natal'] as const;

export type ReadingTimeWindowSource =
  | 'kind_default'
  | 'view_time_scope'
  | 'user_selected'
  | 'ad_hoc_question';

export const READING_TIME_WINDOW_SOURCES: readonly ReadingTimeWindowSource[] = [
  'kind_default',
  'view_time_scope',
  'user_selected',
  'ad_hoc_question',
] as const;

export interface ReadingTimeWindow {
  readonly mode: ReadingTimeWindowMode;
  readonly start_utc?: string;
  readonly end_utc?: string;
  readonly basis_time_zone: string;
  readonly source: ReadingTimeWindowSource;
}

export interface AstrologyFeatureSnapshot {
  readonly method_profile: AstrologyMethodProfile;
  readonly time_window: ReadingTimeWindow;
  readonly subjects: readonly SubjectFeatureSnapshot[];
  readonly relation_features: readonly RelationFeatureSnapshot[];
  readonly stage_label: ShijingStageLabel;
  readonly key_windows: readonly KeyWindowFeature[];
  readonly uncertainty_inputs: readonly UncertaintyInput[];
}

export const HASH_ALGORITHM = 'sha256' as const;
export const CANONICAL_SERIALIZATION = 'json-c14n-v1' as const;
export const UNICODE_NORMALIZATION = 'NFC' as const;
export const HASH_ENCODING = 'utf-8' as const;
export const HASH_DIGEST_FORMAT = 'hex-lowercase' as const;
