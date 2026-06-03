// SJG-ALGO-11 / SJG-ALGO-12 — algorithm correctness tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalSerialize,
  computeCanonicalHash,
  sha256HexFromUtf8,
} from '../src/product/astrology/canonical-hash.ts';
import { inputsSummaryExpired } from '../src/product/astrology/inputs-summary-expiry.ts';
import { resolveCanonicalMirrorWindow } from '../src/product/astrology/mirror-window.ts';
import {
  consultationMirrorScope,
  dailyMirrorScope,
  longHorizonMirrorScope,
  rolling30DayMirrorScope,
  validReading,
} from './_fixtures.mjs';

test('canonicalSerialize sorts object keys deterministically', () => {
  const a = canonicalSerialize({ b: 2, a: 1 });
  const b = canonicalSerialize({ a: 1, b: 2 });
  assert.equal(a, b);
});

test('canonicalSerialize NFC-normalizes strings', () => {
  const composed = 'é';
  const decomposed = 'é';
  const a = canonicalSerialize({ k: composed });
  const b = canonicalSerialize({ k: decomposed });
  assert.equal(a, b);
});

test('sha256HexFromUtf8 matches known reference vector for empty string', () => {
  const empty = sha256HexFromUtf8('');
  assert.equal(empty, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('computeCanonicalHash is stable for equal objects', () => {
  const a = computeCanonicalHash({ x: [1, 2, 3], y: 'foo' });
  const b = computeCanonicalHash({ y: 'foo', x: [1, 2, 3] });
  assert.equal(a, b);
});

test('mirror-window: daily', () => {
  const r = resolveCanonicalMirrorWindow(dailyMirrorScope({ date: '2026-05-25' }));
  assert.equal(r.ok, true);
});

test('mirror-window: rolling_30_day', () => {
  const r = resolveCanonicalMirrorWindow(rolling30DayMirrorScope());
  assert.equal(r.ok, true);
});

test('mirror-window: long_horizon', () => {
  const r = resolveCanonicalMirrorWindow(longHorizonMirrorScope());
  assert.equal(r.ok, true);
});

test('mirror-window: consultation without question_window yields anchored window', () => {
  const r = resolveCanonicalMirrorWindow(consultationMirrorScope(['r_01']));
  assert.equal(r.ok, true);
});

test('inputsSummaryExpired: rijing 24h horizon', () => {
  const recent = validReading({
    mirror_kind: 'rijing',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });
  recent.inputs_summary = { ...recent.inputs_summary, captured_at: recent.created_at };
  assert.equal(inputsSummaryExpired(recent, new Date()), false);

  const stale = validReading({
    mirror_kind: 'rijing',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });
  stale.inputs_summary = { ...stale.inputs_summary, captured_at: stale.created_at };
  assert.equal(inputsSummaryExpired(stale, new Date()), true);
});

test('inputsSummaryExpired: yuejing 7d horizon', () => {
  const r = validReading({
    mirror_kind: 'yuejing',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });
  r.inputs_summary = { ...r.inputs_summary, captured_at: r.created_at };
  assert.equal(inputsSummaryExpired(r, new Date()), true);
});

test('inputsSummaryExpired: nianjing 30d horizon', () => {
  const r = validReading({
    mirror_kind: 'nianjing',
    created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });
  r.inputs_summary = { ...r.inputs_summary, captured_at: r.created_at };
  assert.equal(inputsSummaryExpired(r, new Date()), true);
});

test('inputsSummaryExpired: shijing 7d horizon', () => {
  const r = validReading({
    mirror_kind: 'shijing',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });
  r.inputs_summary = { ...r.inputs_summary, captured_at: r.created_at };
  assert.equal(inputsSummaryExpired(r, new Date()), true);
});
