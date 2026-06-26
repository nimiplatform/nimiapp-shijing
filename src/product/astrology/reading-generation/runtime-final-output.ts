import type { AstrologyFeatureSnapshot } from '../../../domain/algorithm.ts';
import type { MirrorOutput } from '../../../domain/mirror-output.ts';
import type { MirrorContextSnapshot, ReadingGenerationFailure } from '../../../domain/reading.ts';
import { validateMirrorOutput } from '../../../contracts/mirror-output-validator.ts';
import type { RuntimeAiClient, RuntimeAiFailure, RuntimeAiResult } from '../runtime-ai-client.ts';
import { isRuntimeAiWordingPatchAppliedSource } from '../runtime-ai-client.ts';
import { buildRuntimeAiPromptRequest } from '../runtime-ai-prompt.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import type { GenerateReadingInput } from './types.ts';
import { resolveSourceReadings } from './context.ts';

type RuntimeFinalOutputResult =
  | { readonly ok: true; readonly output: MirrorOutput }
  | { readonly ok: false; readonly failure: ReadingGenerationFailure };

interface BuildRuntimeFinalOutputInput {
  readonly input: GenerateReadingInput;
  readonly runtime_ai_client?: RuntimeAiClient;
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly mirror_context: MirrorContextSnapshot;
  readonly deterministic_output: MirrorOutput;
  readonly event_memories: readonly EventMemory[];
}

async function refineWithRuntimeAi(
  client: RuntimeAiClient,
  mirrorKind: GenerateReadingInput['mirror_kind'],
  promptRequest: ReturnType<typeof buildRuntimeAiPromptRequest>,
): Promise<RuntimeAiResult> {
  return client.generate(mirrorKind, promptRequest);
}

function runtimeAiFailureDetail(failure: RuntimeAiFailure): string {
  if (failure.kind === 'runtime_unavailable') return failure.detail;
  const parseFailure = failure.failure;
  switch (parseFailure.kind) {
    case 'invalid_json':
      return `parse_failure:invalid_json:${parseFailure.detail}`;
    case 'mirror_kind_mismatch':
      return [
        'parse_failure:mirror_kind_mismatch',
        `expected=${parseFailure.expected}`,
        `received=${String(parseFailure.received)}`,
      ].join(';');
    case 'validation_failed':
      return `parse_failure:validation_failed:${parseFailure.detail}`;
  }
}

export async function buildRuntimeFinalOutput(
  build: BuildRuntimeFinalOutputInput,
): Promise<RuntimeFinalOutputResult> {
  const { input } = build;
  if (!build.runtime_ai_client) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: 'runtime_unavailable:Runtime AI client is required',
      },
    };
  }
  let promptRequest: ReturnType<typeof buildRuntimeAiPromptRequest>;
  try {
    const sourceReadings =
      input.mirror_kind === 'shijing' && input.mirror_scope.kind === 'consultation'
        ? resolveSourceReadings(input.mirror_scope.source_reading_ids, input.space)
        : null;
    if (sourceReadings && !sourceReadings.ok) {
      return {
        ok: false,
        failure: {
          kind: 'validation_failed',
          mirror_kind: input.mirror_kind,
          mirror_scope: input.mirror_scope,
          stage: 'orchestrator',
          detail: `source reading ${sourceReadings.missing} does not resolve`,
        },
      };
    }
    promptRequest = buildRuntimeAiPromptRequest({
      mirror_kind: input.mirror_kind,
      feature_snapshot: build.feature_snapshot,
      mirror_context: build.mirror_context,
      deterministic_output: build.deterministic_output,
      response_preferences: input.space.settings.response_preferences,
      cited_event_memories: build.event_memories,
      current_time: input.created_at,
      ...(input.question ? { question: input.question } : {}),
      ...(sourceReadings?.ok ? { source_readings: sourceReadings.readings } : {}),
    });
  } catch (error) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: `runtime_prompt_build_failed:${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
  let aiResult: RuntimeAiResult;
  try {
    aiResult = await refineWithRuntimeAi(
      build.runtime_ai_client,
      input.mirror_kind,
      promptRequest,
    );
  } catch (error) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: `runtime_exception:${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
  if (!aiResult.ok) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: runtimeAiFailureDetail(aiResult.failure),
      },
    };
  }
  if (
    input.mirror_kind === 'mingjing' &&
    input.mirror_scope.kind === 'relationship_natal' &&
    !isRuntimeAiWordingPatchAppliedSource(aiResult.output_source)
  ) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: 'runtime_output_missing_wording_patch_provenance',
      },
    };
  }
  const runtimeOutputValidation = validateMirrorOutput(aiResult.output);
  if (!runtimeOutputValidation.ok) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: `runtime_output_validation_failed:${runtimeOutputValidation.error.code}`,
      },
    };
  }
  if (aiResult.output.mirror_kind !== input.mirror_kind) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: 'runtime_output_mirror_kind_mismatch',
      },
    };
  }
  return { ok: true, output: aiResult.output };
}
