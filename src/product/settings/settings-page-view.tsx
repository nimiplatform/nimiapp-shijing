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
import { SETTINGS_PAGE_LABELS } from '../i18n/copy.ts';
import { SettingsSurfaceSection } from './settings-surfaces.tsx';

export interface SettingsPageViewProps {
  readonly pageId: ShijingSettingsPageId;
  readonly onBack: () => void;
  // Switch to a sibling settings sub-page without returning to the avatar
  // menu (see the subnav below). Drives the same `activePage` state in the
  // shell that the avatar menu sets.
  readonly onNavigate: (pageId: ShijingSettingsPageId) => void;
}

export function SettingsPageView({ pageId, onBack, onNavigate }: SettingsPageViewProps) {
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
      ? '管理用于排盘与解读的基础资料和关系人物。'
      : page.id === 'concerns'
        ? '记下你最近在意的事，它们是时镜看你近况的「镜片」。激活的关注会进入日 / 月 / 年镜的推算。内容只保存在本地。'
        : page.id === 'memory'
          ? '记下你经历过的大事，解读时会结合它们，更懂你的处境。内容只保存在本地。'
          : '调整时镜如何回应你，并管理只保存在本设备上的数据。';

  return (
    <div
      className={pageClassName}
      role="dialog"
      aria-modal="true"
      aria-label={SETTINGS_PAGE_LABELS[page.id]}
    >
      <PageDetailLayout
        title={SETTINGS_PAGE_LABELS[page.id]}
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
              返回
            </button>
            <nav className="shijing-settings-page__subnav" aria-label="设置分区">
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
                    {SETTINGS_PAGE_LABELS[entry.id]}
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
                  本地保存 · 不会公开
                </span>
              ) : null}
            </div>
          ) : undefined
        }
      >
        <div className="shijing-settings">
          {page.surfaces.map((surface) => (
            <SettingsSurfaceSection key={surface} surface={surface} />
          ))}
        </div>
      </PageDetailLayout>
    </div>
  );
}
