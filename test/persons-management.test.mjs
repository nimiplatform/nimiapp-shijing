// Wave-8 — Person draft reducer + validate + id factory + dangling
// reference detector + structural assertions on the persons UI tree.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

import {
  buildPersonFromDrafts,
  createEmptyPersonDraft,
  personDraftReducer,
  validatePersonDraft,
  CONSENT_STATE_OPTIONS,
} from '../src/product/persons/person-form-state.ts';
import { findReferencesToPerson } from '../src/product/persons/dangling-reference.ts';
import { newPersonId } from '../src/product/persons/person-id.ts';
import {
  buildNatalInputsFromDraft,
} from '../src/product/inputs/natal-inputs-state.ts';
import { validNatalInputs, validShiJingSpace } from './_fixtures.mjs';

function gregorianNatalDraft() {
  return {
    calendar_system: 'gregorian',
    raw_local_date_text: '1990-04-12',
    raw_local_time_text: '08:30',
    raw_place_text: '',
    raw_lunar_year: '',
    raw_lunar_month: '',
    raw_lunar_day: '',
    raw_lunar_is_leap_month: null,
    birth_datetime_utc: '1990-04-12T08:30:00Z',
    birth_precision: 'exact',
    latitude_text: '31.2304',
    longitude_text: '121.4737',
    iana_time_zone: 'Asia/Shanghai',
    place_name: '',
    calculation_sex: 'unspecified',
    cultural_marker: '',
    notes: '',
  };
}

test('empty Person draft has no consent_state default', () => {
  const draft = createEmptyPersonDraft();
  assert.equal(draft.consent_state, '');
  assert.equal(draft.id, null);
});

test('CONSENT_STATE_OPTIONS exactly mirrors domain CONSENT_STATES', () => {
  assert.deepEqual([...CONSENT_STATE_OPTIONS], ['owner_recorded', 'subject_consented', 'withheld']);
});

test('personDraftReducer hydrates from existing Person', () => {
  const existing = {
    id: 'p_existing',
    display_name: 'Existing',
    kind: 'person',
    natal_inputs: validNatalInputs(),
    consent_state: 'owner_recorded',
    relation_hint: 'sibling',
    notes: 'note',
  };
  const state = personDraftReducer(createEmptyPersonDraft(), { type: 'hydrate', person: existing });
  assert.equal(state.id, 'p_existing');
  assert.equal(state.display_name, 'Existing');
  assert.equal(state.relation_hint, 'sibling');
  assert.equal(state.consent_state, 'owner_recorded');
  assert.equal(state.notes, 'note');
});

test('validatePersonDraft rejects missing id', () => {
  const result = validatePersonDraft(createEmptyPersonDraft());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'person_id_missing');
});

test('validatePersonDraft rejects empty display_name', () => {
  let state = personDraftReducer(createEmptyPersonDraft(), { type: 'assign_id', id: 'p_01' });
  const result = validatePersonDraft(state);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'person_display_name_empty');
});

test('validatePersonDraft rejects unspecified consent_state', () => {
  let state = personDraftReducer(createEmptyPersonDraft(), { type: 'assign_id', id: 'p_01' });
  state = personDraftReducer(state, { type: 'set_display_name', value: 'New' });
  const result = validatePersonDraft(state);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'person_consent_state_unspecified');
});

test('validatePersonDraft passes for complete draft', () => {
  let state = personDraftReducer(createEmptyPersonDraft(), { type: 'assign_id', id: 'p_01' });
  state = personDraftReducer(state, { type: 'set_display_name', value: 'New' });
  state = personDraftReducer(state, { type: 'set_consent_state', value: 'owner_recorded' });
  const result = validatePersonDraft(state);
  assert.equal(result.ok, true);
});

test('buildPersonFromDrafts produces a SJG-DATA-03-shaped Person', () => {
  let state = personDraftReducer(createEmptyPersonDraft(), { type: 'assign_id', id: 'p_uuid' });
  state = personDraftReducer(state, { type: 'set_display_name', value: 'A' });
  state = personDraftReducer(state, { type: 'set_consent_state', value: 'subject_consented' });
  state = personDraftReducer(state, { type: 'set_relation_hint', value: 'friend' });
  const natalInputs = buildNatalInputsFromDraft(gregorianNatalDraft());
  const person = buildPersonFromDrafts(state, natalInputs);
  assert.equal(person.id, 'p_uuid');
  assert.equal(person.kind, 'person');
  assert.equal(person.display_name, 'A');
  assert.equal(person.consent_state, 'subject_consented');
  assert.equal(person.relation_hint, 'friend');
  assert.equal(person.natal_inputs.birth_datetime_utc, '1990-04-12T08:30:00Z');
});

