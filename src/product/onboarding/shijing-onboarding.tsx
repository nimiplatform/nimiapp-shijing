import { useEffect, useMemo, useState } from 'react';

import { CONCERN_TAG_ACTIVE_LIMIT } from '../../domain/concern-tag.ts';
import { ConcernTagControls } from '../concern-tags/concern-tag-controls.tsx';
import { SelfEditor } from '../self/self-editor.tsx';
import { useShijingStore } from '../state/shijing-store.tsx';
import { subjectMirrorReadiness } from '../subjects/natal-readiness.ts';
import { dailyMirrorScopeForToday } from '../tabs/mirror-scope-helpers.ts';

export interface ShijingOnboardingProps {
  readonly onComplete: () => void;
}

type OnboardingPanel = 'profile' | 'concerns';

export function ShijingOnboarding(props: ShijingOnboardingProps) {
  const { state } = useShijingStore();
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
      aria-label="启动准备"
      data-active-panel={activePanel}
    >
      <div className="shijing-onboarding__modal">
        <header className="shijing-onboarding__hero">
          <div className="shijing-onboarding__hero-copy">
            <p className="shijing-onboarding__eyebrow">启动准备</p>
            <h1>让日镜先认识你。</h1>
            <p className="shijing-onboarding__lede">
              完成本人资料和关注，日镜会据此生成今日判断。
            </p>
          </div>
          <button
            type="button"
            className="shijing-onboarding__confirm"
            disabled={!complete}
            onClick={props.onComplete}
          >
            进入日镜
          </button>
        </header>

        <ol className="shijing-onboarding__steps" aria-label="准备状态">
          <li
            data-active={activePanel === 'profile' ? 'true' : 'false'}
            data-complete={selfReady ? 'true' : 'false'}
          >
            <button type="button" onClick={() => setActivePanel('profile')}>
              <span>01</span>
              <strong>本人资料</strong>
              <small>{selfReady ? '已完成' : '建立本命输入'}</small>
            </button>
          </li>
          <li
            data-active={activePanel === 'concerns' ? 'true' : 'false'}
            data-complete={concernReady ? 'true' : 'false'}
          >
            <button type="button" onClick={() => setActivePanel('concerns')}>
              <span>02</span>
              <strong>关注</strong>
              <small>
                {concernReady
                  ? `${activeConcernCount}/${CONCERN_TAG_ACTIVE_LIMIT} 已激活`
                  : '至少激活 1 项'}
              </small>
            </button>
          </li>
        </ol>

        <div className="shijing-onboarding__stage shijing-settings-page--styled">
          <div className="shijing-onboarding__stage-head">
            <p>{activePanel === 'profile' ? '出生信息' : '关注镜片'}</p>
            <h2>{activePanel === 'profile' ? '先确定推算依据。' : '再告诉日镜该看向哪里。'}</h2>
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
            {selfReady ? '继续选择关注' : '继续完善资料'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
