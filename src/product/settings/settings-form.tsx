// SJG-DATA-09 — Settings editor (response_preferences + notification_preferences).
// Failure modes: invalid local_time HH:MM, empty language. Validator gates
// dispatch through validateShiJingSpace.

import { useEffect, useState, type FormEvent } from 'react';
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

const HHMM_RE = /^\d{2}:\d{2}$/;

interface DraftState {
  tone: ResponseTone;
  length: ResponseLength;
  language: string;
  extra_instructions: string;
  daily_today_card_enabled: boolean;
  daily_today_card_local_time: string;
}

function isValidLanguage(lang: string): boolean {
  return /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(lang.trim());
}

export function SettingsForm() {
  const { state, dispatch } = useShijingStore();
  const { response_preferences, notification_preferences } = state.snapshot.settings;
  const [draft, setDraft] = useState<DraftState>({
    tone: response_preferences.tone,
    length: response_preferences.length,
    language: response_preferences.language,
    extra_instructions: response_preferences.extra_instructions || '',
    daily_today_card_enabled: notification_preferences.daily_today_card_enabled,
    daily_today_card_local_time: notification_preferences.daily_today_card_local_time,
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
      daily_today_card_enabled: notification_preferences.daily_today_card_enabled,
      daily_today_card_local_time: notification_preferences.daily_today_card_local_time,
    });
  }, [response_preferences, notification_preferences]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidLanguage(draft.language)) {
      setSubmission({ kind: 'invalid', code: 'language_format' });
      return;
    }
    if (draft.daily_today_card_enabled && !HHMM_RE.test(draft.daily_today_card_local_time)) {
      setSubmission({ kind: 'invalid', code: 'daily_today_card_local_time_format' });
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
        notification_preferences: {
          daily_today_card_enabled: draft.daily_today_card_enabled,
          daily_today_card_local_time: draft.daily_today_card_local_time,
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

      <label>
        <span>{FIELD_LABELS.response_tone}</span>
        <select value={draft.tone} onChange={(e) => setDraft({ ...draft, tone: e.target.value as ResponseTone })}>
          {RESPONSE_TONES.map((tone) => (
            <option key={tone} value={tone}>{enumLabel('response_tone', tone)}</option>
          ))}
        </select>
      </label>

      <label>
        <span>{FIELD_LABELS.response_length}</span>
        <select value={draft.length} onChange={(e) => setDraft({ ...draft, length: e.target.value as ResponseLength })}>
          {RESPONSE_LENGTHS.map((len) => (
            <option key={len} value={len}>{enumLabel('response_length', len)}</option>
          ))}
        </select>
      </label>

      <label>
        <span>{FIELD_LABELS.response_language}</span>
        <input
          type="text"
          value={draft.language}
          onChange={(e) => setDraft({ ...draft, language: e.target.value })}
          placeholder={FIELD_PLACEHOLDERS.response_language}
          required
        />
      </label>

      <label>
        <span>{FIELD_LABELS.extra_instructions}</span>
        <textarea
          value={draft.extra_instructions}
          onChange={(e) => setDraft({ ...draft, extra_instructions: e.target.value })}
          rows={3}
          placeholder={FIELD_PLACEHOLDERS.extra_instructions}
        />
      </label>

      <label className="shijing-settings-toggle-row">
        <input
          type="checkbox"
          checked={draft.daily_today_card_enabled}
          onChange={(e) => setDraft({ ...draft, daily_today_card_enabled: e.target.checked })}
        />
        <span>{FIELD_LABELS.daily_today_card_enabled}</span>
      </label>

      <label>
        <span>{FIELD_LABELS.daily_today_card_local_time}</span>
        <input
          type="time"
          value={draft.daily_today_card_local_time}
          onChange={(e) => setDraft({ ...draft, daily_today_card_local_time: e.target.value })}
        />
      </label>

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
        <button type="submit">{BUTTONS.save_settings}</button>
      </div>
    </form>
  );
}
