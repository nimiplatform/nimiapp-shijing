import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isMethodFeatureUnsupportedFailure,
  readingFailureHeadline,
} from '../src/product/tabs/shared/reading-failure-copy.ts';
import { getProductCopy } from '../src/product/i18n/copy.ts';
import { consultationMirrorScope, rolling30DayMirrorScope } from './_fixtures.mjs';

function unsupportedConsultationMethodFailure() {
  return {
    kind: 'algorithm_fail_closed',
    mirror_kind: 'shijing',
    mirror_scope: consultationMirrorScope(),
    stage: 'method_feature_support',
    detail:
      'method_feature_not_supported:shijing.consultation:qizheng_siyu_guolao_v1:supported=bazi_ziping_v1,ziwei_sanhe_v1',
  };
}

test('method feature support failures are not presented as data precision gaps', () => {
  const failure = unsupportedConsultationMethodFailure();

  assert.equal(isMethodFeatureUnsupportedFailure(failure), true);

  const zhHeadline = readingFailureHeadline(getProductCopy('zh'), failure);
  const enHeadline = readingFailureHeadline(getProductCopy('en'), failure);

  assert.doesNotMatch(zhHeadline, /\u8d44\u6599\u7cbe\u5ea6/u);
  assert.match(zhHeadline, /\u63a8\u6f14\u65b9\u6cd5|\u65b9\u6cd5/u);
  assert.doesNotMatch(enHeadline, /data precision/i);
  assert.match(enHeadline, /selected method/i);
});

test('ordinary algorithm fail-close keeps the generic SJG-ALGO-10 headline', () => {
  const failure = {
    kind: 'algorithm_fail_closed',
    mirror_kind: 'yuejing',
    mirror_scope: rolling30DayMirrorScope(),
    stage: 'uncertainty_decision',
    detail: 'SJG-ALGO-10 fail-closed: no_active_concern_tags',
  };

  assert.equal(isMethodFeatureUnsupportedFailure(failure), false);
  assert.equal(
    readingFailureHeadline(getProductCopy('en'), failure),
    getProductCopy('en').readingFailure.headlines.algorithm_fail_closed,
  );
});
