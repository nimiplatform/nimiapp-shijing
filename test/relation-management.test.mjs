// SJG-DATA-04 (data-model-contract.md lines 131-147) — Relation draft
// reducer + validator + id factory + dangling-reference detector +
// structural assertions on the Relation UI tree.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

import {
  RELATION_KIND_OPTIONS,
  buildRelationFromDraft,
  createEmptyRelationDraft,
  relationDraftReducer,
  validateRelationDraft,
} from '../src/product/relations/relation-form-state.ts';
import { newRelationId } from '../src/product/relations/relation-id.ts';
import { findReferencesToRelation } from '../src/product/relations/relation-dangling-reference.ts';
import { validNatalInputs, validShiJingSpace } from './_fixtures.mjs';

function readyDraft() {
  let state = relationDraftReducer(createEmptyRelationDraft(), { type: 'assign_id', id: 'rel_01' });
  state = relationDraftReducer(state, { type: 'set_from_subject_key', value: 'self' });
  state = relationDraftReducer(state, { type: 'set_to_subject_key', value: 'person:p_01' });
  state = relationDraftReducer(state, { type: 'set_relation_kind', value: '伴侣' });
  return state;
}

test('SJG-DATA-04: empty Relation draft has unspecified kind and no subjects', () => {
  const draft = createEmptyRelationDraft();
  assert.equal(draft.id, null);
  assert.equal(draft.from_subject_key, '');
  assert.equal(draft.to_subject_key, '');
  assert.equal(draft.relation_kind, '');
});

test('SJG-DATA-04: RELATION_KIND_OPTIONS contains exactly the admitted UI vocabulary', () => {
  assert.deepEqual([...RELATION_KIND_OPTIONS], ['亲属', '伴侣', '同事', '朋友', '其他']);
});

test('SJG-DATA-04: assign_id, set_from_subject_key, set_to_subject_key actions update state', () => {
  let state = relationDraftReducer(createEmptyRelationDraft(), { type: 'assign_id', id: 'rel_X' });
  state = relationDraftReducer(state, { type: 'set_from_subject_key', value: 'self' });
  state = relationDraftReducer(state, { type: 'set_to_subject_key', value: 'person:p_01' });
  assert.equal(state.id, 'rel_X');
  assert.equal(state.from_subject_key, 'self');
  assert.equal(state.to_subject_key, 'person:p_01');
});

test('SJG-DATA-04: hydrate populates every field from a Relation', () => {
  const relation = {
    id: 'rel_h',
    from_subject: { kind: 'person', id: 'p_01' },
    to_subject: 'self',
    relation_kind: '朋友',
    notes: 'n',
  };
  const state = relationDraftReducer(createEmptyRelationDraft(), { type: 'hydrate', relation });
  assert.equal(state.id, 'rel_h');
  assert.equal(state.from_subject_key, 'person:p_01');
  assert.equal(state.to_subject_key, 'self');
  assert.equal(state.relation_kind, '朋友');
  assert.equal(state.notes, 'n');
});

test('SJG-DATA-04: validateRelationDraft rejects each missing field', () => {
  let state = createEmptyRelationDraft();
  assert.equal(validateRelationDraft(state).error.code, 'relation_id_missing');
  state = relationDraftReducer(state, { type: 'assign_id', id: 'rel_01' });
  assert.equal(validateRelationDraft(state).error.code, 'relation_from_subject_missing');
  state = relationDraftReducer(state, { type: 'set_from_subject_key', value: 'self' });
  assert.equal(validateRelationDraft(state).error.code, 'relation_to_subject_missing');
  state = relationDraftReducer(state, { type: 'set_to_subject_key', value: 'person:p_01' });
  assert.equal(validateRelationDraft(state).error.code, 'relation_kind_unspecified');
  state = relationDraftReducer(state, { type: 'set_relation_kind', value: '伴侣' });
  assert.equal(validateRelationDraft(state).ok, true);
});

