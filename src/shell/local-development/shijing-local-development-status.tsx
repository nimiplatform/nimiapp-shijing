import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openDesktopIntent } from '@nimiplatform/kit/shell/renderer/bridge';
import {
  Button,
  InlineAlert,
  StatusBadge,
  Surface,
} from '@nimiplatform/kit/ui';
import {
  normalizeShijingLocalAppError,
  shijingLocalAppRuntimePlatform,
  withShijingLocalAppResponseDeadline,
  type ShijingLocalAppErrorEvidence,
} from './shijing-local-app-runtime.ts';
import {
  projectShijingAIConfig,
  type ShijingAIConfigEvidence,
} from '../ai/shijing-ai-config.ts';

type SessionEvidence = {
  readonly state: string;
  readonly reasonCode: string;
  readonly actionHint: string;
};

type OperationEvidence =
  | { readonly state: 'idle' }
  | ({ readonly state: 'failed' } & ShijingLocalAppErrorEvidence);

// @nimi-authority: rule.shijing.product.r015
export function ShijingLocalDevelopmentStatus() {
  const { t } = useTranslation();
  const [session, setSession] = useState<SessionEvidence | null>(null);
  const [aiConfig, setAIConfig] = useState<ShijingAIConfigEvidence | null>(null);
  const [operation, setOperation] = useState<OperationEvidence>({ state: 'idle' });
  const [busy, setBusy] = useState<'refresh' | 'configure' | null>(null);

  const refresh = useCallback(async () => {
    setBusy('refresh');
    try {
      const nextSession = await withShijingLocalAppResponseDeadline(
        shijingLocalAppRuntimePlatform.auth.status(),
        'session refresh',
      );
      setSession({
        state: nextSession.state,
        reasonCode: nextSession.reasonCode,
        actionHint: nextSession.actionHint,
      });
      try {
        const nextAIConfig = await withShijingLocalAppResponseDeadline(
          shijingLocalAppRuntimePlatform.aiConfig.get(),
          'App AIConfig refresh',
        );
        setAIConfig(projectShijingAIConfig(nextAIConfig));
        setOperation({ state: 'idle' });
      } catch (error) {
        const evidence = normalizeShijingLocalAppError(error);
        setAIConfig({ state: 'unavailable', reasonCode: evidence.reasonCode });
        setOperation({ state: 'failed', ...evidence });
      }
    } catch (error) {
      setOperation({ state: 'failed', ...normalizeShijingLocalAppError(error) });
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openConfiguration = useCallback(async () => {
    if (busy !== null) return;
    setBusy('configure');
    try {
      const result = await openDesktopIntent({
        intent: { kind: 'open-apps', appId: 'nimi.shijing', section: 'ai-models' },
      });
      if (result.status === 'rejected') {
        throw Object.assign(new Error(result.reasonCode), {
          reasonCode: result.reasonCode,
          actionHint: result.actionHint,
          retryable: true,
        });
      }
      setOperation({ state: 'idle' });
    } catch (error) {
      setOperation({ state: 'failed', ...normalizeShijingLocalAppError(error) });
    } finally {
      setBusy(null);
    }
  }, [busy]);

  const sessionTone = !session
    ? 'neutral'
    : session.state === 'session-bound'
      ? 'success'
      : 'warning';
  const aiConfigTone = aiConfig?.state === 'ready'
    ? 'success'
    : aiConfig ? 'warning' : 'neutral';

  return (
    <Surface
      tone="panel"
      elevation="raised"
      padding="md"
      className="shijing-local-development"
      data-testid="shijing-local-development-status"
    >
      <div className="shijing-local-development__heading">
        <div>
          <div className="shijing-local-development__badges">
            <StatusBadge tone="info" shape="dot">{t('LocalDevelopment.badge')}</StatusBadge>
            <StatusBadge tone={sessionTone}>{t(sessionLabelKey(session?.state))}</StatusBadge>
            <StatusBadge tone={aiConfigTone}>{t(aiConfigLabelKey(aiConfig))}</StatusBadge>
          </div>
          <h2>{t('LocalDevelopment.title')}</h2>
          <p>{t('LocalDevelopment.detail')}</p>
        </div>
        <div className="shijing-local-development__actions">
          <Button
            tone="secondary"
            size="sm"
            loading={busy === 'configure'}
            disabled={busy !== null}
            onClick={() => void openConfiguration()}
            data-testid="shijing-open-ai-config"
          >
            {t('LocalDevelopment.configureAI')}
          </Button>
          <Button
            tone="secondary"
            size="sm"
            loading={busy === 'refresh'}
            disabled={busy !== null}
            onClick={() => void refresh()}
            data-testid="shijing-local-development-refresh"
          >
            {t('LocalDevelopment.refresh')}
          </Button>
        </div>
      </div>

      <dl className="shijing-local-development__facts">
        <Fact label={t('LocalDevelopment.session')} value={t(sessionLabelKey(session?.state))} />
        <Fact label={t('LocalDevelopment.aiConfig')} value={t(aiConfigLabelKey(aiConfig))} />
      </dl>

      {session && session.state !== 'session-bound' ? (
        <InlineAlert tone="info" data-testid="shijing-local-development-session-pending">
          <span>{t('LocalDevelopment.sessionPending')}</span>
        </InlineAlert>
      ) : null}

      {operation.state === 'failed' ? (
        <InlineAlert tone="warning" data-testid="shijing-local-development-operation-failure">
          <span>{t(session ? 'LocalDevelopment.aiConfigIssue' : 'LocalDevelopment.accessIssue')}</span>
          <details className="shijing-local-development__technical">
            <summary>{t('LocalDevelopment.technicalDetails')}</summary>
            <code>{operation.reasonCode}</code>
            <code>{operation.actionHint}</code>
            <span>{operation.message}</span>
          </details>
        </InlineAlert>
      ) : null}
    </Surface>
  );
}

function sessionLabelKey(state: string | undefined): string {
  if (!state) return 'LocalDevelopment.checking';
  if (state === 'session-bound') return 'LocalDevelopment.sessionReady';
  if (state === 'action-required') return 'LocalDevelopment.sessionActionRequired';
  return 'LocalDevelopment.sessionUnavailable';
}

function aiConfigLabelKey(evidence: ShijingAIConfigEvidence | null): string {
  if (!evidence) return 'LocalDevelopment.aiConfigChecking';
  if (evidence.state === 'ready') {
    return evidence.route === 'local'
      ? 'LocalDevelopment.aiConfigReadyLocal'
      : 'LocalDevelopment.aiConfigReadyCloud';
  }
  if (evidence.state === 'not-configured') return 'LocalDevelopment.aiConfigNotConfigured';
  if (evidence.state === 'missing') return 'LocalDevelopment.aiConfigMissing';
  if (evidence.state === 'blocked') return 'LocalDevelopment.aiConfigBlocked';
  return 'LocalDevelopment.aiConfigUnavailable';
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
