// W06 — typed ReadingGenerationFailure banner (shared across tabs).
//
// SJG-PROD-11 + SJG-ALGO-10: render the failure code verbatim. Never
// substitute synthesized Reading content.

import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { useState } from 'react';
import { useShijingStore } from '../../state/shijing-store.tsx';
import { useProductCopy } from '../../i18n/copy.ts';
import { readingFailureHeadline, runtimeAiFailureRecoveryKind } from './reading-failure-copy.ts';

export interface FailureBannerProps {
  readonly failure: ReadingGenerationFailure;
  readonly onRetry?: () => void;
  readonly action?: {
    readonly label: string;
    readonly onClick: () => void;
  };
}

export function FailureBanner(props: FailureBannerProps) {
  const copy = useProductCopy();
  const { open_runtime_ai_recovery } = useShijingStore();
  const [opening, setOpening] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const recovery = runtimeAiFailureRecoveryKind(props.failure);
  const recoveryCopy = copy.readingFailure.recovery;
  const action = props.action ?? (recovery === 'retry' && props.onRetry
    ? { label: recoveryCopy.labels.retry, onClick: props.onRetry }
    : recovery && recovery !== 'retry' && open_runtime_ai_recovery
      ? {
          label: recoveryCopy.labels[recovery],
          onClick: () => {
            setOpening(true);
            setNavigationError(null);
            setOpened(false);
            void open_runtime_ai_recovery(recovery).then(() => setOpened(true)).catch((error: unknown) => {
              setNavigationError(error instanceof Error ? error.message : String(error));
            }).finally(() => setOpening(false));
          },
        }
      : undefined);
  // @nimi-authority: rule.shijing.ia.r005
  return (
    <div role="alert" className="shijing-failure-banner" data-failure-kind={props.failure.kind}>
      <div className="shijing-failure-banner__copy">
        {readingFailureHeadline(copy, props.failure)}
        {props.failure.detail ? <code>{props.failure.detail}</code> : null}
        {props.failure.reason_code ? <code>{props.failure.reason_code}</code> : null}
        {recovery ? <p>{recoveryCopy.guidance[recovery]}</p> : null}
        {opened ? <p role="status">{recoveryCopy.opened}</p> : null}
        {navigationError ? <p>{recoveryCopy.openFailed} <code>{navigationError}</code></p> : null}
      </div>
      {action ? (
        <button
          type="button"
          className="shijing-failure-banner__action"
          onClick={action.onClick}
          disabled={opening}
          aria-busy={opening}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
