// SJG-DATA-10 — Conversation validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateConversation } from '../src/contracts/conversation-validator.ts';
import { validConversation } from './_fixtures.mjs';

test('valid conversation passes', () => {
  assert.equal(validateConversation(validConversation()).ok, true);
});

test('rejects conversation with empty source_reading_ids', () => {
  const c = { ...validConversation(), source_reading_ids: [] };
  assert.equal(validateConversation(c).ok, false);
});

test('rejects conversation with empty concern archive ref', () => {
  const c = { ...validConversation(), concern_tag_refs: [''] };
  const result = validateConversation(c);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'conversation_concern_tag_ref_empty');
  }
});

test('rejects AI turn that fails to cite any reading', () => {
  const c = validConversation();
  c.turns[1].cited_reading_ids = [];
  const result = validateConversation(c);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'conversation_turn_ai_must_disclose_source_reading');
  }
});

test('rejects AI turn citing a reading not in source_reading_ids', () => {
  const c = validConversation();
  c.turns[1].cited_reading_ids = ['unknown'];
  const result = validateConversation(c);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(
      result.error.code,
      'conversation_turn_ai_cited_reading_must_be_in_source_reading_ids',
    );
  }
});

test('rejects turn with invalid role', () => {
  const c = validConversation();
  c.turns[0].role = 'assistant';
  assert.equal(validateConversation(c).ok, false);
});

test('rejects turn with empty body', () => {
  const c = validConversation();
  c.turns[0].body = '';
  assert.equal(validateConversation(c).ok, false);
});
