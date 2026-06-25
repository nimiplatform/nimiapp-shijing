// SJG-IA-04 — settings detail page.
//
// The account avatar opens a compact menu of the settings sub-pages (see
// SHIJING_SETTINGS_PAGES). Selecting an entry opens this full-surface detail
// page, which renders that page's surfaces. The `.shijing-settings` wrapper
// keeps the existing surface/editor styling (h3 / button / recover) intact.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
  type WheelEvent,
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
import { SettingsSurfaceSection } from './settings-surfaces.tsx';

export type ShijingSettingsFocusTarget =
  | 'self_profile_editor'
  | 'method_profile'
  | 'ai_model_config'
  | 'privacy_local_data';

const SETTINGS_FOCUS_TARGET_IDS: Partial<Record<ShijingSettingsFocusTarget, string>> = {
  method_profile: 'settings-method-profile',
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

interface SettingsModuleNavItem {
  readonly targetId: string;
  readonly label: string;
}

export function SettingsPageView({
  pageId,
  focusTarget,
  onBack,
  onNavigate,
}: SettingsPageViewProps) {
  const copy = useProductCopy();
  const { state, presence_verification_client } = useShijingStore();
  const settingsScrollRef = useRef<HTMLDivElement | null>(null);
  const settingsNavRef = useRef<HTMLElement | null>(null);
  const touchScrollRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const [verifiedUntilMs, setVerifiedUntilMs] = useState(0);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [activeSettingsModuleId, setActiveSettingsModuleId] = useState<string | null>(
    'settings-ui-language',
  );
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

  const settingsModuleNavItems: readonly SettingsModuleNavItem[] =
    page.id === 'settings'
      ? [
          { targetId: 'settings-ui-language', label: copy.uiLanguage.title },
          { targetId: 'settings-method-profile', label: copy.methodProfile.title },
          { targetId: 'settings-response-preferences', label: copy.responsePreferences.title },
          { targetId: 'settings-ai-model-config', label: copy.aiConfig.title },
          { targetId: 'settings-privacy-local-data', label: copy.privacy.title },
          { targetId: 'settings-diagnostics', label: copy.diagnostics.title },
        ]
      : [];

  useEffect(() => {
    setActiveSettingsModuleId(settingsModuleNavItems[0]?.targetId ?? null);
  }, [page.id]);

  const updateActiveSettingsModule = useCallback(() => {
    const nav = settingsNavRef.current;
    if (!nav || settingsModuleNavItems.length === 0) return;

    const navTop = nav.getBoundingClientRect().top;
    let nextActiveTargetId = settingsModuleNavItems[0]?.targetId ?? null;

    for (const item of settingsModuleNavItems) {
      const target = document.getElementById(item.targetId);
      if (!(target instanceof HTMLElement)) continue;

      const targetTop = target.getBoundingClientRect().top;
      if (targetTop <= navTop + 8) {
        nextActiveTargetId = item.targetId;
      }
    }

    setActiveSettingsModuleId((previous) =>
      previous === nextActiveTargetId ? previous : nextActiveTargetId,
    );
  }, [settingsModuleNavItems]);

  const scrollToSettingsModule = useCallback((targetId: string) => {
    const scrollContainer = settingsScrollRef.current;
    const nav = settingsNavRef.current;
    const target = document.getElementById(targetId);
    if (!(target instanceof HTMLElement) || !scrollContainer || !nav) return;

    setActiveSettingsModuleId(targetId);
    const targetRect = target.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const nextTop = scrollContainer.scrollTop + targetRect.top - navRect.top;
    scrollContainer.scrollTo({ top: nextTop, behavior: 'smooth' });
  }, []);

  const handleSettingsContentScroll = useCallback(() => {
    updateActiveSettingsModule();
  }, [updateActiveSettingsModule]);

  const handleSettingsBodyWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const scrollContainer = settingsScrollRef.current;
    if (!scrollContainer || event.deltaY === 0) return;
    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;

    event.preventDefault();
    scrollContainer.scrollTop += event.deltaY;
  }, []);

  const handleSettingsBodyTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    const scrollContainer = settingsScrollRef.current;
    if (!touch || !scrollContainer) return;

    touchScrollRef.current = {
      y: touch.clientY,
      scrollTop: scrollContainer.scrollTop,
    };
  }, []);

  const handleSettingsBodyTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    const scrollContainer = settingsScrollRef.current;
    const touchScroll = touchScrollRef.current;
    if (!touch || !scrollContainer || !touchScroll) return;

    event.preventDefault();
    scrollContainer.scrollTop = touchScroll.scrollTop + touchScroll.y - touch.clientY;
  }, []);

  const handleSettingsBodyTouchEnd = useCallback(() => {
    touchScrollRef.current = null;
  }, []);

  useEffect(() => {
    if (!focusTarget) return;
    const id = SETTINGS_FOCUS_TARGET_IDS[focusTarget];
    if (!id) return;
    const timer = window.setTimeout(() => scrollToSettingsModule(id), 0);
    return () => window.clearTimeout(timer);
  }, [focusTarget, pageId, scrollToSettingsModule]);

  const settingsContent =
    settingsModuleNavItems.length > 0 ? (
      <div
        ref={settingsScrollRef}
        className="shijing-settings shijing-settings-page__content-scroll"
        onScroll={handleSettingsContentScroll}
      >
        {page.surfaces.map((surface) => (
          <SettingsSurfaceSection
            key={surface}
            surface={surface}
            focusTarget={focusTarget}
            profileSensitiveAccess={profileSensitiveAccess}
          />
        ))}
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
        {settingsModuleNavItems.length > 0 ? (
          <div
            className="shijing-settings-page__body"
            onWheel={handleSettingsBodyWheel}
            onTouchStart={handleSettingsBodyTouchStart}
            onTouchMove={handleSettingsBodyTouchMove}
            onTouchEnd={handleSettingsBodyTouchEnd}
            onTouchCancel={handleSettingsBodyTouchEnd}
          >
            <nav
              ref={settingsNavRef}
              className="shijing-settings-page__surface-nav"
              aria-label={copy.settings.subnavAriaLabel}
            >
              <ol className="shijing-settings-page__surface-nav-list">
                {settingsModuleNavItems.map((item) => {
                  const active = item.targetId === activeSettingsModuleId;
                  return (
                    <li key={item.targetId}>
                      <button
                        type="button"
                        className="shijing-settings-page__surface-nav-item"
                        aria-controls={item.targetId}
                        aria-current={active ? 'location' : undefined}
                        data-active={active ? 'true' : undefined}
                        onClick={() => {
                          scrollToSettingsModule(item.targetId);
                        }}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
            {settingsContent}
          </div>
        ) : (
          settingsContent
        )}
      </PageDetailLayout>
    </div>
  );
}
