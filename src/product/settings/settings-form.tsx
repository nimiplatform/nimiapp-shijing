// SJG-DATA-09 — Settings editor (response_preferences).
// Failure mode: invalid language tag. Validator gates dispatch through
// validateShiJingSpace.
//
// Wave-N (kit form pass): the form layout switched from hand-rolled
// <label><span/><select/></label> blocks to kit `FieldShell` +
// kit `SelectField` / `TextField` / `TextareaField` + kit `Button`.
// The form itself still owns submission state and the dispatch /
// validator chain — only the visual layer changed.

import { useEffect, useState, type FormEvent } from 'react';
import {
  Button,
  FieldShell,
  SelectField,
  TextField,
  TextareaField,
} from '@nimiplatform/kit/ui';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import {
  RESPONSE_LENGTHS,
  RESPONSE_TONES,
  type ResponseLength,
  type ResponseTone,
} from '../../domain/settings.ts';
import { BUTTONS, FAILURE_HEADLINES, FIELD_LABELS, FIELD_PLACEHOLDERS, HEADINGS } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

interface DraftState {
  tone: ResponseTone;
  length: ResponseLength;
  language: string;
  extra_instructions: string;
}

function isValidLanguage(lang: string): boolean {
  return /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(lang.trim());
}

export function SettingsForm() {
  const { state, dispatch } = useShijingStore();
  const { response_preferences } = state.snapshot.settings;
  const [draft, setDraft] = useState<DraftState>({
    tone: response_preferences.tone,
    length: response_preferences.length,
    language: response_preferences.language,
    extra_instructions: response_preferences.extra_instructions || '',
  });
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'invalid'; code: string }
    | { kind: 'saved'; at: string }
  >({ kind: 'idle' });

  useEffect(() => {
    setDraft({
      tone: response_preferences.tone,
      length: response_preferences.length,
      language: response_preferences.language,
      extra_instructions: response_preferences.extra_instructions || '',
    });
  }, [response_preferences]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidLanguage(draft.language)) {
      setSubmission({ kind: 'invalid', code: 'language_format' });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      settings: {
        response_preferences: {
          tone: draft.tone,
          length: draft.length,
          language: draft.language.trim(),
          ...(draft.extra_instructions.trim().length > 0
            ? { extra_instructions: draft.extra_instructions.trim() }
            : {}),
        },
      },
    };
    const check = validateShiJingSpace(nextSnapshot);
    if (!check.ok) {
      setSubmission({ kind: 'invalid', code: check.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setSubmission({ kind: 'saved', at: new Date().toISOString() });
  }

  return (
    <form className="shijing-settings-form" onSubmit={onSubmit} noValidate>
      <header className="shijing-card__head">
        <h3>{HEADINGS.settings}</h3>
      </header>

      <FieldShell label={FIELD_LABELS.response_tone}>
        <SelectField
          value={draft.tone}
          options={RESPONSE_TONES.map((tone) => ({
            value: tone,
            label: enumLabel('response_tone', tone),
          }))}
          onValueChange={(value) => setDraft({ ...draft, tone: value as ResponseTone })}
        />
      </FieldShell>

      <FieldShell label={FIELD_LABELS.response_length}>
        <SelectField
          value={draft.length}
          options={RESPONSE_LENGTHS.map((length) => ({
            value: length,
            label: enumLabel('response_length', length),
          }))}
          onValueChange={(value) => setDraft({ ...draft, length: value as ResponseLength })}
        />
      </FieldShell>

      <FieldShell label={FIELD_LABELS.response_language}>
        <TextField
          type="text"
          value={draft.language}
          onChange={(event) => setDraft({ ...draft, language: event.target.value })}
          placeholder={FIELD_PLACEHOLDERS.response_language}
          required
        />
      </FieldShell>

      <FieldShell label={FIELD_LABELS.extra_instructions}>
        <TextareaField
          value={draft.extra_instructions}
          onChange={(event) => setDraft({ ...draft, extra_instructions: event.target.value })}
          rows={3}
          placeholder={FIELD_PLACEHOLDERS.extra_instructions}
        />
      </FieldShell>

      {submission.kind === 'invalid' ? (
        <>
          <p role="alert">{FAILURE_HEADLINES.settings_invalid}</p>
          <TechnicalDetails content={submission.code} />
        </>
      ) : null}
      {submission.kind === 'saved' ? (
        <p role="status">已保存。</p>
      ) : null}

      <div className="shijing-form-actions">
        <Button type="submit" tone="primary">{BUTTONS.save_settings}</Button>
      </div>
    </form>
  );
}
