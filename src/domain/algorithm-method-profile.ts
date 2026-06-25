export const SJG_ALGO_CONTRACT_VERSION = 'SJG-ALGO-v1' as const;
export const SJG_ALGO_FEATURE_SCHEMA_VERSION = 'SJG-FEATURE-v2' as const;
export const SJG_ASTRO_CONTRACT_VERSION = 'SJG-ASTRO-v1' as const;

export const BAZI_ZIPING_V1 = 'bazi_ziping_v1' as const;
export const ZIWEI_SANHE_V1 = 'ziwei_sanhe_v1' as const;
export const QIZHENG_SIYU_GUOLAO_V1 = 'qizheng_siyu_guolao_v1' as const;

export type MethodProfileId =
  | typeof BAZI_ZIPING_V1
  | typeof ZIWEI_SANHE_V1
  | typeof QIZHENG_SIYU_GUOLAO_V1;

export const METHOD_PROFILE_IDS: readonly MethodProfileId[] = [
  BAZI_ZIPING_V1,
  ZIWEI_SANHE_V1,
  QIZHENG_SIYU_GUOLAO_V1,
] as const;

export const ADMITTED_METHOD_PROFILE_IDS: readonly MethodProfileId[] = [
  BAZI_ZIPING_V1,
  ZIWEI_SANHE_V1,
  QIZHENG_SIYU_GUOLAO_V1,
] as const;

export const DEFAULT_METHOD_PROFILE_ID: MethodProfileId = BAZI_ZIPING_V1;

export function isAdmittedMethodProfileId(value: string): value is MethodProfileId {
  return (ADMITTED_METHOD_PROFILE_IDS as readonly string[]).includes(value);
}

export interface MethodProfile {
  readonly id: MethodProfileId;
  readonly contract_version: typeof SJG_ALGO_CONTRACT_VERSION;
  readonly feature_schema_version: typeof SJG_ALGO_FEATURE_SCHEMA_VERSION;
  readonly ephemeris_version: string;
  readonly interpretive_profile?: string;
}
