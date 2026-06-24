import { useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from '@nimiplatform/kit/ui';
import type { TendencyClass } from '../../../domain/mirror-output.ts';
import { CONCERN_TAG_ACTIVE_LIMIT, type ConcernTag } from '../../../domain/concern-tag.ts';
import { TENDENCY_CLASS_LABELS } from '../../i18n/copy.ts';
import { newConcernTagId } from '../../ids/index.ts';
import { useShijingStore } from '../../state/shijing-store.tsx';
import { deriveConcernTagLabelForDisplay, parseConcernTagInput } from '../../concern-tags/concern-tag-parser.ts';
import { CONCERN_PRESETS, type ConcernPreset, concernSubtitleFor, trimmedConcernLabel as yuejingTagLabel } from '../../concern-tags/concern-presets.ts';
import { nowIso } from './yuejing-model.ts';
import { YUEJING_COPY } from './yuejing-copy.ts';

export function YueJingFilterRow(props: {
  readonly activeTags: readonly ConcernTag[];
  readonly filterTagId: string | null;
  readonly onFilterChange: (id: string | null) => void;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  return (
    <div className="shijing-yuejing__filter-row" role="toolbar" aria-label={YUEJING_COPY.filter.toolbarAriaLabel}>
      <div className="shijing-yuejing__filter" role="group" aria-label={YUEJING_COPY.filter.concernAriaLabel}>
        <span className="shijing-yuejing__filter-label" aria-hidden="true">{YUEJING_COPY.filter.concernLabel}</span>
        <FilterPill
          label={YUEJING_COPY.filter.all}
          selected={props.filterTagId === null}
          onSelect={() => props.onFilterChange(null)}
        />
        {props.activeTags.map((tag) => (
          <FilterPill
            key={tag.id}
            label={yuejingTagLabel(tag)}
            selected={props.filterTagId === tag.id}
            onSelect={() => props.onFilterChange(tag.id)}
          />
        ))}
        <span className="shijing-yuejing__editor-anchor">
          <button
            type="button"
            className="shijing-yuejing__filter-manage"
            aria-expanded={editorOpen}
            aria-haspopup="dialog"
            onClick={() => setEditorOpen((o) => !o)}
          >
            {YUEJING_COPY.filter.manageConcerns}
          </button>
          {editorOpen ? (
            <YueJingConcernEditorPopover onClose={() => setEditorOpen(false)} />
          ) : null}
        </span>
      </div>
      <ul className="shijing-yuejing__legend" aria-label={YUEJING_COPY.filter.legendAriaLabel}>
        {(Object.entries(TENDENCY_CLASS_LABELS) as ReadonlyArray<[TendencyClass, string]>).map(
          ([cls, label]) => (
            <li key={cls} data-tendency={cls}>
              <span className="shijing-yuejing__legend-dot" aria-hidden />
              {label}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function FilterPill(props: {
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="shijing-yuejing__filter-pill"
      aria-pressed={props.selected}
      onClick={props.onSelect}
    >
      {props.label}
    </button>
  );
}

// ===== 4b) Concern editor popover ===================================
// Inline manager rendered when「✎ 编辑关注」is clicked. Mirrors the
// NianJing「编辑关注」popover so concerns can be managed from either
// time-window mirror surface. Lets the user quickly archive an active
// concern, re-activate an archived one, add a preset, or type a free
// form concern. Heavier flows (resolving @person mentions, prompt-text
// editing) still live in Settings → 关注.

function YueJingConcernEditorPopover(props: { readonly onClose: () => void }) {
  const { state, dispatch } = useShijingStore();
  const [draftInput, setDraftInput] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const tags = state.snapshot.concern_tags;
  const active = useMemo(() => tags.filter((t) => t.status === 'active'), [tags]);
  const activeCount = active.length;
  const atLimit = activeCount >= CONCERN_TAG_ACTIVE_LIMIT;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!popoverRef.current || !target) return;
      if (popoverRef.current.contains(target)) return;
      // Don't close on a click of our own trigger; the trigger's click
      // handler will toggle the open state itself.
      const triggerBtn = (target as HTMLElement).closest?.(
        'button[aria-expanded][aria-haspopup="dialog"]',
      );
      if (triggerBtn) return;
      props.onClose();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [props]);

  function commitTags(next: readonly ConcernTag[]) {
    dispatch({
      type: 'snapshot/replace',
      snapshot: { ...state.snapshot, concern_tags: next },
    });
  }

  function archiveTag(id: string) {
    commitTags(
      tags.map((t) =>
        t.id === id ? { ...t, status: 'archived', updated_at: nowIso() } : t,
      ),
    );
  }

  function activateExisting(id: string) {
    if (atLimit) return;
    commitTags(
      tags.map((t) =>
        t.id === id ? { ...t, status: 'active', updated_at: nowIso() } : t,
      ),
    );
  }

  function addPreset(preset: ConcernPreset) {
    if (atLimit) return;
    const existing = tags.find((t) => t.label === preset.label);
    if (existing) {
      if (existing.status === 'active') return;
      activateExisting(existing.id);
      return;
    }
    const ts = nowIso();
    const tag: ConcernTag = {
      id: newConcernTagId(),
      label: preset.label,
      status: 'active',
      sort_order: tags.length,
      parsed_topics: [...preset.topics],
      mention_refs: [],
      prompt_text: preset.subtitle,
      created_at: ts,
      updated_at: ts,
    };
    commitTags([...tags, tag]);
  }

  function addCustom() {
    if (atLimit) return;
    const trimmed = draftInput.trim();
    if (trimmed.length === 0) return;
    const parsed = parseConcernTagInput(draftInput, {
      persons: state.snapshot.persons,
    });
    const ts = nowIso();
    const tag: ConcernTag = {
      id: newConcernTagId(),
      label: deriveConcernTagLabelForDisplay(parsed) || trimmed,
      status: 'active',
      sort_order: tags.length,
      parsed_topics: [...parsed.parsed_topics],
      mention_refs: [...parsed.mention_refs],
      prompt_text: parsed.prompt_text,
      created_at: ts,
      updated_at: ts,
    };
    commitTags([...tags, tag]);
    setDraftInput('');
  }

  type Suggestion =
    | { readonly kind: 'archived'; readonly id: string; readonly label: string; readonly subtitle: string }
    | { readonly kind: 'preset'; readonly preset: ConcernPreset };

  const suggestions: readonly Suggestion[] = useMemo(() => {
    const archived: Suggestion[] = tags
      .filter((t) => t.status === 'archived')
      .map((t) => ({
        kind: 'archived',
        id: t.id,
        label: t.label,
        subtitle: concernSubtitleFor(t),
      }));
    const presetSuggestions: Suggestion[] = CONCERN_PRESETS
      .filter((p) => !tags.some((t) => t.label === p.label))
      .map((p) => ({ kind: 'preset', preset: p }));
    return [...archived, ...presetSuggestions];
  }, [tags]);

  return (
    <div
      ref={popoverRef}
      className="shijing-yuejing__editor"
      role="dialog"
      aria-label={YUEJING_COPY.concernEditor.ariaLabel}
    >
      <header className="shijing-yuejing__editor-head">
        <strong>{YUEJING_COPY.concernEditor.title}</strong>
        <span className="shijing-yuejing__editor-count">
          {activeCount}/{CONCERN_TAG_ACTIVE_LIMIT}
        </span>
      </header>
      <p className="shijing-yuejing__editor-subtitle">
        {YUEJING_COPY.concernEditor.subtitle}
      </p>

      {active.length > 0 ? (
        <section className="shijing-yuejing__editor-section">
          <h4>{YUEJING_COPY.concernEditor.activeHeading}</h4>
          <ul>
            {active.map((tag) => (
              <li key={tag.id}>
                <div className="shijing-yuejing__editor-row-text">
                  <strong>{yuejingTagLabel(tag)}</strong>
                  <small>{concernSubtitleFor(tag)}</small>
                </div>
                <button
                  type="button"
                  className="shijing-yuejing__editor-remove"
                  onClick={() => archiveTag(tag.id)}
                >
                  {YUEJING_COPY.concernEditor.remove}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {suggestions.length > 0 ? (
        <section className="shijing-yuejing__editor-section">
          <h4>{YUEJING_COPY.concernEditor.addableHeading}</h4>
          <ul>
            {suggestions.map((s) => {
              const label = s.kind === 'archived' ? s.label : s.preset.label;
              const subtitle = s.kind === 'archived' ? s.subtitle : s.preset.subtitle;
              const key = s.kind === 'archived' ? `arc-${s.id}` : `pre-${s.preset.label}`;
              const addTitle = atLimit
                ? YUEJING_COPY.concernEditor.addLimitTitle(CONCERN_TAG_ACTIVE_LIMIT)
                : YUEJING_COPY.concernEditor.add;
              return (
                <li key={key}>
                  <div className="shijing-yuejing__editor-row-text">
                    <strong>{label.replace(/^#/, '')}</strong>
                    <small>{subtitle}</small>
                  </div>
                  <Tooltip content={addTitle} placement="top">
                    <button
                      type="button"
                      className="shijing-yuejing__editor-add"
                      disabled={atLimit}
                      onClick={() => {
                        if (s.kind === 'archived') {
                          activateExisting(s.id);
                        } else {
                          addPreset(s.preset);
                        }
                      }}
                    >
                      {YUEJING_COPY.concernEditor.add}
                    </button>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="shijing-yuejing__editor-custom">
        <input
          type="text"
          value={draftInput}
          onChange={(e) => setDraftInput(e.currentTarget.value)}
          placeholder={YUEJING_COPY.concernEditor.customPlaceholder}
          disabled={atLimit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !atLimit && draftInput.trim().length > 0) {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button
          type="button"
          className="shijing-yuejing__editor-add"
          disabled={atLimit || draftInput.trim().length === 0}
          onClick={addCustom}
        >
          {YUEJING_COPY.concernEditor.add}
        </button>
      </div>
    </div>
  );
}
