// Wave-9 — pure-TS View draft state machine. Captures every SJG-DATA-06
// field. anchor membership in subjects[] is enforced at submit time by
// the wave-0 validateView gate; the reducer keeps the discriminated
// time_scope branch consistent by auto-clearing the non-applicable
// fields.

import type { DisplayState, TimeScope, View, ViewMemory } from '../../domain/view.ts';
import { DISPLAY_STATES, TIME_SCOPES } from '../../domain/view.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { subjectRefEquals, subjectRefKey } from '../../domain/subject-ref.ts';

export interface ViewDraft {
  readonly id: string | null;
  readonly title: string;
  readonly anchor_key: string;
  readonly selected_subject_keys: readonly string[];
  readonly time_scope: TimeScope;
  readonly bounded_start_utc: string;
  readonly bounded_end_utc: string;
  readonly rolling_window_days_text: string;
  readonly instructions: string;
  readonly memory_summary: string;
  readonly memory_locked: boolean | null;
  readonly display_state: DisplayState;
}

export interface ViewTemplateApplyPayload {
  readonly title: string;
  readonly default_time_scope: TimeScope;
  readonly default_instructions: string;
}

export type ViewDraftAction =
  | { type: 'reset' }
  | { type: 'hydrate'; view: View }
  | { type: 'assign_id'; id: string }
  | { type: 'apply_template'; template: ViewTemplateApplyPayload }
  | { type: 'set_title'; value: string }
  | { type: 'set_anchor_key'; value: string }
  | { type: 'toggle_subject_key'; value: string }
  | { type: 'set_time_scope'; value: TimeScope }
  | { type: 'set_bounded_start_utc'; value: string }
  | { type: 'set_bounded_end_utc'; value: string }
  | { type: 'set_rolling_window_days_text'; value: string }
  | { type: 'set_instructions'; value: string }
  | { type: 'set_memory_summary'; value: string }
  | { type: 'set_memory_locked'; value: boolean }
  | { type: 'set_display_state'; value: DisplayState };

export function createEmptyViewDraft(): ViewDraft {
  return {
    id: null,
    title: '',
    anchor_key: '',
    selected_subject_keys: [],
    time_scope: 'open_ended',
    bounded_start_utc: '',
    bounded_end_utc: '',
    rolling_window_days_text: '',
    instructions: '',
    memory_summary: '',
    memory_locked: null,
    display_state: 'normal',
  };
}

function clearBranchFields(state: ViewDraft, next: TimeScope): ViewDraft {
  if (next === 'bounded') {
    return { ...state, time_scope: next, rolling_window_days_text: '' };
  }
  if (next === 'rolling') {
    return { ...state, time_scope: next, bounded_start_utc: '', bounded_end_utc: '' };
  }
  return { ...state, time_scope: next, bounded_start_utc: '', bounded_end_utc: '', rolling_window_days_text: '' };
}

function ensureAnchorIncluded(state: ViewDraft): ViewDraft {
  if (state.anchor_key.length === 0) return state;
  if (state.selected_subject_keys.includes(state.anchor_key)) return state;
  return { ...state, selected_subject_keys: [state.anchor_key, ...state.selected_subject_keys] };
}

function hydrateFromView(view: View): ViewDraft {
  const anchorKey = subjectRefKey(view.anchor_subject);
  const subjectKeys = view.subjects.map(subjectRefKey);
  return {
    id: view.id,
    title: view.title,
    anchor_key: anchorKey,
    selected_subject_keys: subjectKeys,
    time_scope: view.time_scope,
    bounded_start_utc: view.bounded_range?.start ?? '',
    bounded_end_utc: view.bounded_range?.end ?? '',
    rolling_window_days_text: view.rolling_window_days !== undefined ? String(view.rolling_window_days) : '',
    instructions: view.instructions,
    memory_summary: view.view_memory.summary,
    memory_locked: view.view_memory.locked,
    display_state: view.display_state,
  };
}

