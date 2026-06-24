import {
  ADMITTED_METHOD_PROFILE_IDS,
  type MethodProfileId,
} from '../../domain/algorithm.ts';
import {
  SHIJING_METHOD_FEATURE_DECLARATIONS,
  type ShijingMethodFeatureId,
} from '../astrology/method-feature-support.ts';
import {
  mingJingRouteFailCloseDetail,
  validateMingJingRouteSupport,
  resolveMingJingRouteForMethod,
  type MingJingRouteFeatureId,
  type MingJingRouteId,
  type MingJingRouteStatus,
} from '../astrology/mingjing-route-support.ts';
import { METHOD_LABELS } from '../reading/reading-format.ts';

export interface MethodProfileFeatureCapability {
  readonly id: ShijingMethodFeatureId;
  readonly supported: boolean;
}

export interface MethodProfileMingJingRouteCapability {
  readonly id: MingJingRouteId;
  readonly status: MingJingRouteStatus;
  readonly supported_features: readonly MingJingRouteFeatureId[];
  readonly module_ids: readonly string[];
  readonly fail_close_detail: string | null;
}

export interface MethodProfileCapabilityRow {
  readonly method_profile_id: MethodProfileId;
  readonly method_label: string;
  readonly algorithm_neutral_features: readonly MethodProfileFeatureCapability[];
  readonly mingjing_route: MethodProfileMingJingRouteCapability;
}

export function deriveMethodProfileCapabilityRows(): readonly MethodProfileCapabilityRow[] {
  return ADMITTED_METHOD_PROFILE_IDS.map((methodProfileId) => {
    const route = resolveMingJingRouteForMethod(methodProfileId);
    const routeSupport = validateMingJingRouteSupport({
      method_profile_id: methodProfileId,
      feature_id: 'natal_projection',
    });

    return {
      method_profile_id: methodProfileId,
      method_label: METHOD_LABELS[methodProfileId],
      algorithm_neutral_features: SHIJING_METHOD_FEATURE_DECLARATIONS.map((feature) => ({
        id: feature.id,
        supported: feature.supported_method_profile_ids.includes(methodProfileId),
      })),
      mingjing_route: {
        id: route.id,
        status: route.status,
        supported_features: route.supported_features,
        module_ids: route.module_ids,
        fail_close_detail: routeSupport.ok ? null : mingJingRouteFailCloseDetail(routeSupport.error),
      },
    };
  });
}
