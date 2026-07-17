import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  InlineAlert,
  StatusBadge,
  Surface,
} from '@nimiplatform/kit/ui';
import {
  SHIJING_LOCAL_DEVELOPMENT_STORAGE_OPERATION,
  SHIJING_LOCAL_DEVELOPMENT_STORAGE_PATH,
  SHIJING_LOCAL_DEVELOPMENT_STORAGE_RESOURCE,
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
  readonly state: string;
  readonly reasonCode: string;
  readonly actionHint: string;
};

type OperationEvidence =
  | { readonly state: 'idle' }
  | {
      readonly state: 'succeeded';
      readonly reasonCode: string;
      readonly actionHint: string;
    }
  | ({ readonly state: 'failed' } & ShijingLocalAppErrorEvidence);

export function ShijingLocalDevelopmentStatus() {
  const { t } = useTranslation();
  const [session, setSession] = useState<SessionEvidence | null>(null);
  const [permission, setPermission] = useState<PermissionEvidence | null>(null);
  const [operation, setOperation] = useState<OperationEvidence>({ state: 'idle' });
  const [busy, setBusy] = useState<'refresh' | 'request' | 'write' | null>(null);

  const refresh = useCallback(async () => {
    setBusy('refresh');
    try {
      const [nextSession, nextPermission] = await withShijingLocalAppResponseDeadline(
        Promise.all([
          shijingLocalAppRuntimePlatform.auth.status(),
          shijingLocalAppRuntimePlatform.permissions.posture({
            operationId: SHIJING_LOCAL_DEVELOPMENT_STORAGE_OPERATION,
            resourceRef: SHIJING_LOCAL_DEVELOPMENT_STORAGE_RESOURCE,
          }),
        ]),
        'session and permission refresh',
      );
      setSession({
        state: nextSession.state,
        reasonCode: nextSession.reasonCode,
        actionHint: nextSession.actionHint,
      });
      setPermission({
        state: nextPermission.state,
        reasonCode: nextPermission.reasonCode,
        actionHint: nextPermission.actionHint,
      });
    } catch (error) {
      setOperation({ state: 'failed', ...normalizeShijingLocalAppError(error) });
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    setBusy('request');
    setOperation({ state: 'idle' });
    try {
      const posture = await withShijingLocalAppResponseDeadline(
        shijingLocalAppRuntimePlatform.permissions.request({
          operationId: SHIJING_LOCAL_DEVELOPMENT_STORAGE_OPERATION,
          resourceRef: SHIJING_LOCAL_DEVELOPMENT_STORAGE_RESOURCE,
          purpose: t('LocalDevelopment.permissionPurpose'),
        }),
        'permission request',
      );
      setPermission({
        state: posture.state,
        reasonCode: posture.reasonCode,
        actionHint: posture.actionHint,
      });
    } catch (error) {
      setOperation({ state: 'failed', ...normalizeShijingLocalAppError(error) });
    } finally {
      setBusy(null);
    }
  }, [t]);

  const writeProbe = useCallback(async () => {
    setBusy('write');
    setOperation({ state: 'idle' });
    try {
      await withShijingLocalAppResponseDeadline(
        shijingLocalAppRuntimePlatform.storage.writeJson(
          SHIJING_LOCAL_DEVELOPMENT_STORAGE_PATH,
          {
            schemaVersion: 1,
            source: 'shijing-app-launch-migration',
            executedAt: new Date().toISOString(),
          },
        ),
        'app storage write',
      );
      setOperation({
        state: 'succeeded',
        reasonCode: 'local-app-storage-write-succeeded',
        actionHint: 'revoke_in_desktop_then_retry_to_verify_denial',
      });
      await refresh();
    } catch (error) {
      setOperation({ state: 'failed', ...normalizeShijingLocalAppError(error) });
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  const permissionTone = permission?.state === 'granted'
    ? 'success'
    : permission?.state === 'pending'
      ? 'warning'
      : 'neutral';

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
              {permission?.state ?? t('LocalDevelopment.checking')}
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
        <Fact label={t('LocalDevelopment.operation')} value={SHIJING_LOCAL_DEVELOPMENT_STORAGE_OPERATION} />
        <Fact label={t('LocalDevelopment.resource')} value={SHIJING_LOCAL_DEVELOPMENT_STORAGE_RESOURCE} />
        <Fact label={t('LocalDevelopment.permissionReason')} value={permission?.reasonCode ?? 'loading'} />
        <Fact label={t('LocalDevelopment.nextStep')} value={permission?.actionHint ?? 'refresh_local_app_runtime_projection'} />
      </dl>

      <div className="shijing-local-development__actions">
        <Button
          tone="secondary"
          loading={busy === 'write'}
          disabled={busy !== null && busy !== 'write'}
          onClick={() => void writeProbe()}
          data-testid="shijing-local-development-write-probe"
        >
          {t('LocalDevelopment.write')}
        </Button>
        <Button
          tone="secondary"
          loading={busy === 'request'}
          disabled={busy !== null || permission?.state === 'pending' || permission?.state === 'granted'}
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
      {operation.state === 'succeeded' ? (
        <InlineAlert
          tone="success"
          data-testid="shijing-local-development-operation-success"
        >
          <strong>{operation.reasonCode}</strong>
          <span>{t('LocalDevelopment.writeSucceeded')}</span>
          <code>{operation.actionHint}</code>
        </InlineAlert>
      ) : null}
    </Surface>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
