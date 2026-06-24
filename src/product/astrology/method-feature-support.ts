// SJG-ALGO-18 — algorithm-neutral product-feature support matrix for admitted
// MethodProfiles. MingJing is route-based and is declared separately in
// mingjing-route-support.ts.

import {
  BAZI_ZIPING_V1,
  DEFAULT_METHOD_PROFILE_ID,
  ZIWEI_SANHE_V1,
  isAdmittedMethodProfileId,
  type MethodProfileId,
} from '../../domain/algorithm.ts';
import type { MirrorKind, MirrorScope } from '../../domain/mirror-scope.ts';

export type ShijingMethodFeatureId =
  | 'rijing.daily_reading'
  | 'yuejing.rolling_30_day_reading'
  | 'nianjing.long_horizon_reading'
  | 'shijing.consultation';

export interface ShijingMethodFeatureDeclaration {
  readonly id: ShijingMethodFeatureId;
  readonly label: string;
  readonly mirror_kind: MirrorKind;
  readonly scope_kind: MirrorScope['kind'];
  readonly supported_method_profile_ids: readonly MethodProfileId[];
  readonly fail_close_reason: string;
}

export type MethodFeatureSupportError = {
  readonly code: 'method_feature_not_supported';
  readonly feature_id: ShijingMethodFeatureId;
  readonly method_profile_id: MethodProfileId;
  readonly supported_method_profile_ids: readonly MethodProfileId[];
  readonly detail: string;
};

export type MethodFeatureSupportResult =
  | { ok: true }
  | { ok: false; error: MethodFeatureSupportError };

const BOTH_CORE_METHODS: readonly MethodProfileId[] = [
  BAZI_ZIPING_V1,
  ZIWEI_SANHE_V1,
] as const;

export const SHIJING_METHOD_FEATURE_DECLARATIONS: readonly ShijingMethodFeatureDeclaration[] = [
  {
    id: 'rijing.daily_reading',
    label: 'RiJing daily reading',
    mirror_kind: 'rijing',
    scope_kind: 'daily',
    supported_method_profile_ids: BOTH_CORE_METHODS,
    fail_close_reason: 'RiJing requires a method that can derive daily tendency drivers.',
  },
  {
    id: 'yuejing.rolling_30_day_reading',
    label: 'YueJing rolling-30-day reading',
    mirror_kind: 'yuejing',
    scope_kind: 'rolling_30_day',
    supported_method_profile_ids: BOTH_CORE_METHODS,
    fail_close_reason: 'YueJing requires a method that can derive per-day tendency drivers.',
  },
  {
    id: 'nianjing.long_horizon_reading',
    label: 'NianJing long-horizon reading',
    mirror_kind: 'nianjing',
    scope_kind: 'long_horizon',
    supported_method_profile_ids: BOTH_CORE_METHODS,
    fail_close_reason: 'NianJing requires a method that can derive long-horizon phases and inflections.',
  },
  {
    id: 'shijing.consultation',
    label: 'ShiJing consultation',
    mirror_kind: 'shijing',
    scope_kind: 'consultation',
    supported_method_profile_ids: BOTH_CORE_METHODS,
    fail_close_reason: 'ShiJing consultation requires at least one generated source reading.',
  },
] as const;

const DECLARATION_BY_ID = new Map(
  SHIJING_METHOD_FEATURE_DECLARATIONS.map((feature) => [feature.id, feature]),
);

export function methodFeatureDeclaration(
  featureId: ShijingMethodFeatureId,
): ShijingMethodFeatureDeclaration {
  const declaration = DECLARATION_BY_ID.get(featureId);
  if (!declaration) {
    throw new Error(`unknown ShiJing method feature: ${featureId}`);
  }
  return declaration;
}

export function methodFeatureIdForMirror(
  mirrorKind: MirrorKind,
  mirrorScope: MirrorScope,
): ShijingMethodFeatureId | null {
  if (mirrorKind === 'rijing' && mirrorScope.kind === 'daily') return 'rijing.daily_reading';
  if (mirrorKind === 'yuejing' && mirrorScope.kind === 'rolling_30_day') return 'yuejing.rolling_30_day_reading';
  if (mirrorKind === 'nianjing' && mirrorScope.kind === 'long_horizon') return 'nianjing.long_horizon_reading';
  if (mirrorKind === 'shijing' && mirrorScope.kind === 'consultation') return 'shijing.consultation';
  return null;
}

export function methodSupportsFeature(
  methodProfileId: MethodProfileId,
  featureId: ShijingMethodFeatureId,
): boolean {
  return methodFeatureDeclaration(featureId).supported_method_profile_ids.includes(methodProfileId);
}

export function methodFeatureFailCloseDetail(error: MethodFeatureSupportError): string {
  return [
    'method_feature_not_supported',
    error.feature_id,
    error.method_profile_id,
    `supported=${error.supported_method_profile_ids.join(',')}`,
  ].join(':');
}

export function validateMethodFeatureSupport(input: {
  readonly method_profile_id?: MethodProfileId | string | null;
  readonly feature_id: ShijingMethodFeatureId;
}): MethodFeatureSupportResult {
  const methodProfileId =
    input.method_profile_id && isAdmittedMethodProfileId(input.method_profile_id)
      ? input.method_profile_id
      : DEFAULT_METHOD_PROFILE_ID;
  const declaration = methodFeatureDeclaration(input.feature_id);
  if (declaration.supported_method_profile_ids.includes(methodProfileId)) {
    return { ok: true };
  }
  return {
    ok: false,
    error: {
      code: 'method_feature_not_supported',
      feature_id: input.feature_id,
      method_profile_id: methodProfileId,
      supported_method_profile_ids: declaration.supported_method_profile_ids,
      detail: declaration.fail_close_reason,
    },
  };
}
