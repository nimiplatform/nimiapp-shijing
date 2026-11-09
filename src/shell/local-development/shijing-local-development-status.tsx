import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NimiAppScope } from '@nimiplatform/kit/core/app-session';
import { ModelConfigAIConfigSurface, type ModelConfigCopy } from '@nimiplatform/kit/features/model-config';
import { Button, InlineAlert, StatusBadge } from '@nimiplatform/kit/ui';
import { normalizeShijingLocalAppError, type ShijingLocalAppErrorEvidence } from './shijing-local-app-runtime.ts';
import { projectShijingAIConfig, shouldApplyShijingAIConfigRefresh, type ShijingAIConfigEvidence } from '../ai/shijing-ai-config.ts';
import type { NimiAIConfigSnapshot } from '@nimiplatform/sdk/ai';

// @nimi-authority: rule.shijing.product.r015
export function ShijingLocalDevelopmentStatus({ scope, onReadinessChange, openOwnerConfiguration }: {
  scope: NimiAppScope; onReadinessChange: (ready: boolean | null) => void; openOwnerConfiguration?: () => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [aiConfigSnapshot, setAIConfigSnapshot] = useState<NimiAIConfigSnapshot | null>(null);
  const [operation, setOperation] = useState<ShijingLocalAppErrorEvidence | null>(null);
  const [busy, setBusy] = useState(false);
  const aiConfigRevisionRef = useRef<string | null>(null);
  const aiConfig = aiConfigSnapshot ? projectShijingAIConfig(aiConfigSnapshot) : null;
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
    scope.signal.throwIfAborted();
    aiConfigRevisionRef.current = snapshot.revision;
    setAIConfigSnapshot(snapshot);
    onReadinessChange(projectShijingAIConfig(snapshot).state === 'ready');
  }, [scope, onReadinessChange]);
  const refresh = useCallback(async () => {
    if (scope.signal.aborted) return;
    setBusy(true); setOperation(null);
    try { applyAIConfigSnapshot(await scope.client.aiConfig.get()); }
    catch (error) { if (!scope.signal.aborted) setOperation(normalizeShijingLocalAppError(error)); }
    finally { if (!scope.signal.aborted) setBusy(false); }
  }, [scope, applyAIConfigSnapshot]);
  const refreshAIConfigEffectiveSelections = useCallback(async (expectedRevision: string) => {
    try {
      const refreshed = await scope.client.aiConfig.get();
      if (scope.signal.aborted || !shouldApplyShijingAIConfigRefresh(aiConfigRevisionRef.current, refreshed.revision, expectedRevision)) return;
      applyAIConfigSnapshot(refreshed);
    } catch { /* The acknowledged revision remains valid; effective facts await a later read. */ }
  }, [scope, applyAIConfigSnapshot]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <div className="shijing-local-development" data-testid="shijing-local-development-status">
    <div className="shijing-local-development__topline">
      <StatusBadge tone={aiConfig?.state === 'ready' ? 'success' : aiConfig ? 'warning' : 'neutral'}>{t(aiConfigLabelKey(aiConfig))}</StatusBadge>
      {openOwnerConfiguration && <Button tone="secondary" size="sm" disabled={busy} onClick={() => {
        void openOwnerConfiguration().catch(error => { if (!scope.signal.aborted) setOperation(normalizeShijingLocalAppError(error)); });
      }}>{t('LocalDevelopment.configureAI')}</Button>}
    </div>
    {operation && <InlineAlert tone="warning"><span>{t('LocalDevelopment.aiConfigIssue')}</span><details className="shijing-local-development__technical">
      <summary>{t('LocalDevelopment.technicalDetails')}</summary><code>{operation.reasonCode}</code><code>{operation.actionHint}</code><span>{operation.message}</span>
    </details></InlineAlert>}
    <ModelConfigAIConfigSurface className="shijing-local-development__ai-config" context={{ owner: 'app-ai-config', appId: 'nimi.shijing' }}
      capabilityContracts={['text.generate']} copy={modelConfigCopy} language={i18n.resolvedLanguage ?? i18n.language}
      capabilities={aiConfigSnapshot?.config?.capabilities ?? (aiConfigSnapshot ? null : undefined)} revision={aiConfigSnapshot?.revision} effectiveSelections={aiConfigSnapshot?.effectiveSelections}
      listOptions={query => { scope.signal.throwIfAborted(); return scope.client.aiConfig.listOptions(query); }}
      onOverwrite={async input => {
        scope.signal.throwIfAborted();
        const result = await scope.client.aiConfig.overwrite(input);
        applyAIConfigSnapshot({ config: result.config, revision: result.revision, effectiveSelections: [] });
        setOperation(null); void refreshAIConfigEffectiveSelections(result.revision); return result;
      }}
      onOpenOwnerConfiguration={openOwnerConfiguration ? () => { void openOwnerConfiguration().catch(error => { if (!scope.signal.aborted) setOperation(normalizeShijingLocalAppError(error)); }); } : undefined}
      onRetry={() => void refresh()} disabled={busy} />
    <div className="shijing-local-development__footer"><Button tone="secondary" size="sm" loading={busy} disabled={busy} onClick={() => void refresh()}>{t('LocalDevelopment.refresh')}</Button></div>
  </div>;
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
