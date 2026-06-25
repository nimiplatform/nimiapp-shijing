// SJG-ALGO-18 — MingJing is a method-routed product surface. The route
// lifecycle is shared, but each method owns its route-specific evidence and UI.

import {
  BAZI_ZIPING_V1,
  DEFAULT_METHOD_PROFILE_ID,
  QIZHENG_SIYU_GUOLAO_V1,
  ZIWEI_SANHE_V1,
  isAdmittedMethodProfileId,
  type MethodProfileId,
} from '../../domain/algorithm.ts';
import type { MirrorScope } from '../../domain/mirror-scope.ts';

export type MingJingRouteId =
  | 'mingjing.route.bazi_ziping_v1'
  | 'mingjing.route.ziwei_sanhe_v1'
  | 'mingjing.route.qizheng_siyu_guolao_v1';

export type MingJingRouteFeatureId =
  | 'natal_projection'
  | 'natal_reading'
  | 'relationship_hepan';

export type MingJingRouteStatus = 'implemented' | 'not_implemented';

export interface MingJingRouteDeclaration {
  readonly id: MingJingRouteId;
  readonly method_profile_id: MethodProfileId;
  readonly label: string;
  readonly status: MingJingRouteStatus;
  readonly supported_features: readonly MingJingRouteFeatureId[];
  readonly module_ids: readonly string[];
}

export type MingJingRouteSupportError =
  | {
      readonly code: 'mingjing_route_not_implemented';
      readonly route_id: MingJingRouteId;
      readonly method_profile_id: MethodProfileId;
      readonly feature_id: MingJingRouteFeatureId;
      readonly detail: string;
    }
  | {
      readonly code: 'mingjing_route_feature_not_supported';
      readonly route_id: MingJingRouteId;
      readonly method_profile_id: MethodProfileId;
      readonly feature_id: MingJingRouteFeatureId;
      readonly supported_features: readonly MingJingRouteFeatureId[];
      readonly detail: string;
    };

export type MingJingRouteSupportResult =
  | { ok: true; route: MingJingRouteDeclaration }
  | { ok: false; error: MingJingRouteSupportError };

export const MINGJING_ROUTE_DECLARATIONS: readonly MingJingRouteDeclaration[] = [
  {
    id: 'mingjing.route.bazi_ziping_v1',
    method_profile_id: BAZI_ZIPING_V1,
    label: 'BaZi Ziping MingJing route',
    status: 'implemented',
    supported_features: ['natal_projection', 'natal_reading', 'relationship_hepan'],
    module_ids: [
      'bazi.natal_overview',
      'bazi.four_pillars',
      'bazi.day_master',
      'bazi.ten_gods',
      'bazi.yong_shen',
      'bazi.dayun',
      'bazi.liunian_windows',
      'bazi.relationship_hepan',
    ],
  },
  {
    id: 'mingjing.route.ziwei_sanhe_v1',
    method_profile_id: ZIWEI_SANHE_V1,
    label: 'Ziwei Sanhe MingJing route',
    status: 'implemented',
    supported_features: ['natal_projection', 'natal_reading'],
    module_ids: [
      'ziwei.minggong',
      'ziwei.shengong',
      'ziwei.twelve_palaces',
      'ziwei.major_minor_stars',
      'ziwei.sihua',
      'ziwei.sanfang_sizheng',
      'ziwei.daxian',
      'ziwei.flying_transformations',
    ],
  },
  {
    id: 'mingjing.route.qizheng_siyu_guolao_v1',
    method_profile_id: QIZHENG_SIYU_GUOLAO_V1,
    label: 'QiZheng SiYu / GuoLao MingJing route',
    status: 'implemented',
    supported_features: ['natal_projection', 'natal_reading'],
    module_ids: [
      'qizheng_siyu.chart_basis',
      'qizheng_siyu.seven_governors',
      'qizheng_siyu.four_auxiliaries',
      'qizheng_siyu.twelve_houses',
      'qizheng_siyu.twenty_eight_mansions',
      'qizheng_siyu.star_guidance',
    ],
  },
] as const;

const ROUTE_BY_METHOD = new Map(
  MINGJING_ROUTE_DECLARATIONS.map((route) => [route.method_profile_id, route]),
);

export function resolveMingJingRouteForMethod(
  methodProfileId?: MethodProfileId | string | null,
): MingJingRouteDeclaration {
  const id =
    methodProfileId && isAdmittedMethodProfileId(methodProfileId)
      ? methodProfileId
      : DEFAULT_METHOD_PROFILE_ID;
  return ROUTE_BY_METHOD.get(id) ?? ROUTE_BY_METHOD.get(DEFAULT_METHOD_PROFILE_ID)!;
}

export function mingJingRouteFeatureIdForScope(
  mirrorScope: MirrorScope,
): MingJingRouteFeatureId | null {
  if (mirrorScope.kind === 'natal') return 'natal_reading';
  if (mirrorScope.kind === 'relationship_natal') return 'relationship_hepan';
  return null;
}

export function mingJingRouteFailCloseDetail(error: MingJingRouteSupportError): string {
  if (error.code === 'mingjing_route_not_implemented') {
    return [
      'mingjing_route_not_implemented',
      error.route_id,
      error.method_profile_id,
    ].join(':');
  }
  return [
    'mingjing_route_feature_not_supported',
    error.route_id,
    error.feature_id,
    `supported=${error.supported_features.join(',')}`,
  ].join(':');
}

export function validateMingJingRouteSupport(input: {
  readonly method_profile_id?: MethodProfileId | string | null;
  readonly feature_id: MingJingRouteFeatureId;
}): MingJingRouteSupportResult {
  const route = resolveMingJingRouteForMethod(input.method_profile_id);
  if (route.status !== 'implemented') {
    return {
      ok: false,
      error: {
        code: 'mingjing_route_not_implemented',
        route_id: route.id,
        method_profile_id: route.method_profile_id,
        feature_id: input.feature_id,
        detail: 'Selected MingJing route is not implemented.',
      },
    };
  }
  if (!route.supported_features.includes(input.feature_id)) {
    return {
      ok: false,
      error: {
        code: 'mingjing_route_feature_not_supported',
        route_id: route.id,
        method_profile_id: route.method_profile_id,
        feature_id: input.feature_id,
        supported_features: route.supported_features,
        detail: 'Selected MingJing route does not support this route feature.',
      },
    };
  }
  return { ok: true, route };
}