export function viewDraftReducer(state: ViewDraft, action: ViewDraftAction): ViewDraft {
  switch (action.type) {
    case 'reset':
      return createEmptyViewDraft();
    case 'hydrate':
      return hydrateFromView(action.view);
    case 'assign_id':
      return { ...state, id: action.id };
    case 'apply_template': {
      const next: ViewDraft = clearBranchFields(
        {
          ...state,
          title: action.template.title,
          instructions: action.template.default_instructions,
        },
        action.template.default_time_scope,
      );
      return next;
    }
    case 'set_title':
      return { ...state, title: action.value };
    case 'set_anchor_key': {
      const next: ViewDraft = { ...state, anchor_key: action.value };
      return ensureAnchorIncluded(next);
    }
    case 'toggle_subject_key': {
      // The anchor is always included; ignore toggle on the anchor key
      if (action.value === state.anchor_key) return state;
      const has = state.selected_subject_keys.includes(action.value);
      const nextKeys = has
        ? state.selected_subject_keys.filter((key) => key !== action.value)
        : [...state.selected_subject_keys, action.value];
      return { ...state, selected_subject_keys: nextKeys };
    }
    case 'set_time_scope':
      if (!TIME_SCOPES.includes(action.value)) return state;
      return clearBranchFields(state, action.value);
    case 'set_bounded_start_utc':
      return state.time_scope === 'bounded' ? { ...state, bounded_start_utc: action.value } : state;
    case 'set_bounded_end_utc':
      return state.time_scope === 'bounded' ? { ...state, bounded_end_utc: action.value } : state;
    case 'set_rolling_window_days_text':
      return state.time_scope === 'rolling' ? { ...state, rolling_window_days_text: action.value } : state;
    case 'set_instructions':
      return { ...state, instructions: action.value };
    case 'set_memory_summary':
      return { ...state, memory_summary: action.value };
    case 'set_memory_locked':
      return { ...state, memory_locked: action.value };
    case 'set_display_state':
      if (!DISPLAY_STATES.includes(action.value)) return state;
      return { ...state, display_state: action.value };
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

export type ViewDraftValidationError =
  | { code: 'view_id_missing' }
  | { code: 'view_title_empty' }
  | { code: 'view_anchor_missing' }
  | { code: 'view_memory_locked_unspecified' }
  | { code: 'view_bounded_start_or_end_missing' }
  | { code: 'view_rolling_window_days_not_positive_integer' };

export type ViewDraftValidationOutcome =
  | { ok: true }
  | { ok: false; error: ViewDraftValidationError };

function parseInteger(text: string): number | null {
  const value = Number(text);
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
  return value;
}

export function validateViewDraft(draft: ViewDraft): ViewDraftValidationOutcome {
  if (!draft.id || draft.id.length === 0) return { ok: false, error: { code: 'view_id_missing' } };
  if (draft.title.trim().length === 0) return { ok: false, error: { code: 'view_title_empty' } };
  if (draft.anchor_key.length === 0) return { ok: false, error: { code: 'view_anchor_missing' } };
  if (draft.memory_locked === null) return { ok: false, error: { code: 'view_memory_locked_unspecified' } };
  if (draft.time_scope === 'bounded') {
    if (draft.bounded_start_utc.length === 0 || draft.bounded_end_utc.length === 0) {
      return { ok: false, error: { code: 'view_bounded_start_or_end_missing' } };
    }
  }
  if (draft.time_scope === 'rolling') {
    const days = parseInteger(draft.rolling_window_days_text);
    if (days === null || days <= 0) {
      return { ok: false, error: { code: 'view_rolling_window_days_not_positive_integer' } };
    }
  }
  return { ok: true };
}

export interface BuildViewFromDraftInputs {
  readonly anchor: SubjectRef;
  readonly subjects: readonly SubjectRef[];
}

export function buildViewFromDraft(draft: ViewDraft, refs: BuildViewFromDraftInputs): View {
  if (!draft.id) throw new Error('View.id must be assigned before building a View');
  if (draft.memory_locked === null) throw new Error('view_memory.locked must be chosen before building a View');
  const memory: ViewMemory = {
    summary: draft.memory_summary,
    updated_at: new Date().toISOString(),
    locked: draft.memory_locked,
  };
  const anchorIncluded = refs.subjects.some((subject) => subjectRefEquals(subject, refs.anchor));
  const subjects = anchorIncluded ? refs.subjects : [refs.anchor, ...refs.subjects];
  const base: View = {
    id: draft.id,
    title: draft.title,
    anchor_subject: refs.anchor,
    subjects,
    time_scope: draft.time_scope,
    context_items: [],
    instructions: draft.instructions,
    view_memory: memory,
    display_state: draft.display_state,
  };
  if (draft.time_scope === 'bounded') {
    return { ...base, bounded_range: { start: draft.bounded_start_utc, end: draft.bounded_end_utc } };
  }
  if (draft.time_scope === 'rolling') {
    const days = Number(draft.rolling_window_days_text);
    return { ...base, rolling_window_days: days };
  }
  return base;
}
