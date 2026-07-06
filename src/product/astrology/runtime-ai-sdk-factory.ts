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
import { runtimeAiWordingPatchAppliedSource } from './runtime-ai-client.ts';
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

function extractBalancedJsonObjects(raw: string): string[] {
  const candidates: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const ch = raw[index]!;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (ch !== '}' || depth === 0) continue;

    depth -= 1;
    if (depth === 0 && start >= 0) {
      candidates.push(raw.slice(start, index + 1));
      start = -1;
    }
  }

  return Array.from(new Set(candidates));
}

function parseRuntimeAiWordingPatchCandidate(
  mirrorKind: MirrorKind,
  text: string,
): {
  readonly parsed: ReturnType<typeof parseNimiStructuredJson<RuntimeAiWordingPatch>>;
  readonly normalized: RuntimeAiWordingPatch | null;
  readonly validationError: unknown;
} {
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
  return { parsed, normalized, validationError };
}

function parseRuntimeAiWordingPatch(
  mirrorKind: MirrorKind,
  text: string,
): { ok: true; value: RuntimeAiWordingPatch } | { ok: false; failure: RuntimeAiParseFailure } {
  const { parsed, normalized, validationError } = parseRuntimeAiWordingPatchCandidate(
    mirrorKind,
    text,
  );
  if (!parsed.ok) {
    const accepted = new Map<string, RuntimeAiWordingPatch>();
    for (const candidate of extractBalancedJsonObjects(text)) {
      if (candidate.trim() === text.trim()) continue;
      const retry = parseRuntimeAiWordingPatchCandidate(mirrorKind, candidate);
      if (retry.parsed.ok && retry.normalized) {
        accepted.set(JSON.stringify(retry.normalized), retry.normalized);
      }
    }
    if (accepted.size === 1) {
      return { ok: true, value: [...accepted.values()][0]! };
    }
    if (accepted.size > 1) {
      return {
        ok: false,
        failure: {
          kind: 'validation_failed',
          detail: 'multiple_valid_runtime_ai_wording_patches',
        },
      };
    }
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

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseJsonRecord(raw: string): Record<string, unknown> | null {
  if (!raw.trim().startsWith('{')) return null;
  try {
    return recordValue(JSON.parse(raw));
  } catch {
    return null;
  }
}

function providerMessageFromRuntimeError(message: string): string {
  const envelope = parseJsonRecord(message);
  const details = recordValue(envelope?.details);
  return textValue(details?.provider_message)
    || textValue(details?.providerMessage)
    || '';
}

function isProviderProductNotActivated(providerMessage: string): boolean {
  return /product\b[\s\S]{0,120}\bnot activated/i.test(providerMessage)
    || /not activated\b[\s\S]{0,120}\bproducts?/i.test(providerMessage)
    || /activated products/i.test(providerMessage);
}

function runtimeTextGenerateFailureDetail(error: { readonly code?: string; readonly message?: string }): string {
  const message = textValue(error.message) || textValue(error.code) || 'Runtime text generation failed';
  const providerMessage = providerMessageFromRuntimeError(message);
  if (!providerMessage) return message;
  if (isProviderProductNotActivated(providerMessage)) {
    return `provider_product_not_activated:provider_message=${providerMessage}`;
  }
  return `provider_request_failed:provider_message=${providerMessage}`;
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
          detail: runtimeTextGenerateFailureDetail(result.error),
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
        output_source: runtimeAiWordingPatchAppliedSource(),
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
