// SJG-IA-04 — 设置 > 本地数据与诊断. One row combining local persistence
// status (with the destructive clear action) and current snapshot validation
// status; error details surface as warning notes under the stat cards.

import { nimiToast } from '@nimiplatform/kit/ui';
import { useProductCopy } from '../i18n/copy.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { SettingsRow } from './settings-row.tsx';

export function LocalDataDiagnosticsSection({ surfaces }: {
  readonly surfaces: readonly ('privacy_local_data' | 'diagnostics')[];
}) {
  const { state, persistence_status, persistence_client } = useShijingStore();
  const copy = useProductCopy();
  const persistenceErrorKind =
    persistence_status.kind === 'error' ? persistence_status.error.kind : null;
  const snapshotInvalid = state.snapshot_status.kind === 'invalid';
  const showPersistence = surfaces.includes('privacy_local_data');
  const showDiagnostics = surfaces.includes('diagnostics');

  async function handleClearLocal() {
    if (!persistence_client) {
      nimiToast.danger(copy.privacy.clearNoAdapter);
      return;
    }
    const result = await persistence_client.clear();
    if (result.ok) {
      nimiToast.success(copy.privacy.cleared);
    } else {
      nimiToast.danger(copy.privacy.clearFailed(result.error.kind));
    }
  }

  return (
    <SettingsRow
      id={showPersistence ? 'settings-privacy-local-data' : 'settings-diagnostics'}
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
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      }
      title={copy.localData.title}
    >
      <div className="sjp-statuscards">
        {showPersistence ? <div className="sjp-statuscard" data-tone={persistenceErrorKind ? 'error' : 'ok'}>
          <span className="sjp-statuscard__icon">
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
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
              <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
            </svg>
          </span>
          <div className="sjp-statuscard__text">
            <span className="sjp-statuscard__label">{copy.privacy.status}</span>
            <span className="sjp-statuscard__value">
              <i className="sjp-statuscard__dot" aria-hidden="true" />
              {persistence_status.kind}
            </span>
          </div>
        </div> : null}
        {showDiagnostics ? <div className="sjp-statuscard" data-tone={snapshotInvalid ? 'error' : 'ok'}>
          <span className="sjp-statuscard__icon">
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
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </span>
          <div className="sjp-statuscard__text">
            <span className="sjp-statuscard__label">{copy.diagnostics.snapshotStatus}</span>
            <span className="sjp-statuscard__value">
              <i className="sjp-statuscard__dot" aria-hidden="true" />
              {state.snapshot_status.kind}
            </span>
          </div>
        </div> : null}
      </div>

      {showPersistence && persistenceErrorKind ? (
        <p className="sjp-note sjp-note--warn">
          {copy.privacy.error(persistenceErrorKind)}
        </p>
      ) : null}
      {showDiagnostics && snapshotInvalid ? (
        <p className="sjp-note sjp-note--warn">
          {copy.diagnostics.validationCode}: <code>{state.snapshot_status.error.code}</code>
        </p>
      ) : null}

      {showPersistence ? <div className="sjp-row__actions">
        <button type="button" className="sjp-btn sjp-btn--danger" onClick={handleClearLocal}>
          <svg
            className="sjp-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
          </svg>
          {copy.privacy.clearButton}
        </button>
      </div> : null}
    </SettingsRow>
  );
}
