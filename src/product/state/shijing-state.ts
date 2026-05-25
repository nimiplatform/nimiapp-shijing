// Wave-1 in-memory store for the renderer shell. Pure TS reducer with no
// React coupling so it is unit-testable from `node --test` directly. The
// snapshot is validated through wave-0 `validateShiJingSpace`; rejection
// surfaces as a typed error state, never as silent fail-open.

import type { ShijingSpaceValidationError, ShijingSpaceValidationResult } from '../../contracts/shijing-space-validator.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { subjectRefEquals } from '../../domain/subject-ref.ts';
import type { ShijingTabId } from '../../contracts/ia-contract.ts';
import { SHIJING_IA_TABS } from '../../contracts/ia-contract.ts';

export const ALL_TAB_IDS: readonly ShijingTabId[] = SHIJING_IA_TABS.map((tab) => tab.id);

export type SnapshotStatus =
  | { kind: 'valid' }
  | { kind: 'invalid'; error: ShijingSpaceValidationError };

export interface ShijingViewState {
  readonly active_tab: ShijingTabId;
  readonly observation_target: SubjectRef;
  readonly snapshot: ShiJingSpace;
  readonly snapshot_status: SnapshotStatus;
}

export type ShijingAction =
  | { type: 'tab/activate'; tab: ShijingTabId }
  | { type: 'observation/set'; target: SubjectRef }
  | { type: 'snapshot/replace'; snapshot: ShiJingSpace };

function snapshotStatusFor(snapshot: ShiJingSpace): SnapshotStatus {
  const result: ShijingSpaceValidationResult = validateShiJingSpace(snapshot);
  if (result.ok) return { kind: 'valid' };
  return { kind: 'invalid', error: result.error };
}

export function createInitialState(snapshot: ShiJingSpace, defaultTarget: SubjectRef = 'self'): ShijingViewState {
  return {
    active_tab: SHIJING_IA_TABS[0]!.id,
    observation_target: defaultTarget,
    snapshot,
    snapshot_status: snapshotStatusFor(snapshot),
  };
}

export function shijingReducer(state: ShijingViewState, action: ShijingAction): ShijingViewState {
  switch (action.type) {
    case 'tab/activate':
      if (!ALL_TAB_IDS.includes(action.tab)) return state;
      if (state.active_tab === action.tab) return state;
      return { ...state, active_tab: action.tab };
    case 'observation/set':
      if (subjectRefEquals(state.observation_target, action.target)) return state;
      return { ...state, observation_target: action.target };
    case 'snapshot/replace':
      return {
        ...state,
        snapshot: action.snapshot,
        snapshot_status: snapshotStatusFor(action.snapshot),
      };
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}
