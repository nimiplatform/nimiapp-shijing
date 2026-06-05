import assert from 'node:assert/strict';
import test from 'node:test';

import { validateShiJingSpace } from '../src/contracts/shijing-space-validator.ts';
import { buildEmptyShiJingSpace } from '../src/product/dev/initial-space.ts';
import { subjectMirrorReadiness } from '../src/product/subjects/natal-readiness.ts';

test('initial ShiJing space starts without generated product data', () => {
  const space = buildEmptyShiJingSpace('dev-user');

  assert.deepEqual(space.concern_tags, []);
  assert.deepEqual(space.event_memories, []);
  assert.deepEqual(space.plan_items, []);
  assert.deepEqual(space.readings, []);
  assert.deepEqual(space.conversations, []);
});

test('initial ShiJing space is valid but not generation-ready', () => {
  const space = buildEmptyShiJingSpace('dev-user');

  assert.deepEqual(validateShiJingSpace(space), { ok: true });

  const readiness = subjectMirrorReadiness({
    subject: 'self',
    space,
    mirror_kind: 'rijing',
    mirror_scope: {
      kind: 'daily',
      date: '2026-06-05',
      basis_time_zone: 'Asia/Shanghai',
    },
  });
  assert.equal(readiness.ok, false);
  if (!readiness.ok) assert.equal(readiness.reason, 'scaffold_default_natal_inputs');
});
