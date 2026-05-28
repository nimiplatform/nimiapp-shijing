// Views tab — auto-seeds a default 「最近状态」 View when the snapshot
// has zero views, then renders left-rail ViewList + right-pane
// ViewWorkspace.  New/edit flows: clicking 新建关注 flips the workspace
// straight into inline editor mode (ViewEditorPane).  Templates live as
// a chip row inside the editor — there is no separate picker modal.

import { useEffect, useMemo, useState } from 'react';

import { describeTab } from '../navigation/tab-descriptor.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { ViewList } from '../views/view-list.tsx';
import { ViewWorkspace } from '../views/view-workspace.tsx';
import type { ViewEditorMode } from '../views/view-editor-pane.tsx';
import { validateView } from '../../contracts/view-validator.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import { newViewId } from '../views/view-id.ts';
import { TAB_EYEBROWS } from '../i18n/copy.ts';
import type { View } from '../../domain/view.ts';

const TAB = describeTab('views');

function buildDefaultView(): View {
  const now = new Date().toISOString();
  return {
    id: newViewId(),
    title: '最近状态',
    anchor_subject: 'self',
    subjects: ['self'],
    time_scope: 'rolling',
    rolling_window_days: 7,
    context_items: [],
    instructions: '',
    view_memory: { summary: '', updated_at: now, locked: false },
    display_state: 'normal',
  };
}

export function ViewsTab() {
  const { state, dispatch } = useShijingStore();
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [editor, setEditor] = useState<ViewEditorMode | null>(null);
  const selectedView = useMemo(
    () => state.snapshot.views.find((view) => view.id === selectedViewId) ?? null,
    [selectedViewId, state.snapshot.views],
  );
  const hasViews = state.snapshot.views.length > 0;

  useEffect(() => {
    if (hasViews) return;
    const defaultView = buildDefaultView();
    const viewCheck = validateView(defaultView);
    if (!viewCheck.ok) return;
    const nextSnapshot = { ...state.snapshot, views: [defaultView] };
    const spaceCheck = validateShiJingSpace(nextSnapshot);
    if (!spaceCheck.ok) return;
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
  }, [hasViews, state.snapshot, dispatch]);

  useEffect(() => {
    if (!hasViews) {
      if (selectedViewId !== null) setSelectedViewId(null);
      return;
    }
    if (selectedView) return;
    const pinned = state.snapshot.views.find((view) => view.display_state === 'pinned');
    setSelectedViewId((pinned ?? state.snapshot.views[0]!).id);
  }, [hasViews, selectedView, selectedViewId, state.snapshot.views]);

  return (
    <section className="shijing-tab shijing-tab--views" aria-labelledby="shijing-views-heading">
      <header className="shijing-tab__header">
        <div>
          <p className="shijing-tab__eyebrow">{TAB_EYEBROWS.views}</p>
          <h2 id="shijing-views-heading">{TAB.chinese_label}</h2>
        </div>
      </header>

      {hasViews ? (
        <div className="shijing-view-layout">
          <ViewList
            selectedViewId={selectedViewId}
            onSelectView={(view) => {
              if (editor !== null) setEditor(null);
              setSelectedViewId(view.id);
            }}
            onCreateView={() => setEditor({ kind: 'create' })}
          />
          <ViewWorkspace
            view={selectedView}
            editor={editor}
            onCreateView={() => setEditor({ kind: 'create' })}
            onEditView={(view) => setEditor({ kind: 'edit', view })}
            onDeletedView={(viewId) => {
              if (viewId === selectedViewId) setSelectedViewId(null);
            }}
            onCancelEditor={() => setEditor(null)}
            onSavedEditor={(view) => {
              setEditor(null);
              setSelectedViewId(view.id);
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
