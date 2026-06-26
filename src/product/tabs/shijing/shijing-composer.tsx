import type { FormEventHandler, KeyboardEvent, RefObject } from 'react';
import { Tooltip } from '@nimiplatform/kit/ui';
import { useProductCopy } from '../../i18n/copy.ts';
import { GeneratingButton } from '../shared/generating-button.tsx';
import { ArrowUpIcon } from './shijing-icons.tsx';
import type { SeedItem } from './shijing-session-model.ts';

export interface ShiJingComposerProps {
  readonly chatActive: boolean;
  readonly seedItems: readonly SeedItem[];
  readonly question: string;
  readonly composerPlaceholder: string;
  readonly canAsk: boolean;
  readonly askReason: string;
  readonly submitTitle: string;
  readonly submitLabel: string;
  readonly submitting: boolean;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly onSubmit: FormEventHandler<HTMLFormElement>;
  readonly onQuestionChange: (question: string) => void;
  readonly onClearSeed: (item: SeedItem) => void;
}

export function ShiJingComposer(props: ShiJingComposerProps) {
  const copy = useProductCopy();

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }
    event.preventDefault();
    if (props.canAsk) {
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form
      className="shijing-ask__composer"
      data-chat-composer={props.chatActive ? 'true' : 'false'}
      onSubmit={props.onSubmit}
      aria-label={copy.shijing.composerAria}
    >
      <h2 className="shijing-ask__composer-title">{copy.shijing.composerTitle}</h2>

      {props.seedItems.length > 0 ? (
        <div className="shijing-ask__seed" aria-label={copy.shijing.seedAria}>
          <span className="shijing-ask__seed-label">{copy.shijing.seedLabel}</span>
          <ul className="shijing-ask__seed-list">
            {props.seedItems.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="shijing-ask__seed-chip" data-kind={item.kind}>
                <span className="shijing-ask__seed-tag">
                  {item.kind === 'plan' ? copy.shijing.seedKindPlan : copy.shijing.seedKindMemory}
                </span>
                <span className="shijing-ask__seed-date">{item.date}</span>
                <span className="shijing-ask__seed-body">{item.body}</span>
                <button
                  type="button"
                  className="shijing-ask__seed-remove"
                  aria-label={copy.shijing.seedRemoveAria}
                  onClick={() => props.onClearSeed(item)}
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <textarea
        ref={props.textareaRef}
        className="shijing-ask__textarea"
        rows={2}
        value={props.question}
        onChange={(e) => props.onQuestionChange(e.currentTarget.value)}
        onKeyDown={handleTextareaKeyDown}
        placeholder={props.composerPlaceholder}
        aria-label={copy.shijing.questionAria}
      />

      <div className="shijing-ask__toolbar">
        <div className="shijing-ask__actions">
          <div className="shijing-ask__submit-wrap">
            {!props.canAsk && props.askReason ? (
              <span className="shijing-ask__submit-reason">{props.askReason}</span>
            ) : null}
            <Tooltip content={props.askReason || props.submitTitle} placement="top">
              <GeneratingButton
                type="submit"
                className="shijing-ask__submit"
                disabled={!props.canAsk}
                busy={props.submitting}
                busyLabel={props.submitLabel}
                leadingIcon={<ArrowUpIcon className="shijing-ask__submit-icon" />}
                labelClassName="shijing-ask__submit-text"
              >
                {props.submitLabel}
              </GeneratingButton>
            </Tooltip>
          </div>
        </div>
      </div>
    </form>
  );
}
