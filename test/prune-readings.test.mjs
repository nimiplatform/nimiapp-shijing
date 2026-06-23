// Audit P2 — persisted Readings grew unbounded with no dedup. pruneReadings
// dedups regenerations by input_hash and caps per mirror_kind, both citation-safe.

import assert from 'node:assert/strict';
import test from 'node:test';
import { pruneReadings, DEFAULT_MAX_READINGS_PER_KIND } from '../src/product/reading/prune-readings.ts';

// Minimal Reading-shaped objects — pruneReadings reads only id, mirror_kind,
// created_at, cited_reading_ids, inputs_summary.input_hash.
function r(id, kind, hash, day, cited = []) {
  return {
    id, mirror_kind: kind,
    mirror_scope: { kind: kind === 'mingjing' ? 'natal' : 'daily' },
    created_at: `2026-06-${String(day).padStart(2, '0')}T00:00:00Z`,
    cited_reading_ids: cited,
    inputs_summary: { input_hash: hash },
  };
}
function rel(id, hash, day, personId) {
  return {
    ...r(id, 'mingjing', hash, day),
    mirror_scope: {
      kind: 'relationship_natal',
      related_person_ref: { kind: 'person', id: personId },
      anchor_year: 2026,
      basis_time_zone: 'Asia/Shanghai',
    },
  };
}
const ids = (list) => list.map((x) => x.id).sort();

test('dedup: regenerating the same query (same input_hash) keeps only the newest', () => {
  const kept = pruneReadings([r('a', 'rijing', 'H1', 1), r('b', 'rijing', 'H1', 2)]);
  assert.deepEqual(ids(kept), ['b']);
});

test('distinct input_hash (different days/queries) are all kept', () => {
  const kept = pruneReadings([r('a', 'rijing', 'H1', 1), r('b', 'rijing', 'H2', 2)]);
  assert.deepEqual(ids(kept), ['a', 'b']);
});

test('citation-safe: a superseded reading cited by a conversation is NOT dropped', () => {
  const convo = { source_reading_ids: ['a'], turns: [] };
  const kept = pruneReadings([r('a', 'rijing', 'H1', 1), r('b', 'rijing', 'H1', 2)], [convo]);
  assert.deepEqual(ids(kept), ['a', 'b']);
});

test('citation-safe: a reading cited by another reading (consultation source) survives', () => {
  const consult = r('c', 'shijing', 'H9', 3, ['a']);
  const kept = pruneReadings([r('a', 'rijing', 'H1', 1), r('b', 'rijing', 'H1', 2), consult]);
  assert.deepEqual(ids(kept), ['a', 'b', 'c']);
});

test('per-kind cap keeps the most recent N', () => {
  const many = Array.from({ length: 5 }, (_, i) => r(`x${i}`, 'rijing', `H${i}`, i + 1));
  const kept = pruneReadings(many, [], { max_per_kind: 2 });
  assert.deepEqual(ids(kept), ['x3', 'x4']); // newest two
});

test('cap is independent per mirror_kind, and protected readings exceed the cap', () => {
  const list = [
    r('r1', 'rijing', 'A', 1), r('r2', 'rijing', 'B', 2), r('r3', 'rijing', 'C', 3),
    r('y1', 'yuejing', 'D', 1), r('y2', 'yuejing', 'E', 2),
  ];
  const convo = { source_reading_ids: ['r1'], turns: [] }; // protect the oldest rijing
  const kept = pruneReadings(list, [convo], { max_per_kind: 2 });
  // rijing: newest 2 (r2,r3) + protected r1 = 3; yuejing: both
  assert.deepEqual(ids(kept), ['r1', 'r2', 'r3', 'y1', 'y2']);
});

test('mingjing cap keeps natal and relationship_natal readings in separate retention buckets', () => {
  const kept = pruneReadings(
    [
      r('natal_old', 'mingjing', 'N1', 1),
      r('natal_new', 'mingjing', 'N2', 2),
      rel('rel_old', 'R1', 3, 'p_alice'),
      rel('rel_new', 'R2', 4, 'p_alice'),
    ],
    [],
    { max_per_kind: 1 },
  );
  assert.deepEqual(ids(kept), ['natal_new', 'rel_new']);
});

test('default cap is generous (history preserved)', () => {
  assert.ok(DEFAULT_MAX_READINGS_PER_KIND >= 30);
});
