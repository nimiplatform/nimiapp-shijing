import assert from 'node:assert/strict';
import test from 'node:test';
import { ZH_BASE_COPY } from '../src/product/i18n/zh/base.ts';
import {
  buildCitationBasisRows,
  formatCitationMethod,
  formatCitationReference,
} from '../src/product/tabs/shared/citation-basis.ts';
import { validReading } from './_fixtures.mjs';

test('citation drawer basis rows use user-facing labels instead of internal provenance fields', () => {
  const reading = validReading({
    mirror_kind: 'shijing',
    cited_reading_ids: ['r_daily', 'r_monthly'],
    inputs_summary: {
      ...validReading({ mirror_kind: 'shijing', cited_reading_ids: ['r_daily', 'r_monthly'] }).inputs_summary,
      input_hash: '306cfe3c883a68ad9c8d',
    },
  });

  const rows = buildCitationBasisRows(reading, ZH_BASE_COPY.citationDrawer);
  const text = rows.map((row) => `${row.label}: ${row.value}`).join('\n');

  assert.match(text, /推演方法: 八字子平法/);
  assert.match(text, /问镜依据: 引用 2 份已生成解读/);
  assert.match(text, /依据冻结:/);
  assert.match(text, /本地校验:/);

  for (const internal of [
    'input_hash',
    'feature_snapshot_hash',
    'canonical_window',
    'bazi_ziping_v1',
    '306cfe3c883a68ad',
  ]) {
    assert.doesNotMatch(text, new RegExp(internal));
  }
});

test('citation references translate method ids and reference ids into readable provenance', () => {
  assert.equal(formatCitationMethod('bazi_ziping_v1'), '八字子平法');
  assert.equal(formatCitationReference('shijing.consultation_grounding'), '问镜引用解读与问题上下文');
});
