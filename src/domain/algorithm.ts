// SJG-ALGO-* — Astrology Algorithm Contract v1 source mirror.
//
// Type aliases + closed enums + structural shapes mirroring
// `.nimi/spec/shijing/kernel/algorithm-contract.md` (SJG-ALGO-08
// AstrologyFeatureSnapshot). Validators consume these from src/contracts/**.
// Deterministic pipeline implementation lives downstream of W02.

import type { RawBirthInput } from './person.ts';
import type { MirrorKind, MirrorScope, MirrorScopeKind } from './mirror-scope.ts';
import type { SubjectRef } from './subject-ref.ts';
import type { TendencyClass } from './mirror-output.ts';
import type { NianJingInflectionKind } from './mirror-output.ts';

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

export const MISSING_PILLAR_NAMES: readonly MissingPillarName[] = [
  'year',
  'month',
  'day',
  'hour',
] as const;

export interface NatalChartSnapshot {
  readonly subject_ref: SubjectRef;
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
  readonly current_period_start_utc?: string;
  readonly current_period_end_utc?: string;
  readonly current_pillar?: GanzhiPillar;
}

export interface TimedPillar {
  readonly start_utc: string;
  readonly end_utc: string;
  readonly pillar: GanzhiPillar;
}

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
  readonly kind: string;
  readonly strength: MarkerStrength;
  readonly start_utc: string;
  readonly end_utc: string;
  readonly subject_refs: readonly SubjectRef[];
  readonly source: CycleMarkerSource;
}

export interface CycleSnapshot {
  readonly window_start_utc: string;
  readonly window_end_utc: string;
  readonly annual_pillar?: GanzhiPillar;
  readonly monthly_pillars: readonly TimedPillar[];
  readonly daily_pillars: readonly TimedPillar[];
  readonly markers: readonly CycleMarker[];
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
  readonly marker_refs: readonly string[];
  readonly explanation_key: string;
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
  readonly driver_refs: readonly string[];
  readonly subject_refs: readonly SubjectRef[];
}

export interface SubjectFeatureSnapshot {
  readonly subject_ref: SubjectRef;
  readonly natal_chart: NatalChartSnapshot;
  readonly dayun?: DayunSnapshot;
  readonly cycle_snapshot: CycleSnapshot;
}

export interface YueJingTendencyDriver {
  readonly date: string;
  readonly concern_tag_ref: string;
  readonly tendency_class: TendencyClass;
  readonly driver_refs: readonly string[];
}

export interface NianJingPhaseDriver {
  readonly concern_tag_ref: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly nature: TendencyClass;
  readonly driver_refs: readonly string[];
}

export interface NianJingInflectionDriverWindow {
  readonly start_date: string;
  readonly end_date: string;
}

export interface NianJingInflectionDriver {
  readonly concern_tag_ref: string;
  readonly date: string;
  readonly date_window?: NianJingInflectionDriverWindow;
  readonly kind: NianJingInflectionKind;
  readonly driver_refs: readonly string[];
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
  | 'unresolved_mention'
  | 'related_person_incomplete'
  | 'memory_unavailable'
  | 'no_active_concern_tags'
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
  'unresolved_mention',
  'related_person_incomplete',
  'memory_unavailable',
  'no_active_concern_tags',
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
  readonly subject_ref?: SubjectRef;
}

export interface CanonicalMirrorWindow {
  readonly start_utc: string;
  readonly end_utc: string;
  readonly basis_time_zone: string;
  readonly scope_kind: MirrorScopeKind;
}

export interface AstrologyFeatureSnapshot {
  readonly method_profile: AstrologyMethodProfile;
  readonly mirror_kind: MirrorKind;
  readonly canonical_window: CanonicalMirrorWindow;
  readonly self_subject: SubjectFeatureSnapshot;
  readonly related_persons: readonly SubjectFeatureSnapshot[];
  readonly stage_drivers: readonly StageDriver[];
  readonly key_windows: readonly KeyWindowFeature[];
  readonly yuejing_tendency_drivers: readonly YueJingTendencyDriver[];
  readonly nianjing_phase_drivers: readonly NianJingPhaseDriver[];
  readonly nianjing_inflection_drivers: readonly NianJingInflectionDriver[];
  readonly uncertainty_inputs: readonly UncertaintyInput[];
}

export const HASH_ALGORITHM = 'sha256' as const;
export const CANONICAL_SERIALIZATION = 'json-c14n-v1' as const;
export const UNICODE_NORMALIZATION = 'NFC' as const;
export const HASH_ENCODING = 'utf-8' as const;
export const HASH_DIGEST_FORMAT = 'hex-lowercase' as const;

export function canonicalWindowFromScope(scope: MirrorScope, startUtc: string, endUtc: string): CanonicalMirrorWindow {
  return {
    start_utc: startUtc,
    end_utc: endUtc,
    basis_time_zone: scope.basis_time_zone,
    scope_kind: scope.kind,
  };
}