test('SJG-DATA-04: validateRelationDraft rejects from === to (self-loop)', () => {
  let state = relationDraftReducer(createEmptyRelationDraft(), { type: 'assign_id', id: 'rel_loop' });
  state = relationDraftReducer(state, { type: 'set_from_subject_key', value: 'self' });
  state = relationDraftReducer(state, { type: 'set_to_subject_key', value: 'self' });
  state = relationDraftReducer(state, { type: 'set_relation_kind', value: '其他' });
  assert.equal(validateRelationDraft(state).error.code, 'relation_self_loop');
});

test('SJG-DATA-04: buildRelationFromDraft produces a SJG-DATA-04-shaped Relation', () => {
  const draft = readyDraft();
  const relation = buildRelationFromDraft(draft, {
    from_subject: 'self',
    to_subject: { kind: 'person', id: 'p_01' },
  });
  assert.equal(relation.id, 'rel_01');
  assert.equal(relation.from_subject, 'self');
  assert.deepEqual(relation.to_subject, { kind: 'person', id: 'p_01' });
  assert.equal(relation.relation_kind, '伴侣');
});

test('SJG-DATA-04: buildRelationFromDraft throws when id missing', () => {
  assert.throws(
    () => buildRelationFromDraft(createEmptyRelationDraft(), {
      from_subject: 'self',
      to_subject: { kind: 'person', id: 'p_01' },
    }),
    /Relation\.id must be assigned/,
  );
});

test('SJG-DATA-04: buildRelationFromDraft throws when from === to (self-loop)', () => {
  const draft = readyDraft();
  assert.throws(
    () => buildRelationFromDraft(draft, { from_subject: 'self', to_subject: 'self' }),
    /must not refer to the same subject/,
  );
});

test('SJG-DATA-04: newRelationId returns unique non-empty strings', () => {
  const a = newRelationId();
  const b = newRelationId();
  assert.ok(a.length > 0);
  assert.ok(b.length > 0);
  assert.notEqual(a, b);
});

test('SJG-DATA-04: findReferencesToRelation finds view.context_items body match', () => {
  const space = validShiJingSpace({
    views: [
      {
        id: 'v_X',
        title: 'X',
        anchor_subject: 'self',
        subjects: ['self'],
        time_scope: 'open_ended',
        context_items: [{ id: 'ctx_01', kind: 'note', body: 'rel_target', created_at: '2026-05-25T00:00:00Z' }],
        instructions: '',
        view_memory: { summary: '', updated_at: '2026-05-25T00:00:00Z', locked: false },
        display_state: 'normal',
      },
    ],
  });
  const refs = findReferencesToRelation(space, 'rel_target');
  assert.equal(refs.length, 1);
  assert.equal(refs[0].via, 'view:v_X:context_items:ctx_01');
});

test('SJG-DATA-04: findReferencesToRelation returns empty when no references', () => {
  const space = validShiJingSpace();
  const refs = findReferencesToRelation(space, 'rel_missing');
  assert.equal(refs.length, 0);
});

test('SJG-DATA-04: relations UI source contains no fetch/HTTP/Tauri/AI-provider call', () => {
  const dir = new URL('../src/product/relations/', import.meta.url);
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

test('SJG-DATA-04: RelationForm calls validateRelationDraft + validateShiJingSpace before dispatch', () => {
  const source = readFileSync(new URL('../src/product/relations/relation-form.tsx', import.meta.url), 'utf8');
  const draftIdx = source.indexOf('validateRelationDraft(draft)');
  const spaceIdx = source.indexOf('validateShiJingSpace(nextSnapshot)');
  const dispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(draftIdx >= 0);
  assert.ok(spaceIdx >= 0);
  assert.ok(draftIdx < dispatchIdx);
  assert.ok(spaceIdx < dispatchIdx);
});

test('SJG-DATA-04: RelationList delete flow checks dangling references AND validateShiJingSpace', () => {
  const source = readFileSync(new URL('../src/product/relations/relation-list.tsx', import.meta.url), 'utf8');
  const refsIdx = source.indexOf('findReferencesToRelation');
  const spaceIdx = source.indexOf('validateShiJingSpace');
  const dispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(refsIdx >= 0 && refsIdx < dispatchIdx);
  assert.ok(spaceIdx >= 0 && spaceIdx < dispatchIdx);
});

void validNatalInputs;
