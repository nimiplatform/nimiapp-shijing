// Wave-9 — View list with add + filter + select. Edit/delete moved
// to the workspace kebab menu so list rows stay scannable (per the
// redesigned 关注 page). Validator-gated delete now lives on
// ViewWorkspace; ViewList no longer mutates the snapshot itself.

import { useMemo, useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import type { View } from '../../domain/view.ts';
import { BODY, BUTTONS, EMPTY_STATES } from '../i18n/copy.ts';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import { eventsForView } from './view-workspace-model.ts';

export interface ViewListProps {
  readonly selectedViewId?: string | null;
  readonly onSelectView?: (view: View) => void;
  readonly onCreateView?: () => void;
}

type ViewFilter = 'active' | 'archived' | 'all';

const VIEW_FILTERS: readonly { value: ViewFilter; label: string }[] = [
  { value: 'active', label: '正在看' },
  { value: 'archived', label: '归档' },
  { value: 'all', label: '全部' },
];

type IconShape = 'pulse' | 'pair' | 'clipboard' | 'group';
type IconTone = 'green' | 'purple' | 'amber' | 'sky';

interface IconDescriptor {
  readonly shape: IconShape;
  readonly tone: IconTone;
}

const TONE_ROTATION: readonly IconTone[] = ['green', 'purple', 'amber', 'sky'];

function describeViewIcon(view: View): IconDescriptor {
  let shape: IconShape;
  if (view.time_scope === 'bounded') {
    shape = 'clipboard';
  } else if (view.subjects.length >= 3) {
    shape = 'group';
  } else if (view.subjects.length === 2) {
    shape = 'pair';
  } else {
    shape = 'pulse';
  }
  // Deterministic tone per view id so colors stay stable between renders.
  let hash = 0;
  for (let i = 0; i < view.id.length; i += 1) {
    hash = (hash * 31 + view.id.charCodeAt(i)) | 0;
  }
  const tone = TONE_ROTATION[Math.abs(hash) % TONE_ROTATION.length]!;
  return { shape, tone };
}

function ViewIconGlyph(props: { readonly shape: IconShape }) {
  if (props.shape === 'pulse') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M3 12h4l2-6 4 12 2-8 2 4h4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (props.shape === 'pair') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M3.5 19c.6-2.4 2.8-4 5.5-4s4.9 1.6 5.5 4M14 19c.4-1.6 1.9-2.6 4-2.6s3.6 1 4 2.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (props.shape === 'clipboard') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <rect x="5" y="4" width="14" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="9" y="2.5" width="6" height="3.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="5.5" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18.5" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6 20c.4-2.6 2.8-4.4 6-4.4s5.6 1.8 6 4.4M2.5 20c.3-1.9 1.6-3.2 3.5-3.5M21.5 20c-.3-1.9-1.6-3.2-3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatTimeScopeShort(view: View): string {
  if (view.time_scope === 'bounded') {
    if (view.bounded_range?.start && view.bounded_range?.end) {
      return `${view.bounded_range.start.slice(5, 10)} – ${view.bounded_range.end.slice(5, 10)}`;
    }
    return '固定区间';
  }
  if (view.time_scope === 'rolling') {
    const days = view.rolling_window_days ?? 7;
    return `最近 ${days} 天`;
  }
  return '长期观察';
}

export function ViewList(props: ViewListProps = {}) {
  const { state } = useShijingStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ViewFilter>('active');

  const filteredViews = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
    return [...state.snapshot.views]
      .filter((view) => {
        if (filter === 'active' && view.display_state === 'archived') return false;
        if (filter === 'archived' && view.display_state !== 'archived') return false;
        if (normalizedQuery.length === 0) return true;
        const searchable = [
          view.title,
          view.instructions,
          subjectDisplayName(view.anchor_subject, state.snapshot),
          ...view.subjects.map((subject) => subjectDisplayName(subject, state.snapshot)),
        ].join(' ').toLocaleLowerCase('zh-CN');
        return searchable.includes(normalizedQuery);
      })
      .sort((a, b) => {
        const weight = (view: View) => {
          if (view.display_state === 'pinned') return 0;
          if (view.display_state === 'normal') return 1;
          return 2;
        };
        const weightDiff = weight(a) - weight(b);
        if (weightDiff !== 0) return weightDiff;
        return a.title.localeCompare(b.title, 'zh-CN');
      });
  }, [filter, query, state.snapshot]);

  return (
    <section className="shijing-view-list" aria-label="关注列表">
      <header className="shijing-view-list__header">
        <h3>关注列表</h3>
        <button
          type="button"
          className="shijing-view-list__create"
          onClick={props.onCreateView}
        >
          <PlusIcon />
          <span>{BUTTONS.add_view}</span>
        </button>
      </header>
      <label className="shijing-view-list__search" htmlFor="view-list-search">
        <span className="shijing-visually-hidden">{BODY.view_search_placeholder}</span>
        <input
          id="view-list-search"
          type="search"
          value={query}
          placeholder={BODY.view_search_placeholder}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="shijing-view-list__filters" role="tablist" aria-label="关注筛选">
        {VIEW_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-pressed={filter === item.value}
            aria-selected={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {state.snapshot.views.length === 0 ? (
        <p className="shijing-view-list__empty">{EMPTY_STATES.views}</p>
      ) : filteredViews.length === 0 ? (
        <p className="shijing-view-list__empty">没有匹配的关注。</p>
      ) : (
        <ul>
          {filteredViews.map((view) => {
            const selected = props.selectedViewId === view.id;
            const eventCount = eventsForView(state.snapshot.events, view.id).length;
            const recordCount = view.context_items.length + eventCount;
            const icon = describeViewIcon(view);
            const anchorName = subjectDisplayName(view.anchor_subject, state.snapshot);
            return (
              <li key={view.id} data-selected={selected ? 'true' : 'false'}>
                <button
                  type="button"
                  className="shijing-view-card"
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => props.onSelectView?.(view)}
                >
                  <span className="shijing-view-card__icon" data-tone={icon.tone} aria-hidden="true">
                    <ViewIconGlyph shape={icon.shape} />
                  </span>
                  <span className="shijing-view-card__body">
                    <span className="shijing-view-card__title">{view.title}</span>
                    <span className="shijing-view-card__meta">
                      {anchorName} · {formatTimeScopeShort(view)} · {recordCount} 条记录
                    </span>
                  </span>
                  <span className="shijing-view-card__chevron" aria-hidden="true">
                    <ChevronRight />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
