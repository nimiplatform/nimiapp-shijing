// SJG-DATA-04 — ConcernTag validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONCERN_TAG_ACTIVE_LIMIT,
  CONCERN_TAG_LABEL_MAX_LENGTH,
} from '../src/domain/concern-tag.ts';
import {
  validateConcernTag,
  validateConcernTagCollection,
  validateMentionRef,
} from '../src/contracts/concern-tag-validator.ts';
import { validConcernTag } from './_fixtures.mjs';

test('valid concern tag is accepted', () => {
  assert.equal(validateConcernTag(validConcernTag()).ok, true);
});

test('rejects empty label', () => {
  const result = validateConcernTag(validConcernTag('t', { label: '' }));
  assert.equal(result.ok, false);
});

test('rejects label longer than max length', () => {
  const tag = validConcernTag('t', { label: 'a'.repeat(CONCERN_TAG_LABEL_MAX_LENGTH + 1) });
  const result = validateConcernTag(tag);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'concern_tag_label_too_long');
  }
});

test('rejects invalid status', () => {
  const result = validateConcernTag(validConcernTag('t', { status: 'pinned' }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'concern_tag_status_invalid');
  }
});

test('rejects non-integer sort_order', () => {
  const result = validateConcernTag(validConcernTag('t', { sort_order: 1.5 }));
  assert.equal(result.ok, false);
});

test('rejects mention with both resolved ref and unresolved_text', () => {
  const result = validateMentionRef(
    {
      token: '@alice',
      resolved_subject_ref: { kind: 'person', id: 'p_alice' },
      unresolved_text: 'alice',
    },
    0,
  );
  assert.equal(result.ok, false);
});

test('rejects mention with neither resolved ref nor unresolved_text', () => {
  const result = validateMentionRef({ token: '@bob' }, 0);
  assert.equal(result.ok, false);
});

test('accepts resolved mention with valid person ref', () => {
  const result = validateMentionRef(
    { token: '@alice', resolved_subject_ref: { kind: 'person', id: 'p_alice' } },
    0,
  );
  assert.equal(result.ok, true);
});

test('accepts unresolved mention with text-only fallback', () => {
  const result = validateMentionRef({ token: '@nemo', unresolved_text: 'nemo (unresolved)' }, 0);
  assert.equal(result.ok, true);
});

test('collection rejects duplicate ids', () => {
  const result = validateConcernTagCollection([validConcernTag('t1'), validConcernTag('t1')]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'concern_tags_duplicate_id');
  }
});

test(`collection rejects more than ${CONCERN_TAG_ACTIVE_LIMIT} active tags`, () => {
  const tags = Array.from({ length: CONCERN_TAG_ACTIVE_LIMIT + 1 }, (_, i) =>
    validConcernTag(`t_${i}`, { sort_order: i }),
  );
  const result = validateConcernTagCollection(tags);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'concern_tags_active_limit_exceeded');
  }
});

test('collection accepts CONCERN_TAG_ACTIVE_LIMIT active + many archived tags', () => {
  const active = Array.from({ length: CONCERN_TAG_ACTIVE_LIMIT }, (_, i) =>
    validConcernTag(`t_active_${i}`, { sort_order: i }),
  );
  const archived = Array.from({ length: 10 }, (_, i) =>
    validConcernTag(`t_archived_${i}`, { status: 'archived', sort_order: i + 100 }),
  );
  const result = validateConcernTagCollection([...active, ...archived]);
  assert.equal(result.ok, true, JSON.stringify(result));
});

// ── Custom-concern delete (mirrors the pure logic in concern-tag-controls.tsx)
// A concern is "custom" when its #-trimmed label is not a built-in preset;
// only custom concerns get a hard delete (presets are archive-only). Deleting
// also strips the id from any event memory's concern_tag_refs so no dangling
// reference remains.
import { CONCERN_PRESETS } from '../src/product/concern-tags/concern-presets.ts';

const PRESET_LABELS = new Set(CONCERN_PRESETS.map((p) => p.label.replace(/^#/, '')));
function isCustomTag(tag) {
  return !PRESET_LABELS.has((tag.label ?? '').replace(/^#/, '').trim());
}
function applyDelete(tags, memories, id) {
  return {
    tags: tags.filter((t) => t.id !== id),
    memories: (memories ?? []).map((m) =>
      (m.concern_tag_refs ?? []).includes(id)
        ? { ...m, concern_tag_refs: m.concern_tag_refs.filter((ref) => ref !== id) }
        : m,
    ),
  };
}

test('isCustomTag distinguishes presets from user-typed concerns', () => {
  assert.equal(isCustomTag({ label: '事业' }), false);
  assert.equal(isCustomTag({ label: '姻缘' }), false);
  assert.equal(isCustomTag({ label: '防守打法' }), true);
  assert.equal(isCustomTag({ label: '#创业' }), true);
});

test('applyDelete hard-removes a tag', () => {
  const tags = [
    { id: 'a', label: '事业', status: 'active' },
    { id: 'b', label: '防守打法', status: 'active' },
  ];
  const { tags: next } = applyDelete(tags, [], 'b');
  assert.equal(next.length, 1);
  assert.equal(next.find((t) => t.id === 'b'), undefined);
});

test('applyDelete strips the id from event-memory concern_tag_refs', () => {
  const tags = [{ id: 'b', label: '防守打法', status: 'active' }];
  const memories = [
    { id: 'm1', concern_tag_refs: ['a', 'b'] },
    { id: 'm2', concern_tag_refs: ['a'] },
  ];
  const { memories: next } = applyDelete(tags, memories, 'b');
  assert.deepEqual(next[0].concern_tag_refs, ['a']);
  assert.deepEqual(next[1].concern_tag_refs, ['a']);
});
