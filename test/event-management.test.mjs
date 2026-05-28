// SJG-DATA-05 (data-model-contract.md lines 149-178) — Event draft
// reducer + validator + id factory + dangling-reference detector +
// structural assertions on the Event UI tree.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

import {
  buildEventFromDraft,
  createEmptyEventDraft,
  eventDraftReducer,
  validateEventDraft,
} from '../src/product/events/event-form-state.ts';
import { newEventId } from '../src/product/events/event-id.ts';
import { findReferencesToEvent } from '../src/product/events/event-dangling-reference.ts';
import { validateEvent } from '../src/contracts/event-validator.ts';
import { validNatalInputs, validShiJingSpace } from './_fixtures.mjs';

function readyDraft() {
  let state = eventDraftReducer(createEmptyEventDraft(), { type: 'assign_id', id: 'e_01' });
  state = eventDraftReducer(state, { type: 'set_title', value: 'first event' });
  state = eventDraftReducer(state, { type: 'set_occurred_at_utc', value: '2026-05-25T00:00:00Z' });
  state = eventDraftReducer(state, { type: 'set_primary_subject_key', value: 'self' });
  return state;
}

test('SJG-DATA-05: empty Event draft has no primary subject and empty arrays', () => {
  const draft = createEmptyEventDraft();
  assert.equal(draft.id, null);
  assert.equal(draft.primary_subject_key, '');
  assert.equal(draft.occurred_at_utc, '');
  assert.deepEqual(draft.participant_keys, []);
  assert.deepEqual(draft.view_ref_ids, []);
});

test('SJG-DATA-05: assign_id action sets the id', () => {
  const state = eventDraftReducer(createEmptyEventDraft(), { type: 'assign_id', id: 'e_X' });
  assert.equal(state.id, 'e_X');
});

test('SJG-DATA-05: hydrate populates every field from an Event', () => {
  const event = {
    id: 'e_h',
    primary_subject: { kind: 'person', id: 'p_01' },
    participants: ['self'],
    occurred_at: '2026-05-25T00:00:00Z',
    title: 'h',
    view_refs: ['v_01'],
    recap: 'r',
    notes: 'n',
  };
  const state = eventDraftReducer(createEmptyEventDraft(), { type: 'hydrate', event });
  assert.equal(state.id, 'e_h');
  assert.equal(state.primary_subject_key, 'person:p_01');
  assert.deepEqual(state.participant_keys, ['self']);
  assert.equal(state.occurred_at_utc, '2026-05-25T00:00:00Z');
  assert.equal(state.title, 'h');
  assert.deepEqual(state.view_ref_ids, ['v_01']);
  assert.equal(state.recap, 'r');
  assert.equal(state.notes, 'n');
});

test('SJG-DATA-05: setting primary_subject removes a duplicate participant', () => {
  let state = eventDraftReducer(createEmptyEventDraft(), { type: 'set_primary_subject_key', value: 'self' });
  state = eventDraftReducer(state, { type: 'toggle_participant_key', value: 'person:p_02' });
  // Now switch primary to person:p_02 — that key must be dropped from participants.
  state = eventDraftReducer(state, { type: 'set_primary_subject_key', value: 'person:p_02' });
  assert.equal(state.participant_keys.includes('person:p_02'), false);
});

test('SJG-DATA-05: toggle_participant on primary_subject is a no-op', () => {
  let state = eventDraftReducer(createEmptyEventDraft(), { type: 'set_primary_subject_key', value: 'self' });
  state = eventDraftReducer(state, { type: 'toggle_participant_key', value: 'self' });
  assert.deepEqual(state.participant_keys, []);
});

test('SJG-DATA-05: toggle_view_ref adds and removes ids', () => {
  let state = eventDraftReducer(createEmptyEventDraft(), { type: 'toggle_view_ref_id', value: 'v_01' });
  assert.deepEqual(state.view_ref_ids, ['v_01']);
  state = eventDraftReducer(state, { type: 'toggle_view_ref_id', value: 'v_01' });
  assert.deepEqual(state.view_ref_ids, []);
});

test('SJG-DATA-05: validateEventDraft rejects each missing field', () => {
  let state = createEmptyEventDraft();
  assert.equal(validateEventDraft(state).ok, false);
  state = eventDraftReducer(state, { type: 'assign_id', id: 'e_01' });
  assert.equal(validateEventDraft(state).error.code, 'event_title_empty');
  state = eventDraftReducer(state, { type: 'set_title', value: 'T' });
  assert.equal(validateEventDraft(state).error.code, 'event_occurred_at_missing');
  state = eventDraftReducer(state, { type: 'set_occurred_at_utc', value: '2026-05-25T00:00:00Z' });
  assert.equal(validateEventDraft(state).error.code, 'event_primary_subject_missing');
  state = eventDraftReducer(state, { type: 'set_primary_subject_key', value: 'self' });
  assert.equal(validateEventDraft(state).ok, true);
});

