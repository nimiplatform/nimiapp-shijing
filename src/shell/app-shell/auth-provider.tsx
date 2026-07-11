import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AmbientBackground,
  Button,
  InlineAlert,
  StatusBadge,
  Surface,
} from '@nimiplatform/kit/ui';
import { useAppStore } from './app-store.js';
import type { ShijingProtectedSessionState } from './protected-session-state.js';
import { runShijingBootstrap } from '../infra/shijing-bootstrap.js';

export function AuthProvider() {
  const { t, i18n } = useTranslation();
  const failure = useAppStore((state) => state.bootstrapFailure);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    void runShijingBootstrap();
  }, []);

  const retry = useCallback(() => {
    setRetrying(true);
    void runShijingBootstrap({ force: true }).finally(() => setRetrying(false));
  }, []);

  const state: ShijingProtectedSessionState = failure?.state ?? 'capability-unavailable';
  const reasonCode = failure?.reasonCode ?? 'shijing-protected-operation-set-not-admitted';
  const actionHint = failure?.actionHint ?? 'wait_for_shijing_protected_operation_admission';

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
        data-testid="shijing-protected-session-failure"
        data-protected-state={state}
      >
        <StatusBadge tone="danger" shape="dot">
          {t(`Shell.protectedState.${state}`)}
        </StatusBadge>
        <div className="shijing-protected-gate__copy">
          <p className="shijing-protected-gate__eyebrow">{t('Shell.protectedSessionEyebrow')}</p>
          <h1>{t('Shell.protectedSessionTitle')}</h1>
          <p>{t('Shell.protectedSessionDetail')}</p>
        </div>
        <InlineAlert tone="danger">
          <div className="shijing-protected-gate__alert-copy">
            <span>{t('Shell.protectedSessionLocked')}</span>
            <strong>{t('Shell.reasonCode')}: {reasonCode}</strong>
          </div>
        </InlineAlert>
        <div className="shijing-protected-gate__action-hint">
          <span>{t('Shell.nextStep')}</span>
          <strong>{t(`Shell.protectedAction.${state}`)}</strong>
          <code>{actionHint}</code>
        </div>
        <div className="shijing-protected-gate__actions">
          <Button
            type="button"
            tone="secondary"
            onClick={retry}
            loading={retrying}
            data-testid="shijing-protected-session-retry"
          >
            {t('Shell.retry')}
          </Button>
          <Button
            type="button"
            tone="primary"
            disabled
            data-testid="shijing-protected-operations-locked"
          >
            {t('Shell.protectedOperationsUnavailable')}
          </Button>
        </div>
      </Surface>
    </AmbientBackground>
  );
}
