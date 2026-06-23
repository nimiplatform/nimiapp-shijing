import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import { isScaffoldNatalInputs } from '../../subjects/scaffold-natal-inputs.ts';

export interface MingJingStartupGuideDecisionInput {
  readonly space: ShiJingSpace;
  readonly startupGuideDismissed: boolean;
}

export function hasCompletedMingJingStartupIntake(space: ShiJingSpace): boolean {
  return (
    !isScaffoldNatalInputs(space.self_subject.natal_inputs) &&
    space.concern_tags.length > 0
  );
}

export function shouldShowMingJingStartupGuide(
  input: MingJingStartupGuideDecisionInput,
): boolean {
  if (input.startupGuideDismissed) return false;
  return !hasCompletedMingJingStartupIntake(input.space);
}
