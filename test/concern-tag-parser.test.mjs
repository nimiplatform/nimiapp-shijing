// W-c02 — ConcernTag parser + mention resolver tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveConcernTagLabelForDisplay,
  parseConcernTagInput,
} from '../src/product/concern-tags/concern-tag-parser.ts';
import { validPerson, validShiJingSpace } from './_fixtures.mjs';

function alice() {
  return validPerson('p_alice_ulid_id_here', { display_name: 'Alice' });
}

function bob() {
  return validPerson('p_bob_ulid_id_here', { display_name: 'Bob' });
}

test('empty input → empty parsed structure', () => {
  const r = parseConcernTagInput('', { persons: [] });
  assert.equal(r.label, '');
  assert.deepEqual(r.parsed_topics, []);
  assert.deepEqual(r.mention_refs, []);
  assert.equal(r.prompt_text, '');
  assert.equal(r.unresolved_mention_count, 0);
});

test('pure-text input → label and prompt_text are the trimmed input, no tokens', () => {
  const r = parseConcernTagInput('  Career reflection  ', { persons: [] });
  assert.equal(r.label, 'Career reflection');
  assert.deepEqual(r.parsed_topics, []);
  assert.deepEqual(r.mention_refs, []);
});

test('single topic token populates parsed_topics and label', () => {
  const r = parseConcernTagInput('#姻缘', { persons: [] });
  assert.deepEqual(r.parsed_topics, ['姻缘']);
  assert.equal(r.label, '');
});

test('label is the leading text before the first token', () => {
  const r = parseConcernTagInput('Career #事业 reflection', { persons: [] });
  assert.equal(r.label, 'Career');
  assert.deepEqual(r.parsed_topics, ['事业']);
  assert.equal(r.prompt_text, 'reflection');
});

test('duplicate topic tokens are deduplicated', () => {
  const r = parseConcernTagInput('#love #love #LOVE', { persons: [] });
  assert.deepEqual(r.parsed_topics, ['love']);
});

test('topic tokens are lowercased', () => {
  const r = parseConcernTagInput('#Career #LOVE', { persons: [] });
  assert.deepEqual(r.parsed_topics, ['career', 'love']);
});

test('@person resolves to existing Person by display_name (case-insensitive)', () => {
  const r = parseConcernTagInput('#姻缘 @ALICE', { persons: [alice()] });
  assert.equal(r.mention_refs.length, 1);
  assert.deepEqual(r.mention_refs[0].resolved_subject_ref, {
    kind: 'person',
    id: 'p_alice_ulid_id_here',
  });
  assert.equal(r.mention_refs[0].unresolved_text, undefined);
  assert.equal(r.unresolved_mention_count, 0);
});

test('unresolved @person stays as unresolved_text and counts toward unresolved', () => {
  const r = parseConcernTagInput('@nemo', { persons: [alice()] });
  assert.equal(r.mention_refs.length, 1);
  assert.equal(r.mention_refs[0].resolved_subject_ref, undefined);
  assert.equal(r.mention_refs[0].unresolved_text, '@nemo');
  assert.equal(r.unresolved_mention_count, 1);
});

test('mention by ULID id does NOT resolve - only display_name matches', () => {
  const a = alice();
  const r = parseConcernTagInput(`@${a.id}`, { persons: [a] });
  assert.equal(r.mention_refs[0].resolved_subject_ref, undefined);
  assert.equal(r.mention_refs[0].unresolved_text, `@${a.id}`);
});

test('multiple @mentions, mixed resolved + unresolved', () => {
  const r = parseConcernTagInput('@Alice and @nemo', { persons: [alice(), bob()] });
  assert.equal(r.mention_refs.length, 2);
  assert.deepEqual(r.mention_refs[0].resolved_subject_ref, {
    kind: 'person',
    id: 'p_alice_ulid_id_here',
  });
  assert.equal(r.mention_refs[1].unresolved_text, '@nemo');
  assert.equal(r.unresolved_mention_count, 1);
});

test('prompt_text is the tail after the last token', () => {
  const r = parseConcernTagInput('#career notes after token', { persons: [] });
  assert.equal(r.prompt_text, 'notes after token');
});

test('parser does not create a Person (caller supplies persons[])', () => {
  // The parser's options.persons argument is the only resolution source.
  // Passing a frozen empty list cannot magically gain entries.
  const persons = Object.freeze([]);
  const r = parseConcernTagInput('@whoever', { persons });
  assert.equal(persons.length, 0);
  assert.equal(r.mention_refs[0].resolved_subject_ref, undefined);
});

test('deriveConcernTagLabelForDisplay returns label, then first topic, then first mention, then trimmed input', () => {
  assert.equal(
    deriveConcernTagLabelForDisplay(parseConcernTagInput('Career #love', { persons: [] })),
    'Career',
  );
  assert.equal(
    deriveConcernTagLabelForDisplay(parseConcernTagInput('#love', { persons: [] })),
    '#love',
  );
  assert.equal(
    deriveConcernTagLabelForDisplay(parseConcernTagInput('@Alice', { persons: [alice()] })),
    '@Alice',
  );
});

test('parser handles input where shi-jing-space is supplied (smoke)', () => {
  const space = validShiJingSpace({ persons: [alice()] });
  const r = parseConcernTagInput('#love @Alice', { persons: space.persons });
  assert.deepEqual(r.parsed_topics, ['love']);
  assert.equal(r.mention_refs[0].resolved_subject_ref?.id, 'p_alice_ulid_id_here');
});
