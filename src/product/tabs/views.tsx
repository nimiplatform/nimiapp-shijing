// Views tab — wave-9 mounts the ViewList editor; wave-1's read-only
// list is superseded.

import { useEffect, useMemo, useState } from 'react';

import { describeTab } from '../navigation/tab-descriptor.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { ViewList } from '../views/view-list.tsx';
import { ViewFormOverlay } from '../views/view-form.tsx';
import { ViewWorkspace } from '../views/view-workspace.tsx';
import { EventList } from '../events/event-list.tsx';
import { TAB_EYEBROWS } from '../i18n/copy.ts';
import type { View } from '../../domain/view.ts';

const TAB = describeTab('views');
type ViewEditorMode = null | { kind: 'create' } | { kind: 'edit'; view: View };

export function ViewsTab() {
  const { state } = useShijingStore();
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [editor, setEditor] = useState<ViewEditorMode>(null);
  const selectedView = useMemo(
    () => state.snapshot.views.find((view) => view.id === selectedViewId) ?? null,
    [selectedViewId, state.snapshot.views],
  );

  useEffect(() => {
    if (state.snapshot.views.length === 0) {
      if (selectedViewId !== null) setSelectedViewId(null);
      return;
    }
    if (selectedView) return;
    const pinned = state.snapshot.views.find((view) => view.display_state === 'pinned');
    setSelectedViewId((pinned ?? state.snapshot.views[0]!).id);
  }, [selectedView, selectedViewId, state.snapshot.views]);

  return (
    <section className="shijing-tab shijing-tab--views" aria-labelledby="shijing-views-heading">
      <header className="shijing-tab__header">
        <div>
          <p className="shijing-tab__eyebrow">{TAB_EYEBROWS.views}</p>
          <h2 id="shijing-views-heading">{TAB.chinese_label}</h2>
        </div>
      </header>

      <div className="shijing-view-layout">
        <ViewList
          selectedViewId={selectedViewId}
          onSelectView={(view) => setSelectedViewId(view.id)}
          onCreateView={() => setEditor({ kind: 'create' })}
          onEditView={(view) => setEditor({ kind: 'edit', view })}
          onDeletedView={(viewId) => {
            if (viewId === selectedViewId) setSelectedViewId(null);
          }}
        />
        <ViewWorkspace view={selectedView} onCreateView={() => setEditor({ kind: 'create' })} />
      </div>

      <EventList />
      {editor !== null ? (
        <ViewFormOverlay
          open
          mode={editor.kind === 'create' ? 'create' : { kind: 'edit', view: editor.view }}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </section>
  );
}
