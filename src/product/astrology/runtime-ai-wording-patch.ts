// SJG-ALGO-13 - Runtime AI wording patch.

import type { MirrorKind } from '../../domain/mirror-scope.ts';
import { RuntimeAiOutputValidationError, type RuntimeAiParseFailure } from './runtime-ai-parse.ts';
import { validateMingjingPatch } from './runtime-ai-wording/validate-mingjing-patches.ts';
import { validateNianjingPatch, validateRijingPatch, validateShijingPatch, validateYuejingPatch } from './runtime-ai-wording/validate-time-patches.ts';
import { isRecord } from './runtime-ai-wording/validation-helpers.ts';
import { RUNTIME_AI_WORDING_PATCH_KIND, RuntimeAiWordingPatchValidationError, type RuntimeAiWordingPatch } from './runtime-ai-wording/types.ts';

export { applyRuntimeAiWordingPatch } from './runtime-ai-wording/apply-wording-patch.ts';
export { RUNTIME_AI_WORDING_PATCH_KIND, RuntimeAiWordingPatchValidationError } from './runtime-ai-wording/types.ts';
export type {
  MingJingRelationshipPracticePatch,
  MingJingRelationshipStructurePatch,
  MingJingRelationshipTimingWindowPatch,
  MingJingRelationshipWordingPatch,
  MingJingWordingCorePatch,
  MingJingWordingPatch,
  MingJingWordingStrategyPatch,
  MingJingZiweiDecadeGuidancePatch,
  MingJingZiweiNatalWordingPatch,
  MingJingZiweiProfilePatch,
  NianJingWordingInflectionPatch,
  NianJingWordingPatch,
  NianJingWordingPhasePatch,
  RiJingWordingPatch,
  RiJingWordingProjectionPatch,
  RuntimeAiWordingPatch,
  ShiJingWordingPatch,
  YueJingWordingCellPatch,
  YueJingWordingPatch,
} from './runtime-ai-wording/types.ts';

export function validateRuntimeAiWordingPatchValue(
  expectedKind: MirrorKind,
  value: unknown,
): RuntimeAiWordingPatch {
  if (!isRecord(value)) {
    throw new RuntimeAiOutputValidationError({ kind: 'invalid_json', detail: 'not an object' });
  }
  if (value.patch_kind !== RUNTIME_AI_WORDING_PATCH_KIND) {
    throw new RuntimeAiWordingPatchValidationError('patch_kind_invalid');
  }
  if (value.mirror_kind !== expectedKind) {
    throw new RuntimeAiOutputValidationError({
      kind: 'mirror_kind_mismatch',
      expected: expectedKind,
      received: value.mirror_kind,
    });
  }
  switch (expectedKind) {
    case 'rijing':
      return validateRijingPatch(value);
    case 'yuejing':
      return validateYuejingPatch(value);
    case 'nianjing':
      return validateNianjingPatch(value);
    case 'mingjing':
      return validateMingjingPatch(value);
    case 'shijing':
      return validateShijingPatch(value);
  }
}

export function wordingPatchValidationFailure(detail: string): RuntimeAiParseFailure {
  return { kind: 'validation_failed', detail };
}
