// W-c03 — Settings > Response Preferences editor state tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import { commitResponsePreferences } from '../src/product/settings/response-preferences-state.ts';
import { validShiJingSpace } from './_fixtures.mjs';

test('commitResponsePreferences accepts a valid draft', () => {
  const r = commitResponsePreferences(validShiJingSpace(), {
    tone: 'warm',
    length: 'long',
    language: 'zh-Hans',
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.next_space.settings.response_preferences.tone, 'warm');
    assert.equal(r.next_space.settings.response_preferences.length, 'long');
  }
});

test('commitResponsePreferences rejects invalid tone', () => {
  const r = commitResponsePreferences(validShiJingSpace(), {
    tone: 'snarky',
    length: 'short',
    language: 'zh-Hans',
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'tone_invalid');
});

test('commitResponsePreferences rejects empty language', () => {
  const r = commitResponsePreferences(validShiJingSpace(), {
    tone: 'neutral',
    length: 'standard',
    language: '   ',
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'language_empty');
});

test('commitResponsePreferences rejects unsupported language', () => {
  const r = commitResponsePreferences(validShiJingSpace(), {
    tone: 'neutral',
    length: 'standard',
    language: 'fr-FR',
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'language_invalid');
});

test('commitResponsePreferences carries extra_instructions when present', () => {
  const r = commitResponsePreferences(validShiJingSpace(), {
    tone: 'neutral',
    length: 'standard',
    language: 'zh-Hans',
    extra_instructions: 'be brief',
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.next_space.settings.response_preferences.extra_instructions, 'be brief');
  }
});
