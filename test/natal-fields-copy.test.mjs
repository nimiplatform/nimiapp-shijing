import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getProductCopy } from '../src/product/i18n/copy.ts';

const natalFieldsSource = readFileSync(
  new URL('../src/product/natal/natal-fields.tsx', import.meta.url),
  'utf8',
);

test('natal calibration disclosure badge says automatic instead of optional', () => {
  assert.equal(getProductCopy('zh').common.automatic, '自动');
  assert.equal(getProductCopy('en').common.automatic, 'Automatic');
  assert.match(natalFieldsSource, /copy\.common\.automatic/);
  assert.doesNotMatch(natalFieldsSource, /copy\.common\.optional/);
});
