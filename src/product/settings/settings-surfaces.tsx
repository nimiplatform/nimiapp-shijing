// SJG-IA-04 — per-surface section renderers for the secondary Settings
// surface. Each of the seven settings surfaces maps to one `<section>`; the
// settings panel groups these into sub-pages (see SHIJING_SETTINGS_PAGES) but
// the surface-level rendering lives here so the panel stays a thin tab shell.
//
// No CRM / customer / client / task / project vocabulary appears here.

import { useState } from 'react';
import type { ShijingSettingsSurfaceId } from '../../contracts/ia-contract.ts';
import { SETTINGS_SURFACE_LABELS, useProductCopy } from '../i18n/copy.ts';
import { ConcernTagControls } from '../concern-tags/concern-tag-controls.tsx';
import { MemoryEditor } from '../memories/memory-editor.tsx';
import { PersonEditor } from '../persons/person-editor.tsx';
import { SelfEditor } from '../self/self-editor.tsx';
import { ResponsePreferencesEditor } from './response-preferences-editor.tsx';
import { MethodProfileEditor } from './method-profile-editor.tsx';
import { UiLanguageSwitch } from './ui-language-switch.tsx';
import { useShijingStore } from '../state/shijing-store.tsx';
import type { ShijingSettingsFocusTarget } from './settings-page-view.tsx';

function PrivacyLocalDataSection() {
  const { persistence_status, persistence_client } = useShijingStore();
  const copy = useProductCopy();
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const persistenceErrorKind =
    persistence_status.kind === 'error' ? persistence_status.error.kind : null;

  async function handleClearLocal() {
    if (!persistence_client) {
      setRecoveryStatus(copy.privacy.clearNoAdapter);
      return;
    }
    setRecoveryStatus(copy.privacy.clearing);
    const result = await persistence_client.clear();
    if (result.ok) {
      setRecoveryStatus(copy.privacy.cleared);
    } else {
      setRecoveryStatus(copy.privacy.clearFailed(result.error.kind));
    }
  }

  return (
    <section id="settings-privacy-local-data" className="sjp-card" tabIndex={-1}>
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
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        <div>
          <h2 className="sjp-card-title">{copy.privacy.title}</h2>
          <p className="sjp-card-desc">{copy.privacy.description}</p>
        </div>
      </div>

      <div className="sjp-grid">
        <p className="sjp-note">
          {copy.privacy.status}:<code>{persistence_status.kind}</code>
        </p>
        {persistenceErrorKind ? (
          <p className="sjp-note sjp-note--warn">
            {copy.privacy.error(persistenceErrorKind)}
          </p>
        ) : null}
        <div className="sjp-actions">
          <button type="button" className="sjp-btn" onClick={handleClearLocal}>
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
        </div>
        {recoveryStatus ? (
          <p className="sjp-status" role="status">
            {recoveryStatus}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function DiagnosticsSection() {
  const { state } = useShijingStore();
  const copy = useProductCopy();
  return (
    <section id="settings-diagnostics" className="sjp-card" tabIndex={-1}>
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
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </span>
        <div>
          <h2 className="sjp-card-title">{copy.diagnostics.title}</h2>
          <p className="sjp-card-desc">{copy.diagnostics.description}</p>
        </div>
      </div>

      <div className="sjp-grid">
        <p className="sjp-note">
          {copy.diagnostics.snapshotStatus}:<code>{state.snapshot_status.kind}</code>
        </p>
        {state.snapshot_status.kind === 'invalid' ? (
          <p className="sjp-note sjp-note--warn">
            {copy.diagnostics.validationCode}: <code>{state.snapshot_status.error.code}</code>
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SurfaceBody(props: {
  readonly surface: ShijingSettingsSurfaceId;
  readonly focusTarget?: ShijingSettingsFocusTarget | null;
}) {
  switch (props.surface) {
    case 'self':
      return <SelfEditor autoOpenEditor={props.focusTarget === 'self_profile_editor'} />;
    case 'people':
      return <PersonEditor />;
    case 'concern_tags':
      return <ConcernTagControls />;
    case 'memory_and_plans':
      // Only past events (记忆) are recorded here. Future plans (PlanItem) are
      // captured in-context on the 月镜 calendar's future day cells, where the
      // planned date comes from the cell itself — so this settings surface no
      // longer carries a separate, decontextualized plan-entry form.
      return <MemoryEditor />;
    case 'response_preferences':
      return (
        <>
          <UiLanguageSwitch variant="card" />
          <MethodProfileEditor />
          <ResponsePreferencesEditor />
        </>
      );
    case 'privacy_local_data':
      return <PrivacyLocalDataSection />;
    case 'diagnostics':
      return <DiagnosticsSection />;
    default:
      return null;
  }
}

export interface SettingsSurfaceSectionProps {
  readonly surface: ShijingSettingsSurfaceId;
  readonly focusTarget?: ShijingSettingsFocusTarget | null;
}

// Every settings surface renders its own self-contained `.sjp-card` with an
// icon + heading + description (see SelfEditor / PersonEditor /
// ConcernTagControls / MemoryEditor / ResponsePreferencesEditor /
// PrivacyLocalDataSection / DiagnosticsSection), so the generic `<section><h3>`
// chrome is suppressed to avoid a duplicate heading. The labelled-section shell
// below remains as a fallback for any future surface that ships without a card.
const SELF_CONTAINED_SURFACES: ReadonlySet<ShijingSettingsSurfaceId> = new Set([
  'self',
  'people',
  'concern_tags',
  'memory_and_plans',
  'response_preferences',
  'privacy_local_data',
  'diagnostics',
]);

export function SettingsSurfaceSection(props: SettingsSurfaceSectionProps) {
  const { surface } = props;
  if (SELF_CONTAINED_SURFACES.has(surface)) {
    return <SurfaceBody surface={surface} focusTarget={props.focusTarget} />;
  }
  return (
    <section id={`settings-${surface}`} aria-label={SETTINGS_SURFACE_LABELS[surface]}>
      <h3>{SETTINGS_SURFACE_LABELS[surface]}</h3>
      <SurfaceBody surface={surface} focusTarget={props.focusTarget} />
    </section>
  );
}
