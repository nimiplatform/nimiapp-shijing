// W06 — typed ReadingGenerationFailure banner (shared across tabs).
//
// SJG-PROD-11 + SJG-ALGO-10: render the failure code verbatim. Never
// substitute synthesized Reading content.

import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { useProductCopy } from '../../i18n/copy.ts';
import { readingFailureHeadline } from './reading-failure-copy.ts';

export interface FailureBannerProps {
  readonly failure: ReadingGenerationFailure;
  readonly action?: {
    readonly label: string;
    readonly onClick: () => void;
  };
}

export function FailureBanner(props: FailureBannerProps) {
  const copy = useProductCopy();
  return (
    <div role="alert" className="shijing-failure-banner" data-failure-kind={props.failure.kind}>
      <div className="shijing-failure-banner__copy">
        {readingFailureHeadline(copy, props.failure)}
        {props.failure.detail ? <code>{props.failure.detail}</code> : null}
      </div>
      {props.action ? (
        <button
          type="button"
          className="shijing-failure-banner__action"
          onClick={props.action.onClick}
        >
          {props.action.label}
        </button>
      ) : null}
    </div>
  );
}
