// HeJing (合镜) record dialog — "记录一次经历".
//
// Replaces the old toast stub with a real dialog modeled on the NianJing event
// recorder (textarea + date). The target person is fixed to the current 合镜
// person (核对相关人物, not editable); creating writes an EventMemory with
// `person_refs: [personRef]` and `concern_tag_refs: []` through
// `upsertEventMemory`, and only after the persistence write succeeds does the
// success toast fire and the record become visible in 轨迹. Editing preserves
// the existing subject links, use policy, source, and unchanged date precision.

import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  nimiToast,
} from '@nimiplatform/kit/ui';

import type { EventMemory } from '../../../domain/event-memory.ts';
import { newEventMemoryId } from '../../ids/index.ts';
import { upsertEventMemory } from '../../memories/memory-editor-state.ts';
import { persistenceWriteSucceeded } from '../../state/persistence-bridge.ts';
import { useShijingStore } from '../../state/shijing-store.tsx';
import { dailyMirrorScopeForToday } from '../mirror-scope-helpers.ts';
import {
  buildHeJingEventMemoryDraft,
  HEJING_PAGE_COPY,
  type HeJingPersonRef,
} from './hejing-model.ts';

const copy = HEJING_PAGE_COPY;

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export interface HeJingRecordDialogProps {
  readonly open: boolean;
  readonly personRef: HeJingPersonRef;
  readonly personDisplayName: string;
  // When set, the dialog edits this record instead of creating a new one.
  readonly editing: EventMemory | null;
  readonly onClose: () => void;
}

export function HeJingRecordDialog(props: HeJingRecordDialogProps) {
  const { state, replace_snapshot } = useShijingStore();
  const [draft, setDraft] = useState('');
  const [draftDate, setDraftDate] = useState(dailyMirrorScopeForToday().date);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) return;
    setDraft(props.editing?.body ?? '');
    setDraftDate(props.editing?.occurred_at.slice(0, 10) ?? dailyMirrorScopeForToday().date);
    setError(null);
  }, [props.open, props.editing]);

  async function save() {
    const body = draft.trim();
    if (body.length === 0) return;
    const memory: EventMemory = props.editing
      ? {
          ...props.editing,
          occurred_at: draftDate === props.editing.occurred_at.slice(0, 10)
            ? props.editing.occurred_at
            : `${draftDate}T00:00:00Z`,
          body,
          updated_at: nowIso(),
        }
      : buildHeJingEventMemoryDraft({
          id: newEventMemoryId(),
          personRef: props.personRef,
          body,
          occurredDate: draftDate,
          nowIso: nowIso(),
        });
    const outcome = upsertEventMemory(state.snapshot, memory);
    if (!outcome.ok) {
      const detail =
        outcome.error.code === 'memory_invalid'
          ? `memory_invalid:${outcome.error.detail.code}`
          : outcome.error.code;
      setError(detail);
      return;
    }
    const persistence = await replace_snapshot(outcome.next_space);
    if (!persistenceWriteSucceeded(persistence)) {
      setError(persistence.kind === 'error' ? persistence.error.kind : persistence.kind);
      return;
    }
    nimiToast.success(props.editing ? copy.recordUpdatedToast : copy.recordSavedToast);
    props.onClose();
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => { if (!open) props.onClose(); }}>
      <DialogContent className="shijing-hejing-record" onClose={props.onClose}>
        <DialogHeader>
          <DialogTitle>
            {props.editing ? copy.recordDialogEditTitle : copy.recordDialogTitle}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="shijing-hejing-record__person">
            <span className="shijing-hejing-record__label">{copy.recordDialogPersonLabel}</span>
            <strong>{props.personDisplayName}</strong>
            <p>{copy.recordDialogPersonFixedHint}</p>
          </div>
          <label className="shijing-hejing-record__field">
            <span className="shijing-hejing-record__label">{copy.recordDialogDateLabel}</span>
            <input
              type="date"
              value={draftDate}
              aria-label={copy.recordDialogDateLabel}
              onChange={(e) => setDraftDate(e.currentTarget.value)}
            />
          </label>
          <label className="shijing-hejing-record__field">
            <span className="shijing-hejing-record__label">{copy.recordDialogBodyLabel}</span>
            <textarea
              value={draft}
              rows={4}
              placeholder={copy.recordDialogBodyPlaceholder}
              aria-label={copy.recordDialogBodyLabel}
              onChange={(e) => {
                setDraft(e.currentTarget.value);
                if (error) setError(null);
              }}
            />
          </label>
          {error ? (
            <p className="shijing-hejing-record__error" role="alert">
              {copy.recordSaveError}
              <code>({error})</code>
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <div className="shijing-hejing-record__actions">
            <button type="button" className="shijing-hejing-record__cancel" onClick={props.onClose}>
              {copy.recordDialogCancel}
            </button>
            <button
              type="button"
              className="shijing-hejing-record__save"
              disabled={draft.trim().length === 0}
              onClick={() => void save()}
            >
              {copy.recordDialogSave}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
