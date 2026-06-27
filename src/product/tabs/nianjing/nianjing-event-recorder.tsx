// SJG-DATA-05 / SJG-IA-03 — NianJing "发生过的事" recorder.
//
// Mounted inside the NianJing phase-band / inflection detail drawer so a past
// life event can be recorded right where the long-horizon phase that frames it
// is being read. Per `memory-use-policy.yaml`, NianJing EventMemory is
// "optional_cited_context_for_phase_explanation": events recorded here help the
// AI explain *why* a phase reads the way it does. They never feed the
// deterministic phase math (SJG-PROD-10) — recording an event does not alter
// any band or inflection.
//
// EventMemory is a *past* fact, so the recorder only appears once the framing
// phase has begun (`rangeStart <= today`); a purely-future band shows a short
// note instead. The list shows events whose `occurred_at` falls inside the
// framing range and is tagged with this concern. Save / edit / delete all go
// through `upsertEventMemory` / `deleteEventMemory` so the validator +
// concern-tag-ref gates apply. "去问镜问这条" seeds the ShiJing consultation
// and jumps there, matching the YueJing day panel.

import { useMemo, useState } from 'react';

import { ConfirmDialog, Tooltip } from '@nimiplatform/kit/ui';

import type { ConcernTag } from '../../../domain/concern-tag.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import { newEventMemoryId } from '../../ids/index.ts';
import {
  deleteEventMemory,
  upsertEventMemory,
} from '../../memories/memory-editor-state.ts';
import { useShijingStore } from '../../state/shijing-store.tsx';
import { ArrowUpIcon } from '../shijing/shijing-icons.tsx';

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateLabel(occurredAt: string): string {
  return occurredAt.slice(0, 10);
}

// Default occurred-at date for a new entry: today if it sits inside the
// framing range, otherwise the range's most recent in-range day (its end,
// clamped to today). Keeps the picker's default meaningful at year scale.
function defaultDateWithin(rangeStart: string, rangeEnd: string, today: string): string {
  if (today < rangeStart) return rangeStart;
  if (today > rangeEnd) return rangeEnd;
  return today;
}

export interface NianJingEventRecorderProps {
  readonly concernTag: ConcernTag;
  readonly rangeStart: string; // ISO YYYY-MM-DD (inclusive)
  readonly rangeEnd: string; // ISO YYYY-MM-DD (inclusive)
  // When recording against an inflection marker the date is fixed to the
  // marker; the picker is hidden and the entry anchors to this day.
  readonly fixedDate?: string;
  // Heading override — "发生过的事" for a band, "这个拐点前后发生过什么" for a
  // marker. Defaults to the band wording.
  readonly heading?: string;
  // Called after "去问镜问这条" navigates away, so the host drawer can close.
  readonly onNavigatedAway: () => void;
  // Opens the full-life "发生过的事" archive in Settings — the timeline only
  // ever shows events inside this phase's window, so "查看全部" routes to the
  // complete record list for backfill / review.
  readonly onOpenArchive: () => void;
}

