import { useEffect, useMemo, useState } from 'react';
import { SegmentedControl, nimiToast } from '@nimiplatform/kit/ui';
import { useTranslation } from 'react-i18next';
import { UI_LANGUAGES, type UiLanguage } from '../../domain/settings.ts';
import { useProductCopy } from '../i18n/copy.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { SettingsRow } from './settings-row.tsx';
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

export function UiLanguageSwitch() {
  const { state, replace_snapshot } = useShijingStore();
  const { i18n } = useTranslation();
  const copy = useProductCopy();
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
      nimiToast.danger(copy.uiLanguage.saveFailed(outcome.error.code));
      return;
    }
    setSaving(true);
    const persistence = await replace_snapshot(outcome.next_space);
    setSaving(false);
    if (persistence.kind !== 'saved' && persistence.kind !== 'idle') {
      nimiToast.danger(copy.uiLanguage.saveFailed(persistence.kind));
      return;
    }
    await i18n.changeLanguage(next);
    nimiToast.success(copy.uiLanguage.saved(copy.uiLanguageLabels[next as UiLanguage]));
  }

  return (
    <SettingsRow
      id="settings-ui-language"
      align="center"
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
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a13.5 13.5 0 0 1 3.5 9 13.5 13.5 0 0 1-3.5 9 13.5 13.5 0 0 1-3.5-9A13.5 13.5 0 0 1 12 3z" />
        </svg>
      }
      title={copy.uiLanguage.title}
    >
      <SegmentedControl
        ariaLabel={copy.shell.languageSwitch}
        size="sm"
        value={value}
        onValueChange={(next) => {
          void changeLanguage(next);
        }}
        items={items}
        className="shijing-ui-language-switch__control shijing-ui-language-switch__control--card"
      />
    </SettingsRow>
  );
}
