import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ModelConfigAiModelHub,
  defaultModelConfigProfileCopy,
  useModelConfigProfileController,
  type AppModelConfigSurface,
  type ModelConfigProjectionStatus,
  type SharedAIConfigService,
} from '@nimiplatform/kit/features/model-config';
import type {
  NimiAIConfig,
  NimiAIConfigTargetRef,
  NimiAIScopeRef,
} from '@nimiplatform/sdk/ai';
import { useAppStore } from '../app-shell/app-store.js';
import {
  createShijingAIConfigService,
  createShijingReadingAIScopeRef,
} from './shijing-ai-config.ts';
import { createShijingRuntimeModelPickerProviderCache } from './shijing-runtime-model-provider.ts';
import {
  SHIJING_TEXT_GENERATE_CAPABILITY_ID,
  createShijingModelRequirementDeclaration,
} from './shijing-ai-requirements.ts';
import { createShijingModelConfigTranslator } from './model-config-copy.ts';
import {
  uiLanguageFromI18nLanguage,
  useProductCopy,
  type ProductCopy,
} from '../../product/i18n/copy.ts';

function bindingStatus(
  config: NimiAIConfig,
  runtimeReady: boolean,
  runtimeDetail: string | null,
  copy: ProductCopy,
): ModelConfigProjectionStatus {
  if (!runtimeReady) {
    return {
      supported: false,
      tone: 'attention',
      badgeLabel: copy.aiConfig.runtimeNotReady,
      title: copy.aiConfig.runtimeUnavailable,
      detail: runtimeDetail || copy.aiConfig.runtimeBootstrapPending,
    };
  }
  const targetRef = config.capabilities.targetRefs[SHIJING_TEXT_GENERATE_CAPABILITY_ID] || null;
  if (!targetRef) {
    return {
      supported: false,
      tone: 'attention',
      badgeLabel: copy.aiConfig.needsTarget,
      title: copy.aiConfig.missingTarget,
      detail: copy.aiConfig.missingTargetDetail,
    };
  }
  return {
    supported: true,
    tone: 'ready',
    badgeLabel: copy.aiConfig.configured,
    title: copy.aiConfig.modelConfigured,
    detail: targetRefLabel(targetRef),
  };
}

function targetRefLabel(targetRef: NimiAIConfigTargetRef): string {
  if (targetRef.kind === 'cloud-connector') {
    return targetRef.providerModelId || targetRef.connectorId;
  }
  if (targetRef.kind === 'local-runtime') {
    return targetRef.profileId || targetRef.targetId || targetRef.readinessRef || 'local-runtime';
  }
  return targetRef.sliceId;
}

function useLiveAIConfig(service: SharedAIConfigService, scopeRef: NimiAIScopeRef): NimiAIConfig {
  const [config, setConfig] = useState<NimiAIConfig>(() => service.aiConfig.get(scopeRef));
  useEffect(() => {
    setConfig(service.aiConfig.get(scopeRef));
    return service.aiConfig.subscribe(scopeRef, setConfig);
  }, [service, scopeRef]);
  return config;
}

export function ShijingAiModelConfigSection() {
  const copy = useProductCopy();
  const { i18n } = useTranslation();
  const modelConfigTranslate = useMemo(
    () => createShijingModelConfigTranslator(uiLanguageFromI18nLanguage(i18n.resolvedLanguage ?? i18n.language)),
    [i18n.language, i18n.resolvedLanguage],
  );
  const bootstrapReady = useAppStore((state) => state.bootstrapReady);
  const bootstrapError = useAppStore((state) => state.bootstrapError);
  const service = useMemo(() => createShijingAIConfigService(), []);
  const scopeRef = useMemo(() => createShijingReadingAIScopeRef(), []);
  const config = useLiveAIConfig(service, scopeRef);
  const providerCache = useMemo(() => createShijingRuntimeModelPickerProviderCache(), []);
  const requirementDeclaration = useMemo(
    () => createShijingModelRequirementDeclaration(scopeRef),
    [scopeRef],
  );

  const surface = useMemo<AppModelConfigSurface>(() => ({
    scopeRef,
    aiConfigService: service,
    requirementDeclaration,
    enabledCapabilities: [SHIJING_TEXT_GENERATE_CAPABILITY_ID],
    providerResolver: (capabilityId: string) => (bootstrapReady ? providerCache(capabilityId) : null),
    projectionResolver: () => bindingStatus(config, bootstrapReady, bootstrapError, copy),
    runtimeReady: bootstrapReady,
    runtimeNotReadyLabel: bootstrapError || copy.aiConfig.runtimeNotReady,
    i18n: { t: modelConfigTranslate },
  }), [bootstrapError, bootstrapReady, config, copy, modelConfigTranslate, providerCache, requirementDeclaration, scopeRef, service]);

  const profileCopy = useMemo(
    () => defaultModelConfigProfileCopy(modelConfigTranslate),
    [modelConfigTranslate],
  );
  const currentOrigin = useMemo(
    () => (config.profileOrigin
      ? { profileId: config.profileOrigin.profileId, title: config.profileOrigin.title }
      : null),
    [config.profileOrigin],
  );
  const profile = useModelConfigProfileController({
    scopeRef,
    aiConfigService: service,
    requirementDeclaration,
    copy: profileCopy,
    currentOrigin,
  });

  return (
    <section
      id="settings-ai-model-config"
      className="sjp-card sjp-card--ai-model-config"
      tabIndex={-1}
    >
      <div className="sjp-card-head">
        <span className="sjp-card-icon">
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
            <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </span>
        <div>
          <h2 className="sjp-card-title">{copy.aiConfig.title}</h2>
          <p className="sjp-card-desc">{copy.aiConfig.description}</p>
        </div>
      </div>
      <div className="shijing-ai-model-config">
        <ModelConfigAiModelHub
          surface={surface}
          profile={profile}
          className="shijing-ai-model-config__hub"
        />
      </div>
    </section>
  );
}
