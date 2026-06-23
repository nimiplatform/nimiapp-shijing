import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveShiJingSourceReadingIds } from '../src/product/tabs/shijing-source-readings.ts';
import { validReading } from './_fixtures.mjs';

function reading(kind, id, createdAt, overrides = {}) {
  const base = validReading({
    id,
    mirror_kind: kind,
    created_at: createdAt,
    ...overrides,
  });
  return {
    ...base,
    inputs_summary: {
      ...base.inputs_summary,
      captured_at: overrides.captured_at ?? createdAt,
    },
  };
}

test('resolveShiJingSourceReadingIds keeps explicit imported readings first', () => {
  const readings = [
    reading('rijing', 'r_ri_latest', '2026-05-25T04:00:00Z'),
    reading('yuejing', 'r_yue_imported', '2026-05-25T03:00:00Z'),
  ];

  assert.deepEqual(
    resolveShiJingSourceReadingIds({
      imported_reading_ids: ['r_yue_imported', 'r_yue_imported', 'r_missing'],
      readings,
      now: new Date('2026-05-25T06:00:00Z'),
    }),
    ['r_yue_imported'],
  );
});

test('resolveShiJingSourceReadingIds falls back to latest fresh non-consultation readings', () => {
  const readings = [
    reading('rijing', 'r_ri_old', '2026-05-25T01:00:00Z'),
    reading('rijing', 'r_ri_latest', '2026-05-25T05:00:00Z'),
    reading('yuejing', 'r_yue_latest', '2026-05-24T05:00:00Z'),
    reading('nianjing', 'r_nian_latest', '2026-05-20T05:00:00Z'),
    reading('shijing', 'r_consultation', '2026-05-25T06:00:00Z'),
  ];

  assert.deepEqual(
    resolveShiJingSourceReadingIds({
      imported_reading_ids: [],
      readings,
      now: new Date('2026-05-25T06:00:00Z'),
    }),
    ['r_ri_latest', 'r_yue_latest', 'r_nian_latest'],
  );
});

test('resolveShiJingSourceReadingIds does not reuse expired inputs summaries', () => {
  const readings = [
    reading('rijing', 'r_ri_expired', '2026-05-20T05:00:00Z', {
      captured_at: '2026-05-20T05:00:00Z',
    }),
  ];

  assert.deepEqual(
    resolveShiJingSourceReadingIds({
      imported_reading_ids: [],
      readings,
      now: new Date('2026-05-25T06:00:00Z'),
    }),
    [],
  );
});
