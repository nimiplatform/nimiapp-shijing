import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  NimiLocalAppAgentHandle,
  NimiLocalAppAgentReference,
} from '@nimiplatform/sdk/app';
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

type SessionEvidence = {
  readonly state: string;
  readonly reasonCode: string;
  readonly actionHint: string;
};

type OperationEvidence =
  | { readonly state: 'idle' }
  | ({ readonly state: 'failed' } & ShijingLocalAppErrorEvidence);

export type ShijingLocalDevelopmentStatusProps = {
  readonly selectedAgentHandle: NimiLocalAppAgentHandle | null;
  readonly onSelectAgent: (agentHandle: NimiLocalAppAgentHandle | null) => void;
};

export function ShijingLocalDevelopmentStatus(
  props: ShijingLocalDevelopmentStatusProps,
) {
  const { t } = useTranslation();
  const [session, setSession] = useState<SessionEvidence | null>(null);
  const [agents, setAgents] = useState<readonly NimiLocalAppAgentReference[]>([]);
  const [operation, setOperation] = useState<OperationEvidence>({ state: 'idle' });
  const [busy, setBusy] = useState<'refresh' | null>(null);

  const applyAgents = useCallback((nextAgents: readonly NimiLocalAppAgentReference[]) => {
    setAgents(nextAgents);
    const retained = nextAgents.find(
      (agent) => agent.agentHandle === props.selectedAgentHandle,
    );
    props.onSelectAgent(retained?.agentHandle ?? nextAgents[0]?.agentHandle ?? null);
  }, [props.onSelectAgent, props.selectedAgentHandle]);

  const refresh = useCallback(async () => {
    setBusy('refresh');
    try {
      const [nextSession, nextAgents] = await withShijingLocalAppResponseDeadline(
        Promise.all([
          shijingLocalAppRuntimePlatform.auth.status(),
          shijingLocalAppRuntimePlatform.agents.listReferences(),
        ]),
        'session and Agent reference refresh',
      );
      setSession({
        state: nextSession.state,
        reasonCode: nextSession.reasonCode,
        actionHint: nextSession.actionHint,
      });
      applyAgents(nextAgents);
      setOperation({ state: 'idle' });
    } catch (error) {
      setOperation({ state: 'failed', ...normalizeShijingLocalAppError(error) });
    } finally {
      setBusy(null);
    }
  }, [applyAgents]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedAgent = agents.find(
    (agent) => agent.agentHandle === props.selectedAgentHandle,
  );
  const sessionTone = !session
    ? 'neutral'
    : session.state === 'session-bound'
      ? 'success'
      : 'warning';

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
            <StatusBadge tone={sessionTone}>
              {t(sessionLabelKey(session?.state))}
            </StatusBadge>
          </div>
          <h2>{t('LocalDevelopment.title')}</h2>
          <p>{t('LocalDevelopment.detail')}</p>
        </div>
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

      <dl className="shijing-local-development__facts">
        <Fact label={t('LocalDevelopment.session')} value={t(sessionLabelKey(session?.state))} />
        <Fact label={t('LocalDevelopment.agentCount')} value={String(agents.length)} />
        <Fact
          label={t('LocalDevelopment.selectedAgent')}
          value={selectedAgent?.displayName ?? t('LocalDevelopment.noAgentSelected')}
        />
      </dl>

      {session && session.state !== 'session-bound' ? (
        <InlineAlert
          tone="info"
          data-testid="shijing-local-development-session-pending"
        >
          <span>{t('LocalDevelopment.sessionPending')}</span>
        </InlineAlert>
      ) : null}

      {agents.length > 0 ? (
        <div className="shijing-local-development__actions">
          <label>
            <span>{t('LocalDevelopment.selectedAgent')}</span>
            <select
              value={props.selectedAgentHandle ?? ''}
              onChange={(event) => {
                const selected = agents.find(
                  (agent) => agent.agentHandle === event.currentTarget.value,
                );
                props.onSelectAgent(selected?.agentHandle ?? null);
              }}
              data-testid="shijing-local-development-agent-select"
            >
              {agents.map((agent) => (
                <option key={agent.agentHandle} value={agent.agentHandle}>
                  {agent.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {operation.state === 'failed' ? (
        <InlineAlert
          tone="warning"
          data-testid="shijing-local-development-operation-failure"
        >
          <span>{t('LocalDevelopment.accessIssue')}</span>
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

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
