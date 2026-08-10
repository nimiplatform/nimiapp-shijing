import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import { hasCompletedMingJingStartupIntake } from '../../onboarding/startup-intake.ts';

export { hasCompletedMingJingStartupIntake } from '../../onboarding/startup-intake.ts';

export interface MingJingStartupGuideDecisionInput {
  readonly startupGuideDismissed: boolean;
}

export function initialMingJingStartupGuideDismissed(space: ShiJingSpace): boolean {
  return hasCompletedMingJingStartupIntake(space);
}

export function shouldShowMingJingStartupGuide(
  input: MingJingStartupGuideDecisionInput,
): boolean {
  return !input.startupGuideDismissed;
}
