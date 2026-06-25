// SJG-IA-05 / SJG-IA-08 — readiness for the 命镜 natal projection.
//
// 命镜 renders the full whole-life chart (four pillars incl. 时柱, 大运 sequence),
// so it requires exact birth precision and a specified calculation sex (DaYun,
// SJG-ALGO-07). Reuses the shared NatalReadiness reason codes (i18n headlines +
// severities) rather than inventing parallel ones.

import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import { DEFAULT_METHOD_PROFILE_ID } from '../../../domain/algorithm.ts';
import { subjectNatalReadiness, type NatalReadiness } from '../../subjects/natal-readiness.ts';
import { getMethodEngine } from '../../astrology/engines/registry.ts';
import {
  mingJingRouteFailCloseDetail,
  validateMingJingRouteSupport,
} from '../../astrology/mingjing-route-support.ts';

export function mingJingReadiness(space: ShiJingSpace): NatalReadiness {
  const base = subjectNatalReadiness('self', space);
  if (!base.ok) return base;

  const routeSupport = validateMingJingRouteSupport({
    method_profile_id: space.settings.method_profile_id,
    feature_id: 'natal_projection',
  });
  if (!routeSupport.ok) {
    return {
      ok: false,
      reason: 'mingjing_route_unavailable',
      detail: mingJingRouteFailCloseDetail(routeSupport.error),
    };
  }

  if (base.inputs.birth_precision !== 'exact') {
    return {
      ok: false,
      reason: 'birth_time_required_for_method',
      detail: 'mingjing_requires_exact_birth_time',
    };
  }
  const methodId = space.settings.method_profile_id ?? DEFAULT_METHOD_PROFILE_ID;
  const capabilities = getMethodEngine(methodId)?.capabilities;
  if (capabilities?.requires_calculation_sex !== false && base.inputs.calculation_sex === 'unspecified') {
    return {
      ok: false,
      reason: 'calculation_sex_unspecified_for_dayun',
      detail: `mingjing_requires_calculation_sex:${methodId}`,
    };
  }
  return base;
}
