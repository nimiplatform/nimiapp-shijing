import type { ShijingTabId } from '../../contracts/ia-contract.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { isScaffoldNatalInputs } from '../subjects/scaffold-natal-inputs.ts';

export function hasCompletedMingJingStartupIntake(space: ShiJingSpace): boolean {
  return (
    !isScaffoldNatalInputs(space.self_subject.natal_inputs) &&
    space.concern_tags.length > 0
  );
}

export function defaultPrimaryTabForSpace(space: ShiJingSpace): ShijingTabId {
  return hasCompletedMingJingStartupIntake(space) ? 'rijing' : 'mingjing';
}

// Soft intake gate (rule.shijing.ia.r005): before the first self + concern
// intake completes, the five non-mingjing mirrors stay navigable but their
// content area shows the intake guide with a recovery route to 命镜 instead
// of mirror content. 命镜 itself hosts the intake (startup guide), so it is
// never gated.
export function shouldGatePrimaryTabForIntake(space: ShiJingSpace, tab: ShijingTabId): boolean {
  return tab !== 'mingjing' && !hasCompletedMingJingStartupIntake(space);
}
