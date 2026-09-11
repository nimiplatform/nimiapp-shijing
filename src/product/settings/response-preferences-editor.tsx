// W-c03 Settings > Response Preferences React editor.

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { nimiToast } from '@nimiplatform/kit/ui';
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
import { persistenceWriteSucceeded } from '../state/persistence-bridge.ts';
import { SettingsRow } from './settings-row.tsx';
import { commitResponsePreferences } from './response-preferences-state.ts';

const EXTRA_INSTRUCTIONS_COMMIT_DELAY_MS = 600;
const EXTRA_INSTRUCTIONS_MAX_LENGTH = 500;

export function ResponsePreferencesEditor() {
  const { state, replace_snapshot } = useShijingStore();
  const copy = useProductCopy();
  const currentPreferences = state.snapshot.settings.response_preferences;
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Selects commit immediately with a quiet success toast. The
  // extra-instructions textarea keeps a local draft and commits on blur, on a
  // short debounce, and on unmount — typing no longer validates and persists
  // the whole snapshot per keystroke.
  async function commitDraft(nextDraft: ResponsePreferences, announce = true): Promise<boolean> {
    if (savingRef.current) return false;
    const value = extraDraftRef.current;
    const outcome = commitResponsePreferences(state.snapshot, { ...nextDraft, extra_instructions: value });
    if (!outcome.ok) {
      nimiToast.danger(copy.responsePreferences.saveFailed(outcome.error.code));
      return false;
    }
    savingRef.current = true;
    setSaving(true);
    if (extraCommitTimerRef.current !== null) {
      window.clearTimeout(extraCommitTimerRef.current);
      extraCommitTimerRef.current = null;
    }
    try {
      const persistence = await replace_snapshot(outcome.next_space);
      if (!persistenceWriteSucceeded(persistence)) {
        nimiToast.danger(copy.responsePreferences.saveFailed(
          persistence.kind === 'error' ? persistence.error.kind : persistence.kind,
        ));
        return false;
      }
      committedExtraRef.current = value;
      if (announce) nimiToast.success(copy.responsePreferences.saved());
      return true;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const [extraDraft, setExtraDraft] = useState(currentPreferences.extra_instructions ?? '');
  const extraDraftRef = useRef(extraDraft);
  const committedExtraRef = useRef(extraDraft);
  const extraCommitTimerRef = useRef<number | null>(null);
  const latestRef = useRef({ commitDraft, currentPreferences });
  useEffect(() => {
    latestRef.current = { commitDraft, currentPreferences };
  });

  const flushExtraDraft = useCallback(() => {
    if (extraCommitTimerRef.current !== null) {
      window.clearTimeout(extraCommitTimerRef.current);
      extraCommitTimerRef.current = null;
    }
    const value = extraDraftRef.current;
    if (value === committedExtraRef.current) return;
    void latestRef.current.commitDraft(
      { ...latestRef.current.currentPreferences, extra_instructions: value },
      false,
    );
  }, []);

  function handleExtraChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.currentTarget.value;
    setExtraDraft(value);
    extraDraftRef.current = value;
    if (extraCommitTimerRef.current !== null) {
      window.clearTimeout(extraCommitTimerRef.current);
    }
    extraCommitTimerRef.current = window.setTimeout(
      flushExtraDraft,
      EXTRA_INSTRUCTIONS_COMMIT_DELAY_MS,
    );
  }

  // Never overwrite unsaved text with an unrelated snapshot update or a
  // failed write. A clean draft follows external preferences changes.
  useEffect(() => {
    const storeValue = currentPreferences.extra_instructions ?? '';
    if (!savingRef.current && extraDraftRef.current === committedExtraRef.current
      && storeValue !== committedExtraRef.current) {
      committedExtraRef.current = storeValue;
      extraDraftRef.current = storeValue;
      setExtraDraft(storeValue);
    }
  }, [currentPreferences.extra_instructions]);

  // Page switches unmount this editor; flush so trailing keystrokes inside
  // the debounce window are not lost.
  useEffect(() => flushExtraDraft, [flushExtraDraft]);

  return (
    <SettingsRow
      id="settings-response-preferences"
      icon={
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
      }
      title={copy.responsePreferences.title}
    >
      <div className="sjp-row__fields">
        <div className="sjp-field">
          <label className="sjp-label" htmlFor="resp-tone">{copy.responsePreferences.tone}</label>
          <SjpSelect
            id="resp-tone"
            disabled={saving}
            value={currentPreferences.tone}
            onValueChange={(v) => commitDraft({ ...currentPreferences, tone: v as ResponseTone })}
            options={RESPONSE_TONES.map((t) => ({ value: t, label: copy.responseToneLabels[t] }))}
          />
        </div>

        <div className="sjp-field">
          <label className="sjp-label" htmlFor="resp-length">{copy.responsePreferences.length}</label>
          <SjpSelect
            id="resp-length"
            disabled={saving}
            value={currentPreferences.length}
            onValueChange={(v) => commitDraft({ ...currentPreferences, length: v as ResponseLength })}
            options={RESPONSE_LENGTHS.map((l) => ({ value: l, label: copy.responseLengthLabels[l] }))}
          />
        </div>
      </div>

      <div className="sjp-field">
        <label className="sjp-label" htmlFor="resp-language">{copy.responsePreferences.aiLanguage}</label>
        <SjpSelect
          id="resp-language"
          disabled={saving}
          value={currentPreferences.language}
          onValueChange={(v) => commitDraft({ ...currentPreferences, language: v })}
          options={RESPONSE_LANGUAGES.map((l) => ({
            value: l,
            label: copy.responseLanguageLabels[l],
          }))}
        />
      </div>

      <div className="sjp-field">
        <label className="sjp-label" htmlFor="resp-extra">
          {copy.responsePreferences.extraInstructions}{' '}
          <span className="sjp-opt">({copy.common.optional})</span>
        </label>
        <div className="sjp-textarea-wrap">
          <textarea
            id="resp-extra"
            disabled={saving}
            className="sjp-textarea"
            placeholder={copy.responsePreferences.extraPlaceholder}
            value={extraDraft}
            maxLength={EXTRA_INSTRUCTIONS_MAX_LENGTH}
            onChange={handleExtraChange}
            onBlur={flushExtraDraft}
          />
          <span className="sjp-textarea-count" aria-hidden="true">
            {extraDraft.length}/{EXTRA_INSTRUCTIONS_MAX_LENGTH}
          </span>
        </div>
        {extraDraft !== (currentPreferences.extra_instructions ?? '') ? (
          <button
            type="button"
            className="sjp-btn"
            disabled={saving}
            onClick={flushExtraDraft}
          >
            {copy.responsePreferences.saveButton}
          </button>
        ) : null}
      </div>
    </SettingsRow>
  );
}
