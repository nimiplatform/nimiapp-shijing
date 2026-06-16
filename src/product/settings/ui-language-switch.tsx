import { useEffect, useMemo, useState } from 'react';
import { SegmentedControl } from '@nimiplatform/kit/ui';
import { useTranslation } from 'react-i18next';
import { UI_LANGUAGES, type UiLanguage } from '../../domain/settings.ts';
import { useProductCopy } from '../i18n/copy.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { commitUiLanguage } from './ui-language-state.ts';

export function usePersistedUiLanguageSync() {
  const { state } = useShijingStore();
  const { i18n } = useTranslation();
  const uiLanguage = state.snapshot.settings.ui_language;

  useEffect(() => {
    if (i18n.resolvedLanguage === uiLanguage || i18n.language === uiLanguage) return;
    void i18n.changeLanguage(uiLanguage);
  }, [i18n, uiLanguage]);
}

export function UiLanguageSwitch({
  variant = 'compact',
}: {
  readonly variant?: 'compact' | 'card';
}) {
  const { state, replace_snapshot } = useShijingStore();
  const { i18n } = useTranslation();
  const copy = useProductCopy();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [savedLanguage, setSavedLanguage] = useState<UiLanguage | null>(null);
  const [saving, setSaving] = useState(false);
  const value = state.snapshot.settings.ui_language;
  const items = useMemo(
    () =>
      UI_LANGUAGES.map((language) => ({
        value: language,
        label: copy.uiLanguageLabels[language],
        disabled: saving,
      })),
    [copy, saving],
  );

  async function changeLanguage(next: string) {
    if (next === value || saving) return;
    const outcome = commitUiLanguage(state.snapshot, next);
    if (!outcome.ok) {
      setErrorCode(outcome.error.code);
      setSavedLanguage(null);
      return;
    }
    setSaving(true);
    setErrorCode(null);
    setSavedLanguage(null);
    const persistence = await replace_snapshot(outcome.next_space);
    setSaving(false);
    if (persistence.kind !== 'saved' && persistence.kind !== 'idle') {
      setErrorCode(persistence.kind);
      return;
    }
    await i18n.changeLanguage(next);
    setSavedLanguage(next as UiLanguage);
  }

  const control = (
    <SegmentedControl
      ariaLabel={copy.shell.languageSwitch}
      size="sm"
      value={value}
      onValueChange={(next) => {
        void changeLanguage(next);
      }}
      items={items}
      className="shijing-ui-language-switch__control"
    />
  );

  if (variant === 'compact') {
    return <div className="shijing-ui-language-switch">{control}</div>;
  }

  return (
    <section className="sjp-card">
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
            <path d="M4 5h16M4 19h16M7 5c1.8 6.3 5.2 10.7 10 14M17 5c-1.8 6.3-5.2 10.7-10 14" />
          </svg>
        </span>
        <div>
          <h2 className="sjp-card-title">{copy.uiLanguage.title}</h2>
          <p className="sjp-card-desc">{copy.uiLanguage.description}</p>
        </div>
      </div>
      <div className="sjp-grid">
        <div className="sjp-field sjp-field--full">{control}</div>
        {errorCode ? (
          <p className="sjp-alert" role="alert">
            {copy.uiLanguage.saveFailed(errorCode)}
          </p>
        ) : null}
        {savedLanguage ? (
          <p className="sjp-status" role="status">
            {copy.uiLanguage.saved(copy.uiLanguageLabels[savedLanguage])}
          </p>
        ) : null}
      </div>
    </section>
  );
}
