// SJG-ASTRO-11 — Nimi runtime SDK factory.

import {
  runNimiTextGenerate,
  type NimiAiModel,
} from '@nimiplatform/sdk/ai';
import type {
  NimiStructuredOutputParseFailure,
} from '@nimiplatform/sdk/features/evaluation';
import { parseNimiStructuredJson } from '@nimiplatform/sdk/features/evaluation';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import {
  RuntimeAiOutputValidationError,
  type RuntimeAiParseFailure,
} from './runtime-ai-parse.ts';
import {
  applyRuntimeAiWordingPatch,
  RuntimeAiWordingPatchValidationError,
  validateRuntimeAiWordingPatchValue,
  wordingPatchValidationFailure,
  type RuntimeAiWordingPatch,
} from './runtime-ai-wording-patch.ts';
import type {
  RuntimeAiClient,
  RuntimeAiResult,
} from './runtime-ai-client.ts';
import type { RuntimeAiPromptRequest } from './runtime-ai-prompt.ts';

interface NimiRuntimeLike {
  readonly model: NimiAiModel;
}

export interface SdkRuntimeFactoryOptions {
  readonly runtime?: NimiRuntimeLike;
  readonly metadata?: Record<string, string>;
  readonly temperature?: number;
  readonly topP?: number;
  readonly maxTokens?: number;
  readonly timeoutMs?: number;
}

function structuredFailureToRuntimeParseFailure(
  failure: NimiStructuredOutputParseFailure,
  validationError?: unknown,
): RuntimeAiParseFailure {
  if (failure.reason === 'invalid-json' || failure.reason === 'expectation-failed') {
    return {
      kind: 'invalid_json',
      detail: failure.message,
    };
  }
  const error = validationError ?? failure.error;
  if (error instanceof RuntimeAiOutputValidationError) {
    return error.failure;
  }
  if (error instanceof RuntimeAiWordingPatchValidationError) {
    return wordingPatchValidationFailure(error.detail);
  }
  return {
    kind: 'validation_failed',
    detail: failure.message,
  };
}

function parseRuntimeAiWordingPatch(
  mirrorKind: MirrorKind,
  text: string,
): { ok: true; value: RuntimeAiWordingPatch } | { ok: false; failure: RuntimeAiParseFailure } {
  let normalized: RuntimeAiWordingPatch | null = null;
  let validationError: unknown;
  const parsed = parseNimiStructuredJson<RuntimeAiWordingPatch>({
    raw: text,
    expect: 'object',
    validate: (value): value is RuntimeAiWordingPatch => {
      try {
        normalized = validateRuntimeAiWordingPatchValue(mirrorKind, value);
        return true;
      } catch (error) {
        validationError = error;
        return false;
      }
    },
  });
  if (!parsed.ok) {
    return {
      ok: false,
      failure: structuredFailureToRuntimeParseFailure(parsed, validationError),
    };
  }
  if (!normalized) {
    return {
      ok: false,
      failure: {
        kind: 'validation_failed',
        detail: 'Runtime AI wording patch validator did not return a normalized patch.',
      },
    };
  }
  return { ok: true, value: normalized };
}

class SdkRuntimeAiClient implements RuntimeAiClient {
  private readonly runtime: NimiRuntimeLike | undefined;
  private readonly options: SdkRuntimeFactoryOptions;
  constructor(options: SdkRuntimeFactoryOptions) {
    this.runtime = options.runtime;
    this.options = options;
  }

  async generate(
    mirror_kind: MirrorKind,
    request: RuntimeAiPromptRequest,
  ): Promise<RuntimeAiResult> {
    if (!this.runtime) {
      return {
        ok: false,
        failure: { kind: 'runtime_unavailable', detail: 'Nimi runtime not provided to factory' },
      };
    }
    const model = String(this.runtime.model.model.modelId || '').trim();
    if (!model) {
      return {
        ok: false,
        failure: {
          kind: 'runtime_unavailable',
          detail: 'Nimi runtime text model not provided to factory',
        },
      };
    }
    const result = await runNimiTextGenerate({
      runtime: this.runtime,
      request: {
        model: this.runtime.model.model,
        messages: [
          { role: 'system', content: [{ type: 'text', text: request.system_prompt }] },
          { role: 'user', content: [{ type: 'text', text: request.user_prompt }] },
        ],
        parameters: {
          ...(this.options.metadata ? { metadata: this.options.metadata } : {}),
          ...(typeof this.options.temperature === 'number'
            ? { temperature: this.options.temperature }
            : {}),
          ...(typeof this.options.topP === 'number' ? { topP: this.options.topP } : {}),
          ...(typeof this.options.maxTokens === 'number' ? { maxTokens: this.options.maxTokens } : {}),
        },
      },
    });
    if (!result.ok) {
      return {
        ok: false,
        failure: {
          kind: 'runtime_unavailable',
          detail: result.error.message || result.error.code || 'Runtime text generation failed',
        },
      };
    }
    const parsed = parseRuntimeAiWordingPatch(mirror_kind, result.text);
    if (!parsed.ok) {
      return { ok: false, failure: { kind: 'parse_failure', failure: parsed.failure } };
    }
    try {
      return {
        ok: true,
        output: applyRuntimeAiWordingPatch(
          request.deterministic_output,
          parsed.value,
        ),
      };
    } catch (error) {
      if (error instanceof RuntimeAiOutputValidationError) {
        return { ok: false, failure: { kind: 'parse_failure', failure: error.failure } };
      }
      if (error instanceof RuntimeAiWordingPatchValidationError) {
        return {
          ok: false,
          failure: {
            kind: 'parse_failure',
            failure: wordingPatchValidationFailure(error.detail),
          },
        };
      }
      return {
        ok: false,
        failure: {
          kind: 'parse_failure',
          failure: {
            kind: 'validation_failed',
            detail: error instanceof Error ? error.message : String(error),
          },
        },
      };
    }
  }
}

export function createSdkRuntimeAiClient(options: SdkRuntimeFactoryOptions): RuntimeAiClient {
  return new SdkRuntimeAiClient(options);
}
