// Settings > 推演方法 React editor — pick the active 命理 algorithm engine
// (八字子平 / 紫微斗数). Saves immediately; new readings use the chosen method.

import { useState } from 'react';
import {
  ADMITTED_METHOD_PROFILE_IDS,
  DEFAULT_METHOD_PROFILE_ID,
  type MethodProfileId,
} from '../../domain/algorithm.ts';
import { METHOD_LABELS } from '../reading/reading-format.ts';
import { SjpSelect } from '../components/sjp-select.tsx';
import { useShijingStore } from '../state/shijing-store.tsx';
import { commitMethodProfile } from './method-profile-state.ts';

export function MethodProfileEditor() {
  const { state, dispatch } = useShijingStore();
  const current = state.snapshot.settings.method_profile_id ?? DEFAULT_METHOD_PROFILE_ID;
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function onChange(value: string) {
    const next = commitMethodProfile(state.snapshot, value as MethodProfileId);
    dispatch({ type: 'snapshot/replace', snapshot: next });
    setSavedAt(new Date().toISOString());
  }

  return (
    <section className="sjp-card">
      <div className="sjp-card-head">
        <span className="sjp-card-icon">
          <svg
            className="sjp-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2l9 5-9 5-9-5 9-5z" />
            <path d="M3 12l9 5 9-5" />
            <path d="M3 17l9 5 9-5" />
          </svg>
        </span>
        <div>
          <h2 className="sjp-card-title">推演方法</h2>
          <p className="sjp-card-desc">选择命理算法引擎,新生成的日/月/年镜与时镜将采用此方法</p>
        </div>
      </div>

      <div className="sjp-grid">
        <div className="sjp-field sjp-field--full">
          <label className="sjp-label" htmlFor="method-profile">命理算法</label>
          <SjpSelect
            id="method-profile"
            value={current}
            onValueChange={onChange}
            options={ADMITTED_METHOD_PROFILE_IDS.map((id) => ({ value: id, label: METHOD_LABELS[id] }))}
          />
        </div>
        <p className="sjp-note">切换后立即生效;已生成的解读保留各自方法,可并排对照。</p>
        {savedAt ? (
          <p className="sjp-status" role="status">
            已切换 ({savedAt})
          </p>
        ) : null}
      </div>
    </section>
  );
}
