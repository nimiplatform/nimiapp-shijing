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
import { BAZI_ZIPING_V1, QIZHENG_SIYU_GUOLAO_V1, ZIWEI_SANHE_V1 } from './algorithm-method-profile.ts';
import type { MethodProfile } from './algorithm-method-profile.ts';

export {
  ADMITTED_METHOD_PROFILE_IDS,
  BAZI_ZIPING_V1,
  DEFAULT_METHOD_PROFILE_ID,
  METHOD_PROFILE_IDS,
  QIZHENG_SIYU_GUOLAO_V1,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ALGO_FEATURE_SCHEMA_VERSION,
  SJG_ASTRO_CONTRACT_VERSION,
  ZIWEI_SANHE_V1,
  isAdmittedMethodProfileId,
} from './algorithm-method-profile.ts';
export type { MethodProfile, MethodProfileId } from './algorithm-method-profile.ts';

// SJG-ALGO-01 — Method profile registry. Profiles are a closed set; user data
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
  // The 干支 of the period this marker opens (流年 for annual_transition, 大运 for
  // dayun_boundary). Lets the projection derive period quality (用神 favourability)
  // instead of labelling every NianJing phase a degenerate 转折. Absent for
  // markers with no intrinsic pillar (e.g. natal-relation clash/combination).
  readonly pillar?: GanzhiPillar;
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

// BaZi method evidence (method_evidence.bazi). Opaque to Layer-3 consumers
// except the dedicated BaZi evidence view.
// SJG-ALGO-15 — interpretive layer (fuyi_tiaohou_v1).
export type FiveElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export type StrengthBand = '极弱' | '偏弱' | '中和' | '偏强' | '极强';

export const STRENGTH_BANDS: readonly StrengthBand[] = ['极弱', '偏弱', '中和', '偏强', '极强'] as const;

export type HiddenStemWeightClass = 'primary' | 'middle' | 'residual';

export interface HiddenStem {
  readonly stem: HeavenlyStem;
  readonly weight_class: HiddenStemWeightClass;
}

export type PillarPosition = 'year' | 'month' | 'day' | 'hour';

export interface BaziPillarFeatures {
  readonly position: PillarPosition;
  readonly ten_god: string; // 十神 of the stem vs day master
  readonly hidden_stems: readonly HiddenStem[];
  readonly nayin: string;
  readonly terrain: string; // 日主 十二长生 at this branch
}

export interface BaziStrength {
  readonly band: StrengthBand;
  readonly support_ratio: number; // bounded 0..1 ordinal evidence, NOT a luck score
  readonly basis: readonly string[];
}

export interface YongShen {
  readonly yong: readonly FiveElement[];
  readonly xi: readonly FiveElement[];
  readonly ji: readonly FiveElement[];
  readonly tiaohou?: FiveElement;
  readonly basis: readonly string[];
}

export type BaziBranchRelationKind = '六合' | '三合' | '相冲' | '相害' | '相刑' | '相破';

export interface BaziBranchRelation {
  readonly kind: BaziBranchRelationKind;
  readonly positions: readonly PillarPosition[];
}

export interface RelationshipBranchInteraction {
  readonly self_position: PillarPosition;
  readonly related_position: PillarPosition;
  readonly kind: BaziBranchRelationKind;
  readonly driver_ref: string;
}

export interface RelationshipElementDirection {
  readonly label: 'supporting' | 'draining' | 'controlling' | 'same' | 'unknown';
  readonly driver_ref: string;
}

export interface RelationshipTimingEvidenceWindow {
  readonly start_date: string;
  readonly end_date: string;
  readonly nature: TendencyClass;
  readonly driver_refs: readonly string[];
}

export interface RelationshipHePanEvidence {
  readonly related_person_ref: Extract<SubjectRef, { kind: 'person' }>;
  readonly display_name_snapshot: string;
  readonly branch_interactions: readonly RelationshipBranchInteraction[];
  readonly day_master_relation: RelationshipElementDirection;
  readonly ten_god_relation: RelationshipElementDirection;
  readonly yong_shen_relation: RelationshipElementDirection;
  readonly timing_windows: readonly RelationshipTimingEvidenceWindow[];
}

export interface BaziInterpretation {
  readonly pillars: readonly BaziPillarFeatures[];
  readonly strength: BaziStrength;
  readonly yong_shen: YongShen;
  readonly natal_branch_relations: readonly BaziBranchRelation[];
}

export interface BaziSubjectChart {
  readonly subject_ref: SubjectRef;
  readonly natal_chart: NatalChartSnapshot;
  readonly dayun?: DayunSnapshot;
  readonly cycle_snapshot: CycleSnapshot;
  readonly interpretation?: BaziInterpretation;
}

export interface BaziEvidence {
  readonly self_subject: BaziSubjectChart;
  readonly related_persons: readonly BaziSubjectChart[];
}

