// RiJing — "今天有特别的事情吗？" lightweight memory composer.
//
// This is NOT a calibration form. It invites the user to add a
// real-world piece of context that should feed the day's reading.
// Visually it stays low-pressure (two short text rows, a 2-line
// textarea, one calm primary action) and lives directly under the
// Hero conclusion so the user does not have to scroll.
//
// On submit we build a valid EventMemory and call upsertEventMemory
// so the validator + concern-tag-ref + person-ref gates apply. We
// never scroll, never navigate; the success line stays in place and
// the textarea clears.

import { useState } from 'react';
import { nimiToast } from '@nimiplatform/kit/ui';

import { useShijingStore } from '../../state/shijing-store.tsx';
import { upsertEventMemory } from '../../memories/memory-editor-state.ts';
import { newEventMemoryId } from '../../ids/index.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import { useProductCopy } from '../../i18n/copy.ts';
import { RiJingReferenceList } from './rijing-reference-list.tsx';
import { persistenceWriteSucceeded } from '../../state/persistence-bridge.ts';

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export interface RiJingEventInputProps {
  // Events already folded into today's reading, newest first. Rendered above the
  // composer with inline edit/delete; empty → only the composer shows.
  readonly references: readonly EventMemory[];
}

export function RiJingEventInput(props: RiJingEventInputProps) {
  const copy = useProductCopy();
  const { state, replace_snapshot } = useShijingStore();
  const [draft, setDraft] = useState('');
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'empty' }
    | { kind: 'invalid'; reason: string }
  >({ kind: 'idle' });

  async function onAdd() {
    const body = draft.trim();
    if (body.length === 0) {
      setSubmission({ kind: 'empty' });
      return;
    }
    const ts = nowIso();
    const memory: EventMemory = {
      id: newEventMemoryId(),
      occurred_at: ts,
      body,
      person_refs: [],
      concern_tag_refs: [],
      source: 'rijing',
      admissible_use: 'eligible_for_retrieval',
      created_at: ts,
      updated_at: ts,
    };
    const outcome = upsertEventMemory(state.snapshot, memory);
    if (!outcome.ok) {
      const detail =
        outcome.error.code === 'memory_invalid'
          ? `memory_invalid:${outcome.error.detail.code}`
          : outcome.error.code;
      setSubmission({ kind: 'invalid', reason: detail });
      return;
    }
    const persistence = await replace_snapshot(outcome.next_space);
    if (!persistenceWriteSucceeded(persistence)) {
      setSubmission({
        kind: 'invalid',
        reason: persistence.kind === 'error' ? persistence.error.kind : persistence.kind,
      });
      return;
    }
    setDraft('');
    nimiToast.success(copy.rijing.eventInput.successHint);
  }

  const disabled = draft.trim().length === 0;
  const hintNode = (() => {
    if (submission.kind === 'empty') {
      return (
        <span className="shijing-rijing__event-input-hint shijing-rijing__event-input-hint--warn">
          {copy.rijing.eventInput.emptyHint}
        </span>
      );
    }
    if (submission.kind === 'invalid') {
      return (
        <span className="shijing-rijing__event-input-hint shijing-rijing__event-input-hint--warn">
          {copy.rijing.eventInput.invalidHint(submission.reason)}
        </span>
      );
    }
    return null;
  })();

  return (
    <aside className="shijing-rijing__event-input" aria-label={copy.rijing.eventInput.ariaLabel}>
      <header className="shijing-rijing__event-input-head">
        <h3 className="shijing-rijing__event-input-title">{copy.rijing.eventInput.title}</h3>
        <p className="shijing-rijing__event-input-intro">
          {copy.rijing.eventInput.intro}
        </p>
      </header>
      <RiJingReferenceList references={props.references} />
      <textarea
        className="shijing-rijing__event-input-textarea"
        value={draft}
        rows={3}
        placeholder={copy.rijing.eventInput.placeholder}
        aria-label={copy.rijing.eventInput.ariaLabel}
        onChange={(e) => {
          setDraft(e.target.value);
          if (submission.kind !== 'idle') {
            setSubmission({ kind: 'idle' });
          }
        }}
      />
      <div className="shijing-rijing__event-input-toolbar">
        {hintNode ? (
          <div
            className="shijing-rijing__event-input-hint-slot"
            role="alert"
          >
            {hintNode}
          </div>
        ) : null}
        <button
          type="button"
          className="shijing-rijing__event-input-submit"
          onClick={onAdd}
          disabled={disabled}
        >
          <span>{copy.rijing.eventInput.submit}</span>
        </button>
      </div>
    </aside>
  );
}