test('SJG-DATA-05: validateEventDraft rejects occurred_at not ISO UTC', () => {
  let state = readyDraft();
  state = eventDraftReducer(state, { type: 'set_occurred_at_utc', value: '2026-05-25 00:00:00' });
  assert.equal(validateEventDraft(state).error.code, 'event_occurred_at_not_iso_utc');
});

test('SJG-DATA-05: buildEventFromDraft passes validateEvent', () => {
  const draft = readyDraft();
  const event = buildEventFromDraft(draft, { primary_subject: 'self', participants: [] });
  assert.equal(validateEvent(event).ok, true);
});

test('SJG-DATA-05: buildEventFromDraft filters out duplicate primary subject from participants', () => {
  const draft = readyDraft();
  const event = buildEventFromDraft(draft, { primary_subject: 'self', participants: ['self'] });
  assert.deepEqual(event.participants, []);
  assert.equal(validateEvent(event).ok, true);
});

test('SJG-DATA-05: buildEventFromDraft throws when id missing', () => {
  assert.throws(
    () => buildEventFromDraft(createEmptyEventDraft(), { primary_subject: 'self', participants: [] }),
    /Event\.id must be assigned/,
  );
});

test('SJG-DATA-05: newEventId returns unique non-empty strings', () => {
  const a = newEventId();
  const b = newEventId();
  assert.ok(a.length > 0);
  assert.ok(b.length > 0);
  assert.notEqual(a, b);
});

test('SJG-DATA-05: findReferencesToEvent finds view.context_items event_ref body match', () => {
  const space = validShiJingSpace({
    views: [
      {
        id: 'v_X',
        title: 'X',
        anchor_subject: 'self',
        subjects: ['self'],
        time_scope: 'open_ended',
        context_items: [{ id: 'ctx_01', kind: 'event_ref', body: 'e_target', created_at: '2026-05-25T00:00:00Z' }],
        instructions: '',
        view_memory: { summary: '', updated_at: '2026-05-25T00:00:00Z', locked: false },
        display_state: 'normal',
      },
    ],
  });
  const refs = findReferencesToEvent(space, 'e_target');
  assert.equal(refs.length, 1);
  assert.equal(refs[0].via, 'view:v_X:context_items:ctx_01');
});

test('SJG-DATA-05: findReferencesToEvent finds conversation.turns body match', () => {
  const space = validShiJingSpace({
    conversations: [
      {
        id: 'c_01',
        created_at: '2026-05-25T00:00:00Z',
        subject_anchor: 'self',
        turns: [
          { id: 't_01', role: 'user', body: 'e_target', created_at: '2026-05-25T00:00:01Z' },
        ],
      },
    ],
  });
  const refs = findReferencesToEvent(space, 'e_target');
  assert.equal(refs.length, 1);
  assert.equal(refs[0].via, 'conversation:c_01:turns:t_01');
});

test('SJG-DATA-05: findReferencesToEvent returns empty when no references', () => {
  const space = validShiJingSpace();
  const refs = findReferencesToEvent(space, 'e_missing');
  assert.equal(refs.length, 0);
});

test('SJG-DATA-05: events UI source contains no fetch/HTTP/Tauri/AI-provider call', () => {
  const dir = new URL('../src/product/events/', import.meta.url);
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

test('SJG-DATA-05: EventForm calls validateEventDraft + validateEvent + validateShiJingSpace before dispatch', () => {
  const source = readFileSync(new URL('../src/product/events/event-form.tsx', import.meta.url), 'utf8');
  const draftIdx = source.indexOf('validateEventDraft(draft)');
  const eventIdx = source.indexOf('validateEvent(event)');
  const spaceIdx = source.indexOf('validateShiJingSpace(nextSnapshot)');
  const dispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(draftIdx >= 0);
  assert.ok(eventIdx >= 0);
  assert.ok(spaceIdx >= 0);
  assert.ok(draftIdx < dispatchIdx);
  assert.ok(eventIdx < dispatchIdx);
  assert.ok(spaceIdx < dispatchIdx);
});

test('SJG-DATA-05: EventList delete flow checks dangling references AND validateShiJingSpace', () => {
  const source = readFileSync(new URL('../src/product/events/event-list.tsx', import.meta.url), 'utf8');
  const refsIdx = source.indexOf('findReferencesToEvent');
  const spaceIdx = source.indexOf('validateShiJingSpace');
  const dispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(refsIdx >= 0 && refsIdx < dispatchIdx);
  assert.ok(spaceIdx >= 0 && spaceIdx < dispatchIdx);
});

// Suppress unused-import warning for fixtures used only via the helpers.
void validNatalInputs;
