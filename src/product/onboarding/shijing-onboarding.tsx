import { useEffect, useMemo, useState } from 'react';

import { CONCERN_TAG_ACTIVE_LIMIT } from '../../domain/concern-tag.ts';
import { ConcernTagControls } from '../concern-tags/concern-tag-controls.tsx';
import { SelfEditor } from '../self/self-editor.tsx';
import { useShijingStore } from '../state/shijing-store.tsx';
import { subjectMirrorReadiness } from '../subjects/natal-readiness.ts';
import { dailyMirrorScopeForToday } from '../tabs/mirror-scope-helpers.ts';
import { useProductCopy } from '../i18n/copy.ts';

export interface ShijingOnboardingProps {
  readonly onComplete: () => void;
}

type OnboardingPanel = 'profile' | 'concerns';

export function ShijingOnboarding(props: ShijingOnboardingProps) {
  const { state } = useShijingStore();
  const copy = useProductCopy();
  const [activePanel, setActivePanel] = useState<OnboardingPanel>('profile');
  const dailyScope = useMemo(() => dailyMirrorScopeForToday(), []);
  const selfReadiness = useMemo(
    () =>
      subjectMirrorReadiness({
        subject: 'self',
        space: state.snapshot,
        mirror_kind: 'rijing',
        mirror_scope: dailyScope,
      }),
    [state.snapshot, dailyScope],
  );
  const activeConcernCount = state.snapshot.concern_tags.filter((tag) => tag.status === 'active').length;
  const selfReady = selfReadiness.ok;
  const concernReady = activeConcernCount > 0;
  const complete = selfReady && concernReady;
  const nextPanel: OnboardingPanel = selfReady ? 'concerns' : 'profile';

  useEffect(() => {
    if (!selfReady) {
      setActivePanel('profile');
      return;
    }
    if (!concernReady) {
      setActivePanel('concerns');
    }
  }, [selfReady, concernReady]);

  return (
    <section
      className="shijing-onboarding"
      aria-label={copy.onboarding.ariaLabel}
      data-active-panel={activePanel}
    >
      <div className="shijing-onboarding__modal">
        <header className="shijing-onboarding__hero">
          <div className="shijing-onboarding__hero-copy">
            <p className="shijing-onboarding__eyebrow">{copy.onboarding.eyebrow}</p>
            <h1>{copy.onboarding.title}</h1>
            <p className="shijing-onboarding__lede">
              {copy.onboarding.lede}
            </p>
          </div>
          <button
            type="button"
            className="shijing-onboarding__confirm"
            disabled={!complete}
            onClick={props.onComplete}
          >
            {copy.onboarding.enter}
          </button>
        </header>

        <ol className="shijing-onboarding__steps" aria-label={copy.onboarding.readinessAria}>
          <li
            data-active={activePanel === 'profile' ? 'true' : 'false'}
            data-complete={selfReady ? 'true' : 'false'}
          >
            <button type="button" onClick={() => setActivePanel('profile')}>
              <span>01</span>
              <strong>{copy.onboarding.selfTitle}</strong>
              <small>{selfReady ? copy.onboarding.done : copy.onboarding.selfPending}</small>
            </button>
          </li>
          <li
            data-active={activePanel === 'concerns' ? 'true' : 'false'}
            data-complete={concernReady ? 'true' : 'false'}
          >
            <button type="button" onClick={() => setActivePanel('concerns')}>
              <span>02</span>
              <strong>{copy.onboarding.concernTitle}</strong>
              <small>
                {concernReady
                  ? copy.onboarding.activeCount(activeConcernCount, CONCERN_TAG_ACTIVE_LIMIT)
                  : copy.onboarding.concernPending}
              </small>
            </button>
          </li>
        </ol>

        <div className="shijing-onboarding__stage shijing-settings-page--styled">
          <div className="shijing-onboarding__stage-head">
            <p>
              {activePanel === 'profile'
                ? copy.onboarding.profileStageEyebrow
                : copy.onboarding.concernStageEyebrow}
            </p>
            <h2>
              {activePanel === 'profile'
                ? copy.onboarding.profileStageTitle
                : copy.onboarding.concernStageTitle}
            </h2>
          </div>
          <div
            className="shijing-onboarding__panel"
            hidden={activePanel !== 'profile'}
            aria-hidden={activePanel !== 'profile'}
          >
            <SelfEditor />
          </div>
          <div
            className="shijing-onboarding__panel"
            hidden={activePanel !== 'concerns'}
            aria-hidden={activePanel !== 'concerns'}
          >
            <ConcernTagControls />
          </div>
        </div>

        {!complete ? (
          <button
            type="button"
            className="shijing-onboarding__next"
            onClick={() => setActivePanel(nextPanel)}
          >
            {selfReady ? copy.onboarding.continueConcerns : copy.onboarding.continueProfile}
          </button>
        ) : null}
      </div>
    </section>
  );
}
