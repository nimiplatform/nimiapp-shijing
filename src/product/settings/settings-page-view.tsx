// SJG-IA-04 — settings detail page.
//
// The account avatar opens a compact menu of the settings sub-pages (see
// SHIJING_SETTINGS_PAGES). Selecting an entry opens this full-surface detail
// page, which renders that page's surfaces. The `.shijing-settings` wrapper
// keeps the existing surface/editor styling (h3 / button / recover) intact.

import { useEffect } from 'react';
import { PageDetailLayout } from '@nimiplatform/kit/ui';
import {
  SHIJING_SETTINGS_PAGES,
  type ShijingSettingsPageId,
} from '../../contracts/ia-contract.ts';
import { useProductCopy } from '../i18n/copy.ts';
import { SettingsSurfaceSection } from './settings-surfaces.tsx';

export type ShijingSettingsFocusTarget =
  | 'self_profile_editor'
  | 'ai_model_config'
  | 'privacy_local_data';

const SETTINGS_FOCUS_TARGET_IDS: Partial<Record<ShijingSettingsFocusTarget, string>> = {
  ai_model_config: 'settings-ai-model-config',
  privacy_local_data: 'settings-privacy-local-data',
};

export interface SettingsPageViewProps {
  readonly pageId: ShijingSettingsPageId;
  readonly focusTarget?: ShijingSettingsFocusTarget | null;
  readonly onBack: () => void;
  // Switch to a sibling settings sub-page without returning to the avatar
  // menu (see the subnav below). Drives the same `activePage` state in the
  // shell that the avatar menu sets.
  readonly onNavigate: (pageId: ShijingSettingsPageId) => void;
}

export function SettingsPageView({
  pageId,
  focusTarget,
  onBack,
  onNavigate,
}: SettingsPageViewProps) {
  const copy = useProductCopy();
  const page =
    SHIJING_SETTINGS_PAGES.find((candidate) => candidate.id === pageId) ??
    SHIJING_SETTINGS_PAGES[0];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onBack();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onBack]);

  useEffect(() => {
    if (!focusTarget) return;
    const id = SETTINGS_FOCUS_TARGET_IDS[focusTarget];
    if (!id) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(id);
      if (!(target instanceof HTMLElement)) return;
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
      target.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusTarget, pageId]);

  // 档案 (profile), 关注 (concerns), 发生过的事 (memory), and 设置 (settings)
  // all share the polished personal-data card system (see styles-personal-data.css),
  // keyed off `--styled` — every settings sub-page renders self-contained
  // `.sjp-card`s.
  const pageClassName = `shijing-settings-page shijing-settings-page--styled shijing-settings-page--${page.id}`;

  const isProfile = page.id === 'profile';

  // Intro copy per sub-page. 关注 is the forward-looking lens; 发生过的事 is
  // the lifelong archive whose day-to-day entry lives on the time mirrors.
  const intro =
    page.id === 'profile'
      ? copy.settings.profileIntro
      : page.id === 'concerns'
        ? copy.settings.concernsIntro
        : page.id === 'memory'
          ? copy.settings.memoryIntro
          : copy.settings.settingsIntro;

  return (
    <div
      className={pageClassName}
      role="dialog"
      aria-modal="true"
      aria-label={copy.settingsPageLabels[page.id]}
    >
      <PageDetailLayout
        title={copy.settingsPageLabels[page.id]}
        width="md"
        back={
          <>
            <button type="button" className="shijing-settings-page__back" onClick={onBack}>
              <svg
                className="sjp-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {copy.settings.back}
            </button>
            <nav className="shijing-settings-page__subnav" aria-label={copy.settings.subnavAriaLabel}>
              {SHIJING_SETTINGS_PAGES.map((entry) => {
                const active = entry.id === page.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className="shijing-settings-page__subnav-item"
                    aria-current={active ? 'page' : undefined}
                    onClick={active ? undefined : () => onNavigate(entry.id)}
                  >
                    {copy.settingsPageLabels[entry.id]}
                  </button>
                );
              })}
            </nav>
          </>
        }
        beforeContent={
          intro ? (
            <div className="sjp-lede">
              <p className="sjp-intro">{intro}</p>
              {isProfile ? (
                <span className="sjp-tag">
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 018 0v4" />
                  </svg>
                  {copy.settings.localOnlyTag}
                </span>
              ) : null}
            </div>
          ) : undefined
        }
      >
        <div className="shijing-settings">
          {page.surfaces.map((surface) => (
            <SettingsSurfaceSection key={surface} surface={surface} focusTarget={focusTarget} />
          ))}
        </div>
      </PageDetailLayout>
    </div>
  );
}
