// SJG-IA-06 — shared concern-tag controls (create / archive / unarchive
// / active-count feedback). The controls are mounted from both Settings
// and per-mirror filter areas; they must never become a standalone
// View-like workspace.
//
// The layout mirrors the 年镜 / 月镜「管理关注」popover: an 已激活 group
// of active concerns (each removable) followed by a 可添加 group of preset
// templates and archived concerns (each addable), then a free-form custom
// input. Presets + subtitles come from the shared `concern-presets`
// catalog so every surface offers the same set.

import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@nimiplatform/kit/ui';
import {
  CONCERN_TAG_ACTIVE_LIMIT,
  type ConcernTag,
} from '../../domain/concern-tag.ts';
import { newConcernTagId } from '../ids/index.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import {
  CONCERN_PRESETS,
  type ConcernPreset,
  concernSubtitleFor,
  trimmedConcernLabel,
} from './concern-presets.ts';

// Compared against `trimmedConcernLabel` (which drops the leading `#`), so the
// preset labels are trimmed to match — otherwise every concern reads as custom.
const PRESET_LABELS: ReadonlySet<string> = new Set(
  CONCERN_PRESETS.map((p) => p.label.replace(/^#/, '')),
);
import {
  deriveConcernTagLabelForDisplay,
  parseConcernTagInput,
} from './concern-tag-parser.ts';

export interface ConcernTagControlsProps {
  readonly onChange?: (next: readonly ConcernTag[]) => void;
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

type Suggestion =
  | {
      readonly kind: 'archived';
      readonly id: string;
      readonly label: string;
      readonly subtitle: string;
      readonly isCustom: boolean;
    }
  | { readonly kind: 'preset'; readonly preset: ConcernPreset };

export function ConcernTagControls(props: ConcernTagControlsProps) {
  const { state, dispatch } = useShijingStore();
  const [draftInput, setDraftInput] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<{
    readonly id: string;
    readonly label: string;
  } | null>(null);
  const tags = state.snapshot.concern_tags;
  const active = useMemo(() => tags.filter((t) => t.status === 'active'), [tags]);
  const activeCount = active.length;
  const atLimit = activeCount >= CONCERN_TAG_ACTIVE_LIMIT;

  const parsedPreview = useMemo(
    () => parseConcernTagInput(draftInput, { persons: state.snapshot.persons }),
    [draftInput, state.snapshot.persons],
  );

  // Archived concerns first (so a concern the user once tracked is easy to
  // bring back), then preset templates not already present in any state.
  const suggestions: readonly Suggestion[] = useMemo(() => {
    const archived: Suggestion[] = tags
      .filter((t) => t.status === 'archived')
      .map((t) => ({
        kind: 'archived',
        id: t.id,
        label: t.label,
        subtitle: concernSubtitleFor(t),
        isCustom: !PRESET_LABELS.has(trimmedConcernLabel(t)),
      }));
    const presetSuggestions: Suggestion[] = CONCERN_PRESETS.filter(
      (p) => !tags.some((t) => t.label === p.label),
    ).map((p) => ({ kind: 'preset', preset: p }));
    return [...archived, ...presetSuggestions];
  }, [tags]);

  function commitTags(next: readonly ConcernTag[]) {
    dispatch({ type: 'snapshot/replace', snapshot: { ...state.snapshot, concern_tags: next } });
    props.onChange?.(next);
  }

  function archiveTag(id: string) {
    commitTags(
      tags.map((t) =>
        t.id === id ? { ...t, status: 'archived', updated_at: nowIso() } : t,
      ),
    );
  }

  // A concern is "custom" when its label is not one of the built-in presets.
  // Preset concerns can only be archived (they stay re-addable); custom ones
  // the user typed get a true delete so a typo/experiment isn't stuck forever.
  function isCustomTag(tag: ConcernTag): boolean {
    return !PRESET_LABELS.has(trimmedConcernLabel(tag));
  }

  function deleteTag(id: string) {
    // Hard-remove the tag, and strip its id from any event memory that
    // referenced it so no dangling concern_tag_ref is left behind.
    const nextTags = tags.filter((t) => t.id !== id);
    const nextMemories = state.snapshot.event_memories.map((m) =>
      m.concern_tag_refs.includes(id)
        ? { ...m, concern_tag_refs: m.concern_tag_refs.filter((ref) => ref !== id) }
        : m,
    );
    dispatch({
      type: 'snapshot/replace',
      snapshot: { ...state.snapshot, concern_tags: nextTags, event_memories: nextMemories },
    });
    props.onChange?.(nextTags);
  }

  function confirmDelete() {
    if (!confirmingDelete) return;
    deleteTag(confirmingDelete.id);
    setConfirmingDelete(null);
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
    const parsed = parsedPreview;
    const trimmed = parsed.raw_input.trim();
    if (trimmed.length === 0) return;
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

  return (
    <section className="sjp-card" aria-label="关注的事">
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
            <path d="M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </span>
        <div>
          <h2 className="sjp-card-title">关注的事</h2>
          <p className="sjp-card-desc">
            写下你这阵子最在意的事，解读时会围绕它们来展开 · 最多同时关注{' '}
            {CONCERN_TAG_ACTIVE_LIMIT} 项，正在关注 {activeCount} 项
            {atLimit ? '（已满，先收起一项再添加新的）' : ''}
          </p>
        </div>
      </div>

      {active.length > 0 ? (
        <div className="sjp-concern-group">
          <h3 className="sjp-concern-group__title">已激活</h3>
          <ul className="sjp-concern-list">
            {active.map((tag) => (
              <li className="sjp-concern-row" key={tag.id} data-status="active">
                <div className="sjp-concern-row__text">
                  <strong>{trimmedConcernLabel(tag)}</strong>
                  <small>{concernSubtitleFor(tag)}</small>
                  {tag.mention_refs.length > 0 ? (
                    <small className="sjp-concern-row__mentions">
                      关系到{' '}
                      {tag.mention_refs.map((m, i) => (
                        <span key={i} data-resolved={m.resolved_subject_ref ? 'true' : 'false'}>
                          {m.token}
                          {m.resolved_subject_ref ? '（已匹配）' : '（待匹配）'}{' '}
                        </span>
                      ))}
                    </small>
                  ) : null}
                </div>
                <div className="sjp-concern-row__actions">
                  <button
                    type="button"
                    className="sjp-concern-row__action sjp-concern-row__action--remove"
                    onClick={() => archiveTag(tag.id)}
                  >
                    移除
                  </button>
                  {isCustomTag(tag) ? (
                    <button
                      type="button"
                      className="sjp-concern-row__action sjp-concern-row__action--delete"
                      onClick={() =>
                        setConfirmingDelete({ id: tag.id, label: trimmedConcernLabel(tag) })
                      }
                      aria-label={`彻底删除 ${trimmedConcernLabel(tag)}`}
                    >
                      删除
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="sjp-empty">还没有关注的事。从下面挑一个，或写下你这阵子最在意的。</p>
      )}

      {suggestions.length > 0 ? (
        <div className="sjp-concern-group">
          <h3 className="sjp-concern-group__title">可添加</h3>
          <ul className="sjp-concern-list">
            {suggestions.map((s) => {
              const label = s.kind === 'archived' ? s.label : s.preset.label;
              const subtitle = s.kind === 'archived' ? s.subtitle : s.preset.subtitle;
              const key = s.kind === 'archived' ? `arc-${s.id}` : `pre-${s.preset.label}`;
              return (
                <li className="sjp-concern-row" key={key} data-status="suggestion">
                  <div className="sjp-concern-row__text">
                    <strong>{label.replace(/^#/, '')}</strong>
                    <small>{subtitle}</small>
                  </div>
                  <div className="sjp-concern-row__actions">
                    <button
                      type="button"
                      className="sjp-concern-row__action sjp-concern-row__action--add"
                      disabled={atLimit}
                      title={atLimit ? `已达激活上限 ${CONCERN_TAG_ACTIVE_LIMIT}` : '加入关注'}
                      onClick={() => {
                        if (s.kind === 'archived') {
                          activateExisting(s.id);
                        } else {
                          addPreset(s.preset);
                        }
                      }}
                    >
                      添加
                    </button>
                    {s.kind === 'archived' && s.isCustom ? (
                      <button
                        type="button"
                        className="sjp-concern-row__action sjp-concern-row__action--delete"
                        onClick={() =>
                          setConfirmingDelete({ id: s.id, label: label.replace(/^#/, '') })
                        }
                        aria-label={`彻底删除 ${label.replace(/^#/, '')}`}
                      >
                        删除
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="sjp-field sjp-field--full">
        <label className="sjp-label" htmlFor="concern-add">自定义关注</label>
        <div className="sjp-inline-add">
          <input
            id="concern-add"
            className="sjp-input"
            type="text"
            value={draftInput}
            onChange={(e) => setDraftInput(e.currentTarget.value)}
            placeholder="想关注什么？如「创业」「考研」，可 @某人，也可直接写一句话"
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
            className="sjp-btn sjp-btn--primary"
            onClick={addCustom}
            disabled={atLimit || parsedPreview.raw_input.trim().length === 0}
          >
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
              <path d="M12 5v14M5 12h14" />
            </svg>
            添加
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete !== null}
        title="彻底删除这个关注？"
        message={
          confirmingDelete
            ? `「${confirmingDelete.label}」将被永久删除，并从引用它的记录中移除。此操作不可撤销。`
            : ''
        }
        confirmLabel="删除"
        cancelLabel="取消"
        confirmTone="danger"
        onConfirm={confirmDelete}
        onClose={() => setConfirmingDelete(null)}
      />
    </section>
  );
}
