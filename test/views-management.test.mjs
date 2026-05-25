// Wave-9 — View draft reducer + validate + id factory + dangling
// reference detector + structural assertions on the views UI tree.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

import {
  buildViewFromDraft,
  createEmptyViewDraft,
  validateViewDraft,
  viewDraftReducer,
} from '../src/product/views/view-form-state.ts';
import { newViewId } from '../src/product/views/view-id.ts';
import { buildSubjectRoster, findRosterEntry } from '../src/product/views/subject-roster.ts';
import { findReferencesToView } from '../src/product/views/view-dangling-reference.ts';
import { validateView } from '../src/contracts/view-validator.ts';
import { validNatalInputs, validShiJingSpace } from './_fixtures.mjs';

function readyDraft() {
  let state = viewDraftReducer(createEmptyViewDraft(), { type: 'assign_id', id: 'v_01' });
  state = viewDraftReducer(state, { type: 'set_title', value: 'My View' });
  state = viewDraftReducer(state, { type: 'set_anchor_key', value: 'self' });
  state = viewDraftReducer(state, { type: 'set_memory_locked', value: false });
  return state;
}

test('empty View draft has no anchor and unspecified memory_locked', () => {
  const draft = createEmptyViewDraft();
  assert.equal(draft.anchor_key, '');
  assert.equal(draft.memory_locked, null);
  assert.equal(draft.time_scope, 'open_ended');
});

test('setting anchor auto-includes anchor key in subjects', () => {
  let state = viewDraftReducer(createEmptyViewDraft(), { type: 'set_anchor_key', value: 'self' });
  assert.deepEqual(state.selected_subject_keys, ['self']);
});

test('toggle_subject on anchor is a no-op', () => {
  let state = viewDraftReducer(createEmptyViewDraft(), { type: 'set_anchor_key', value: 'self' });
  state = viewDraftReducer(state, { type: 'toggle_subject_key', value: 'self' });
  assert.deepEqual(state.selected_subject_keys, ['self']);
});

test('switching time_scope clears non-applicable branch fields', () => {
  let state = viewDraftReducer(createEmptyViewDraft(), { type: 'set_time_scope', value: 'bounded' });
  state = viewDraftReducer(state, { type: 'set_bounded_start_utc', value: '2026-05-25T00:00:00Z' });
  state = viewDraftReducer(state, { type: 'set_bounded_end_utc', value: '2026-05-26T00:00:00Z' });
  state = viewDraftReducer(state, { type: 'set_time_scope', value: 'rolling' });
  assert.equal(state.bounded_start_utc, '');
  assert.equal(state.bounded_end_utc, '');
  state = viewDraftReducer(state, { type: 'set_rolling_window_days_text', value: '30' });
  state = viewDraftReducer(state, { type: 'set_time_scope', value: 'open_ended' });
  assert.equal(state.rolling_window_days_text, '');
});

test('validateViewDraft rejects each missing field', () => {
  let state = createEmptyViewDraft();
  assert.equal(validateViewDraft(state).ok, false);
  state = viewDraftReducer(state, { type: 'assign_id', id: 'v_01' });
  assert.equal(validateViewDraft(state).error.code, 'view_title_empty');
  state = viewDraftReducer(state, { type: 'set_title', value: 'T' });
  assert.equal(validateViewDraft(state).error.code, 'view_anchor_missing');
  state = viewDraftReducer(state, { type: 'set_anchor_key', value: 'self' });
  assert.equal(validateViewDraft(state).error.code, 'view_memory_locked_unspecified');
  state = viewDraftReducer(state, { type: 'set_memory_locked', value: false });
  assert.equal(validateViewDraft(state).ok, true);
});

test('validateViewDraft requires bounded endpoints when time_scope=bounded', () => {
  let state = readyDraft();
  state = viewDraftReducer(state, { type: 'set_time_scope', value: 'bounded' });
  assert.equal(validateViewDraft(state).error.code, 'view_bounded_start_or_end_missing');
  state = viewDraftReducer(state, { type: 'set_bounded_start_utc', value: '2026-05-25T00:00:00Z' });
  state = viewDraftReducer(state, { type: 'set_bounded_end_utc', value: '2026-05-26T00:00:00Z' });
  assert.equal(validateViewDraft(state).ok, true);
});

test('validateViewDraft requires positive integer rolling_window_days when time_scope=rolling', () => {
  let state = readyDraft();
  state = viewDraftReducer(state, { type: 'set_time_scope', value: 'rolling' });
  state = viewDraftReducer(state, { type: 'set_rolling_window_days_text', value: '0' });
  assert.equal(validateViewDraft(state).error.code, 'view_rolling_window_days_not_positive_integer');
  state = viewDraftReducer(state, { type: 'set_rolling_window_days_text', value: '30' });
  assert.equal(validateViewDraft(state).ok, true);
});

test('buildViewFromDraft passes validateView for open_ended', () => {
  const draft = readyDraft();
  const view = buildViewFromDraft(draft, { anchor: 'self', subjects: ['self'] });
  assert.equal(validateView(view).ok, true);
  assert.equal(view.time_scope, 'open_ended');
  assert.equal(view.bounded_range, undefined);
  assert.equal(view.rolling_window_days, undefined);
});

