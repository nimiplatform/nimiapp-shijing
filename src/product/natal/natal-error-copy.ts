// Human-readable Chinese messages for natal-input build / validation errors.
// The editors surface these instead of raw codes like `latitude_invalid`, so a
// user who left required fields blank gets actionable guidance.
//
// Keyed by the leaf error code (build-step codes, validator codes, and the
// `birth_datetime_underivable` reasons all share one flat dictionary).

import { getProductCopy, type ProductCopy } from '../i18n/copy.ts';

export function describeNatalError(
  code: string,
  copy: ProductCopy = getProductCopy('zh'),
): string {
  return copy.natalErrors[code] ?? copy.operationFailed(code);
}
