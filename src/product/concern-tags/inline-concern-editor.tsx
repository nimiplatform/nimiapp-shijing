// SJG-IA-06 - compact inline concern manager for mirror surfaces.
// It offers the same quick active/archive/preset/custom controls used by
// YueJing and NianJing without routing the user into the full Settings page.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from '@nimiplatform/kit/ui';
import {
  CONCERN_TAG_ACTIVE_LIMIT,
  type ConcernTag,
} from '../../domain/concern-tag.ts';
import { newConcernTagId } from '../ids/index.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import {
  deriveConcernTagLabelForDisplay,
  parseConcernTagInput,
} from './concern-tag-parser.ts';
import {
  CONCERN_PRESETS,
  concernSubtitleFor,
  trimmedConcernLabel,
  type ConcernPreset,
} from './concern-presets.ts';

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export interface InlineConcernEditorPopoverProps {
  readonly onClose: () => void;
  readonly subtitle: string;
  readonly classNamePrefix?: string;
  readonly ariaLabel: string;
  readonly title: string;
  readonly activeHeading?: string;
  readonly addableHeading?: string;
  readonly removeLabel?: string;
  readonly addLabel?: string;
  readonly customPlaceholder?: string;
}

type Suggestion =
  | { readonly kind: 'archived'; readonly id: string; readonly label: string; readonly subtitle: string }
  | { readonly kind: 'preset'; readonly preset: ConcernPreset };

export function InlineConcernEditorPopover({
  onClose,
  subtitle,
  classNamePrefix = 'shijing-inline-concern-editor',
  ariaLabel,
  title,
  activeHeading = '已激活',
  addableHeading = '可添加',
  removeLabel = '移除',
  addLabel = '添加',
  customPlaceholder = '自定义关注, 如「学业」「创业」',
}: InlineConcernEditorPopoverProps) {
  const { state, dispatch } = useShijingStore();
  const [draftInput, setDraftInput] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const tags = state.snapshot.concern_tags;
  const active = useMemo(() => tags.filter((t) => t.status === 'active'), [tags]);
  const activeCount = active.length;
  const atLimit = activeCount >= CONCERN_TAG_ACTIVE_LIMIT;
  const cx = (part?: string) => (part ? `${classNamePrefix}__${part}` : classNamePrefix);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!popoverRef.current || !target) return;
      if (popoverRef.current.contains(target)) return;
      const triggerBtn = (target as HTMLElement).closest?.(
        'button[aria-expanded][aria-haspopup="dialog"]',
      );
      if (triggerBtn) return;
      onClose();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [onClose]);

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
      className={cx()}
      role="dialog"
      aria-label={ariaLabel}
    >
      <header className={cx('head')}>
        <strong>{title}</strong>
        <span className={cx('count')}>
          {activeCount}/{CONCERN_TAG_ACTIVE_LIMIT}
        </span>
      </header>
      <p className={cx('subtitle')}>{subtitle}</p>

      {active.length > 0 ? (
        <section className={cx('section')}>
          <h4>{activeHeading}</h4>
          <ul>
            {active.map((tag) => (
              <li key={tag.id}>
                <div className={cx('row-text')}>
                  <strong>{trimmedConcernLabel(tag)}</strong>
                  <small>{concernSubtitleFor(tag)}</small>
                </div>
                <button
                  type="button"
                  className={cx('remove')}
                  onClick={() => archiveTag(tag.id)}
                >
                  {removeLabel}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {suggestions.length > 0 ? (
        <section className={cx('section')}>
          <h4>{addableHeading}</h4>
          <ul>
            {suggestions.map((s) => {
              const label = s.kind === 'archived' ? s.label : s.preset.label;
              const suggestionSubtitle = s.kind === 'archived' ? s.subtitle : s.preset.subtitle;
              const key = s.kind === 'archived' ? `arc-${s.id}` : `pre-${s.preset.label}`;
              const addTitle = atLimit ? `已达激活上限 ${CONCERN_TAG_ACTIVE_LIMIT}` : '加入关注';
              return (
                <li key={key}>
                  <div className={cx('row-text')}>
                    <strong>{label.replace(/^#/, '')}</strong>
                    <small>{suggestionSubtitle}</small>
                  </div>
                  <Tooltip content={addTitle} placement="top">
                    <button
                      type="button"
                      className={cx('add')}
                      disabled={atLimit}
                      onClick={() => {
                        if (s.kind === 'archived') {
                          activateExisting(s.id);
                        } else {
                          addPreset(s.preset);
                        }
                      }}
                    >
                      {addLabel}
                    </button>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className={cx('custom')}>
        <input
          type="text"
          value={draftInput}
          onChange={(e) => setDraftInput(e.currentTarget.value)}
          placeholder={customPlaceholder}
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
          className={cx('add')}
          disabled={atLimit || draftInput.trim().length === 0}
          onClick={addCustom}
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
