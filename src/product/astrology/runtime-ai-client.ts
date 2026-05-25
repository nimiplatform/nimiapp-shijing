// SJG-ALGO-12 — Runtime AI wording boundary. The deterministic pipeline
// produces an AstrologyFeatureSnapshot; this module hands that snapshot
// (plus user/View context + response preferences + the Astrology
// Contract output schema reference) to a RuntimeAiClient. The client is
// supposed to return JSON shaped like AstrologyOutput. Wave-5 ships the
// abstract interface plus a NoOp implementation that fail-closes to
// `runtime_unavailable`. A later wave wires a real
// `@nimiplatform/sdk/runtime` adapter.
//
// Wave-5 enforces SJG-ALGO-12 invariants by construction:
//   - no provider/model literal here; configuration comes via constructor
//   - no fallback copy; any failure returns a typed error
//   - the abstract surface accepts the AstrologyFeatureSnapshot, never
//     raw birth data, so the caller cannot bypass the pipeline.

import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { AstrologyOutput } from '../../domain/reading.ts';
import type { ResponsePreferences } from '../../domain/settings.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';

export interface RuntimeAiViewContext {
  readonly view_id: string;
  readonly anchor_subject: SubjectRef;
  readonly instructions: string;
  readonly memory_summary: string;
}

export interface RuntimeAiAdHocContext {
  readonly text: string;
}

export interface RuntimeAiRequest {
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly response_preferences: ResponsePreferences;
  readonly view_context?: RuntimeAiViewContext;
  readonly ad_hoc_context?: RuntimeAiAdHocContext;
}

export type RuntimeAiFailureKind =
  | 'runtime_unavailable'
  | 'runtime_call_failed'
  | 'runtime_response_empty'
  | 'runtime_response_not_json'
  | 'runtime_response_schema_invalid'
  | 'forbidden_content';

export interface RuntimeAiFailure {
  readonly kind: RuntimeAiFailureKind;
  readonly detail: string;
}

export type RuntimeAiResult =
  | { ok: true; output: AstrologyOutput }
  | { ok: false; error: RuntimeAiFailure };

export interface RuntimeAiClient {
  readonly adapter_kind: string;
  generate(request: RuntimeAiRequest): Promise<RuntimeAiResult>;
}

export class NoOpRuntimeAiClient implements RuntimeAiClient {
  readonly adapter_kind = 'no_op' as const;

  async generate(_request: RuntimeAiRequest): Promise<RuntimeAiResult> {
    return {
      ok: false,
      error: {
        kind: 'runtime_unavailable',
        detail:
          'NoOpRuntimeAiClient: Nimi runtime adapter is not wired in this wave. A later wave admits the real @nimiplatform/sdk/runtime adapter.',
      },
    };
  }
}

// Wave-11 — injection-based RuntimeAiClient. Accepts any callable
// matching `RuntimeTextGenerator` (typically wired to
// `@nimiplatform/sdk/runtime` `runtimeGenerateText` in production).
// SJG-ALGO-12 invariants:
//   - no provider/model literal here; caller supplies model id at
//     construction time.
//   - no fallback copy; any failure returns a typed error.
//   - prompt + parse + validateReading order is preserved by
//     `generate-reading.ts` upstream.

import { buildRuntimeAiPrompt } from './runtime-ai-prompt.ts';
import { parseAstrologyOutput } from './runtime-ai-parse.ts';

export interface RuntimeTextGeneratorRequest {
  readonly system: string;
  readonly user: string;
  readonly modelId: string;
}

export interface RuntimeTextGeneratorResponse {
  readonly text: string;
  readonly traceId?: string;
}

export type RuntimeTextGenerator = (
  request: RuntimeTextGeneratorRequest,
) => Promise<RuntimeTextGeneratorResponse>;

export interface RuntimeTextGeneratorAiClientOptions {
  readonly modelId: string;
  readonly generator: RuntimeTextGenerator;
  readonly adapterKind?: string;
}

export class RuntimeTextGeneratorAiClient implements RuntimeAiClient {
  readonly adapter_kind: string;
  readonly #generator: RuntimeTextGenerator;
  readonly #modelId: string;

  constructor(options: RuntimeTextGeneratorAiClientOptions) {
    this.adapter_kind = options.adapterKind ?? 'runtime_text_generator';
    this.#generator = options.generator;
    this.#modelId = options.modelId;
  }

  async generate(request: RuntimeAiRequest): Promise<RuntimeAiResult> {
    const prompt = buildRuntimeAiPrompt(
      request.feature_snapshot,
      request.response_preferences,
      request.view_context,
      request.ad_hoc_context,
    );
    let response: RuntimeTextGeneratorResponse;
    try {
      response = await this.#generator({
        system: prompt.system,
        user: prompt.user,
        modelId: this.#modelId,
      });
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: 'runtime_call_failed',
          detail: cause instanceof Error ? cause.message : 'runtime generator threw',
        },
      };
    }
    if (!response || typeof response.text !== 'string') {
      return {
        ok: false,
        error: { kind: 'runtime_response_empty', detail: 'runtime generator returned no text' },
      };
    }
    const parsed = parseAstrologyOutput(response.text);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }
    return { ok: true, output: parsed.output };
  }
}
