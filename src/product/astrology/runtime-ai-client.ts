// SJG-ASTRO-11 — Runtime AI client boundary.

import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type { MirrorOutput } from '../../domain/mirror-output.ts';
import type { RuntimeAiPromptRequest } from './runtime-ai-prompt.ts';
import type { RuntimeAiParseFailure } from './runtime-ai-parse.ts';
import { RUNTIME_AI_WORDING_PATCH_KIND } from './runtime-ai-wording-patch.ts';

export type RuntimeAiFailure =
  | { kind: 'runtime_unavailable'; detail: string }
  | { kind: 'parse_failure'; failure: RuntimeAiParseFailure };

export type RuntimeAiOutputSource = {
  readonly kind: 'runtime_ai_wording_patch_applied';
  readonly patch_kind: typeof RUNTIME_AI_WORDING_PATCH_KIND;
};

export type RuntimeAiResult =
  | { ok: true; output: MirrorOutput; output_source: RuntimeAiOutputSource }
  | { ok: false; failure: RuntimeAiFailure };

export function runtimeAiWordingPatchAppliedSource(): RuntimeAiOutputSource {
  return {
    kind: 'runtime_ai_wording_patch_applied',
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
  };
}

export function isRuntimeAiWordingPatchAppliedSource(
  value: unknown,
): value is RuntimeAiOutputSource {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.kind === 'runtime_ai_wording_patch_applied' &&
    record.patch_kind === RUNTIME_AI_WORDING_PATCH_KIND
  );
}

export interface RuntimeAiClient {
  generate(
    mirror_kind: MirrorKind,
    request: RuntimeAiPromptRequest,
  ): Promise<RuntimeAiResult>;
}

export function createUnavailableRuntimeAiClient(detail: string): RuntimeAiClient {
  return {
    async generate(): Promise<RuntimeAiResult> {
      return {
        ok: false,
        failure: { kind: 'runtime_unavailable', detail },
      };
    },
  };
}
