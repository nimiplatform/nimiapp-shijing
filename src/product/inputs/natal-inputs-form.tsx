import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react';

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

export function NatalInputsForm() {
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
      <header className="shijing-natal-onboarding">
        <h1>{title}</h1>
        <p>{HEADINGS.natal_onboarding_body}</p>
      </header>
      <NaturalBirthEditor
        draft={draft}
        dispatch={draftDispatch}
        idPrefix="natal-inputs"
        submitLabel={BUTTONS.save_natal}
      />
      {submission.kind === 'invalid_birth' ? (
        <>
          <p role="alert" className="shijing-natal-inputs-form__error">
            {submission.message}
          </p>
          <TechnicalDetails content={submission.technical} />
        </>
      ) : null}
      {submission.kind === 'invalid_space' ? (() => {
        const formatted = formatSaveRefusal(submission.code);
        return (
          <>
            <p role="alert" className="shijing-natal-inputs-form__error">
              {FAILURE_HEADLINES.save_refused} {formatted.headline}
            </p>
            <TechnicalDetails content={formatted.technical} />
          </>
        );
      })() : null}
      {submission.kind === 'saved' ? (
        <p role="status" className="shijing-natal-inputs-form__status">
          已保存。
        </p>
      ) : null}
    </form>
  );
}
