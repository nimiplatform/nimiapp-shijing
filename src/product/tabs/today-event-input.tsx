// Today tab — "今天有特别的事情吗？" lightweight input card.
//
// Visually mirrors the consultation composer pattern (问时镜 右侧输入卡):
// a soft white-to-mint gradient card with a serif heading, a borderless
// transparent textarea, and a calm gradient-pill submit button anchored
// in a thin toolbar separator at the bottom. The card is dimensionally
// lighter than the consultation composer (smaller heading, smaller
// textarea, smaller button) so it sits as a secondary action under the
// Hero conclusion without competing with the "今天怎么做" cards.
//
// On submit we validate the draft, build a real Event, run it through
// validateEvent + validateShiJingSpace, and dispatch a snapshot replace
// that appends to ShiJingSpace.events. We never scroll, never navigate;
// the success line stays in-place inside the toolbar and the textarea
// clears.

import { useEffect, useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { newEventId } from '../events/event-id.ts';
import { validateEvent } from '../../contracts/event-validator.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Event } from '../../domain/event.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { SparkleIcon } from './today-icons.tsx';

export interface TodayEventInputCardProps {
  readonly primarySubject: SubjectRef;
}

function nowIsoUtc(): string {
  return new Date().toISOString();
}

function splitTitleAndRecap(input: string): { title: string; recap: string } {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { title: '', recap: '' };
  const firstBreak = trimmed.search(/[\n。！？!?]/);
  if (firstBreak === -1) {
    return { title: trimmed.slice(0, 64), recap: trimmed };
  }
  const title = trimmed.slice(0, firstBreak).trim() || trimmed.slice(0, 64);
  return { title: title.slice(0, 64), recap: trimmed };
}

const PLACEHOLDER = '例如：下午要谈一个重要合作，心里有点不确定……';
const EMPTY_HINT = '可以先写一句今天发生的事情。';
const SUCCESS_HINT = '已加入今日参考，今日建议会优先结合这件事来看。';

export function TodayEventInputCard(props: TodayEventInputCardProps) {
  const { state, dispatch } = useShijingStore();
  const [draft, setDraft] = useState('');
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'empty' }
    | { kind: 'invalid'; reason: string }
    | { kind: 'saved' }
  >({ kind: 'idle' });

  // Auto-clear the success banner so the card returns to its calm
  // resting state without the user having to dismiss anything.
  useEffect(() => {
    if (submission.kind !== 'saved') return;
    const handle = window.setTimeout(() => {
      setSubmission((current) => (current.kind === 'saved' ? { kind: 'idle' } : current));
    }, 4000);
    return () => window.clearTimeout(handle);
  }, [submission]);

  function onAdd() {
    const text = draft.trim();
    if (text.length === 0) {
      setSubmission({ kind: 'empty' });
      return;
    }
    const { title, recap } = splitTitleAndRecap(text);
    if (title.length === 0) {
      setSubmission({ kind: 'empty' });
      return;
    }
    const event: Event = {
      id: newEventId(),
      primary_subject: props.primarySubject,
      participants: [],
      occurred_at: nowIsoUtc(),
      title,
      view_refs: [],
      ...(recap.length > 0 ? { recap } : {}),
    };
    const eventCheck = validateEvent(event);
    if (!eventCheck.ok) {
      setSubmission({ kind: 'invalid', reason: eventCheck.error.code });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      events: [...state.snapshot.events, event],
    };
    const spaceCheck = validateShiJingSpace(nextSnapshot);
    if (!spaceCheck.ok) {
      setSubmission({ kind: 'invalid', reason: spaceCheck.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setDraft('');
    setSubmission({ kind: 'saved' });
  }

  const disabled = draft.trim().length === 0;
  // Only surface a hint when there is a *real* status to communicate.
  // The intro paragraph above the textarea already explains what this
  // module does, so an "idle" helper repeating the same idea would be
  // pure noise. Render `null` in idle so the toolbar collapses to just
  // the primary action.
  const hintNode = (() => {
    if (submission.kind === 'empty') {
      return (
        <span className="shijing-today-event-input__hint shijing-today-event-input__hint--warn">
          {EMPTY_HINT}
        </span>
      );
    }
    if (submission.kind === 'invalid') {
      return (
        <span className="shijing-today-event-input__hint shijing-today-event-input__hint--warn">
          这条事件没有加入（{submission.reason}）。请稍后再试或调整描述。
        </span>
      );
    }
    if (submission.kind === 'saved') {
      return (
        <span className="shijing-today-event-input__hint shijing-today-event-input__hint--ok">
          {SUCCESS_HINT}
        </span>
      );
    }
    return null;
  })();

  return (
    <aside className="shijing-today-event-input" aria-label="今天有特别的事情吗？">
      <h3 className="shijing-today-event-input__heading">今天有特别的事情吗？</h3>
      <p className="shijing-today-event-input__intro">
        补充一件今天正在发生的事，时镜会结合它整理今日建议。
      </p>
      <textarea
        className="shijing-today-event-input__textarea"
        value={draft}
        rows={3}
        placeholder={PLACEHOLDER}
        aria-label="今天有特别的事情吗？"
        onChange={(e) => {
          setDraft(e.target.value);
          if (submission.kind !== 'idle' && submission.kind !== 'saved') {
            setSubmission({ kind: 'idle' });
          }
        }}
      />
      <div className="shijing-today-event-input__toolbar">
        {hintNode ? (
          <div
            className="shijing-today-event-input__hint-slot"
            role={submission.kind === 'empty' || submission.kind === 'invalid' ? 'alert' : 'status'}
          >
            {hintNode}
          </div>
        ) : null}
        <button
          type="button"
          className="shijing-today-event-input__submit"
          onClick={onAdd}
          disabled={disabled}
        >
          <SparkleIcon />
          <span>加入今日参考</span>
        </button>
      </div>
    </aside>
  );
}
