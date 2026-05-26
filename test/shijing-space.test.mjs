// SJG-DATA-02 + SJG-DATA-11 — ShiJingSpace validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateShiJingSpace } from '../src/contracts/shijing-space-validator.ts';
import {
  validInputsSummary,
  validNatalInputs,
  validPerson,
  validReading,
  validShiJingSpace,
  validTimeWindow,
} from './_fixtures.mjs';

function baseSpace(overrides = {}) {
  return validShiJingSpace(overrides);
}

test('empty space with valid natal inputs is valid', () => {
  const result = validateShiJingSpace(baseSpace());
  assert.equal(result.ok, true);
});

test('space root with removed field name is rejected', () => {
  const space = baseSpace();
  space.profiles = [];
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_removed_field_present');
    assert.equal(result.error.container, 'space');
    assert.equal(result.error.field, 'profiles');
  }
});

test('settings with removed field name is rejected', () => {
  const space = baseSpace();
  space.settings.global_instructions = 'whatever';
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_removed_field_present');
    assert.equal(result.error.container, 'settings');
    assert.equal(result.error.field, 'global_instructions');
  }
});

test('settings with project_memory key is rejected (base64 token decoded)', () => {
  const space = baseSpace();
  space.settings.project_memory = {};
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_removed_field_present');
    assert.equal(result.error.field, 'project_memory');
  }
});

test('invalid self natal inputs fail-close', () => {
  const broken = validNatalInputs();
  broken.birth_datetime_utc = 'not-iso';
  const space = baseSpace({ self_subject: { natal_inputs: broken } });
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_self_subject_natal_inputs_invalid');
});

