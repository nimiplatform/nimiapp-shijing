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
import { useProductCopy } from '../i18n/copy.ts';
import { deriveMethodProfileCapabilityRows } from './method-profile-capabilities.ts';
import { commitMethodProfile } from './method-profile-state.ts';

export function MethodProfileEditor() {
  const { state, dispatch } = useShijingStore();
  const copy = useProductCopy();
  const current = state.snapshot.settings.method_profile_id ?? DEFAULT_METHOD_PROFILE_ID;
  const capabilityRows = deriveMethodProfileCapabilityRows();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function onChange(value: string) {
    const next = commitMethodProfile(state.snapshot, value as MethodProfileId);
    dispatch({ type: 'snapshot/replace', snapshot: next });
    setSavedAt(new Date().toISOString());
  }

  return (
    <section id="settings-method-profile" className="sjp-card" tabIndex={-1}>
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
          <h2 className="sjp-card-title">{copy.methodProfile.title}</h2>
          <p className="sjp-card-desc">{copy.methodProfile.description}</p>
        </div>
      </div>

      <div className="sjp-grid">
        <div className="sjp-field sjp-field--full">
          <label className="sjp-label" htmlFor="method-profile">{copy.methodProfile.algorithm}</label>
          <SjpSelect
            id="method-profile"
            value={current}
            onValueChange={onChange}
            options={ADMITTED_METHOD_PROFILE_IDS.map((id) => ({ value: id, label: METHOD_LABELS[id] }))}
          />
        </div>
        <p className="sjp-note">{copy.methodProfile.note}</p>
        {savedAt ? (
          <p className="sjp-status" role="status">
            {copy.methodProfile.switchedAt(savedAt)}
          </p>
        ) : null}
        <div className="sjp-field sjp-field--full">
          <div className="sjp-method-capabilities" aria-label={copy.methodProfile.capabilities.title}>
            <div>
              <h3 className="sjp-subpanel-title">{copy.methodProfile.capabilities.title}</h3>
              <p className="sjp-note">{copy.methodProfile.capabilities.description}</p>
            </div>
            <div className="sjp-method-capability-list">
              {capabilityRows.map((row) => {
                const currentMethod = row.method_profile_id === current;
                return (
                  <article
                    key={row.method_profile_id}
                    className="sjp-method-capability"
                    data-method-profile-id={row.method_profile_id}
                    data-current={currentMethod ? 'true' : undefined}
                  >
                    <div className="sjp-method-capability__head">
                      <strong>{row.method_label}</strong>
                      {currentMethod ? (
                        <span className="sjp-tag">{copy.methodProfile.capabilities.current}</span>
                      ) : null}
                    </div>
                    <div className="sjp-method-capability__section">
                      <span className="sjp-method-capability__section-title">
                        {copy.methodProfile.capabilities.algorithmNeutralTitle}
                      </span>
                      <ul className="sjp-method-capability__chips">
                        {row.algorithm_neutral_features.map((feature) => (
                          <li
                            key={feature.id}
                            className="sjp-method-capability__chip"
                            data-supported={feature.supported ? 'true' : 'false'}
                          >
                            <span>{copy.methodProfile.capabilities.featureLabels[feature.id]}</span>
                            <small>
                              {feature.supported
                                ? copy.methodProfile.capabilities.supported
                                : copy.methodProfile.capabilities.unavailable}
                            </small>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div
                      className="sjp-method-capability__route"
                      data-mingjing-route-status={row.mingjing_route.status}
                    >
                      <span className="sjp-method-capability__section-title">
                        {copy.methodProfile.capabilities.mingjingRouteTitle}
                      </span>
                      {row.mingjing_route.supported_features.length > 0 ? (
                        <ul className="sjp-method-capability__chips">
                          {row.mingjing_route.supported_features.map((feature) => (
                            <li
                              key={feature}
                              className="sjp-method-capability__chip"
                              data-supported="true"
                            >
                              <span>{copy.methodProfile.capabilities.routeFeatureLabels[feature]}</span>
                              <small>{copy.methodProfile.capabilities.supported}</small>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="sjp-note sjp-note--warn">
                          {copy.methodProfile.capabilities.noRouteFeatures}
                        </p>
                      )}
                      {row.mingjing_route.fail_close_detail ? (
                        <p className="sjp-note sjp-note--warn">
                          {copy.methodProfile.capabilities.failClosePrefix}: <code>{row.mingjing_route.fail_close_detail}</code>
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
