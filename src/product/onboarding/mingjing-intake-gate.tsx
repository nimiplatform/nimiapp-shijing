// Soft intake gate (rule.shijing.ia.r005): before the first self + concern
// intake completes, the five non-mingjing mirrors stay navigable, but their
// content area renders this typed guide with a recovery route to 命镜 instead
// of mirror content. Step status mirrors the 命镜 startup-guide semantics so
// what the user sees here always matches what the onboarding requires.

import { useMemo } from 'react';

import { CONCERN_TAG_ACTIVE_LIMIT } from '../../domain/concern-tag.ts';
import type { ShijingTabId } from '../../contracts/ia-contract.ts';
import { useProductCopy } from '../i18n/copy.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { mingJingReadiness } from '../tabs/mingjing/mingjing-readiness.ts';

export interface MingJingIntakeGateProps {
  readonly gatedTab: ShijingTabId;
  readonly onGoToMingJing: () => void;
}

const stepCheckIcon = (
  <svg viewBox="0 0 12 12" fill="none" aria-hidden>
    <path
      d="M2.4 6.3 4.7 8.6 9.6 3.4"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function MingJingIntakeGate(props: MingJingIntakeGateProps) {
  const { state } = useShijingStore();
  const copy = useProductCopy();
  const gate = copy.intakeGate;
  const selfReady = useMemo(
    () => mingJingReadiness(state.snapshot).ok,
    [state.snapshot],
  );
  const activeConcernCount = state.snapshot.concern_tags.filter((tag) => tag.status === 'active').length;
  const concernReady = activeConcernCount > 0;
  const mirrorLabel = copy.tabLabels[props.gatedTab];
  const mirrorGlyph = Array.from(mirrorLabel)[0] ?? mirrorLabel;

  return (
    <section
      className="shijing-tab shijing-intake-gate"
      data-mirror-kind={props.gatedTab}
      aria-label={gate.ariaLabel}
    >
      <div className="shijing-intake-gate__stage">
        <div className="shijing-intake-gate__halo" aria-hidden>
          <span className="shijing-intake-gate__halo-ring" />
          <span className="shijing-intake-gate__halo-orbit">
            <span className="shijing-intake-gate__halo-dot shijing-intake-gate__halo-dot--accent" />
            <span className="shijing-intake-gate__halo-dot shijing-intake-gate__halo-dot--gold" />
          </span>
          <span className="shijing-intake-gate__halo-disc">
            <span className="shijing-intake-gate__halo-glyph">{mirrorGlyph}</span>
          </span>
        </div>

        <p className="shijing-intake-gate__eyebrow">{gate.eyebrow}</p>
        <h1 className="shijing-intake-gate__title">{gate.title(mirrorLabel)}</h1>
        <p className="shijing-intake-gate__body">{gate.body}</p>

        <ol className="shijing-intake-gate__steps" aria-label={gate.ariaLabel}>
          <li data-complete={selfReady ? 'true' : 'false'}>
            <span className="shijing-intake-gate__step-marker" aria-hidden>
              {selfReady ? (
                stepCheckIcon
              ) : (
                <span className="shijing-intake-gate__step-index">01</span>
              )}
            </span>
            <strong>{gate.selfTitle}</strong>
            <small className="shijing-intake-gate__step-status">
              {selfReady ? gate.done : gate.selfPending}
            </small>
          </li>
          <li data-complete={concernReady ? 'true' : 'false'}>
            <span className="shijing-intake-gate__step-marker" aria-hidden>
              {concernReady ? (
                stepCheckIcon
              ) : (
                <span className="shijing-intake-gate__step-index">02</span>
              )}
            </span>
            <strong>{gate.concernTitle}</strong>
            <small className="shijing-intake-gate__step-status">
              {concernReady
                ? gate.activeCount(activeConcernCount, CONCERN_TAG_ACTIVE_LIMIT)
                : gate.concernPending}
            </small>
          </li>
        </ol>

        <button
          type="button"
          className="shijing-intake-gate__action"
          onClick={props.onGoToMingJing}
        >
          {gate.action}
          <span className="shijing-intake-gate__action-arrow" aria-hidden>→</span>
        </button>
      </div>
    </section>
  );
}
