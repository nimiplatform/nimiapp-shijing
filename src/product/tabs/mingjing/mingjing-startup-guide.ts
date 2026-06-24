import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import { hasCompletedMingJingStartupIntake } from '../../onboarding/startup-intake.ts';

export { hasCompletedMingJingStartupIntake } from '../../onboarding/startup-intake.ts';

export interface MingJingStartupGuideDecisionInput {
  readonly space: ShiJingSpace;
  readonly startupGuideDismissed: boolean;
}

export function shouldShowMingJingStartupGuide(
  input: MingJingStartupGuideDecisionInput,
): boolean {
  if (input.startupGuideDismissed) return false;
  return !hasCompletedMingJingStartupIntake(input.space);
}
