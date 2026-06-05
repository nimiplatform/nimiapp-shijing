// Settings > 推演方法 (命理算法) — pure-state helper. Selects the active
// MethodProfile for new Reading generation (SJG-ALGO-01/02). Existing Readings
// keep their own method, so the two engines stay comparable side by side.

import {
  DEFAULT_METHOD_PROFILE_ID,
  isAdmittedMethodProfileId,
  type MethodProfileId,
} from '../../domain/algorithm.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';

export function commitMethodProfile(space: ShiJingSpace, methodId: MethodProfileId): ShiJingSpace {
  const id = isAdmittedMethodProfileId(methodId) ? methodId : DEFAULT_METHOD_PROFILE_ID;
  return {
    ...space,
    settings: { ...space.settings, method_profile_id: id },
  };
}
