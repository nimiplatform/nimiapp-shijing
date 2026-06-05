// Pre-release hard-cut recovery: a persisted space carrying a Reading from the
// retired schema must load with that Reading (and any Conversation citing it)
// dropped, rather than failing the whole space (space_reading_invalid).

import assert from 'node:assert/strict';
import test from 'node:test';
import { dropIncompatibleReadings } from '../src/product/persistence/sanitize-loaded-space.ts';
import { validateShiJingSpace } from '../src/contracts/shijing-space-validator.ts';
import { validReading, validShiJingSpace, validConversation, validConcernTag, validInputsSummary } from './_fixtures.mjs';

function retiredReading(id) {
  const reading = validReading();
  const summary = validInputsSummary();
  return {
    ...reading,
    id,
    // retired method id → fails isAdmittedMethodProfileId in validateReading
    inputs_summary: { ...summary, method_profile: { ...summary.method_profile, id: 'bazi_ganzhi_jieqi_dayun_v1' } },
  };
}

test('dropIncompatibleReadings: drops a retired-schema reading, keeps the valid one', () => {
  const valid = validReading(); // id r_01, current schema
  const old = retiredReading('r_old');
  const space = validShiJingSpace({
    concern_tags: [validConcernTag('tag_love')],
    readings: [valid, old],
  });

  // whole-space validation fails today because of the retired reading
  assert.equal(validateShiJingSpace(space).ok, false);

  const result = dropIncompatibleReadings(space);
  assert.equal(result.dropped_readings, 1);
  assert.equal(result.space.readings.length, 1);
  assert.equal(result.space.readings[0].id, 'r_01');
  // the sanitized space now validates
  assert.equal(validateShiJingSpace(result.space).ok, true, JSON.stringify(validateShiJingSpace(result.space)));
});

test('dropIncompatibleReadings: also drops conversations citing a dropped reading', () => {
  const old = retiredReading('r_old');
  const convo = validConversation({
    source_reading_ids: ['r_old'],
    turns: [
      { id: 't1', role: 'user', body: 'q', cited_reading_ids: [], cited_event_memory_refs: [], cited_plan_item_refs: [], created_at: '2026-05-25T00:01:00Z' },
    ],
  });
  const space = validShiJingSpace({
    concern_tags: [validConcernTag('tag_love')],
    readings: [old],
    conversations: [convo],
  });

  const result = dropIncompatibleReadings(space);
  assert.equal(result.dropped_readings, 1);
  assert.equal(result.dropped_conversations, 1);
  assert.equal(result.space.readings.length, 0);
  assert.equal(result.space.conversations.length, 0);
  assert.equal(validateShiJingSpace(result.space).ok, true);
});

test('dropIncompatibleReadings: leaves a clean space untouched', () => {
  const space = validShiJingSpace({
    concern_tags: [validConcernTag('tag_love')],
    readings: [validReading()],
  });
  const result = dropIncompatibleReadings(space);
  assert.equal(result.dropped_readings, 0);
  assert.equal(result.space.readings.length, 1);
  assert.equal(validateShiJingSpace(result.space).ok, true);
});

// Audit P1 (Claude) — a structurally malformed Reading makes validateReading
// throw on property access; the sanitizer must drop it, never crash the load.
test('dropIncompatibleReadings: a malformed reading (missing inputs_summary) is dropped, not thrown', () => {
  const broken = { ...validReading(), id: 'r_broken', inputs_summary: undefined };
  const space = validShiJingSpace({
    concern_tags: [validConcernTag('tag_love')],
    readings: [validReading(), broken],
  });
  let result;
  assert.doesNotThrow(() => { result = dropIncompatibleReadings(space); });
  assert.equal(result.dropped_readings, 1);
  assert.equal(result.space.readings.length, 1);
  assert.equal(result.space.readings[0].id, 'r_01');
  assert.equal(validateShiJingSpace(result.space).ok, true);
});

// Audit P1 (both) — a Reading valid in isolation but citing a since-deleted
// entity (orphan ref) passes validateReading yet fails the space validator. The
// sanitizer must drop it too, else the space can never recover on load.
test('dropIncompatibleReadings: a reading citing a deleted person is dropped (orphan ref)', () => {
  const orphan = { ...validReading(), id: 'r_orphan', related_person_refs: [{ kind: 'person', id: 'p_ghost' }] };
  const space = validShiJingSpace({
    concern_tags: [validConcernTag('tag_love')],
    readings: [orphan],
  });
  // per-reading validation passes, but the whole space does not
  assert.equal(validateShiJingSpace(space).ok, false);
  const result = dropIncompatibleReadings(space);
  assert.equal(result.dropped_readings, 1);
  assert.equal(result.space.readings.length, 0);
  assert.equal(validateShiJingSpace(result.space).ok, true);
});

// Audit P1 (Codex) — a method_profile_id left over from a retired engine fails
// validateSettings; the sanitizer resets it to the default so the space loads.
test('dropIncompatibleReadings: resets an unadmitted method_profile_id to default', () => {
  const space = validShiJingSpace({
    concern_tags: [validConcernTag('tag_love')],
    readings: [validReading()],
    settings: {
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
      method_profile_id: 'bazi_ganzhi_jieqi_dayun_v1', // retired
    },
  });
  assert.equal(validateShiJingSpace(space).ok, false);
  const result = dropIncompatibleReadings(space);
  assert.equal(result.repaired_settings, true);
  assert.equal(result.space.settings.method_profile_id, undefined);
  assert.equal(validateShiJingSpace(result.space).ok, true);
});
