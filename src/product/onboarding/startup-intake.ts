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
