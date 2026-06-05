import type { NimiClient } from '@nimiplatform/sdk';
import {
  getNimiRuntimeProductControlRecord,
  projectNimiFirstRunExecutionEvidenceToAIConfigTargets,
} from '@nimiplatform/sdk/runtime';
import type { NimiAIConfig, NimiAIScopeRef } from '@nimiplatform/sdk/ai';
import { getShijingNimiClient } from '../infra/shijing-nimi-client.ts';
import {
  createShijingReadingAIScopeRef,
  loadShijingAIConfig,
  saveShijingAIConfig,
} from './shijing-ai-config.ts';
import { SHIJING_TEXT_GENERATE_CAPABILITY_ID } from './shijing-runtime-ai-client.ts';

export type ShijingFirstRunAIConfigInitOutcome =
  | {
      outcome: 'already-bound';
      config: NimiAIConfig;
    }
  | {
      outcome: 'initialized';
      config: NimiAIConfig;
      executionEvidenceRef: string;
      runtimeBaselineRef: string;
    }
  | {
      outcome: 'not-initialized';
      reason:
        | 'first_run_record_unavailable'
        | 'first_run_evidence_missing'
        | 'first_run_evidence_not_ready'
        | 'first_run_text_binding_missing'
        | 'first_run_config_apply_failed';
      detail: string;
    };

export type ShijingFirstRunAIConfigInitOptions = {
  readonly scopeRef?: NimiAIScopeRef;
  readonly client?: NimiClient;
  readonly getClient?: () => NimiClient;
  readonly loadConfig?: (scopeRef: NimiAIScopeRef) => NimiAIConfig;
  readonly saveConfig?: (next: NimiAIConfig, scopeRef: NimiAIScopeRef) => NimiAIConfig;
};

function detailFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readTextGenerateTargetRef(config: NimiAIConfig) {
  return config.capabilities.targetRefs[SHIJING_TEXT_GENERATE_CAPABILITY_ID] || null;
}

function ensureAIConfigShape(config: NimiAIConfig, scopeRef: NimiAIScopeRef): NimiAIConfig {
  return {
    ...config,
    scopeRef,
    capabilities: {
      targetRefs: { ...(config.capabilities.targetRefs || {}) },
      selectedParams: { ...(config.capabilities.selectedParams || {}) },
    },
    profileOrigin: config.profileOrigin ?? null,
  };
}

export async function ensureShijingReadingAIConfigFromFirstRunEvidence(
  options: ShijingFirstRunAIConfigInitOptions = {},
): Promise<ShijingFirstRunAIConfigInitOutcome> {
  const scopeRef = options.scopeRef ?? createShijingReadingAIScopeRef();
  const loadConfig = options.loadConfig ?? loadShijingAIConfig;
  const saveConfig = options.saveConfig ?? ((next, targetScopeRef) =>
    saveShijingAIConfig(next, targetScopeRef));
  const config = ensureAIConfigShape(loadConfig(scopeRef), scopeRef);

  if (readTextGenerateTargetRef(config)) {
    return { outcome: 'already-bound', config };
  }

  const client = options.client
    ?? (options.getClient ? options.getClient() : getShijingNimiClient());

  let recordProjection;
  try {
    recordProjection = await getNimiRuntimeProductControlRecord(client.runtime.generated);
  } catch (error) {
    return {
      outcome: 'not-initialized',
      reason: 'first_run_record_unavailable',
      detail: detailFromError(error),
    };
  }

  const firstRun = recordProjection.record?.firstRun ?? null;
  const executionEvidenceRef = String(firstRun?.executionEvidenceRef || '').trim();
  const runtimeBaselineRef = String(firstRun?.runtimeBaselineRef || '').trim();
  const installLevel = String(firstRun?.installLevel || '').trim();
  if (!executionEvidenceRef || !runtimeBaselineRef || !installLevel) {
    return {
      outcome: 'not-initialized',
      reason: 'first_run_evidence_missing',
      detail: 'Runtime product-control first-run evidence is incomplete.',
    };
  }

  let resolvedEvidence;
  try {
    resolvedEvidence = await client.runtime.generated.resolveFirstRunExecutionEvidence({
      executionEvidenceRef,
      expectedRuntimeBaselineRef: runtimeBaselineRef,
      expectedDataRootRef: '',
      expectedInstallLevel: installLevel,
    });
  } catch (error) {
    return {
      outcome: 'not-initialized',
      reason: 'first_run_evidence_not_ready',
      detail: detailFromError(error),
    };
  }

  if (resolvedEvidence.state !== 'local_ai_ready' || !resolvedEvidence.ref) {
    return {
      outcome: 'not-initialized',
      reason: 'first_run_evidence_not_ready',
      detail: resolvedEvidence.detail || resolvedEvidence.reasonCode || resolvedEvidence.state,
    };
  }

  let textTargetRef;
  try {
    textTargetRef = projectNimiFirstRunExecutionEvidenceToAIConfigTargets(resolvedEvidence.ref)
      .find((item) => item.capability === SHIJING_TEXT_GENERATE_CAPABILITY_ID)?.targetRef ?? null;
  } catch (error) {
    return {
      outcome: 'not-initialized',
      reason: 'first_run_text_binding_missing',
      detail: detailFromError(error),
    };
  }

  if (!textTargetRef) {
    return {
      outcome: 'not-initialized',
      reason: 'first_run_text_binding_missing',
      detail: 'Verified Runtime first-run evidence did not contain text.generate.',
    };
  }

  const next: NimiAIConfig = {
    ...config,
    capabilities: {
      ...config.capabilities,
      targetRefs: {
        ...config.capabilities.targetRefs,
        [SHIJING_TEXT_GENERATE_CAPABILITY_ID]: textTargetRef,
      },
    },
  };

  try {
    const saved = saveConfig(next, scopeRef);
    return {
      outcome: 'initialized',
      config: saved,
      executionEvidenceRef,
      runtimeBaselineRef,
    };
  } catch (error) {
    return {
      outcome: 'not-initialized',
      reason: 'first_run_config_apply_failed',
      detail: detailFromError(error),
    };
  }
}
