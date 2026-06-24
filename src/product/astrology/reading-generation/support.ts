import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { evaluateMirrorKindScope, validateMirrorScope } from '../../../contracts/mirror-scope-validator.ts';
import {
  methodFeatureFailCloseDetail,
  methodFeatureIdForMirror,
  validateMethodFeatureSupport,
} from '../method-feature-support.ts';
import {
  mingJingRouteFailCloseDetail,
  mingJingRouteFeatureIdForScope,
  validateMingJingRouteSupport,
} from '../mingjing-route-support.ts';
import type { GenerateReadingInput } from './types.ts';

function validateGenerationScopePairing(input: GenerateReadingInput): ReadingGenerationFailure | null {
  const scopeCheck = validateMirrorScope(input.mirror_scope);
  if (!scopeCheck.ok) {
    return {
      kind: 'validation_failed',
      mirror_kind: input.mirror_kind,
      mirror_scope: input.mirror_scope,
      stage: 'orchestrator',
      detail: `mirror_scope_invalid:${scopeCheck.error.code}`,
    };
  }
  if (evaluateMirrorKindScope(input.mirror_kind, input.mirror_scope) === 'forbidden') {
    return {
      kind: 'validation_failed',
      mirror_kind: input.mirror_kind,
      mirror_scope: input.mirror_scope,
      stage: 'orchestrator',
      detail: `mirror_kind_scope_forbidden:${input.mirror_kind}:${input.mirror_scope.kind}`,
    };
  }
  return null;
}

function validateMingJingRouteGate(input: GenerateReadingInput): ReadingGenerationFailure | null {
  const routeFeatureId = mingJingRouteFeatureIdForScope(input.mirror_scope);
  if (!routeFeatureId) {
    return {
      kind: 'validation_failed',
      mirror_kind: input.mirror_kind,
      mirror_scope: input.mirror_scope,
      stage: 'mingjing_route_support',
      detail: `mingjing_route_feature_not_declared:${input.mirror_scope.kind}`,
    };
  }
  const routeSupport = validateMingJingRouteSupport({
    method_profile_id: input.space.settings.method_profile_id,
    feature_id: routeFeatureId,
  });
  if (!routeSupport.ok) {
    return {
      kind: 'algorithm_fail_closed',
      mirror_kind: input.mirror_kind,
      mirror_scope: input.mirror_scope,
      stage: 'mingjing_route_support',
      detail: mingJingRouteFailCloseDetail(routeSupport.error),
    };
  }
  return null;
}

function validateMethodFeatureGate(input: GenerateReadingInput): ReadingGenerationFailure | null {
  const methodFeatureId = methodFeatureIdForMirror(input.mirror_kind, input.mirror_scope);
  if (!methodFeatureId) {
    return {
      kind: 'validation_failed',
      mirror_kind: input.mirror_kind,
      mirror_scope: input.mirror_scope,
      stage: 'method_feature_support',
      detail: `method_feature_not_declared:${input.mirror_kind}:${input.mirror_scope.kind}`,
    };
  }
  const methodFeatureSupport = validateMethodFeatureSupport({
    method_profile_id: input.space.settings.method_profile_id,
    feature_id: methodFeatureId,
  });
  if (!methodFeatureSupport.ok) {
    return {
      kind: 'algorithm_fail_closed',
      mirror_kind: input.mirror_kind,
      mirror_scope: input.mirror_scope,
      stage: 'method_feature_support',
      detail: methodFeatureFailCloseDetail(methodFeatureSupport.error),
    };
  }
  return null;
}

export function validateGenerationGates(input: GenerateReadingInput): ReadingGenerationFailure | null {
  const scopePairingFailure = validateGenerationScopePairing(input);
  if (scopePairingFailure) return scopePairingFailure;
  if (input.mirror_kind === 'mingjing') return validateMingJingRouteGate(input);
  return validateMethodFeatureGate(input);
}
