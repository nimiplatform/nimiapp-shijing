import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import type { ProductCopy } from '../../i18n/copy-types.ts';

const METHOD_FEATURE_UNSUPPORTED_PREFIX = 'method_feature_not_supported:';

export function isMethodFeatureUnsupportedFailure(
  failure: ReadingGenerationFailure,
): boolean {
  return (
    failure.stage === 'method_feature_support' &&
    typeof failure.detail === 'string' &&
    failure.detail.startsWith(METHOD_FEATURE_UNSUPPORTED_PREFIX)
  );
}

export function readingFailureHeadline(
  copy: ProductCopy,
  failure: ReadingGenerationFailure,
): string {
  if (isMethodFeatureUnsupportedFailure(failure)) {
    return copy.readingFailure.methodFeatureUnsupported;
  }
  return copy.readingFailure.headlines[failure.kind];
}
