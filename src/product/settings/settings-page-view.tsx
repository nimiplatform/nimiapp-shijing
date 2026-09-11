// SJG-IA-04 — settings detail page.
//
// The account avatar opens a compact menu of the settings sub-pages (see
// SHIJING_SETTINGS_PAGES). Selecting an entry opens this full-surface detail
// page. The 设置 sub-page renders every module as a row inside one stacked
// card — no left module rail, so all settings stay visible in a single
// scroll; deep links scroll the owning row into view. Sibling sub-pages
// (档案 / 关注 / 发生过的事) render their surfaces as one flowing column of
// `.sjp-card`s. The `.shijing-settings` wrapper keeps the existing
// surface/editor styling (h3 / button / recover) intact.

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PageDetailLayout } from '@nimiplatform/kit/ui';
import {
  SHIJING_SETTINGS_PAGES,
  type ShijingSettingsPageId,
} from '../../contracts/ia-contract.ts';
import { useProductCopy } from '../i18n/copy.ts';
import { SHIJING_PROFILE_REVEAL_PRESENCE_REQUEST } from '../privacy/presence-verification.ts';
import type { ProfileSensitiveAccess } from '../privacy/profile-sensitive-access.ts';
import {
  isPresenceVerificationForSelfProfile,
  selfProfilePresenceVerificationFailureReason,
} from '../self/self-profile-privacy.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { LocalDataDiagnosticsSection } from './local-data-diagnostics-section.tsx';
import { MethodProfileEditor } from './method-profile-editor.tsx';
import { ResponsePreferencesEditor } from './response-preferences-editor.tsx';
import { SettingsRow } from './settings-row.tsx';
import { SettingsSurfaceSection } from './settings-surfaces.tsx';
import { UiLanguageSwitch } from './ui-language-switch.tsx';

export type ShijingSettingsFocusTarget =
  | 'self_profile_editor'
  | 'method_profile'
  | 'privacy_local_data';

// Host-injected extra module rendered as the last row on the 设置 sub-page.
// The product layer owns no such module itself — the local-development
// carrier uses this to place its session / AI-config status inside settings
// instead of above the product shell. Absent in previews and tests.
export interface SettingsPageExtraModule {
  readonly targetId: string;
  readonly navLabel: string;
  readonly content: ReactNode;
}

const SETTINGS_FOCUS_TARGET_IDS: Partial<Record<ShijingSettingsFocusTarget, string>> = {
  method_profile: 'settings-method-profile',
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
  // Optional host-injected extra module on the 设置 sub-page only.
  readonly settingsExtras?: SettingsPageExtraModule | null;
}

