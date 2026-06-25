// W04 + W-c04 — pure in-memory store for the renderer shell.
//
// Snapshot is validated through `validateShiJingSpace`; rejection
// surfaces as a typed `snapshot_status: invalid` state, never silent
// fail-open.
//
// W-c04 added `pending_shijing_source_reading_ids`: a state-only
// (NOT persisted) staging list of Reading ids that mirror tabs push
// when the user clicks "导入到问镜咨询". The ShiJing tab reads this
// list to seed the consultation's source readings instead of the
// previous globalThis bus.

import type {
  ShijingSpaceValidationError,
  ShijingSpaceValidationResult,
} from '../../contracts/shijing-space-validator.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import {
  SHIJING_IA_TABS,
  type ShijingTabId,
} from '../../contracts/ia-contract.ts';
import { defaultPrimaryTabForSpace } from '../onboarding/startup-intake.ts';

export const ALL_TAB_IDS: readonly ShijingTabId[] = SHIJING_IA_TABS.map((tab) => tab.id);

export type SnapshotStatus =
  | { kind: 'valid' }
  | { kind: 'invalid'; error: ShijingSpaceValidationError };

export interface ShijingViewState {
  readonly active_tab: ShijingTabId;
  readonly active_tab_selection: 'default' | 'user';
  readonly snapshot: ShiJingSpace;
  readonly snapshot_status: SnapshotStatus;
  readonly pending_shijing_source_reading_ids: readonly string[];
  // State-only (NOT persisted) staging lists of record ids that a
  // mirror tab pushes when the user clicks "去问镜问这条". The ShiJing
  // consultation reads these to seed `cited_event_memory_refs` /
  // `cited_plan_item_refs` so the next question is grounded on those
  // specific records — past events (EventMemory) and forward-looking
  // plans (PlanItem) alike.
  readonly pending_shijing_seed_memory_ids: readonly string[];
  readonly pending_shijing_seed_plan_ids: readonly string[];
}

export type ShijingAction =
  | { type: 'tab/activate'; tab: ShijingTabId }
  | {
      type: 'snapshot/replace';
      snapshot: ShiJingSpace;
      default_tab_policy?: 'derive' | 'preserve';
    }
  | { type: 'shijing/import-source-reading'; reading_id: string }
  | { type: 'shijing/clear-import-bus' }
  | { type: 'shijing/remove-source-reading'; reading_id: string }
  | { type: 'shijing/seed-memory'; memory_id: string }
  | { type: 'shijing/clear-seed-memory'; memory_id?: string }
  | { type: 'shijing/seed-plan'; plan_id: string }
  | { type: 'shijing/clear-seed-plan'; plan_id?: string };

function snapshotStatusFor(snapshot: ShiJingSpace): SnapshotStatus {
  const result: ShijingSpaceValidationResult = validateShiJingSpace(snapshot);
  if (result.ok) return { kind: 'valid' };
  return { kind: 'invalid', error: result.error };
}

export function createInitialState(snapshot: ShiJingSpace): ShijingViewState {
  return {
    active_tab: defaultPrimaryTabForSpace(snapshot),
    active_tab_selection: 'default',
    snapshot,
    snapshot_status: snapshotStatusFor(snapshot),
    pending_shijing_source_reading_ids: [],
    pending_shijing_seed_memory_ids: [],
    pending_shijing_seed_plan_ids: [],
  };
}

export function shijingReducer(state: ShijingViewState, action: ShijingAction): ShijingViewState {
  switch (action.type) {
    case 'tab/activate':
      if (!ALL_TAB_IDS.includes(action.tab)) return state;
      if (state.active_tab === action.tab && state.active_tab_selection === 'user') return state;
      return { ...state, active_tab: action.tab, active_tab_selection: 'user' };
    case 'snapshot/replace':
      return {
        ...state,
        active_tab:
          action.default_tab_policy === 'derive' && state.active_tab_selection === 'default'
            ? defaultPrimaryTabForSpace(action.snapshot)
            : state.active_tab,
        snapshot: action.snapshot,
        snapshot_status: snapshotStatusFor(action.snapshot),
        // If a pending source reading was deleted from the snapshot,
        // drop it from the pending bus so the ShiJing tab never tries
        // to cite a non-existent id.
        pending_shijing_source_reading_ids: state.pending_shijing_source_reading_ids.filter(
          (id) => action.snapshot.readings.some((r) => r.id === id),
        ),
        // Likewise drop seed ids whose EventMemory / PlanItem was
        // deleted (e.g. via the YueJing day-panel 🗑) so the
        // consultation never seeds a non-existent record.
        pending_shijing_seed_memory_ids: state.pending_shijing_seed_memory_ids.filter(
          (id) => action.snapshot.event_memories.some((m) => m.id === id),
        ),
        pending_shijing_seed_plan_ids: state.pending_shijing_seed_plan_ids.filter(
          (id) => action.snapshot.plan_items.some((p) => p.id === id),
        ),
      };
    case 'shijing/import-source-reading': {
      if (state.pending_shijing_source_reading_ids.includes(action.reading_id)) return state;
      if (!state.snapshot.readings.some((r) => r.id === action.reading_id)) return state;
      return {
        ...state,
        pending_shijing_source_reading_ids: [
          ...state.pending_shijing_source_reading_ids,
          action.reading_id,
        ],
      };
    }
    case 'shijing/remove-source-reading':
      return {
        ...state,
        pending_shijing_source_reading_ids: state.pending_shijing_source_reading_ids.filter(
          (id) => id !== action.reading_id,
        ),
      };
    case 'shijing/clear-import-bus':
      if (state.pending_shijing_source_reading_ids.length === 0) return state;
      return { ...state, pending_shijing_source_reading_ids: [] };
    case 'shijing/seed-memory': {
      if (state.pending_shijing_seed_memory_ids.includes(action.memory_id)) return state;
      if (!state.snapshot.event_memories.some((m) => m.id === action.memory_id)) return state;
      return {
        ...state,
        pending_shijing_seed_memory_ids: [
          ...state.pending_shijing_seed_memory_ids,
          action.memory_id,
        ],
      };
    }
    case 'shijing/clear-seed-memory':
      if (action.memory_id === undefined) {
        if (state.pending_shijing_seed_memory_ids.length === 0) return state;
        return { ...state, pending_shijing_seed_memory_ids: [] };
      }
      return {
        ...state,
        pending_shijing_seed_memory_ids: state.pending_shijing_seed_memory_ids.filter(
          (id) => id !== action.memory_id,
        ),
      };
    case 'shijing/seed-plan': {
      if (state.pending_shijing_seed_plan_ids.includes(action.plan_id)) return state;
      if (!state.snapshot.plan_items.some((p) => p.id === action.plan_id)) return state;
      return {
        ...state,
        pending_shijing_seed_plan_ids: [
          ...state.pending_shijing_seed_plan_ids,
          action.plan_id,
        ],
      };
    }
    case 'shijing/clear-seed-plan':
      if (action.plan_id === undefined) {
        if (state.pending_shijing_seed_plan_ids.length === 0) return state;
        return { ...state, pending_shijing_seed_plan_ids: [] };
      }
      return {
        ...state,
        pending_shijing_seed_plan_ids: state.pending_shijing_seed_plan_ids.filter(
          (id) => id !== action.plan_id,
        ),
      };
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}
