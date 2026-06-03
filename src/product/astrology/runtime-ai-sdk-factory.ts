// SJG-ASTRO-11 — Nimi runtime SDK factory.

import {
  runAppAiTextGenerate,
  type AppAiStructuredOutputParseFailure,
} from '@nimiplatform/sdk/ai-app';
import type {
  NimiRoutePolicy,
  TextGenerateInput,
  TextGenerateOutput,
} from '@nimiplatform/sdk/runtime';
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
  readonly ai: {
    readonly text: {
      readonly generate: (request: TextGenerateInput) => Promise<TextGenerateOutput>;
    };
  };
}

export interface SdkRuntimeFactoryOptions {
  readonly runtime?: NimiRuntimeLike;
  readonly model: string;
  readonly route?: NimiRoutePolicy;
  readonly connectorId?: string;
  readonly metadata?: Record<string, string>;
  readonly temperature?: number;
  readonly topP?: number;
  readonly maxTokens?: number;
  readonly timeoutMs?: number;
}

function structuredFailureToRuntimeParseFailure(
  failure: AppAiStructuredOutputParseFailure,
): RuntimeAiParseFailure {
  if (failure.reason === 'json-missing' || failure.reason === 'json-invalid') {
    return {
      kind: 'invalid_json',
      detail: failure.message,
    };
  }
  if (failure.error instanceof RuntimeAiOutputValidationError) {
    return failure.error.failure;
  }
  if (failure.error instanceof RuntimeAiWordingPatchValidationError) {
    return wordingPatchValidationFailure(failure.error.detail);
  }
  return {
    kind: 'validation_failed',
    detail: failure.message,
  };
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
    const model = String(this.options.model || '').trim();
    if (!model) {
      return {
        ok: false,
        failure: {
          kind: 'runtime_unavailable',
          detail: 'Nimi runtime text model not provided to factory',
        },
      };
    }
    const result = await runAppAiTextGenerate<RuntimeAiWordingPatch>({
      runtime: {
        generateText: (runtimeRequest) => this.runtime!.ai.text.generate(runtimeRequest),
      },
      request: {
        model,
        input: request.user_prompt,
        system: request.system_prompt,
        ...(this.options.route ? { route: this.options.route } : {}),
        ...(this.options.connectorId ? { connectorId: this.options.connectorId } : {}),
        ...(this.options.metadata ? { metadata: this.options.metadata } : {}),
        ...(typeof this.options.temperature === 'number'
          ? { temperature: this.options.temperature }
          : {}),
        ...(typeof this.options.topP === 'number' ? { topP: this.options.topP } : {}),
        ...(typeof this.options.maxTokens === 'number' ? { maxTokens: this.options.maxTokens } : {}),
        ...(typeof this.options.timeoutMs === 'number' ? { timeoutMs: this.options.timeoutMs } : {}),
      },
      structuredOutput: {
        expect: 'object',
        validate: (value) => validateRuntimeAiWordingPatchValue(mirror_kind, value),
        repairInstruction: [
          'Return one JSON object matching the requested ShiJing runtime AI wording patch schema.',
          'Do not include markdown fences, explanations, or any text before or after the JSON object.',
          'Do not return the full MirrorOutput. Return patch_kind, mirror_kind, and allowed wording patch fields only.',
        ].join(' '),
      },
    });
    if (!result.ok) {
      if (result.structuredOutputFailure) {
        return {
          ok: false,
          failure: {
            kind: 'parse_failure',
            failure: structuredFailureToRuntimeParseFailure(result.structuredOutputFailure),
          },
        };
      }
      return {
        ok: false,
        failure: {
          kind: 'runtime_unavailable',
          detail: result.error.message || result.error.code || 'Runtime text generation failed',
        },
      };
    }
    if (!result.structuredOutput) {
      return {
        ok: false,
        failure: {
          kind: 'parse_failure',
          failure: {
            kind: 'invalid_json',
            detail: 'SDK structured output parser did not return a parsed object',
          },
        },
      };
    }
    try {
      return {
        ok: true,
        output: applyRuntimeAiWordingPatch(
          request.deterministic_output,
          result.structuredOutput.value,
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
