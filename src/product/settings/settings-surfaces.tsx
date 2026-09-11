// SJG-IA-04 — per-surface section renderers for the secondary Settings
// surface. The sibling sub-pages (档案 / 关注 / 发生过的事) map each of their
// surfaces to one self-contained `.sjp-card` here so the page stays a thin
// shell. The 设置 sub-page no longer routes through this file: its modules
// render as stacked rows (see settings-page-view.tsx).
//
// No CRM / customer / client / task / project vocabulary appears here.

import type { ShijingSettingsSurfaceId } from '../../contracts/ia-contract.ts';
import { SETTINGS_SURFACE_LABELS } from '../i18n/copy.ts';
import { ConcernTagControls } from '../concern-tags/concern-tag-controls.tsx';
import { MemoryEditor } from '../memories/memory-editor.tsx';
import { PersonEditor } from '../persons/person-editor.tsx';
import type { ProfileSensitiveAccess } from '../privacy/profile-sensitive-access.ts';
import { SelfEditor } from '../self/self-editor.tsx';
import type { ShijingSettingsFocusTarget } from './settings-page-view.tsx';

function SurfaceBody(props: {
  readonly surface: ShijingSettingsSurfaceId;
  readonly focusTarget?: ShijingSettingsFocusTarget | null;
  readonly profileSensitiveAccess?: ProfileSensitiveAccess;
}) {
  switch (props.surface) {
    case 'self':
      return (
        <SelfEditor
          autoOpenEditor={props.focusTarget === 'self_profile_editor'}
          profileSensitiveAccess={props.profileSensitiveAccess}
        />
      );
    case 'people':
      return <PersonEditor profileSensitiveAccess={props.profileSensitiveAccess} />;
    case 'concern_tags':
      return <ConcernTagControls />;
    case 'memory_and_plans':
      // Only past events (记忆) are recorded here. Future plans (PlanItem) are
      // captured in-context on the 月镜 calendar's future day cells, where the
      // planned date comes from the cell itself — so this settings surface no
      // longer carries a separate, decontextualized plan-entry form.
      return <MemoryEditor />;
    default:
      return null;
  }
}

export interface SettingsSurfaceSectionProps {
  readonly surface: ShijingSettingsSurfaceId;
  readonly focusTarget?: ShijingSettingsFocusTarget | null;
  readonly profileSensitiveAccess?: ProfileSensitiveAccess;
}

// Every settings surface renders its own self-contained `.sjp-card` with an
// icon + heading + description (see SelfEditor / PersonEditor /
// ConcernTagControls / MemoryEditor), so the generic `<section><h3>` chrome is
// suppressed to avoid a duplicate heading. The labelled-section shell below
// remains as a fallback for any future surface that ships without a card.
const SELF_CONTAINED_SURFACES: ReadonlySet<ShijingSettingsSurfaceId> = new Set([
  'self',
  'people',
  'concern_tags',
  'memory_and_plans',
]);

export function SettingsSurfaceSection(props: SettingsSurfaceSectionProps) {
  const { surface } = props;
  if (SELF_CONTAINED_SURFACES.has(surface)) {
    return (
      <SurfaceBody
        surface={surface}
        focusTarget={props.focusTarget}
        profileSensitiveAccess={props.profileSensitiveAccess}
      />
    );
  }
  return (
    <section id={`settings-${surface}`} aria-label={SETTINGS_SURFACE_LABELS[surface]}>
      <h3>{SETTINGS_SURFACE_LABELS[surface]}</h3>
      <SurfaceBody
        surface={surface}
        focusTarget={props.focusTarget}
        profileSensitiveAccess={props.profileSensitiveAccess}
      />
    </section>
  );
}
