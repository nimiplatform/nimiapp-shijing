import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openDesktopIntent } from '@nimiplatform/kit/shell/renderer/bridge';
import {
  ModelConfigAIConfigSurface,
  type ModelConfigCopy,
} from '@nimiplatform/kit/features/model-config';
import {
  Button,
  InlineAlert,
  StatusBadge,
} from '@nimiplatform/kit/ui';
import {
  normalizeShijingLocalAppError,
  shijingLocalAppRuntimePlatform,
  withShijingLocalAppResponseDeadline,
  type ShijingLocalAppErrorEvidence,
} from './shijing-local-app-runtime.ts';
import {
  projectShijingAIConfig,
  shouldApplyShijingAIConfigRefresh,
  type ShijingAIConfigEvidence,
} from '../ai/shijing-ai-config.ts';
import {
  applyShijingSessionFailure,
  applyShijingSessionProjection,
} from '../infra/shijing-bootstrap.ts';
import { useAppStore } from '../app-shell/app-store.js';
import type { NimiAIConfigSnapshot } from '@nimiplatform/sdk/ai';

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
  const { t, i18n } = useTranslation();
  const [session, setSession] = useState<SessionEvidence | null>(null);
  const [aiConfig, setAIConfig] = useState<ShijingAIConfigEvidence | null>(null);
  const [aiConfigSnapshot, setAIConfigSnapshot] = useState<NimiAIConfigSnapshot | null>(null);
  const [operation, setOperation] = useState<OperationEvidence>({ state: 'idle' });
  const [busy, setBusy] = useState<'refresh' | 'configure' | null>(null);
  const aiConfigRevisionRef = useRef<string | null>(null);

  const modelConfigCopy = useMemo<ModelConfigCopy>(() => {
    const key = (name: string) => `LocalDevelopment.modelConfig.${name}`;
    return {
      title: t(key('title')),
      description: t(key('description')),
      backLabel: t(key('backLabel')),
      detailTitle: (label) => t(key('detailTitle'), { label }),
      activeModelLabel: t(key('activeModelLabel')),
      activeModelHint: t(key('activeModelHint')),
      activeModelConfiguredLabel: t(key('activeModelConfiguredLabel')),
      activeModelSetupPendingLabel: t(key('activeModelSetupPendingLabel')),
      modelPickerTitle: t(key('modelPickerTitle')),
      modelPickerSearchPlaceholder: t(key('modelPickerSearchPlaceholder')),
      modelPickerLoadingLabel: t(key('modelPickerLoadingLabel')),
      modelPickerEmptyLabel: t(key('modelPickerEmptyLabel')),
      configuredSummary: t(key('configuredSummary')),
      emptySummary: t(key('emptySummary')),
      routeLabel: t(key('routeLabel')),
      localLabel: t(key('localLabel')),
      cloudLabel: t(key('cloudLabel')),
      saveLocalLabel: t(key('saveLocalLabel')),
      saveCloudLabel: t(key('saveCloudLabel')),
      savingLabel: t(key('savingLabel')),
      clearLabel: t(key('clearLabel')),
      clearingLabel: t(key('clearingLabel')),
      conflictLabel: t(key('conflictLabel')),
      conflictDescription: t(key('conflictDescription')),
      conflictCurrentLabel: (revision, summary) => t(key('conflictCurrentLabel'), { revision, summary }),
      advancedLabel: t(key('advancedLabel')),
      advancedHint: t(key('advancedHint')),
      requiredFeaturesLabel: t(key('requiredFeaturesLabel')),
      requiredFeaturesPlaceholder: t(key('requiredFeaturesPlaceholder')),
      defaultsLabel: t(key('defaultsLabel')),
      defaultsPlaceholder: t(key('defaultsPlaceholder')),
      defaultsUnsetLabel: t(key('defaultsUnsetLabel')),
      defaultsTrueLabel: t(key('defaultsTrueLabel')),
      defaultsFalseLabel: t(key('defaultsFalseLabel')),
      defaultsListPlaceholder: t(key('defaultsListPlaceholder')),
      defaultsLocalEffectivePlaceholder: (value) => t(key('defaultsLocalEffectivePlaceholder'), { value }),
      defaultsCloudEffectivePlaceholder: t(key('defaultsCloudEffectivePlaceholder')),
      defaultsRandomValue: t(key('defaultsRandomValue')),
      localChoiceDescription: t(key('localChoiceDescription')),
      localSelectedLabel: t(key('localSelectedLabel')),
      localMissingLabel: t(key('localMissingLabel')),
      localBrokenLabel: t(key('localBrokenLabel')),
      localUnavailableLabel: t(key('localUnavailableLabel')),
      localMismatchLabel: (features) => t(key('localMismatchLabel'), { features }),
      openMachineLabel: t(key('openMachineLabel')),
      cloudConnectorPickerLabel: t(key('cloudConnectorPickerLabel')),
      cloudConnectorPickerPlaceholder: t(key('cloudConnectorPickerPlaceholder')),
      cloudConnectorSelectionRequired: t(key('cloudConnectorSelectionRequired')),
      cloudNoConnectorsLabel: t(key('cloudNoConnectorsLabel')),
      openCloudConnectorsLabel: t(key('openCloudConnectorsLabel')),
      cloudImplementationLabel: t(key('cloudImplementationLabel')),
      cloudImplementationPlaceholder: t(key('cloudImplementationPlaceholder')),
      cloudTargetLabel: t(key('cloudTargetLabel')),
      cloudTargetPlaceholder: t(key('cloudTargetPlaceholder')),
      cloudTargetDialogTitle: t(key('cloudTargetDialogTitle')),
      cloudTargetDialogDescription: t(key('cloudTargetDialogDescription')),
      cloudNoticeLabel: t(key('cloudNoticeLabel')),
      cloudNoticeDescription: t(key('cloudNoticeDescription')),
      cloudConnectorLabel: t(key('cloudConnectorLabel')),
      cloudConnectorPlaceholder: t(key('cloudConnectorPlaceholder')),
      cloudLoadFailed: t(key('cloudLoadFailed')),
      retryLabel: t(key('retryLabel')),
      loadFailed: t(key('loadFailed')),
      saveFailed: t(key('saveFailed')),
      technicalDetailsLabel: t(key('technicalDetailsLabel')),
      unsupportedCapabilityLabel: t(key('unsupportedCapabilityLabel')),
      notConfiguredLabel: t(key('notConfiguredLabel')),
      configuredLabel: t(key('configuredLabel')),
      selectionRequiredLabel: t(key('selectionRequiredLabel')),
      blockedLabel: t(key('blockedLabel')),
      unavailableLabel: t(key('unavailableLabel')),
      mismatchLabel: t(key('mismatchLabel')),
      cancelLabel: t(key('cancelLabel')),
      confirmSelectionLabel: t(key('confirmSelectionLabel')),
      capabilityLabel: (contract, fallback) => contract === 'text.generate'
        ? t(key('capabilityTextGenerateLabel'))
        : fallback,
      capabilityDescription: (contract, fallback) => contract === 'text.generate'
        ? t(key('capabilityTextGenerateDescription'))
        : fallback,
    };
  }, [t]);

  const applyAIConfigSnapshot = useCallback((snapshot: NimiAIConfigSnapshot) => {
    aiConfigRevisionRef.current = snapshot.revision;
    setAIConfigSnapshot(snapshot);
    const evidence = projectShijingAIConfig(snapshot);
    setAIConfig(evidence);
    // Mirror readiness app-wide so product surfaces react to AI setup the
    // moment the overwrite is acknowledged, not on the next bootstrap poll.
    useAppStore.getState().setAiConfigReady(evidence.state === 'ready');
  }, []);

  const clearAIConfigSnapshot = useCallback(() => {
    aiConfigRevisionRef.current = null;
    setAIConfigSnapshot(null);
    setAIConfig(null);
    useAppStore.getState().setAiConfigReady(null);
  }, []);

  const refreshAIConfigEffectiveSelections = useCallback(async (expectedRevision: string) => {
    try {
      const refreshed = await withShijingLocalAppResponseDeadline(
        shijingLocalAppRuntimePlatform.aiConfig.get(),
        'App AIConfig effective-selection refresh',
      );
      if (!shouldApplyShijingAIConfigRefresh(
        aiConfigRevisionRef.current,
        refreshed.revision,
        expectedRevision,
      )) return;
      applyAIConfigSnapshot(refreshed);
    } catch {
      // The overwrite acknowledgement remains authoritative. Effective facts
      // stay unknown until the next successful matching read.
    }
  }, [applyAIConfigSnapshot]);

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
      applyShijingSessionProjection(nextSession);
      if (!nextSession.sessionBound) {
        clearAIConfigSnapshot();
        setOperation({ state: 'idle' });
        return;
      }
      try {
        const nextAIConfig = await withShijingLocalAppResponseDeadline(
          shijingLocalAppRuntimePlatform.aiConfig.get(),
          'App AIConfig refresh',
        );
        applyAIConfigSnapshot(nextAIConfig);
        setOperation({ state: 'idle' });
      } catch (error) {
        const evidence = normalizeShijingLocalAppError(error);
        setSession(null);
        clearAIConfigSnapshot();
        setOperation({ state: 'failed', ...evidence });
        applyShijingSessionFailure(error);
      }
    } catch (error) {
      const evidence = normalizeShijingLocalAppError(error);
      setSession(null);
      clearAIConfigSnapshot();
      setOperation({ state: 'failed', ...evidence });
      applyShijingSessionFailure(error);
    } finally {
      setBusy(null);
    }
  }, [applyAIConfigSnapshot, clearAIConfigSnapshot]);

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
    <div
      className="shijing-local-development"
      data-testid="shijing-local-development-status"
    >
      <div className="shijing-local-development__topline">
        <div className="shijing-local-development__badges">
          <StatusBadge tone="info" shape="dot">{t('LocalDevelopment.badge')}</StatusBadge>
          <StatusBadge tone={sessionTone}>{t(sessionLabelKey(session?.state))}</StatusBadge>
          <StatusBadge tone={aiConfigTone}>{t(aiConfigLabelKey(aiConfig))}</StatusBadge>
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
        </div>
      </div>

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

      <ModelConfigAIConfigSurface
        className="shijing-local-development__ai-config"
        context={{ owner: 'app-ai-config', appId: 'nimi.shijing' }}
        capabilityContracts={['text.generate']}
        copy={modelConfigCopy}
        language={i18n.resolvedLanguage ?? i18n.language}
        capabilities={aiConfigSnapshot?.config?.capabilities
          ?? (aiConfigSnapshot ? null : undefined)}
        revision={aiConfigSnapshot?.revision}
        effectiveSelections={aiConfigSnapshot?.effectiveSelections}
        listOptions={(query) => withShijingLocalAppResponseDeadline(
          shijingLocalAppRuntimePlatform.aiConfig.listOptions(query),
          'App AIConfig options',
        )}
        onOverwrite={async (input) => {
          const result = await withShijingLocalAppResponseDeadline(
            shijingLocalAppRuntimePlatform.aiConfig.overwrite(input),
            'App AIConfig overwrite',
          );
          const acknowledgedSnapshot = {
            config: result.config,
            revision: result.revision,
            effectiveSelections: [],
          } satisfies NimiAIConfigSnapshot;
          applyAIConfigSnapshot(acknowledgedSnapshot);
          setOperation({ state: 'idle' });
          void refreshAIConfigEffectiveSelections(result.revision);
          return result;
        }}
        onOpenOwnerConfiguration={() => { void openConfiguration(); }}
        onRetry={() => { void refresh(); }}
        disabled={busy !== null || session?.state !== 'session-bound'}
      />

      <div className="shijing-local-development__footer">
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
