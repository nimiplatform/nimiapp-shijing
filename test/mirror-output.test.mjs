// SJG-ASTRO-03..08 — MirrorOutput validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateMirrorOutput } from '../src/contracts/mirror-output-validator.ts';
import {
  rolling30DayMirrorScope,
  validNianjingOutput,
  validRijingOutput,
  validShijingOutput,
  validYuejingOutput,
} from './_fixtures.mjs';

test('valid rijing output passes', () => {
  assert.equal(validateMirrorOutput(validRijingOutput()).ok, true);
});

test('rejects rijing output missing daily_overview', () => {
  const result = validateMirrorOutput({ ...validRijingOutput(), daily_overview: '' });
  assert.equal(result.ok, false);
});

test('rejects rijing projection missing recommendations array', () => {
  const out = validRijingOutput();
  delete out.concern_projections[0].recommendations;
  const result = validateMirrorOutput(out);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(
      result.error.code,
      'mirror_output_rijing_concern_projection_recommendations_invalid',
    );
  }
});

test('rejects mirror output with forbidden score field', () => {
  const out = { ...validRijingOutput(), score: 1 };
  assert.equal(validateMirrorOutput(out).ok, false);
});

test('rejects mirror output with forbidden trend_chart field', () => {
  const out = { ...validRijingOutput(), trend_chart: { points: [] } };
  assert.equal(validateMirrorOutput(out).ok, false);
});

test('rejects mirror output with citation method outside allowlist', () => {
  const out = {
    ...validRijingOutput(),
    citations: [{ method: 'tarot_v1', reference: 'r1' }],
  };
  assert.equal(validateMirrorOutput(out).ok, false);
});

test('valid yuejing output passes', () => {
  assert.equal(validateMirrorOutput(validYuejingOutput()).ok, true);
});

test('rejects yuejing cell with invalid tendency class', () => {
  const out = validYuejingOutput(rolling30DayMirrorScope());
  out.cells = [{ ...out.cells[0], tendency_class: 'lucky' }];
  assert.equal(validateMirrorOutput(out).ok, false);
});

test('valid nianjing output passes', () => {
  assert.equal(validateMirrorOutput(validNianjingOutput()).ok, true);
});

test('rejects nianjing inflection with invalid kind', () => {
  const out = validNianjingOutput();
  out.inflection_points = [{ ...out.inflection_points[0], kind: 'mystery' }];
  assert.equal(validateMirrorOutput(out).ok, false);
});

test('valid shijing output passes', () => {
  assert.equal(validateMirrorOutput(validShijingOutput()).ok, true);
});

test('rejects shijing output with empty cited_reading_ids', () => {
  const out = { ...validShijingOutput(), cited_reading_ids: [] };
  assert.equal(validateMirrorOutput(out).ok, false);
});

test('rejects shijing output with empty answer', () => {
  const out = { ...validShijingOutput(), answer: '' };
  assert.equal(validateMirrorOutput(out).ok, false);
});

test('rejects mirror output missing summary', () => {
  const out = { ...validRijingOutput(), summary: '' };
  assert.equal(validateMirrorOutput(out).ok, false);
});
