import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AmbientBackground,
  Button,
  StatusBadge,
  Surface,
} from '@nimiplatform/kit/ui';
import { useAppStore } from './app-store.js';
import type { ShijingRuntimeAccessState } from './runtime-access-state.js';
import { runShijingBootstrap } from '../infra/shijing-bootstrap.js';
import { ProductArea } from '../routes/product-area.js';

type ShijingHostEvents = {
  readonly onSessionInvalidated: (listener: () => void) => () => void;
};

declare global {
  interface Window {
    /** ShiJing's preload forwards the Kit Host's session invalidation. */
    readonly shijingHost?: ShijingHostEvents;
  }
}

export function RuntimeAccessBoundary() {
  const { t, i18n } = useTranslation();
  const ready = useAppStore((state) => state.bootstrapReady);
  const failure = useAppStore((state) => state.bootstrapFailure);
  const sessionInvalidated = useAppStore((state) => state.sessionInvalidated);
  const [retrying, setRetrying] = useState(false);

  // The ended session's product work stops by unmounting the product area;
  // reopening binds ShiJing to the current session again.
  useEffect(
    () => window.shijingHost?.onSessionInvalidated(() => useAppStore.getState().setSessionInvalidated()),
    [],
  );

  useEffect(() => {
    void runShijingBootstrap();
    const revalidate = () => {
      void runShijingBootstrap({ force: true, preserveReady: true });
    };
    const interval = window.setInterval(revalidate, 5_000);
    window.addEventListener('focus', revalidate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', revalidate);
    };
  }, []);

  const retry = useCallback(() => {
    setRetrying(true);
    void runShijingBootstrap({ force: true }).finally(() => setRetrying(false));
  }, []);

  if (sessionInvalidated) {
    return (
      <AmbientBackground variant="mesh" className="shijing-protected-gate">
        <Surface
          tone="panel"
          elevation="raised"
          padding="lg"
          className="shijing-protected-gate__panel"
          data-testid="shijing-session-invalidated"
        >
          <StatusBadge tone="info" shape="dot">
            {t('Shell.sessionChanged.badge')}
          </StatusBadge>
          <div className="shijing-protected-gate__copy">
            <h1>{t('Shell.sessionChanged.title')}</h1>
            <p>{t('Shell.sessionChanged.detail')}</p>
          </div>
          <div className="shijing-protected-gate__actions">
            <Button type="button" tone="primary" onClick={() => window.location.reload()}>
              {t('Shell.sessionChanged.reopen')}
            </Button>
          </div>
        </Surface>
      </AmbientBackground>
    );
  }

  if (ready) return <ProductArea />;

  const state: ShijingRuntimeAccessState = failure?.state ?? 'runtime-unavailable';
  const reasonCode = failure?.reasonCode ?? 'shijing-runtime-access-unavailable';
  const actionHint = failure?.actionHint ?? 'retry_same_host';

  return (
    <AmbientBackground variant="mesh" className="shijing-protected-gate">
      <div className="shijing-protected-gate__language" role="group" aria-label={t('Shell.language')}>
        <button
          type="button"
          aria-pressed={i18n.resolvedLanguage === 'en'}
          onClick={() => void i18n.changeLanguage('en')}
        >
          EN
        </button>
        <button
          type="button"
          aria-pressed={i18n.resolvedLanguage === 'zh'}
          onClick={() => void i18n.changeLanguage('zh')}
        >
          中
        </button>
      </div>

      <Surface
        tone="panel"
        elevation="raised"
        padding="lg"
        className="shijing-protected-gate__panel"
        data-testid="shijing-runtime-access-failure"
        data-access-state={state}
      >
        <StatusBadge tone={state === 'action-required' ? 'info' : 'warning'} shape="dot">
          {t(`Shell.accessState.${state}`)}
        </StatusBadge>
        <div className="shijing-protected-gate__copy">
          <p className="shijing-protected-gate__eyebrow">{t('Shell.accessEyebrow')}</p>
          <h1>{t('Shell.accessTitle')}</h1>
          <p>{t('Shell.accessDetail')}</p>
        </div>
        <div className="shijing-protected-gate__action-hint">
          <span>{t(`Shell.accessAction.${state}`)}</span>
        </div>
        <details className="shijing-protected-gate__technical">
          <summary>{t('Shell.technicalDetails')}</summary>
          <code>{reasonCode}</code>
          <code>{actionHint}</code>
        </details>
        <div className="shijing-protected-gate__actions">
          <Button
            type="button"
            tone="primary"
            onClick={retry}
            loading={retrying}
            data-testid="shijing-runtime-access-retry"
          >
            {t('Shell.retry')}
          </Button>
        </div>
      </Surface>
    </AmbientBackground>
  );
}