test('buildPersonFromDrafts throws if id missing', () => {
  const natalInputs = buildNatalInputsFromDraft(gregorianNatalDraft());
  assert.throws(
    () => buildPersonFromDrafts(createEmptyPersonDraft(), natalInputs),
    /Person\.id must be assigned/,
  );
});

test('buildPersonFromDrafts throws if consent_state missing', () => {
  const natalInputs = buildNatalInputsFromDraft(gregorianNatalDraft());
  let state = personDraftReducer(createEmptyPersonDraft(), { type: 'assign_id', id: 'p_01' });
  state = personDraftReducer(state, { type: 'set_display_name', value: 'X' });
  assert.throws(() => buildPersonFromDrafts(state, natalInputs), /consent_state must be chosen/);
});

test('newPersonId returns a unique non-empty string each call', () => {
  const a = newPersonId();
  const b = newPersonId();
  assert.ok(a.length > 0);
  assert.ok(b.length > 0);
  assert.notEqual(a, b);
});

test('findReferencesToPerson finds relation references', () => {
  const space = validShiJingSpace({
    persons: [
      {
        id: 'p_01',
        display_name: 'A',
        kind: 'person',
        natal_inputs: validNatalInputs(),
        consent_state: 'owner_recorded',
      },
    ],
    relations: [
      {
        id: 'rel_01',
        from_subject: 'self',
        to_subject: { kind: 'person', id: 'p_01' },
        relation_kind: 'partner',
      },
    ],
  });
  const refs = findReferencesToPerson(space, 'p_01');
  assert.equal(refs.length, 1);
  assert.equal(refs[0].via, 'relation:rel_01:to');
});

test('findReferencesToPerson finds event participants references', () => {
  const space = validShiJingSpace({
    persons: [
      {
        id: 'p_02',
        display_name: 'B',
        kind: 'person',
        natal_inputs: validNatalInputs(),
        consent_state: 'owner_recorded',
      },
    ],
    events: [
      {
        id: 'e_01',
        primary_subject: 'self',
        participants: [{ kind: 'person', id: 'p_02' }],
        occurred_at: '2026-05-25T00:00:00Z',
        title: 'x',
        view_refs: [],
      },
    ],
  });
  const refs = findReferencesToPerson(space, 'p_02');
  assert.equal(refs.length, 1);
  assert.equal(refs[0].via, 'event:e_01:participants');
});

test('findReferencesToPerson returns empty when no references', () => {
  const space = validShiJingSpace({
    persons: [
      {
        id: 'p_alone',
        display_name: 'Alone',
        kind: 'person',
        natal_inputs: validNatalInputs(),
        consent_state: 'owner_recorded',
      },
    ],
  });
  const refs = findReferencesToPerson(space, 'p_alone');
  assert.equal(refs.length, 0);
});

test('persons UI source contains no fetch/HTTP/Tauri/Runtime/AI-provider call', () => {
  const dir = new URL('../src/product/persons/', import.meta.url);
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

test('persons UI source has no Math.random() call site', () => {
  const dir = new URL('../src/product/persons/', import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'));
  for (const file of files) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    // Strip line comments so the "No Math.random fallback" doc is allowed.
    const sourceWithoutLineComments = source.replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(
      sourceWithoutLineComments,
      /Math\.random\s*\(/,
      `${file} must not call Math.random()`,
    );
  }
});

test('PersonForm calls validatePersonDraft + validateDraft + validateShiJingSpace before dispatch', () => {
  const source = readFileSync(new URL('../src/product/persons/person-form.tsx', import.meta.url), 'utf8');
  const personIdx = source.indexOf('validatePersonDraft(personDraft)');
  const natalIdx = source.indexOf('validateDraft(natalDraft)');
  const spaceIdx = source.indexOf('validateShiJingSpace(nextSnapshot)');
  const dispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(personIdx >= 0);
  assert.ok(natalIdx >= 0);
  assert.ok(spaceIdx >= 0);
  assert.ok(dispatchIdx >= 0);
  assert.ok(personIdx < dispatchIdx);
  assert.ok(natalIdx < dispatchIdx);
  assert.ok(spaceIdx < dispatchIdx);
});

test('PersonList delete flow checks dangling references AND validateShiJingSpace', () => {
  const source = readFileSync(new URL('../src/product/persons/person-list.tsx', import.meta.url), 'utf8');
  const refsIdx = source.indexOf('findReferencesToPerson');
  const spaceIdx = source.indexOf('validateShiJingSpace');
  const dispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(refsIdx >= 0);
  assert.ok(spaceIdx >= 0);
  assert.ok(refsIdx < dispatchIdx);
  assert.ok(spaceIdx < dispatchIdx);
});
