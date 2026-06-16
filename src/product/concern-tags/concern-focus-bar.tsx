// SJG-IA-06 — compact, mirror-side concern-tag focus bar.
//
// Per design-system: on a mirror surface concern tags appear as "compact
// chips or filters", NOT as a full editor. This bar shows every tag as a
// pill (active = filled, archived = muted) and lets the user quickly
// toggle which concerns this mirror focuses on (the "filter" affordance:
// archive / unarchive within the 5-active cap). All heavier management —
// creating tags, resolving @person mentions, parse preview — lives in
// Settings → 关注 through the richer `ConcernTagControls`, reachable
// from the「管理」entry here.

import { useMemo } from 'react';
import { CONCERN_TAG_ACTIVE_LIMIT } from '../../domain/concern-tag.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { useProductCopy } from '../i18n/copy.ts';

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export interface ConcernFocusBarProps {
  // Opens the full concern-tag management surface (Settings → 关注).
  readonly onManage?: () => void;
}

export function ConcernFocusBar({ onManage }: ConcernFocusBarProps) {
  const { state, dispatch } = useShijingStore();
  const copy = useProductCopy();
  const tags = state.snapshot.concern_tags;
  const activeCount = useMemo(
    () => tags.filter((t) => t.status === 'active').length,
    [tags],
  );
  const atLimit = activeCount >= CONCERN_TAG_ACTIVE_LIMIT;

  function toggle(id: string, current: 'active' | 'archived') {
    const next = current === 'active' ? 'archived' : 'active';
    // Respect the active cap when re-activating; archiving is always allowed.
    if (next === 'active' && atLimit) return;
    const ts = nowIso();
    dispatch({
      type: 'snapshot/replace',
      snapshot: {
        ...state.snapshot,
        concern_tags: tags.map((t) =>
          t.id === id ? { ...t, status: next, updated_at: ts } : t,
        ),
      },
    });
  }

  return (
    <section className="shijing-concern-bar" aria-label={copy.concerns.focusAria}>
      <span className="shijing-concern-bar__label">{copy.concerns.focusLabel}</span>
      <span
        className="shijing-concern-bar__count"
        aria-label={copy.concerns.activeCountAria(activeCount, CONCERN_TAG_ACTIVE_LIMIT)}
      >
        {activeCount}/{CONCERN_TAG_ACTIVE_LIMIT}
      </span>

      {tags.length === 0 ? (
        <span className="shijing-concern-bar__empty">{copy.concerns.focusEmpty}</span>
      ) : (
        <ul className="shijing-concern-bar__pills">
          {tags.map((tag) => {
            const active = tag.status === 'active';
            return (
              <li key={tag.id}>
                <button
                  type="button"
                  className="shijing-concern-bar__pill"
                  data-status={tag.status}
                  aria-pressed={active}
                  disabled={!active && atLimit}
                  title={
                    active
                      ? copy.concerns.toggleOffTitle
                      : atLimit
                        ? copy.concerns.addLimitTitle(CONCERN_TAG_ACTIVE_LIMIT)
                        : copy.concerns.toggleOnTitle
                  }
                  onClick={() => toggle(tag.id, tag.status)}
                >
                  {tag.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        className="shijing-concern-bar__manage"
        onClick={() => onManage?.()}
      >
        {copy.concerns.manage}
      </button>
    </section>
  );
}
