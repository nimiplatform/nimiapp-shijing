// Lightweight OverlayShell wrappers around the existing
// NatalInputsForm / SettingsForm / Person+Relation lists. The
// redesigned "我" tab presents read-only summary cards and routes all
// editing through these overlays, so each card stays focused while
// reusing the validator-gated forms unchanged.

import { DialogTitle, NimiText, OverlayShell } from '@nimiplatform/kit/ui';

import { NatalInputsForm } from '../inputs/natal-inputs-form.tsx';
import { SettingsForm } from '../settings/settings-form.tsx';
import { PersonList } from '../persons/person-list.tsx';
import { RelationList } from '../relations/relation-list.tsx';
import { BODY, HEADINGS, BUTTONS } from '../i18n/copy.ts';

export interface MeOverlayProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

// The natal editor overlay is intentionally tighter than kit's
// preset sizes (S=480, M=720) — 560px is wide enough for two-up
// lunar fields without making the form feel like a settings page.
// `panelStyle` / `panelClassName` / `className` (backdrop) hook
// into the panel + backdrop styling defined under
// `.shijing-natal-overlay__*` in styles.css.
const NATAL_OVERLAY_WIDTH = '560px';

export function MeNatalEditorOverlay(props: MeOverlayProps) {
  return (
    <OverlayShell
      open={props.open}
      kind="dialog"
      onClose={props.onClose}
      panelStyle={{ width: NATAL_OVERLAY_WIDTH }}
      panelClassName="shijing-natal-overlay__panel"
      className="shijing-natal-overlay__backdrop"
      title={<DialogTitle>{HEADINGS.natal_overlay_title}</DialogTitle>}
    >
      <div className="shijing-natal-overlay__body shijing-tab">
        <NimiText role="body" className="shijing-natal-overlay__lead">
          {BODY.natal_overlay_lead}
        </NimiText>
        <NatalInputsForm
          embedded
          saveLabel={BUTTONS.save_and_resync}
          onCancel={props.onClose}
        />
      </div>
    </OverlayShell>
  );
}

export function MeSettingsEditorOverlay(props: MeOverlayProps) {
  return (
    <OverlayShell
      open={props.open}
      kind="dialog"
      size="M"
      onClose={props.onClose}
      title={<DialogTitle>调整回应方式</DialogTitle>}
    >
      <div className="shijing-me-overlay shijing-tab">
        <SettingsForm />
      </div>
    </OverlayShell>
  );
}

export function MePersonsManagerOverlay(props: MeOverlayProps) {
  return (
    <OverlayShell
      open={props.open}
      kind="dialog"
      size="L"
      onClose={props.onClose}
      title={<DialogTitle>管理人物与关系</DialogTitle>}
    >
      <div className="shijing-me-overlay shijing-tab">
        <PersonList />
        <RelationList />
      </div>
    </OverlayShell>
  );
}
