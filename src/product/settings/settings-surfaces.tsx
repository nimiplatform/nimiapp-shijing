// SJG-IA-04 — per-surface section renderers for the secondary Settings
// surface. Each of the seven settings surfaces maps to one `<section>`; the
// settings panel groups these into sub-pages (see SHIJING_SETTINGS_PAGES) but
// the surface-level rendering lives here so the panel stays a thin tab shell.
//
// No CRM / customer / client / task / project vocabulary appears here.

import { useState } from 'react';
import type { ShijingSettingsSurfaceId } from '../../contracts/ia-contract.ts';
import { SETTINGS_SURFACE_LABELS } from '../i18n/copy.ts';
import { ConcernTagControls } from '../concern-tags/concern-tag-controls.tsx';
import { MemoryEditor } from '../memories/memory-editor.tsx';
import { PersonEditor } from '../persons/person-editor.tsx';
import { SelfEditor } from '../self/self-editor.tsx';
import { ResponsePreferencesEditor } from './response-preferences-editor.tsx';
import { MethodProfileEditor } from './method-profile-editor.tsx';
import { useShijingStore } from '../state/shijing-store.tsx';

function PrivacyLocalDataSection() {
  const { persistence_status, persistence_client } = useShijingStore();
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const persistenceErrorKind =
    persistence_status.kind === 'error' ? persistence_status.error.kind : null;

  async function handleClearLocal() {
    if (!persistence_client) {
      setRecoveryStatus('清理失败:当前没有可用的本地持久化适配器');
      return;
    }
    setRecoveryStatus('清理中…');
    const result = await persistence_client.clear();
    if (result.ok) {
      setRecoveryStatus('已清理。请刷新页面以重新加载。');
    } else {
      setRecoveryStatus(`清理失败: ${result.error.kind}`);
    }
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
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        <div>
          <h2 className="sjp-card-title">隐私与本地数据</h2>
          <p className="sjp-card-desc">你的资料只保存在本设备 · 可在此查看本地存储状态并在需要时清理</p>
        </div>
      </div>

      <div className="sjp-grid">
        <p className="sjp-note">
          本地持久化状态:<code>{persistence_status.kind}</code>
        </p>
        {persistenceErrorKind ? (
          <p className="sjp-note sjp-note--warn">
            <strong>本地持久化错误:</strong> <code>{persistenceErrorKind}</code>。
            可能原因:本地保存了旧版本架构的快照,新校验拒绝其加载。
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
            清理本地持久化数据
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
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </span>
        <div>
          <h2 className="sjp-card-title">诊断</h2>
          <p className="sjp-card-desc">查看当前数据快照的校验状态,便于排查问题</p>
        </div>
      </div>

      <div className="sjp-grid">
        <p className="sjp-note">
          当前快照校验:<code>{state.snapshot_status.kind}</code>
        </p>
        {state.snapshot_status.kind === 'invalid' ? (
          <p className="sjp-note sjp-note--warn">
            校验错误码: <code>{state.snapshot_status.error.code}</code>
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SurfaceBody(props: { readonly surface: ShijingSettingsSurfaceId }) {
  switch (props.surface) {
    case 'self':
      return <SelfEditor />;
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
    return <SurfaceBody surface={surface} />;
  }
  return (
    <section id={`settings-${surface}`} aria-label={SETTINGS_SURFACE_LABELS[surface]}>
      <h3>{SETTINGS_SURFACE_LABELS[surface]}</h3>
      <SurfaceBody surface={surface} />
    </section>
  );
}
