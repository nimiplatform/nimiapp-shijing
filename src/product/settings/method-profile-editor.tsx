// Settings > 推演方法 React editor — pick the active 命理 algorithm engine
// (八字子平 / 紫微斗数). Saves immediately; new readings use the chosen method.
// The selected method's mirror capabilities show as compact chips; the full
// per-method capability declaration stays one expand away in the collapse.

import { useState } from 'react';
import { nimiToast } from '@nimiplatform/kit/ui';
import {
  DEFAULT_METHOD_PROFILE_ID,
  type MethodProfileId,
} from '../../domain/algorithm.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { useProductCopy } from '../i18n/copy.ts';
import { METHOD_LABELS } from '../reading/reading-format.ts';
import { deriveMethodProfileCapabilityRows } from './method-profile-capabilities.ts';
import { MethodProfileSelect } from './method-profile-select.tsx';
import { SettingsRow } from './settings-row.tsx';
import { commitMethodProfile } from './method-profile-state.ts';
import { persistenceWriteSucceeded } from '../state/persistence-bridge.ts';

export function MethodProfileEditor() {
  const { state, replace_snapshot } = useShijingStore();
  const copy = useProductCopy();
  const current = state.snapshot.settings.method_profile_id ?? DEFAULT_METHOD_PROFILE_ID;
  const capabilityRows = deriveMethodProfileCapabilityRows();
  const currentRow =
    capabilityRows.find((row) => row.method_profile_id === current) ?? capabilityRows[0] ?? null;
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);

  async function onChange(value: MethodProfileId) {
    const next = commitMethodProfile(state.snapshot, value);
    const persistence = await replace_snapshot(next);
    if (!persistenceWriteSucceeded(persistence)) {
      nimiToast.danger(copy.shell.persistenceFailed(
        persistence.kind === 'error' ? persistence.error.kind : persistence.kind,
      ));
      return;
    }
    nimiToast.success(copy.methodProfile.switched(METHOD_LABELS[value]));
  }

  return (
    <SettingsRow
      id="settings-method-profile"
      icon={
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
      }
      title={copy.methodProfile.title}
    >
      <div className="sjp-inline-field">
        <label className="sjp-label" htmlFor="method-profile">{copy.methodProfile.algorithm}</label>
        <MethodProfileSelect
          id="method-profile"
          value={current}
          onChange={onChange}
        />
      </div>

      {currentRow ? (
        <div className="sjp-row__chips-block" aria-label={copy.methodProfile.capabilities.title}>
          <div className="sjp-row__chips-group">
            <span className="sjp-method-capability__section-title">
              {copy.methodProfile.capabilities.algorithmNeutralTitle}
            </span>
            <ul className="sjp-method-capability__chips">
              {currentRow.algorithm_neutral_features.map((feature) => (
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
            className="sjp-row__chips-group"
            data-mingjing-route-status={currentRow.mingjing_route.status}
          >
            <span className="sjp-method-capability__section-title">
              {copy.methodProfile.capabilities.mingjingRouteTitle}
            </span>
            {currentRow.mingjing_route.supported_features.length > 0 ? (
              <ul className="sjp-method-capability__chips">
                {currentRow.mingjing_route.supported_features.map((feature) => (
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
          </div>
          {currentRow.mingjing_route.fail_close_detail ? (
            <p className="sjp-note sjp-note--warn">
              {copy.methodProfile.capabilities.failClosePrefix}: <code>{currentRow.mingjing_route.fail_close_detail}</code>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="sjp-collapse sjp-method-all" data-open={capabilitiesOpen}>
        <button
          type="button"
          className="sjp-collapse__summary"
          aria-expanded={capabilitiesOpen}
          aria-controls="method-profile-capabilities"
          onClick={() => setCapabilitiesOpen((open) => !open)}
        >
          <span>{copy.methodProfile.capabilities.viewAll}</span>
          <svg
            className="sjp-collapse__chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {capabilitiesOpen ? (
          <div className="sjp-collapse__body" id="method-profile-capabilities">
            <div className="sjp-method-capabilities" aria-label={copy.methodProfile.capabilities.title}>
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
        ) : null}
      </div>
    </SettingsRow>
  );
}
