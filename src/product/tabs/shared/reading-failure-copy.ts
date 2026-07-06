import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import type { ProductCopy } from '../../i18n/copy-types.ts';

const METHOD_FEATURE_UNSUPPORTED_PREFIX = 'method_feature_not_supported:';
const RUNTIME_PROVIDER_PRODUCT_NOT_ACTIVATED_PREFIX = 'provider_product_not_activated:';

export type RuntimeAiFailureRecoveryKind =
  | 'model_configuration'
  | 'provider_product_activation';

export function isMethodFeatureUnsupportedFailure(
  failure: ReadingGenerationFailure,
): boolean {
  return (
    failure.stage === 'method_feature_support' &&
    typeof failure.detail === 'string' &&
    failure.detail.startsWith(METHOD_FEATURE_UNSUPPORTED_PREFIX)
  );
}

export function isRuntimeProviderProductNotActivatedFailure(
  failure: ReadingGenerationFailure,
): boolean {
  return (
    failure.kind === 'runtime_ai_failed' &&
    typeof failure.detail === 'string' &&
    failure.detail.startsWith(RUNTIME_PROVIDER_PRODUCT_NOT_ACTIVATED_PREFIX)
  );
}

export function runtimeAiFailureRecoveryKind(
  failure: ReadingGenerationFailure,
): RuntimeAiFailureRecoveryKind | null {
  if (failure.kind !== 'runtime_ai_failed') return null;
  if (isRuntimeProviderProductNotActivatedFailure(failure)) {
    return 'provider_product_activation';
  }
  return 'model_configuration';
}

export function readingFailureHeadline(
  copy: ProductCopy,
  failure: ReadingGenerationFailure,
): string {
  if (isMethodFeatureUnsupportedFailure(failure)) {
    return copy.readingFailure.methodFeatureUnsupported;
  }
  if (isRuntimeProviderProductNotActivatedFailure(failure)) {
    return copy.readingFailure.runtimeProviderProductNotActivated;
  }
  return copy.readingFailure.headlines[failure.kind];
}