// @nimi-authority: rule.shijing.ia.r004
export function SettingsPageView({
  pageId,
  focusTarget,
  onBack,
  onNavigate,
  settingsExtras,
}: SettingsPageViewProps) {
  const copy = useProductCopy();
  const { state, presence_verification_client } = useShijingStore();
  const [verifiedUntilMs, setVerifiedUntilMs] = useState(0);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
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
  // keyed off `--styled`.
  const pageClassName = `shijing-settings-page shijing-settings-page--styled shijing-settings-page--${page.id}`;

  const isProfile = page.id === 'profile';
  const revealSensitive = isProfile && verifiedUntilMs > Date.now();

  useEffect(() => {
    setVerifiedUntilMs(0);
    setVerificationError(null);
    setVerificationPending(false);
  }, [page.id, state.snapshot.user_id]);

  useEffect(() => {
    if (!isProfile) return;
    if (verifiedUntilMs <= Date.now()) return;
    const timeout = window.setTimeout(() => {
      setVerifiedUntilMs(0);
      setVerificationError(null);
    }, Math.max(0, verifiedUntilMs - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [isProfile, verifiedUntilMs]);

  const ensureSensitiveReveal = useCallback(async (): Promise<boolean> => {
    if (revealSensitive) return true;
    if (verificationPending) return false;
    setVerificationPending(true);
    setVerificationError(null);
    try {
      const result = await presence_verification_client.requestPresenceVerification(
        SHIJING_PROFILE_REVEAL_PRESENCE_REQUEST,
      );
      if (result.state === 'verified') {
        if (isPresenceVerificationForSelfProfile(result, state.snapshot.user_id)) {
          setVerifiedUntilMs(result.verifiedUntilMs);
          return true;
        }
        setVerificationError(
          copy.self.revealSensitiveFailed(
            selfProfilePresenceVerificationFailureReason(result, state.snapshot.user_id) ??
              'presence_verification_failed',
          ),
        );
        return false;
      }
      if (result.state === 'cancelled') return false;
      setVerificationError(copy.self.revealSensitiveFailed(result.reason));
      return false;
    } catch (error) {
      setVerificationError(
        copy.self.revealSensitiveFailed(error instanceof Error ? error.message : String(error)),
      );
      return false;
    } finally {
      setVerificationPending(false);
    }
  }, [
    copy,
    presence_verification_client,
    revealSensitive,
    state.snapshot.user_id,
    verificationPending,
  ]);

  const lockSensitiveProfile = useCallback(() => {
    setVerifiedUntilMs(0);
    setVerificationError(null);
  }, []);

  const profileSensitiveAccess = useMemo<ProfileSensitiveAccess>(
    () => ({
      revealSensitive,
      verificationPending,
      verificationError,
      ensureSensitiveReveal,
      lockSensitiveProfile,
    }),
    [
      ensureSensitiveReveal,
      lockSensitiveProfile,
      revealSensitive,
      verificationError,
      verificationPending,
    ],
  );

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

  // The extra module only belongs to the 设置 sub-page; on sibling sub-pages
  // it is not rendered.
  const extras = page.id === 'settings' ? (settingsExtras ?? null) : null;
  const localDataSurfaces = page.surfaces.filter(
    (surface) => surface === 'privacy_local_data' || surface === 'diagnostics',
  );

  // Deep links (e.g. a mirror readiness blocker pointing at 推演方法) scroll
  // the owning row into view now that every module stays on the page.
  useEffect(() => {
    if (!focusTarget || page.id !== 'settings') return;
    const id = SETTINGS_FOCUS_TARGET_IDS[focusTarget];
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  }, [focusTarget, page.id]);

  const settingsContent =
    page.id === 'settings' ? (
      <div className="shijing-settings-stack">
        <div className="sjp-stack">
          {page.surfaces.map((surface) => {
            if (surface === 'response_preferences') {
              return (
                <Fragment key={surface}>
                  <UiLanguageSwitch />
                  <MethodProfileEditor />
                  <ResponsePreferencesEditor />
                </Fragment>
              );
            }
            if (surface === localDataSurfaces[0]) {
              return <LocalDataDiagnosticsSection key={surface} surfaces={localDataSurfaces} />;
            }
            if (surface === 'privacy_local_data' || surface === 'diagnostics') return null;
            return (
              <SettingsSurfaceSection
                key={surface}
                surface={surface}
                focusTarget={focusTarget}
                profileSensitiveAccess={profileSensitiveAccess}
              />
            );
          })}
          {extras ? (
            <SettingsRow
              id={extras.targetId}
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
                  <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
                  <path d="M3.3 8.3L12 13l8.7-4.7" />
                  <path d="M12 13v9" />
                </svg>
              }
              title={extras.navLabel}
            >
              {extras.content}
            </SettingsRow>
          ) : null}
        </div>
      </div>
    ) : (
      <div className="shijing-settings">
        {page.surfaces.map((surface) => (
          <SettingsSurfaceSection
            key={surface}
            surface={surface}
            focusTarget={focusTarget}
            profileSensitiveAccess={profileSensitiveAccess}
          />
        ))}
      </div>
    );

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
        {settingsContent}
      </PageDetailLayout>
    </div>
  );
}
