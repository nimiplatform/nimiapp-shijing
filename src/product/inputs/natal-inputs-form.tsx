import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react';
import { InlineAlert } from '@nimiplatform/kit/ui';

import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';
import { BUTTONS, FAILURE_HEADLINES, HEADINGS } from '../i18n/copy.ts';
import { formatSaveRefusal } from '../i18n/format-failure.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { natalInputsReadiness } from '../subjects/natal-readiness.ts';
import {
  buildNaturalBirthNatalInputs,
  technicalDetailForNaturalBirthError,
  userMessageForNaturalBirthError,
} from './natural-birth-build.ts';
import { NaturalBirthEditor } from './natural-birth-editor.tsx';
import {
  createEmptyNaturalBirthDraft,
  naturalBirthDraftReducer,
} from './natural-birth-draft.ts';

export interface NatalInputsFormProps {
  /**
   * When true (Me-tab editor overlay path), skip the internal
   * "完善本命资料" header — the wrapping OverlayShell already shows
   * its own DialogTitle, so an inner h1 just doubles the page
   * chrome. The shell-repair surface keeps the default (header
   * visible) because it has no outer title.
   */
  readonly embedded?: boolean;
  /**
   * Override the primary "save" button label. Default is
   * `BUTTONS.save_natal` ("保存出生记录"). The Me modal passes
   * `BUTTONS.save_and_resync` ("保存并更新时镜") to set user
   * expectations that the chart re-baselines on save.
   */
  readonly saveLabel?: string;
  /**
   * When provided, the form renders a secondary "取消" button in
   * the action row that triggers this callback (typically the
   * overlay's onClose). Without this prop only the primary button
   * shows — matching the pre-modal callsites that didn't have a
   * close affordance to wire up.
   */
  readonly onCancel?: () => void;
}

export function NatalInputsForm(props: NatalInputsFormProps = {}) {
  const { state, dispatch } = useShijingStore();
  const initialDraft = useMemo(() => createEmptyNaturalBirthDraft(), []);
  const readiness = useMemo(
    () => natalInputsReadiness(state.snapshot.self_subject.natal_inputs),
    [state.snapshot.self_subject.natal_inputs],
  );
  const title = readiness.ok
    ? HEADINGS.natal_profile_title
    : readiness.reason === 'scaffold_default_natal_inputs'
      ? HEADINGS.natal_onboarding_title
      : HEADINGS.natal_profile_completion_title;
  const [draft, draftDispatch] = useReducer(naturalBirthDraftReducer, initialDraft);
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'invalid_birth'; message: string; technical: string }
    | { kind: 'invalid_space'; code: string }
    | { kind: 'saved'; at: string }
  >({ kind: 'idle' });

  useEffect(() => {
    draftDispatch({ type: 'hydrate_from_natal_inputs', value: state.snapshot.self_subject.natal_inputs });
  }, [state.snapshot.self_subject.natal_inputs]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const birthOutcome = buildNaturalBirthNatalInputs(draft);
    if (!birthOutcome.ok) {
      setSubmission({
        kind: 'invalid_birth',
        message: userMessageForNaturalBirthError(birthOutcome.error),
        technical: technicalDetailForNaturalBirthError(birthOutcome.error),
      });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      self_subject: { ...state.snapshot.self_subject, natal_inputs: birthOutcome.inputs },
    };
    const spaceCheck = validateShiJingSpace(nextSnapshot);
    if (!spaceCheck.ok) {
      setSubmission({ kind: 'invalid_space', code: spaceCheck.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setSubmission({ kind: 'saved', at: new Date().toISOString() });
  }

  return (
    <form className="shijing-natal-inputs-form" onSubmit={onSubmit} noValidate>
      {props.embedded ? null : (
        <header className="shijing-natal-onboarding">
          <h1>{title}</h1>
          <p>{HEADINGS.natal_onboarding_body}</p>
        </header>
      )}
      <NaturalBirthEditor
        draft={draft}
        dispatch={draftDispatch}
        idPrefix="natal-inputs"
        submitLabel={props.saveLabel ?? BUTTONS.save_natal}
        {...(props.onCancel ? { onCancel: props.onCancel } : {})}
      />
      {submission.kind === 'invalid_birth' ? (
        <>
          <InlineAlert tone="danger" className="shijing-natal-inputs-form__alert">
            {submission.message}
          </InlineAlert>
          <TechnicalDetails content={submission.technical} />
        </>
      ) : null}
      {submission.kind === 'invalid_space' ? (() => {
        const formatted = formatSaveRefusal(submission.code);
        return (
          <>
            <InlineAlert tone="danger" className="shijing-natal-inputs-form__alert">
              {FAILURE_HEADLINES.save_refused} {formatted.headline}
            </InlineAlert>
            <TechnicalDetails content={formatted.technical} />
          </>
        );
      })() : null}
      {submission.kind === 'saved' ? (
        <InlineAlert tone="success" className="shijing-natal-inputs-form__alert">
          已保存。
        </InlineAlert>
      ) : null}
    </form>
  );
}
