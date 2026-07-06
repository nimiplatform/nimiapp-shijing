import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isRuntimeProviderProductNotActivatedFailure,
  isMethodFeatureUnsupportedFailure,
  readingFailureHeadline,
  runtimeAiFailureRecoveryKind,
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

function providerProductNotActivatedFailure() {
  return {
    kind: 'runtime_ai_failed',
    mirror_kind: 'rijing',
    mirror_scope: { kind: 'daily', date: '2026-07-04', basis_time_zone: 'Asia/Shanghai' },
    detail:
      'provider_product_not_activated:provider_message=The product is not activated, please confirm that you have activated products and try again after activation.',
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

test('provider product activation failures are not presented as missing model configuration', () => {
  const failure = providerProductNotActivatedFailure();

  assert.equal(isRuntimeProviderProductNotActivatedFailure(failure), true);
  assert.equal(runtimeAiFailureRecoveryKind(failure), 'provider_product_activation');

  const zhHeadline = readingFailureHeadline(getProductCopy('zh'), failure);
  const enHeadline = readingFailureHeadline(getProductCopy('en'), failure);

  assert.match(zhHeadline, /云厂商|产品|开通/u);
  assert.doesNotMatch(zhHeadline, /配置 AI 模型/u);
  assert.match(enHeadline, /provider|activated|activation/i);
  assert.doesNotMatch(enHeadline, /configure AI model/i);
  assert.match(getProductCopy('zh').rijing.failureActions.runtimeProviderProductActivation, /开通|更换/u);
  assert.match(getProductCopy('en').rijing.failureActions.runtimeProviderProductActivation, /activate|switch/i);
});