export function NianJingEventRecorder(props: NianJingEventRecorderProps) {
  const { state, dispatch } = useShijingStore();
  const today = todayIsoDate();
  const tagId = props.concernTag.id;

  const [draft, setDraft] = useState('');
  const [draftDate, setDraftDate] = useState(
    props.fixedDate ?? defaultDateWithin(props.rangeStart, props.rangeEnd, today),
  );
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<EventMemory | null>(null);

  // The framing phase hasn't started yet — there is nothing past to record.
  const isFuture = props.rangeStart > today;

  const records = useMemo(() => {
    return state.snapshot.event_memories
      .filter((m) => {
        if (!m.concern_tag_refs.includes(tagId)) return false;
        const d = m.occurred_at.slice(0, 10);
        if (props.fixedDate) return d === props.fixedDate;
        return d >= props.rangeStart && d <= props.rangeEnd;
      })
      .slice()
      .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
  }, [state.snapshot.event_memories, tagId, props.rangeStart, props.rangeEnd, props.fixedDate]);

  function commit(memory: EventMemory, onOk: () => void) {
    const outcome = upsertEventMemory(state.snapshot, memory);
    if (!outcome.ok) {
      const detail =
        outcome.error.code === 'memory_invalid'
          ? `memory_invalid:${outcome.error.detail.code}`
          : outcome.error.code;
      setError(detail);
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    setError(null);
    onOk();
  }

  function saveNew() {
    const body = draft.trim();
    if (body.length === 0) return;
    const ts = nowIso();
    const memory: EventMemory = {
      id: newEventMemoryId(),
      occurred_at: `${draftDate}T00:00:00Z`,
      body,
      person_refs: [],
      concern_tag_refs: [tagId],
      source: 'nianjing',
      admissible_use: 'eligible_for_retrieval',
      created_at: ts,
      updated_at: ts,
    };
    commit(memory, () => setDraft(''));
  }

  function startEdit(memory: EventMemory) {
    setEditingId(memory.id);
    setEditDraft(memory.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft('');
  }

  function saveEdit(memory: EventMemory) {
    const body = editDraft.trim();
    if (body.length === 0) return;
    commit({ ...memory, body, updated_at: nowIso() }, cancelEdit);
  }

  function confirmDelete() {
    const memory = confirmingDelete;
    if (!memory) return;
    const outcome = deleteEventMemory(state.snapshot, memory.id);
    if (!outcome.ok) {
      setError(outcome.error.code);
      setConfirmingDelete(null);
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    setError(null);
    if (editingId === memory.id) cancelEdit();
    setConfirmingDelete(null);
  }

  function askInShiJing(id: string) {
    dispatch({ type: 'shijing/seed-memory', memory_id: id });
    dispatch({ type: 'tab/activate', tab: 'shijing' });
    props.onNavigatedAway();
  }

  const heading = props.heading ?? '发生过的事';

  return (
    <section className="shijing-nianjing__rec" aria-label={heading}>
      <h4 className="shijing-nianjing__rec-title">{heading}</h4>

      {isFuture ? (
        <p className="shijing-nianjing__rec-note">
          这段相位还未到来,暂时没有可记录的经历。等它发生后,可以回到这里把经历记下来。
        </p>
      ) : (
        <>
          <p className="shijing-nianjing__rec-intro">
            记下这段时间里和「{props.concernTag.label.replace(/^#/, '')}」相关的经历,问镜解读这段相位时可以引用它。
          </p>
          <div className="shijing-nianjing__rec-compose">
            <textarea
              className="shijing-nianjing__rec-textarea"
              value={draft}
              rows={2}
              placeholder="例如：这段时间换了工作 / 一段关系有了结果……"
              aria-label="记一笔发生过的事"
              onChange={(e) => {
                setDraft(e.currentTarget.value);
                if (error) setError(null);
              }}
            />
            <div className="shijing-nianjing__rec-compose-control">
              {props.fixedDate ? (
                <span className="shijing-nianjing__rec-date-fixed">
                  {dateLabel(`${props.fixedDate}T00:00:00Z`)}
                </span>
              ) : (
                <input
                  type="date"
                  className="shijing-nianjing__rec-date"
                  value={draftDate}
                  min={props.rangeStart}
                  max={props.rangeEnd}
                  aria-label="发生时间"
                  onChange={(e) => setDraftDate(e.currentTarget.value)}
                />
              )}
              <Tooltip content="保存事件" placement="top">
                <button
                  type="button"
                  className="shijing-nianjing__rec-save"
                  onClick={saveNew}
                  disabled={draft.trim().length === 0}
                  aria-label="保存事件"
                >
                  <ArrowUpIcon className="shijing-nianjing__rec-save-icon" />
                </button>
              </Tooltip>
            </div>
          </div>
        </>
      )}

      {error ? (
        <p className="shijing-nianjing__rec-error" role="alert">
          没能保存,请检查内容后再试一次。<code>（{error}）</code>
        </p>
      ) : null}

      <div className="shijing-nianjing__rec-list-head">
        <span>已记录 ({records.length})</span>
        <button
          type="button"
          className="shijing-nianjing__rec-archive-link"
          onClick={() => {
            props.onOpenArchive();
            props.onNavigatedAway();
          }}
        >
          查看全部
        </button>
      </div>
      {records.length === 0 ? (
        <p className="shijing-nianjing__rec-empty" role="status">
          这段时间还没有记录。
        </p>
      ) : (
        <ul className="shijing-nianjing__rec-list" aria-label="已记录的事件">
          {records.map((m) => {
            const isEditing = editingId === m.id;
            return (
              <li key={m.id} data-editing={isEditing || undefined}>
                {isEditing ? (
                  <>
                    <textarea
                      className="shijing-nianjing__rec-edit"
                      value={editDraft}
                      rows={2}
                      autoFocus
                      aria-label="编辑事件内容"
                      onChange={(e) => setEditDraft(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelEdit();
                        }
                      }}
                    />
                    <div className="shijing-nianjing__rec-edit-actions">
                      <button type="button" onClick={cancelEdit}>
                        取消
                      </button>
                      <button
                        type="button"
                        data-primary
                        disabled={
                          editDraft.trim().length === 0 || editDraft.trim() === m.body
                        }
                        onClick={() => saveEdit(m)}
                      >
                        保存
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="shijing-nianjing__rec-date-label">
                      {dateLabel(m.occurred_at)}
                    </span>
                    <span className="shijing-nianjing__rec-body">{m.body}</span>
                    <div className="shijing-nianjing__rec-actions">
                      <Tooltip content="去问镜问这条" placement="top">
                        <button
                          type="button"
                          aria-label="去问镜问这条"
                          onClick={() => askInShiJing(m.id)}
                        >
                          问
                        </button>
                      </Tooltip>
                      <Tooltip content="编辑" placement="top">
                        <button
                          type="button"
                          aria-label="编辑这条事件"
                          onClick={() => startEdit(m)}
                        >
                          ✎
                        </button>
                      </Tooltip>
                      <Tooltip content="删除" placement="top">
                        <button
                          type="button"
                          aria-label="删除这条事件"
                          onClick={() => setConfirmingDelete(m)}
                        >
                          ✕
                        </button>
                      </Tooltip>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmingDelete !== null}
        title="删除这条记录？"
        message={
          confirmingDelete
            ? `「${confirmingDelete.body}」将被永久删除，解读这段相位时不再引用。此操作不可撤销。`
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
