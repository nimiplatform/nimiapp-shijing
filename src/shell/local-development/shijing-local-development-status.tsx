import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NimiLocalAppAgent, NimiLocalAppAgentHandle } from '@nimiplatform/sdk/app';
import {
  Button,
  InlineAlert,
  StatusBadge,
  Surface,
} from '@nimiplatform/kit/ui';
import {
  SHIJING_AGENTS_INTERACT_PERMISSION,
  SHIJING_AGENTS_INTERACT_REASON,
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

type PermissionEvidence = {
  readonly posture: string;
  readonly canRequest: boolean;
  readonly agents: readonly NimiLocalAppAgent[];
  readonly detail: string;
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
  const [permission, setPermission] = useState<PermissionEvidence | null>(null);
  const [operation, setOperation] = useState<OperationEvidence>({ state: 'idle' });
  const [busy, setBusy] = useState<'refresh' | 'request' | null>(null);

  const applyPermission = useCallback((nextPermission: PermissionEvidence) => {
    setPermission(nextPermission);
    const retained = nextPermission.agents.find(
      (agent) => agent.agentHandle === props.selectedAgentHandle,
    );
    props.onSelectAgent(retained?.agentHandle ?? nextPermission.agents[0]?.agentHandle ?? null);
  }, [props.onSelectAgent, props.selectedAgentHandle]);

  const refresh = useCallback(async () => {
    setBusy('refresh');
    try {
      const [nextSession, nextPermission] = await withShijingLocalAppResponseDeadline(
        Promise.all([
          shijingLocalAppRuntimePlatform.auth.status(),
          shijingLocalAppRuntimePlatform.permissions.status(
            SHIJING_AGENTS_INTERACT_PERMISSION,
          ),
        ]),
        'session and Agent permission refresh',
      );
      setSession({
        state: nextSession.state,
        reasonCode: nextSession.reasonCode,
        actionHint: nextSession.actionHint,
      });
      applyPermission({
        posture: nextPermission.posture,
        canRequest: nextPermission.canRequest,
        agents: nextPermission.agents,
        detail: nextPermission.detail ?? '',
      });
      setOperation({ state: 'idle' });
    } catch (error) {
      setOperation({ state: 'failed', ...normalizeShijingLocalAppError(error) });
    } finally {
      setBusy(null);
    }
  }, [applyPermission]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => shijingLocalAppRuntimePlatform.permissions.subscribe(
    SHIJING_AGENTS_INTERACT_PERMISSION,
    (event) => {
      applyPermission({
        posture: event.status.posture,
        canRequest: event.status.canRequest,
        agents: event.status.agents,
        detail: event.status.detail ?? '',
      });
    },
    (error) => {
      setOperation({ state: 'failed', ...normalizeShijingLocalAppError(error) });
    },
  ), [applyPermission]);

  const requestPermission = useCallback(async () => {
    setBusy('request');
    setOperation({ state: 'idle' });
    try {
      const nextPermission = await withShijingLocalAppResponseDeadline(
        shijingLocalAppRuntimePlatform.permissions.request({
          permissionId: SHIJING_AGENTS_INTERACT_PERMISSION,
          reason: SHIJING_AGENTS_INTERACT_REASON,
        }),
        'Agent permission request',
      );
      applyPermission({
        posture: nextPermission.posture,
        canRequest: nextPermission.canRequest,
        agents: nextPermission.agents,
        detail: nextPermission.detail ?? '',
      });
    } catch (error) {
      setOperation({ state: 'failed', ...normalizeShijingLocalAppError(error) });
    } finally {
      setBusy(null);
    }
  }, [applyPermission]);

  const permissionTone = permission?.posture === 'granted'
    ? 'success'
    : permission?.posture === 'pending'
      ? 'warning'
      : 'neutral';
  const selectedAgent = permission?.agents.find(
    (agent) => agent.agentHandle === props.selectedAgentHandle,
  );

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
            <StatusBadge tone={permissionTone}>
              {permission?.posture ?? t('LocalDevelopment.checking')}
            </StatusBadge>
          </div>
          <h2>{t('LocalDevelopment.title')}</h2>
          <p>{t('LocalDevelopment.detail')}</p>
        </div>
        <Button
          tone="secondary"
          size="sm"
          loading={busy === 'refresh'}
          disabled={busy !== null && busy !== 'refresh'}
          onClick={() => void refresh()}
          data-testid="shijing-local-development-refresh"
        >
          {t('LocalDevelopment.refresh')}
        </Button>
      </div>

      <dl className="shijing-local-development__facts">
        <Fact label={t('LocalDevelopment.session')} value={session?.state ?? 'loading'} />
        <Fact label={t('LocalDevelopment.sessionReason')} value={session?.reasonCode ?? 'loading'} />
        <Fact label={t('LocalDevelopment.permission')} value={SHIJING_AGENTS_INTERACT_PERMISSION} />
        <Fact label={t('LocalDevelopment.agentCount')} value={String(permission?.agents.length ?? 0)} />
        <Fact label={t('LocalDevelopment.selectedAgent')} value={selectedAgent?.displayName ?? 'none'} />
        <Fact label={t('LocalDevelopment.permissionReason')} value={permission?.detail || permission?.posture || 'loading'} />
        <Fact label={t('LocalDevelopment.nextStep')} value={permissionActionHint(permission)} />
      </dl>

      <div className="shijing-local-development__actions">
        {permission?.posture === 'granted' && permission.agents.length > 0 ? (
          <label>
            <span>{t('LocalDevelopment.selectedAgent')}</span>
            <select
              value={props.selectedAgentHandle ?? ''}
              onChange={(event) => {
                const selected = permission.agents.find(
                  (agent) => agent.agentHandle === event.currentTarget.value,
                );
                props.onSelectAgent(selected?.agentHandle ?? null);
              }}
              data-testid="shijing-local-development-agent-select"
            >
              {permission.agents.map((agent) => (
                <option key={agent.agentHandle} value={agent.agentHandle}>
                  {agent.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button
          tone="primary"
          loading={busy === 'request'}
          disabled={busy !== null || !permission?.canRequest || permission.posture === 'pending'}
          onClick={() => void requestPermission()}
          data-testid="shijing-local-development-request-permission"
        >
          {t('LocalDevelopment.request')}
        </Button>
      </div>

      {operation.state === 'failed' ? (
        <InlineAlert
          tone="warning"
          data-testid="shijing-local-development-operation-failure"
        >
          <strong>{operation.reasonCode}</strong>
          <span>{operation.message}</span>
          <code>{operation.actionHint}</code>
        </InlineAlert>
      ) : null}
    </Surface>
  );
}

function permissionActionHint(permission: PermissionEvidence | null): string {
  if (!permission) return 'refresh_agents_interact_permission';
  if (permission.posture === 'granted') {
    return permission.agents.length > 0
      ? 'send_shijing_agent_conversation'
      : 'wait_for_account_agent_inventory';
  }
  if (permission.posture === 'pending') return 'approve_agents_interact_in_nimi_desktop';
  if (permission.canRequest) return 'request_agents_interact_from_shijing';
  return 'review_agents_interact_in_nimi_desktop';
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