test('natal inputs missing raw_birth_input fail-close', () => {
  const broken = validNatalInputs();
  delete broken.raw_birth_input;
  const result = validateShiJingSpace(baseSpace({ self_subject: { natal_inputs: broken } }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_self_subject_natal_inputs_invalid');
});

test('person without consent_state is rejected', () => {
  const p = validPerson('p_01');
  delete p.consent_state;
  const result = validateShiJingSpace(baseSpace({ persons: [p] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_person_consent_state_invalid');
});

test('person with kind other than "person" is rejected', () => {
  const result = validateShiJingSpace(baseSpace({ persons: [validPerson('p_01', { kind: 'profile' })] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_person_kind_invalid');
});

test('duplicate person id is rejected', () => {
  const result = validateShiJingSpace(
    baseSpace({ persons: [validPerson('p_01'), validPerson('p_01')] }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_persons_duplicate_id');
});

test('person with invalid natal inputs is rejected', () => {
  const p = validPerson('p_01');
  p.natal_inputs = { ...p.natal_inputs, birth_precision: 'never_known' };
  const result = validateShiJingSpace(baseSpace({ persons: [p] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_person_natal_inputs_invalid');
    assert.equal(result.error.person_id, 'p_01');
  }
});

test('relation pointing to unknown person is rejected', () => {
  const result = validateShiJingSpace(
    baseSpace({
      relations: [
        {
          id: 'rel_01',
          from_subject: 'self',
          to_subject: { kind: 'person', id: 'p_missing' },
          relation_kind: 'partner',
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_subject_ref_unresolvable');
});

test('self-loop relation is rejected', () => {
  const result = validateShiJingSpace(
    baseSpace({
      relations: [{ id: 'rel_self', from_subject: 'self', to_subject: 'self', relation_kind: 'self' }],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_relation_self_loop');
});

test('view with anchor not in subjects is rejected via view validator', () => {
  const result = validateShiJingSpace(
    baseSpace({
      persons: [validPerson('p_01')],
      views: [
        {
          id: 'v_01',
          title: 't',
          anchor_subject: { kind: 'person', id: 'p_01' },
          subjects: ['self'],
          time_scope: 'open_ended',
          context_items: [],
          instructions: '',
          view_memory: { summary: '', updated_at: '2026-05-25T00:00:00Z', locked: false },
          display_state: 'normal',
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_view_invalid');
});

test('space rejects View bounded_range with non-UTC endpoint via view validator', () => {
  const result = validateShiJingSpace(
    baseSpace({
      views: [
        {
          id: 'v_01',
          title: 't',
          anchor_subject: 'self',
          subjects: ['self'],
          time_scope: 'bounded',
          bounded_range: { start: '2026-05-25T00:00:00+08:00', end: '2026-05-26T00:00:00Z' },
          context_items: [],
          instructions: '',
          view_memory: { summary: '', updated_at: '2026-05-25T00:00:00Z', locked: false },
          display_state: 'normal',
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_view_invalid');
    assert.equal(result.error.reason, 'view_bounded_range_endpoint_not_iso_utc');
  }
});

test('event with participants including primary_subject is rejected', () => {
  const result = validateShiJingSpace(
    baseSpace({
      events: [
        {
          id: 'e_01',
          primary_subject: 'self',
          participants: ['self'],
          occurred_at: '2026-05-25T00:00:00Z',
          title: 'self event',
          view_refs: [],
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_event_invalid');
});

test('event view_refs[] must resolve to existing view ids', () => {
  const result = validateShiJingSpace(
    baseSpace({
      events: [
        {
          id: 'e_01',
          primary_subject: 'self',
          participants: [],
          occurred_at: '2026-05-25T00:00:00Z',
          title: 't',
          view_refs: ['v_missing'],
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_event_view_ref_unresolvable');
    assert.equal(result.error.view_id, 'v_missing');
  }
});

test('reading with view scope but unresolved view_id is rejected', () => {
  const timeWindow = validTimeWindow();
  const result = validateShiJingSpace(
    baseSpace({
      readings: [
        {
          id: 'r_01',
          created_at: '2026-05-25T00:00:00Z',
          scope: 'view',
          kind: 'period_outlook',
          anchor_subject: 'self',
          subjects: ['self'],
          time_window: timeWindow,
          view_id: 'v_does_not_exist',
          inputs_summary: validInputsSummary({ scope: 'view', timeWindow, viewId: 'v_does_not_exist' }),
          output: { summary: 'x', highlights: [], recommendations: [], citations: [] },
          uncertainty: { confidence: 'low', caveats: [], data_gaps: [] },
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_reading_view_id_unresolvable');
});

test('space rejects ReadingTimeWindow with non-UTC endpoint via reading validator', () => {
  const reading = validReading({ id: 'r_01', kind: 'today' });
  reading.time_window = {
    ...reading.time_window,
    start_utc: '2026-05-25T00:00:00+08:00',
    end_utc: '2026-05-26T00:00:00Z',
  };
  reading.inputs_summary.time_window = reading.time_window;
  reading.inputs_summary.feature_snapshot.time_window = reading.time_window;
  const result = validateShiJingSpace(baseSpace({ readings: [reading] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_reading_invalid');
    assert.equal(result.error.reason, 'reading_time_window_bounded_endpoint_not_iso_utc');
  }
});

test('space rejects ReadingTimeWindow with invalid basis_time_zone via reading validator', () => {
  const reading = validReading({ id: 'r_01', kind: 'today' });
  reading.time_window = { ...reading.time_window, basis_time_zone: 'UTC+08' };
  reading.inputs_summary.time_window = reading.time_window;
  reading.inputs_summary.feature_snapshot.time_window = reading.time_window;
  const result = validateShiJingSpace(baseSpace({ readings: [reading] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_reading_invalid');
    assert.equal(result.error.reason, 'reading_time_window_basis_time_zone_invalid');
  }
});

test('conversation with unresolved view_id is rejected', () => {
  const result = validateShiJingSpace(
    baseSpace({
      conversations: [
        {
          id: 'c_01',
          created_at: '2026-05-25T00:00:00Z',
          subject_anchor: 'self',
          view_id: 'v_missing',
          turns: [],
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_conversation_view_id_unresolvable');
});

test('conversation with unresolvable source_reading_id is rejected', () => {
  const result = validateShiJingSpace(
    baseSpace({
      conversations: [
        {
          id: 'c_01',
          created_at: '2026-05-25T00:00:00Z',
          subject_anchor: 'self',
          source_reading_id: 'r_missing',
          turns: [],
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_conversation_source_reading_unresolvable');
});

test('conversation ai turn without source_reading_id is rejected', () => {
  const result = validateShiJingSpace(
    baseSpace({
      conversations: [
        {
          id: 'c_01',
          created_at: '2026-05-25T00:00:00Z',
          subject_anchor: 'self',
          turns: [
            {
              id: 't_ai_01',
              role: 'ai',
              body: 'reply',
              created_at: '2026-05-25T00:00:00Z',
            },
          ],
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_conversation_ai_turn_without_source_reading');
});

test('conversation source Reading view scope cannot conflict with conversation view_id', () => {
  const viewA = {
    id: 'v_01',
    title: 'A',
    anchor_subject: 'self',
    subjects: ['self'],
    time_scope: 'rolling',
    rolling_window_days: 30,
    context_items: [],
    instructions: '',
    view_memory: { summary: '', updated_at: '2026-05-25T00:00:00Z', locked: false },
    display_state: 'normal',
  };
  const viewB = { ...viewA, id: 'v_02', title: 'B' };
  const reading = validReading({ id: 'r_view', scope: 'view', kind: 'period_outlook', view_id: 'v_01' });
  const result = validateShiJingSpace(
    baseSpace({
      views: [viewA, viewB],
      readings: [reading],
      conversations: [
        {
          id: 'c_01',
          created_at: '2026-05-25T00:00:00Z',
          subject_anchor: 'self',
          source_reading_id: 'r_view',
          view_id: 'v_02',
          turns: [],
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_conversation_source_view_conflict');
});