// 紫微斗数 method evidence (method_evidence.ziwei). Opaque to Layer-3 consumers
// except the dedicated 紫微 evidence view.
export interface ZiweiStar {
  readonly name: string;
  readonly brightness: string;
  readonly mutagen: '' | '禄' | '权' | '科' | '忌';
}

export interface ZiweiPalace {
  readonly index: number;
  readonly name: string;
  readonly heavenly_stem: string;
  readonly earthly_branch: string;
  readonly is_soul: boolean;
  readonly is_body: boolean;
  readonly major_stars: readonly ZiweiStar[];
  readonly minor_stars: readonly ZiweiStar[];
  readonly decadal_start_age: number;
  readonly decadal_end_age: number;
}

export interface ZiweiSubjectChart {
  readonly subject_ref: SubjectRef;
  readonly five_elements_class: string;
  readonly soul_star: string;
  readonly body_star: string;
  readonly soul_palace_branch: string;
  readonly palaces: readonly ZiweiPalace[];
}

export interface ZiweiEvidence {
  readonly self_subject: ZiweiSubjectChart;
  readonly related_persons: readonly ZiweiSubjectChart[];
}

// 七政四余 / 果老星宗 method evidence (method_evidence.qizheng_siyu).
// v1 uses astronomical ecliptic longitudes for 七政, admitted virtual-point
// definitions for 四余, and an equal-house route projection for 命镜.
export type QizhengSiyuBodyKey =
  | 'taiyang'
  | 'taiyin'
  | 'chenxing'
  | 'taibai'
  | 'yinghuo'
  | 'suixing'
  | 'zhenxing'
  | 'luohou'
  | 'jidu'
  | 'ziqi'
  | 'yuebei';

export type QizhengSiyuBodyKind = 'qizheng' | 'siyu';

export interface QizhengSiyuBody {
  readonly key: QizhengSiyuBodyKey;
  readonly label: string;
  readonly kind: QizhengSiyuBodyKind;
  readonly longitude: number;
  readonly latitude?: number;
  readonly zodiac_sign: string;
  readonly mansion: string;
  readonly house_name: string;
  readonly position_class: string;
  readonly provenance: string;
}

export interface QizhengSiyuHouse {
  readonly index: number;
  readonly name: string;
  readonly start_longitude: number;
  readonly end_longitude: number;
  readonly body_keys: readonly QizhengSiyuBodyKey[];
}

export interface QizhengSiyuChartBasis {
  readonly birth_utc: string;
  readonly ascendant_longitude: number;
  readonly day_night: 'day' | 'night';
  readonly zodiac_model: string;
  readonly house_model: string;
  readonly mansion_model: string;
  readonly siyu_model: string;
  readonly ephemeris_version: string;
}

export interface QizhengSiyuSubjectChart {
  readonly subject_ref: SubjectRef;
  readonly canonicalization_hash: string;
  readonly chart_basis: QizhengSiyuChartBasis;
  readonly bodies: readonly QizhengSiyuBody[];
  readonly houses: readonly QizhengSiyuHouse[];
}

export interface QizhengSiyuEvidence {
  readonly self_subject: QizhengSiyuSubjectChart;
  readonly related_persons: readonly QizhengSiyuSubjectChart[];
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

// SJG-ALGO-08 — algorithm-agnostic common driver surface. Layer-3 (projection,
// runtime AI, validators, persistence, non-evidence UI) binds to this only.
export interface CommonDrivers {
  readonly stage_drivers: readonly StageDriver[];
  readonly key_windows: readonly KeyWindowFeature[];
  readonly yuejing_tendency_drivers: readonly YueJingTendencyDriver[];
  readonly nianjing_phase_drivers: readonly NianJingPhaseDriver[];
  readonly nianjing_inflection_drivers: readonly NianJingInflectionDriver[];
  readonly relationship_hepan?: RelationshipHePanEvidence;
  readonly uncertainty_inputs: readonly UncertaintyInput[];
}

// Method-tagged, opaque evidence, discriminated by method_id. The 紫微 variant
// (ZiweiMethodEvidence) is admitted with the 紫微 engine and added to this union.
export interface BaziMethodEvidence {
  readonly method_id: typeof BAZI_ZIPING_V1;
  readonly bazi: BaziEvidence;
}

export interface ZiweiMethodEvidence {
  readonly method_id: typeof ZIWEI_SANHE_V1;
  readonly ziwei: ZiweiEvidence;
}

export interface QizhengSiyuMethodEvidence {
  readonly method_id: typeof QIZHENG_SIYU_GUOLAO_V1;
  readonly qizheng_siyu: QizhengSiyuEvidence;
}

export type MethodEvidence = BaziMethodEvidence | ZiweiMethodEvidence | QizhengSiyuMethodEvidence;

export interface AstrologyFeatureSnapshot {
  readonly method_profile: MethodProfile;
  readonly mirror_kind: MirrorKind;
  readonly canonical_window: CanonicalMirrorWindow;
  readonly common: CommonDrivers;
  readonly method_evidence: MethodEvidence;
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
