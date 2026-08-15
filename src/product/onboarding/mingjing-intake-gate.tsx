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

  return (
    <section
      className="shijing-tab shijing-intake-gate"
      data-mirror-kind={props.gatedTab}
      aria-label={gate.ariaLabel}
    >
      <div className="shijing-intake-gate__card">
        <p className="shijing-intake-gate__eyebrow">{gate.eyebrow}</p>
        <h1 className="shijing-intake-gate__title">{gate.title(copy.tabLabels[props.gatedTab])}</h1>
        <p className="shijing-intake-gate__body">{gate.body}</p>
        <ul className="shijing-intake-gate__steps" aria-label={gate.ariaLabel}>
          <li data-complete={selfReady ? 'true' : 'false'}>
            <span className="shijing-intake-gate__step-dot" aria-hidden />
            <strong>{gate.selfTitle}</strong>
            <small>{selfReady ? gate.done : gate.selfPending}</small>
          </li>
          <li data-complete={concernReady ? 'true' : 'false'}>
            <span className="shijing-intake-gate__step-dot" aria-hidden />
            <strong>{gate.concernTitle}</strong>
            <small>
              {concernReady
                ? gate.activeCount(activeConcernCount, CONCERN_TAG_ACTIVE_LIMIT)
                : gate.concernPending}
            </small>
          </li>
        </ul>
        <button
          type="button"
          className="shijing-intake-gate__action"
          onClick={props.onGoToMingJing}
        >
          {gate.action}
        </button>
      </div>
    </section>
  );
}
