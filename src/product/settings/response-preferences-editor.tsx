// W-c03 Settings > Response Preferences React editor.

import { useState } from 'react';
import {
  RESPONSE_LENGTHS,
  RESPONSE_LANGUAGES,
  RESPONSE_TONES,
  type ResponseLength,
  type ResponsePreferences,
  type ResponseTone,
} from '../../domain/settings.ts';
import {
  useProductCopy,
} from '../i18n/copy.ts';
import { SjpSelect } from '../components/sjp-select.tsx';
import { useShijingStore } from '../state/shijing-store.tsx';
import { commitResponsePreferences } from './response-preferences-state.ts';
import { ShijingAiModelConfigSection } from '../../shell/ai/shijing-ai-model-config-section.tsx';

export function ResponsePreferencesEditor() {
  const { state, dispatch } = useShijingStore();
  const copy = useProductCopy();
  const initial = state.snapshot.settings.response_preferences;
  const [draft, setDraft] = useState<ResponsePreferences>(initial);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function save() {
    const outcome = commitResponsePreferences(state.snapshot, draft);
    if (!outcome.ok) {
      setErrorCode(outcome.error.code);
      setSavedAt(null);
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    setErrorCode(null);
    setSavedAt(new Date().toISOString());
  }

  return (
    <>
      <section id="settings-response-preferences" className="sjp-card" tabIndex={-1}>
        <div className="sjp-card-head">
          <span className="sjp-card-icon">
            <svg
              className="sjp-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
          </span>
          <div>
            <h2 className="sjp-card-title">{copy.responsePreferences.title}</h2>
            <p className="sjp-card-desc">{copy.responsePreferences.description}</p>
          </div>
        </div>

        <form
          className="sjp-grid"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="sjp-field">
            <label className="sjp-label" htmlFor="resp-tone">{copy.responsePreferences.tone}</label>
            <SjpSelect
              id="resp-tone"
              value={draft.tone}
              onValueChange={(v) => setDraft({ ...draft, tone: v as ResponseTone })}
              options={RESPONSE_TONES.map((t) => ({ value: t, label: copy.responseToneLabels[t] }))}
            />
          </div>

          <div className="sjp-field">
            <label className="sjp-label" htmlFor="resp-length">{copy.responsePreferences.length}</label>
            <SjpSelect
              id="resp-length"
              value={draft.length}
              onValueChange={(v) => setDraft({ ...draft, length: v as ResponseLength })}
              options={RESPONSE_LENGTHS.map((l) => ({ value: l, label: copy.responseLengthLabels[l] }))}
            />
          </div>

          <div className="sjp-field sjp-field--full">
            <label className="sjp-label" htmlFor="resp-language">{copy.responsePreferences.aiLanguage}</label>
            <SjpSelect
              id="resp-language"
              value={draft.language}
              onValueChange={(v) => setDraft({ ...draft, language: v })}
              options={RESPONSE_LANGUAGES.map((l) => ({
                value: l,
                label: copy.responseLanguageLabels[l],
              }))}
            />
          </div>

          <div className="sjp-field sjp-field--full">
            <label className="sjp-label" htmlFor="resp-extra">
              {copy.responsePreferences.extraInstructions}{' '}
              <span className="sjp-opt">({copy.common.optional})</span>
            </label>
            <textarea
              id="resp-extra"
              className="sjp-textarea"
              placeholder={copy.responsePreferences.extraPlaceholder}
              value={draft.extra_instructions ?? ''}
              onChange={(e) => setDraft({ ...draft, extra_instructions: e.currentTarget.value })}
            />
          </div>

          <div className="sjp-actions">
            <button type="submit" className="sjp-btn sjp-btn--primary">
              <svg
                className="sjp-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {copy.responsePreferences.saveButton}
            </button>
          </div>

          {errorCode ? (
            <p className="sjp-alert" role="alert">
              {copy.responsePreferences.saveFailed(errorCode)}
            </p>
          ) : null}
          {savedAt ? (
            <p className="sjp-status" role="status">
              {copy.responsePreferences.savedAt(savedAt)}
            </p>
          ) : null}
        </form>
      </section>
      <ShijingAiModelConfigSection />
    </>
  );
}
