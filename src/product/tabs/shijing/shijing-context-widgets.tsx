import { useState } from 'react';
import type { Conversation } from '../../../domain/conversation.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import { InlineConcernEditorPopover } from '../../concern-tags/inline-concern-editor.tsx';
import { trimmedConcernLabel } from '../../concern-tags/concern-presets.ts';
import { useProductCopy } from '../../i18n/copy.ts';
import {
  firstUserQuestion,
  sessionTimeLabel,
  type ArchiveConcernOption,
} from './shijing-session-model.ts';

export function ArchiveTray(props: {
  readonly options: readonly ArchiveConcernOption[];
  readonly selectedIds: readonly string[];
  readonly onToggleOption: (option: ArchiveConcernOption) => void;
  readonly onRemoveOption: (option: ArchiveConcernOption) => void;
}) {
  const copy = useProductCopy();
  if (props.options.length === 0) return null;
  return (
    <section className="shijing-archive" aria-label={copy.shijing.archive.aria}>
      <div className="shijing-archive__lead">
        <span className="shijing-archive__icon" aria-hidden>
          +
        </span>
        <span className="shijing-archive__label">{copy.shijing.archive.addPrefix}</span>
      </div>
      <div className="shijing-archive__chips">
        {props.options.map((option) => {
          const selected = option.tag_id != null && props.selectedIds.includes(option.tag_id);
          const label = option.label;
          return (
            <span key={option.option_id} className="shijing-archive__chip" data-selected={selected ? 'true' : 'false'}>
              <button
                type="button"
                className="shijing-archive__chip-main"
                onClick={() => props.onToggleOption(option)}
              >
                {label}
              </button>
              <button
                type="button"
                className="shijing-archive__close"
                aria-label={copy.shijing.archive.removeAria(label)}
                onClick={() => props.onRemoveOption(option)}
              >
                x
              </button>
            </span>
          );
        })}
      </div>
    </section>
  );
}

export function QuestionArchiveRecall(props: {
  readonly conversations: readonly Conversation[];
  readonly concernTags: readonly ConcernTag[];
  readonly onSelectConversation: (id: string) => void;
}) {
  const copy = useProductCopy();
  if (props.conversations.length === 0) return null;
  const tagsById = new Map(props.concernTags.map((tag) => [tag.id, tag]));
  return (
    <section className="shijing-recall" aria-label={copy.shijing.archive.recallAria}>
      <div className="shijing-recall__lead">
        <span className="shijing-recall__icon" aria-hidden>
          +
        </span>
        <span className="shijing-recall__title">{copy.shijing.archive.recallTitle}</span>
      </div>
      <ul className="shijing-recall__list">
        {props.conversations.map((conversation) => {
          const question = firstUserQuestion(conversation, copy);
          const labels = conversation.concern_tag_refs
            .map((id) => tagsById.get(id))
            .filter((tag): tag is ConcernTag => tag != null)
            .map((tag) => trimmedConcernLabel(tag));
          return (
            <li key={conversation.id}>
              <button
                type="button"
                className="shijing-recall__item"
                aria-label={copy.shijing.archive.recallOpenAria(question)}
                onClick={() => props.onSelectConversation(conversation.id)}
              >
                <span className="shijing-recall__question">{question}</span>
                <span className="shijing-recall__meta">
                  {labels.length > 0 ? labels.join(' / ') : sessionTimeLabel(conversation.created_at, copy)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Context focus bar for the consultation surface. It surfaces the active
// concern tags that will shape this reading and opens the same compact
// inline concern editor used by the time-window mirrors.
export function ContextFocusBar(props: {
  readonly tags: readonly ConcernTag[];
}) {
  const copy = useProductCopy();
  const [editorOpen, setEditorOpen] = useState(false);
  const active = props.tags.filter((t) => t.status === 'active');
  return (
    <section className="shijing-ctx" aria-label={copy.shijing.context.aria}>
      <div className="shijing-ctx__lead">
        <span className="shijing-ctx__icon" aria-hidden>
          ✦
        </span>
        <div className="shijing-ctx__text">
          <p className="shijing-ctx__title">{copy.shijing.context.title}</p>
          <p className="shijing-ctx__desc">{copy.shijing.context.description}</p>
        </div>
      </div>
      <div className="shijing-ctx__focus">
        <ul className="shijing-ctx__chips">
          {active.length === 0 ? (
            <li className="shijing-ctx__empty">{copy.shijing.context.empty}</li>
          ) : (
            active.map((t) => (
              <li key={t.id} className="shijing-ctx__chip">
                {t.label}
              </li>
            ))
          )}
        </ul>
        <span className="shijing-ctx__editor-anchor">
          <button
            type="button"
            className="shijing-ctx__manage"
            aria-expanded={editorOpen}
            aria-haspopup="dialog"
            onClick={() => setEditorOpen((open) => !open)}
          >
            ✎ {copy.shijing.context.manage}
          </button>
          {editorOpen ? (
            <InlineConcernEditorPopover
              classNamePrefix="shijing-ctx-editor"
              ariaLabel={copy.shijing.context.manage}
              title={copy.shijing.context.manage}
              subtitle={copy.shijing.context.editorSubtitle}
              onClose={() => setEditorOpen(false)}
            />
          ) : null}
        </span>
      </div>
    </section>
  );
}

export function ConversationThread(props: { readonly conversation: Conversation }) {
  const copy = useProductCopy();
  return (
    <ol className="shijing-ask__thread">
      {props.conversation.turns.map((turn) => (
        <li key={turn.id} className="shijing-ask__turn" data-role={turn.role}>
          <span className="shijing-ask__turn-role">{copy.conversationRoleLabels[turn.role]}</span>
          <p className="shijing-ask__turn-body">{turn.body}</p>
          {turn.cited_reading_ids.length > 0 ? (
            <small className="shijing-ask__turn-cite">
              {copy.shijing.citedReadings(turn.cited_reading_ids.length)}
            </small>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