test('buildViewFromDraft passes validateView for bounded', () => {
  let draft = readyDraft();
  draft = viewDraftReducer(draft, { type: 'set_time_scope', value: 'bounded' });
  draft = viewDraftReducer(draft, { type: 'set_bounded_start_utc', value: '2026-05-25T00:00:00Z' });
  draft = viewDraftReducer(draft, { type: 'set_bounded_end_utc', value: '2026-05-26T00:00:00Z' });
  const view = buildViewFromDraft(draft, { anchor: 'self', subjects: ['self'] });
  assert.equal(validateView(view).ok, true);
  assert.equal(view.bounded_range?.start, '2026-05-25T00:00:00Z');
});

test('buildViewFromDraft passes validateView for rolling', () => {
  let draft = readyDraft();
  draft = viewDraftReducer(draft, { type: 'set_time_scope', value: 'rolling' });
  draft = viewDraftReducer(draft, { type: 'set_rolling_window_days_text', value: '14' });
  const view = buildViewFromDraft(draft, { anchor: 'self', subjects: ['self'] });
  assert.equal(validateView(view).ok, true);
  assert.equal(view.rolling_window_days, 14);
});

test('buildViewFromDraft auto-includes anchor in subjects when caller forgot', () => {
  const draft = readyDraft();
  const view = buildViewFromDraft(draft, { anchor: 'self', subjects: [] });
  assert.deepEqual(view.subjects, ['self']);
});

test('subject roster surfaces self + persons', () => {
  const space = validShiJingSpace({
    persons: [
      { id: 'p_01', display_name: 'A', kind: 'person', natal_inputs: validNatalInputs(), consent_state: 'owner_recorded' },
      { id: 'p_02', display_name: 'B', kind: 'person', natal_inputs: validNatalInputs(), consent_state: 'owner_recorded' },
    ],
  });
  const roster = buildSubjectRoster(space);
  assert.equal(roster.length, 3);
  assert.equal(roster[0].key, 'self');
  assert.equal(roster[1].key, 'person:p_01');
  assert.equal(findRosterEntry(roster, 'person:p_02')?.label.startsWith('B'), true);
});

test('view dangling reference detector finds event.view_refs', () => {
  const space = validShiJingSpace({
    views: [
      {
        id: 'v_X',
        title: 'X',
        anchor_subject: 'self',
        subjects: ['self'],
        time_scope: 'open_ended',
        context_items: [],
        instructions: '',
        view_memory: { summary: '', updated_at: '2026-05-25T00:00:00Z', locked: false },
        display_state: 'normal',
      },
    ],
    events: [
      {
        id: 'e_01',
        primary_subject: 'self',
        participants: [],
        occurred_at: '2026-05-25T00:00:00Z',
        title: 't',
        view_refs: ['v_X'],
      },
    ],
  });
  const refs = findReferencesToView(space, 'v_X');
  assert.equal(refs.length, 1);
  assert.equal(refs[0].via, 'event:e_01:view_refs');
});

test('view dangling reference detector returns empty when no references', () => {
  const space = validShiJingSpace();
  const refs = findReferencesToView(space, 'v_missing');
  assert.equal(refs.length, 0);
});

test('newViewId returns unique non-empty strings', () => {
  const a = newViewId();
  const b = newViewId();
  assert.ok(a.length > 0);
  assert.notEqual(a, b);
});

test('views UI source contains no fetch/HTTP/Tauri/Runtime/AI-provider call', () => {
  const dir = new URL('../src/product/views/', import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'));
  const forbidden = [
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /\baxios\b/,
    /\bgrpc\b/,
    /WebSocket/,
    /\binvoke\s*\(/,
    /@tauri-apps/,
    /\bgpt-/i,
    /\bclaude-/i,
    /\bgemini-/i,
    /\bopenai\b/i,
    /\banthropic\b/i,
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} contains forbidden primitive ${pattern}`);
    }
  }
});

test('ViewForm calls validateViewDraft + validateView + validateShiJingSpace before dispatch', () => {
  const source = readFileSync(new URL('../src/product/views/view-form.tsx', import.meta.url), 'utf8');
  const draftIdx = source.indexOf('validateViewDraft(draft)');
  const viewIdx = source.indexOf('validateView(view)');
  const spaceIdx = source.indexOf('validateShiJingSpace(nextSnapshot)');
  const dispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(draftIdx >= 0);
  assert.ok(viewIdx >= 0);
  assert.ok(spaceIdx >= 0);
  assert.ok(draftIdx < dispatchIdx);
  assert.ok(viewIdx < dispatchIdx);
  assert.ok(spaceIdx < dispatchIdx);
});

test('ViewList delete flow checks dangling references AND validateShiJingSpace', () => {
  const source = readFileSync(new URL('../src/product/views/view-list.tsx', import.meta.url), 'utf8');
  const refsIdx = source.indexOf('findReferencesToView');
  const spaceIdx = source.indexOf('validateShiJingSpace');
  const dispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(refsIdx >= 0 && refsIdx < dispatchIdx);
  assert.ok(spaceIdx >= 0 && spaceIdx < dispatchIdx);
});
