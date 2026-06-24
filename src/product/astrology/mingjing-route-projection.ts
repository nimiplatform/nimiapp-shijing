// SJG-ALGO-18 - MingJing method-routed projection boundary.
//
// The route shell consumes this union instead of forcing every method through
// the BaZi-specific MingJingChart projection.

import type {
  AstrologyFeatureSnapshot,
  ZiweiSubjectChart,
} from '../../domain/algorithm.ts';
import type { NatalMirrorScope } from '../../domain/mirror-scope.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { MingJingChart } from '../../domain/mingjing.ts';
import { buildAstrologyFeatureSnapshot } from './build-feature-snapshot.ts';
import { buildMingJingProjection } from './mingjing-projection.ts';
import {
  mingJingRouteFailCloseDetail,
  validateMingJingRouteSupport,
} from './mingjing-route-support.ts';
import type { StageResult } from './stage-result.ts';

export type MingJingRouteProjection =
  | {
      readonly kind: 'bazi_ziping_v1';
      readonly route_id: 'mingjing.route.bazi_ziping_v1';
      readonly chart: MingJingChart;
    }
  | {
      readonly kind: 'ziwei_sanhe_v1';
      readonly route_id: 'mingjing.route.ziwei_sanhe_v1';
      readonly chart: ZiweiSubjectChart;
      readonly feature_snapshot: AstrologyFeatureSnapshot;
      readonly mirror_scope: NatalMirrorScope;
    };

function defaultBasisTimeZone(space: ShiJingSpace): string {
  return space.self_subject.natal_inputs.birth_location?.iana_time_zone ?? 'Asia/Shanghai';
}

function natalScopeForProjection(input: {
  readonly space: ShiJingSpace;
  readonly reference_year?: number;
  readonly basis_time_zone?: string;
}): NatalMirrorScope {
  return {
    kind: 'natal',
    anchor_year: input.reference_year ?? new Date().getUTCFullYear(),
    basis_time_zone: input.basis_time_zone ?? defaultBasisTimeZone(input.space),
  };
}

export function buildMingJingRouteProjection(input: {
  readonly space: ShiJingSpace;
  readonly reference_year?: number;
  readonly basis_time_zone?: string;
}): StageResult<MingJingRouteProjection> {
  const support = validateMingJingRouteSupport({
    method_profile_id: input.space.settings.method_profile_id,
    feature_id: 'natal_projection',
  });
  if (!support.ok) {
    return {
      ok: false,
      error: {
        stage: 'mingjing_route_support',
        kind: 'stage_invalid_input',
        subject_ref: 'self',
        detail: mingJingRouteFailCloseDetail(support.error),
      },
    };
  }

  if (support.route.id === 'mingjing.route.bazi_ziping_v1') {
    const chart = buildMingJingProjection({
      space: input.space,
      reference_year: input.reference_year,
    });
    if (!chart.ok) return chart;
    return {
      ok: true,
      value: {
        kind: 'bazi_ziping_v1',
        route_id: support.route.id,
        chart: chart.value,
      },
    };
  }

  const scope = natalScopeForProjection(input);
  const snapshot = buildAstrologyFeatureSnapshot({
    mirror_kind: 'mingjing',
    mirror_scope: scope,
    space: input.space,
    related_person_refs: [],
    active_concern_tags: [],
    method_profile_id: support.route.method_profile_id,
  });
  if (!snapshot.ok) return snapshot;
  if (snapshot.value.method_evidence.method_id !== 'ziwei_sanhe_v1') {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_invalid_input',
        subject_ref: 'self',
        detail: `Ziwei MingJing route received ${snapshot.value.method_evidence.method_id} evidence`,
      },
    };
  }

  return {
    ok: true,
    value: {
      kind: 'ziwei_sanhe_v1',
      route_id: support.route.id,
      chart: snapshot.value.method_evidence.ziwei.self_subject,
      feature_snapshot: snapshot.value,
      mirror_scope: scope,
    },
  };
}
